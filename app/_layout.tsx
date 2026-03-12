import React, { useEffect, useState } from 'react';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { useShakeDetector } from '../hooks/useShakeDetector';
import { sendTwilioSMS } from '../utils/twilio';
import * as Notifications from 'expo-notifications';
import { Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { SafeRideProvider, useSafeRide } from '../context/SafeRideContext';
import { isOffRoute } from '../utils/routeMonitor';
import { triggerLoudAlarm, escalateToFamily, escalateToPolice } from '../utils/emergencyEscalation';
import { supabase } from '../utils/supabase';
import { Session } from '@supabase/supabase-js';
import SafetyAIChatbot from '../components/SafetyAIChatbot';

// Notification handler setup is moved inside RootLayout useEffect to prevent Expo Go crashes

function GlobalSOSHandler({ children, session }: { children: React.ReactNode; session: Session | null | undefined }) {
  const { settings, updateSettings } = useSettings();
  const { rideState, setEmergencyPhase, setEscalationTimer } = useSafeRide();
  const [alarmSound, setAlarmSound] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
 
  useEffect(() => {
    // Delay chatbot mount for better initial load performance
    const timer = setTimeout(() => setIsMounted(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Debug shake detector
    console.log('Shake detector settings:', {
      shakeToSOS: settings.shakeToSOS,
      safeMode: settings.safeMode
    });
  }, [settings.shakeToSOS, settings.safeMode]);
 
  useEffect(() => {
    if (settings.safeMode && !settings.shakeToSOS) {
      updateSettings({ shakeToSOS: true });
    }
    
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: true,
      playThroughEarpieceAndroid: false
    });
  }, [settings.safeMode]);
 
  useEffect(() => {
    if (!rideState.isTripActive || !rideState.expectedRoute.length || rideState.emergencyPhase !== 'NONE') return;

    const checkRoute = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const offRoute = isOffRoute(loc.coords, rideState.expectedRoute);
          if (offRoute) {
            handleDeviationDetected();
          }
      }
    };

    const interval = setInterval(checkRoute, 10000);
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
    setEscalationTimer(null);
    setEmergencyPhase('ESCALATING_FAMILY');
    
    try {
      const loc = await Location.getCurrentPositionAsync({});
      
      // Log alert to Supabase for Admin Dashboard
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('full_name, phone_number').eq('id', user?.id).single();
      
      await supabase.from('emergency_alerts').insert([{
        user_id: user?.id,
        user_name: profile?.full_name || user?.email,
        user_phone: profile?.phone_number,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        status: 'active'
      }]);

      await escalateToFamily(rideState.cabInfo, loc.coords, settings);
    } catch (err) {
      console.error("❌ Escalation failed:", err);
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
      try {
        await Notifications.scheduleNotificationAsync({
          content: { title: "SOS Triggered! 🚨", body: "Sending emergency alerts to your contacts..." },
          trigger: null,
        });
      } catch (e) {
        console.warn("Local notification failed (likely Expo Go limitation):", e);
        Alert.alert("SOS Triggered! 🚨", "Sending emergency alerts to your contacts...");
      }

      const savedContacts = await AsyncStorage.getItem('@emergency_contacts');
      let contacts = [];
      
      try {
        const parsedContacts = savedContacts ? JSON.parse(savedContacts) : [];
        contacts = Array.isArray(parsedContacts) ? parsedContacts : [];
      } catch (parseError) {
        console.warn('Failed to parse emergency contacts:', parseError);
        contacts = [];
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      let locData = null;
      let locationLink = '';
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        locData = loc;
        locationLink = `https://www.google.com/maps?q=${loc.coords.latitude}%2C${loc.coords.longitude}`;
      }

      // Log alert to Supabase for Admin Dashboard
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('full_name, phone_number').eq('id', user?.id).single();
      
      if (locData) {
        await supabase.from('emergency_alerts').insert([{
          user_id: user?.id,
          user_name: profile?.full_name || user?.email,
          user_phone: profile?.phone_number,
          latitude: locData.coords.latitude,
          longitude: locData.coords.longitude,
          status: 'active'
        }]);
      }

      if (!Array.isArray(contacts) || contacts.length === 0) {
        console.warn('No valid emergency contacts found');
        return;
      }

      const message = settings.sosMessage.replace('{link}', locationLink);
      
      for (const contact of contacts) {
        if (contact && contact.phone) {
          await sendTwilioSMS(
            contact.phone,
            message,
            settings.twilioSid,
            settings.twilioToken,
            settings.twilioNumber
          );
        }
      }
    } catch (err) {
      console.error('SOS Background Error:', err);
    }
  };

  useShakeDetector(sendSOS, settings.shakeToSOS);

  return (
    <>
      {children}
      {/* Only show chatbot when user is authenticated (not on auth pages) */}
      {isMounted && session && <SafetyAIChatbot />}
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
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Graceful notification setup for Expo Go
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (e) {
      console.warn("Notifications setup failed:", e);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    }).catch(() => setSession(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!navigationState?.key || session === undefined) return;

    const inAuthGroup = segments[0] === 'auth';

    // Using a microtask/timeout to ensure the Root Layout has finished its first render
    const timeout = setTimeout(() => {
      if (!session && !inAuthGroup) {
        router.replace('/auth');
      } else if (session && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }, 1);

    return () => clearTimeout(timeout);
  }, [session, segments, navigationState?.key]);

  return (
    <SettingsProvider>
      <SafeRideProvider>
        <GlobalSOSHandler session={session}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="auth" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </GlobalSOSHandler>
      </SafeRideProvider>
    </SettingsProvider>
  );
}
