import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { useShakeDetector } from '../hooks/useShakeDetector';
import { sendTwilioSMS } from '../utils/twilio';
import * as Notifications from 'expo-notifications';
import { Alert, Vibration, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { SafeRideProvider, useSafeRide } from '../context/SafeRideContext';
import { isOffRoute } from '../utils/routeMonitor';
import { triggerLoudAlarm, escalateToFamily, escalateToPolice } from '../utils/emergencyEscalation';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function GlobalSOSHandler({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const { rideState, setEmergencyPhase, setEscalationTimer } = useSafeRide();
  const [alarmSound, setAlarmSound] = useState<any>(null);
 
  useEffect(() => {
    // Auto-enable shake when safe mode is on
    if (settings.safeMode && !settings.shakeToSOS) {
      updateSettings({ shakeToSOS: true });
    }
    
    // Configure Audio for loud playback
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: true,
      playThroughEarpieceAndroid: false
    });
  }, [settings.safeMode]);
 
  // --- Safe Ride Monitoring ---
  useEffect(() => {
    if (!rideState.isTripActive || !rideState.expectedRoute.length || rideState.emergencyPhase !== 'NONE') return;
 
    const checkRoute = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync(); // Request permission if not granted
      if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const offRoute = isOffRoute(loc.coords, rideState.expectedRoute);
          if (offRoute) {
            handleDeviationDetected();
          }
      }
    };
 
    const interval = setInterval(checkRoute, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [rideState.isTripActive, rideState.expectedRoute, rideState.emergencyPhase]);
 
  const handleDeviationDetected = async () => {
    setEscalationTimer(10);
    setEmergencyPhase('CHECKING_IN');
    const sound = await triggerLoudAlarm();
    setAlarmSound(sound);
  };
 
  useEffect(() => {
    let interval: any;
    if (rideState.escalationTimer !== null && rideState.escalationTimer > 0) {
      interval = setInterval(() => setEscalationTimer(rideState.escalationTimer! - 1), 1000);
    } else if (rideState.escalationTimer === 0) {
      if (rideState.emergencyPhase === 'CHECKING_IN') {
        handleEscalateToFamily();
      }
    }
    return () => clearInterval(interval);
  }, [rideState.escalationTimer, rideState.emergencyPhase]);

  const handleEscalateToFamily = async () => {
    console.log("🕒 Timeout reached! Starting escalation...");
    setEscalationTimer(null); // Clear timer immediately to prevent race conditions
    setEmergencyPhase('ESCALATING_FAMILY');
    
    try {
      const loc = await Location.getCurrentPositionAsync({});
      console.log("📍 Location captured, notifying contacts...");
      await escalateToFamily(rideState.cabInfo, loc.coords, settings);
      console.log("✅ Escalation process complete.");
    } catch (err) {
      console.error("❌ Escalation failed:", err);
      // Fallback: try alerting if Twilio/Location fails
      Alert.alert("Emergency", "Failed to send automatic alerts. Please try manual SOS.");
    }
  };

  const stopGlobalAlarm = async () => {
    if (alarmSound) {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
      setAlarmSound(null);
    }
    setEmergencyPhase('NONE');
    setEscalationTimer(null);
  };

  const sendSOS = async () => {
    try {
      // 1. Alert locally immediately - Try catch specifically for this to prevent crash
      try {
        await Notifications.scheduleNotificationAsync({
          content: { title: "SOS Triggered! 🚨", body: "Sending emergency alerts to your contacts..." },
          trigger: null,
        });
      } catch (e) {
        console.warn("Notifications not supported in this environment:", e);
        Alert.alert("SOS Triggered! 🚨", "Sending emergency alerts to your contacts...");
      }

      const savedContacts = await AsyncStorage.getItem('@emergency_contacts');
      const contacts = savedContacts ? JSON.parse(savedContacts) : [];
      
      if (contacts.length === 0) {
        console.log('No contacts found');
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      let locationLink = '';
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        locationLink = `https://www.google.com/maps?q=${loc.coords.latitude}%2C${loc.coords.longitude}`;
      }

      const message = settings.sosMessage.replace('{link}', locationLink);
      
      for (const contact of contacts) {
        await sendTwilioSMS(
          contact.phone,
          message,
          settings.twilioSid,
          settings.twilioToken,
          settings.twilioNumber
        );
      }
    } catch (err) {
      console.error('SOS Background Error:', err);
    }
  };

  useShakeDetector(sendSOS, settings.shakeToSOS);

  return (
    <>
      {children}
      {rideState.emergencyPhase !== 'NONE' && (
        <View style={gs.emergencyOverlay}>
          <Ionicons name="alert-circle" size={80} color={Colors.sos} />
          <Text style={gs.emergencyTitle}>Route Deviation Detected!</Text>
          <Text style={gs.emergencySubtitle}>Are you okay? We will call your family in {rideState.escalationTimer ?? 10}s if you don't respond.</Text>
          
          <TouchableOpacity style={gs.imSafeBtn} onPress={stopGlobalAlarm}>
            <Text style={gs.imSafeText}>YES, I AM SAFE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={gs.callPoliceNow} onPress={async () => {
             const loc = await Location.getCurrentPositionAsync({});
             await escalateToPolice(rideState.cabInfo, loc.coords, settings);
          }}>
            <Text style={gs.callPoliceText}>Call Police Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const gs = StyleSheet.create({
  emergencyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, zIndex: 2000, elevation: 100 },
  emergencyTitle: { color: Colors.sos, fontSize: FontSize.xl, fontWeight: '900', textAlign: 'center', marginTop: Spacing.xl },
  emergencySubtitle: { color: Colors.white, fontSize: FontSize.md, textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.xl, lineHeight: 24 },
  imSafeBtn: { backgroundColor: Colors.safe, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderRadius: Radius.full, width: '100%', alignItems: 'center' },
  imSafeText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '800' },
  callPoliceNow: { marginTop: Spacing.xl, padding: Spacing.md },
  callPoliceText: { color: Colors.sos, fontSize: FontSize.md, fontWeight: '700', textDecorationLine: 'underline' },
});

export default function RootLayout() {
  return (
    <SettingsProvider>
      <SafeRideProvider>
        <GlobalSOSHandler>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border, borderTopWidth: 1, height: 64, paddingBottom: 8 },
              tabBarActiveTintColor: Colors.sos, tabBarInactiveTintColor: Colors.textMuted,
              tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
          >
            <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="shield-checkmark" size={size} color={color} /> }} />
            <Tabs.Screen name="contacts" options={{ title: 'Contacts', tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="people" size={size} color={color} /> }} />
            <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="map" size={size} color={color} /> }} />
            <Tabs.Screen name="complaints" options={{ title: 'Report', tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="document-text-outline" size={size} color={color} /> }} />
            <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
          </Tabs>
        </GlobalSOSHandler>
      </SafeRideProvider>
    </SettingsProvider>
  );
}
