import React, { useEffect, useState } from 'react';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { useShakeDetector } from '../hooks/useShakeDetector';
import { sendTwilioSMS } from '../utils/twilio';
import { startGuardianScanning, stopGuardianScanning, estimateDistance } from '../utils/bluetoothSOS';
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
  const [nearbyAlert, setNearbyAlert] = useState<any>(null);
  const [offlineSOSSignal, setOfflineSOSSignal] = useState<any>(null);

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

  const recordingRef = React.useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[SOS] Microphone permission not granted');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('[SOS] Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      console.log('[SOS] Recording started');
    } catch (err) {
      console.error('[SOS] Failed to start recording', err);
    }
  };

  const stopAndUploadRecording = async (alertId: string) => {
    if (!recordingRef.current) {
      console.warn('[SOS] No recording found to stop');
      return;
    }

    try {
      console.log('[SOS] Stopping recording...');
      const currentRecording = recordingRef.current;
      recordingRef.current = null; // Clear immediately to prevent multiple calls

      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();

      if (uri) {
        console.log('[SOS] Uploading audio:', uri);
        const fileName = `sos_${alertId}_${Date.now()}.m4a`;

        // Use FormData for robust React Native uploads
        const formData = new FormData();
        formData.append('file', {
          uri: uri,
          name: fileName,
          type: 'audio/m4a'
        } as any);

        const { error: uploadError } = await supabase.storage
          .from('sos_recordings')
          .upload(fileName, formData);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('sos_recordings')
          .getPublicUrl(fileName);

        await supabase.from('emergency_alerts').update({ audio_url: publicUrl }).eq('id', alertId);
        console.log('[SOS] Audio uploaded successfully:', publicUrl);

        // Send follow-up SMS with audio link
        const savedContacts = await AsyncStorage.getItem('@emergency_contacts');
        const parsedContacts = savedContacts ? JSON.parse(savedContacts) : [];
        const contacts = Array.isArray(parsedContacts) ? parsedContacts.filter((c: any) => c && c.phone) : [];

        if (contacts.length > 0) {
          const phones = contacts.map((c: any) => c.phone.trim());
          const message = `🚨 Audio evidence recorded for ${settings.userName || 'User'}. Listen here: ${publicUrl}`;

          await sendTwilioSMS(
            phones,
            message,
            settings.twilioSid,
            settings.twilioToken,
            settings.twilioNumber
          );
          console.log('[SOS] Follow-up Audio SMS sent to', phones.length, 'contacts');
        }
      }
    } catch (err) {
      console.error('[SOS] Audio upload failed', err);
    }
  };

  const handleEscalateToFamily = async () => {
    setEscalationTimer(null);
    setEmergencyPhase('ESCALATING_FAMILY');

    try {
      // Start recording immediately
      startRecording();

      const loc = await Location.getCurrentPositionAsync({});

      // Fetch emergency contacts snapshot
      const savedContacts = await AsyncStorage.getItem('@emergency_contacts');
      const contactsSnapshot = savedContacts ? JSON.parse(savedContacts) : [];

      // Log alert to Supabase for Admin Dashboard
      const { data: { user } } = await supabase.auth.getUser();
      // Fresh fetch to ensure we have the very latest name/phone
      const { data: profile } = await supabase.from('profiles').select('full_name, phone_number').eq('id', user?.id).single();

      const userName = profile?.full_name || settings.userName || user?.email;
      const userPhone = profile?.phone_number || user?.phone || user?.user_metadata?.phone || '';

      const { data: alertData, error: dbError } = await supabase.from('emergency_alerts').insert([{
        user_id: user?.id,
        user_name: userName,
        user_phone: userPhone,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        status: 'active',
        emergency_contacts: contactsSnapshot,
        police_status: 'none'
      }]).select().single();

      if (dbError) {
        console.warn("Offline/DB Error: Falling back to native SMS...");
        const message = `🚨 EMERGENCY: ${userName}'s ride deviated! 📍 https://www.google.com/maps?q=${loc.coords.latitude}%2C${loc.coords.longitude}`;
        const phones = contactsSnapshot.map((c: any) => c.phone);
        if (phones.length > 0) {
          import('expo-sms').then(({ sendSMSAsync }) => {
            sendSMSAsync(phones, message);
          });
        }
      }

      // Stop and upload recording after 30 seconds (User requested)
      if (alertData) {
        setTimeout(() => stopAndUploadRecording(alertData.id), 30000);
      }

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

      const userName = profile?.full_name || settings.userName || user?.email;
      const userPhone = profile?.phone_number || user?.phone || user?.user_metadata?.phone || '';

      if (locData) {
        const { data: alertData, error: dbError } = await supabase.from('emergency_alerts').insert([{
          user_id: user?.id,
          user_name: userName,
          user_phone: userPhone,
          latitude: locData.coords.latitude,
          longitude: locData.coords.longitude,
          status: 'active',
          emergency_contacts: contacts,
          police_status: 'none'
        }]).select().single();

        if (dbError) {
          console.warn("Offline/DB Error: Falling back to native SMS...");
          const smsMessage = `🚨 SOS HELP! My live location: ${locationLink}`;
          const phones = contacts.map((c: any) => c.phone);
          if (phones.length > 0) {
            import('expo-sms').then(({ sendSMSAsync }) => {
              sendSMSAsync(phones, smsMessage);
            });
          }
        }

        // Start background recording for manual SOS too
        startRecording();
        if (alertData) {
          setTimeout(() => stopAndUploadRecording(alertData.id), 10000);
        }
      }

      if (!Array.isArray(contacts) || contacts.length === 0) {
        console.warn('No valid emergency contacts found');
        return;
      }

      const message = settings.sosMessage.replace('{link}', locationLink);

      for (const contact of contacts) {
        if (contact && contact.phone) {
          await sendTwilioSMS(
            contact.phone.trim(),
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

  useEffect(() => {
    if (!settings.joinSafetyNetwork || !session?.user?.id) return;

    console.log('[Guardian] Subscribing to emergency alerts...');
    const channel = supabase
      .channel('guardian-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emergency_alerts', filter: `status=eq.active` },
        async (payload) => {
          const alert = payload.new;
          if (alert.user_id === session.user.id) return; // Don't notify self

          // Check distance
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const currentLoc = await Location.getCurrentPositionAsync({});
            const distance = getDistance(
              currentLoc.coords.latitude,
              currentLoc.coords.longitude,
              alert.latitude,
              alert.longitude
            );

            if (distance <= 5) { // 5km radius
              setNearbyAlert({ ...alert, distance });
              // Play a subtle notification sound (reusing alarm logic but maybe quieter?)
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [settings.joinSafetyNetwork, session?.user?.id]);

  useEffect(() => {
    if (settings.joinSafetyNetwork) {
      startGuardianScanning();
    } else {
      stopGuardianScanning();
    }
  }, [settings.joinSafetyNetwork]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data?.type === 'BLE_SOS') {
        setOfflineSOSSignal({
          name: data.name,
          rssi: data.rssi,
          timestamp: Date.now()
        });
      }
    });

    return () => subscription.remove();
  }, []);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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
        </View>
      )}

      {nearbyAlert && (
        <View style={gs.guardianOverlay}>
          <View style={gs.guardianContent}>
            <Ionicons name="shield-half" size={40} color={Colors.white} />
            <Text style={gs.guardianTitle}>HELP NEEDED NEARBY! 🚨</Text>
            <Text style={gs.guardianSubtitle}>
              Someone is in danger approx {nearbyAlert.distance.toFixed(1)}km from you.
            </Text>
            <Text style={gs.guardianName}>{nearbyAlert.user_name}</Text>
            
            <View style={gs.guardianActions}>
              <TouchableOpacity 
                style={[gs.guardianBtn, gs.guardianAccept]} 
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/map',
                    params: { 
                      targetLat: nearbyAlert.latitude, 
                      targetLng: nearbyAlert.longitude,
                      targetName: `${nearbyAlert.user_name} (SOS)`
                    }
                  });
                  setNearbyAlert(null);
                }}
              >
                <Text style={gs.guardianBtnText}>VIEW ON MAP</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[gs.guardianBtn, gs.guardianDismiss]} 
                onPress={() => setNearbyAlert(null)}
              >
                <Text style={gs.guardianBtnText}>DISMISS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {offlineSOSSignal && (
        <View style={gs.offlineOverlay}>
          <View style={gs.offlineContent}>
            <View style={gs.offlineHeader}>
              <Ionicons name="bluetooth" size={24} color={Colors.white} />
              <Text style={gs.offlineTitle}>NEARBY OFFLINE SOS!</Text>
            </View>
            <Text style={gs.offlineText}>
              A help signal was detected via Bluetooth from {offlineSOSSignal.name || 'someone'} nearby.
            </Text>
            <Text style={gs.offlineDist}>
              Estimated Distance: {estimateDistance(offlineSOSSignal.rssi)}
            </Text>
            <TouchableOpacity 
              style={gs.offlineDismiss} 
              onPress={() => setOfflineSOSSignal(null)}
            >
              <Text style={gs.offlineBtnText}>UNDERSTOOD</Text>
            </TouchableOpacity>
          </View>
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
  
  guardianOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 3000,
    elevation: 10,
  },
  guardianContent: {
    backgroundColor: Colors.sos,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  guardianTitle: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '900',
    marginTop: Spacing.sm,
  },
  guardianSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: 4,
  },
  guardianName: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  guardianActions: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  guardianBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  guardianAccept: {
    backgroundColor: Colors.white,
  },
  guardianDismiss: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  guardianBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.sos,
  },
  offlineOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 4000,
  },
  offlineContent: {
    backgroundColor: '#2D3436', // Dark gray for offline
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.sos,
  },
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  offlineTitle: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '900',
  },
  offlineText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.sm,
    marginBottom: 4,
  },
  offlineDist: {
    color: Colors.sos,
    fontSize: FontSize.sm,
    fontWeight: '800',
    marginBottom: Spacing.lg,
  },
  offlineDismiss: {
    backgroundColor: Colors.sos,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  offlineBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
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
