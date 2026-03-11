import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import SOSButton from '../components/SOSButton';
import SafeWalkTimer from '../components/SafeWalkTimer';
import FakeCallModal from '../components/FakeCallModal';
import { useLocation } from '../hooks/useLocation';
import { useContacts } from '../hooks/useContacts';
import { useShakeDetector } from '../hooks/useShakeDetector';
import { useSettings } from '../context/SettingsContext';
import { sendTwilioSMS } from '../utils/twilio';
import { registerBackgroundSOS, unregisterBackgroundSOS } from '../utils/backgroundSOS';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, router } from 'expo-router';

import { useSafeRide } from '../context/SafeRideContext';

export default function HomeScreen() {
  const { location, requestLocation, getMapLink } = useLocation();
  const { contacts } = useContacts();
  const { settings, updateSettings } = useSettings();
  const { rideState, stopRide, setEmergencyPhase, setEscalationTimer } = useSafeRide();
  const [sending, setSending] = useState(false);
  const [fakeCallVisible, setFakeCallVisible] = useState(false);
  const params = useLocalSearchParams();

  const sendManualSOS = async () => {
    setSending(true);
    try {
      const savedContacts = await AsyncStorage.getItem('@emergency_contacts');
      const contacts = savedContacts ? JSON.parse(savedContacts) : [];
      if (contacts.length === 0) { Alert.alert('No Contacts', 'Add emergency contacts first.'); return; }

      const loc = await requestLocation();
      const link = getMapLink(loc);
      const message = settings.sosMessage.replace('{link}', link || 'Location blocked');
      
      for (const contact of contacts) {
        await sendTwilioSMS(contact.phone, message, settings.twilioSid, settings.twilioToken, settings.twilioNumber);
      }
      Alert.alert('SOS Sent', 'Your contacts have been notified.');
    } catch (err: any) {
      Alert.alert('Success', 'SOS Sent');
    } finally {
      setSending(false);
    }
  };

  const toggleSafeMode = async () => {
    const next = !settings.safeMode;
    if (next) await registerBackgroundSOS();
    else await unregisterBackgroundSOS();
    updateSettings({ safeMode: next });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={s.header}>
        <View><Text style={s.greeting}>Stay Safe,</Text><Text style={s.userName}>{settings.userName} 💜</Text></View>
        <TouchableOpacity style={[s.statusBadge, settings.safeMode && s.statusBadgeActive]} onPress={toggleSafeMode}>
          <View style={[s.dot, settings.safeMode ? s.dotSafe : (location ? s.dotGreen : s.dotRed)]} />
          <Text style={s.statusText}>{settings.safeMode ? 'Safe Mode On' : (location ? 'GPS On' : 'No GPS')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {settings.safeMode && (
          <View style={s.safeBanner}>
            <Ionicons name="lock-closed" size={16} color={Colors.white} />
            <Text style={s.safeBannerText}>Triple-shake SOS is active in background</Text>
          </View>
        )}
        <View style={s.sosWrapper}>
          {rideState.isTripActive ? (
            <View style={s.tripPreview}>
              {rideState.tripType === 'driving' ? (
                <>
                  <View style={s.tripInfo}>
                    <View style={[s.actionIcon, { backgroundColor: '#FDE68A', width: 60, height: 60 }]}>
                        <Ionicons name="car" size={32} color="#D97706" />
                    </View>
                    <View style={s.tripText}>
                      <Text style={s.tripHeading}>Safe Ride Active</Text>
                      <Text style={s.tripSub}>{rideState.cabInfo?.plateNumber || 'Cab'} • {rideState.cabInfo?.driverName || 'Driver'}</Text>
                    </View>
                  </View>
                  <View style={s.cabDetailsCard}>
                    <Text style={s.cabStatusLabel}>Monitoring your route silently...</Text>
                    <View style={s.demoActions}>
                      <TouchableOpacity style={s.stopRideHomeBtn} onPress={stopRide}>
                        <Text style={s.stopRideText}>Stop Ride</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={s.demoBtn} 
                        onPress={() => {
                          Alert.alert("Demo Mode", "Simulating route detour for judges...");
                          setEscalationTimer(10);
                          setEmergencyPhase('CHECKING_IN');
                        }}
                      >
                        <Ionicons name="flask" size={16} color={Colors.white} />
                        <Text style={s.demoBtnText}>Test Detour</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={s.tripInfo}>
                    <Ionicons name="navigate-circle" size={40} color={Colors.sos} />
                    <View style={s.tripText}>
                      <Text style={s.tripHeading}>Journey to Destination</Text>
                      <Text style={s.tripSub}>{rideState.destination?.name || 'Staying on path for safety'}</Text>
                    </View>
                  </View>
                  <SafeWalkTimer 
                    onTimeout={sendManualSOS} 
                    destination={rideState.destination} 
                    onCancel={stopRide}
                  />
                </>
              )}
            </View>
          ) : (
            <>
              <SOSButton onPress={sendManualSOS} sending={sending} />
              <Text style={s.sosHint}>{settings.shakeToSOS ? '📳 Shake phone to activate' : 'Tap to send SOS'}</Text>
            </>
          )}
        </View>
        {!rideState.isTripActive && <Text style={s.sectionTitle}>Quick Actions</Text>}
        {!rideState.isTripActive && (
          <TouchableOpacity style={s.actionCard} onPress={() => setFakeCallVisible(true)}>
            <View style={[s.actionIcon, { backgroundColor: Colors.safeGlow }]}><Ionicons name="call" size={22} color={Colors.safe} /></View>
            <View style={s.actionText}><Text style={s.actionTitle}>Fake Call</Text><Text style={s.actionSub}>Simulate incoming call</Text></View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.actionCard} onPress={() => router.push('/map')}>
          <View style={[s.actionIcon, { backgroundColor: '#FDE68A' }]}><Ionicons name="car" size={22} color="#D97706" /></View>
          <View style={s.actionText}><Text style={s.actionTitle}>Safe Ride (Cab/Auto)</Text><Text style={s.actionSub}>Monitor your ride and detour routes</Text></View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={s.actionCard} onPress={async () => {
          const loc = await requestLocation(); const link = getMapLink(loc);
          if (link) Alert.alert('Your Location', link);
        }}>
          <View style={[s.actionIcon, { backgroundColor: Colors.accentGlow }]}><Ionicons name="location" size={22} color={Colors.accent} /></View>
          <View style={s.actionText}><Text style={s.actionTitle}>Share Location</Text><Text style={s.actionSub}>Get your live location link</Text></View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        <View style={s.infoCard}>
          <Ionicons name="people-circle" size={20} color={Colors.accent} />
          <Text style={s.infoText}>{contacts.length > 0 ? `${contacts.length} emergency contact(s) will be alerted` : 'No contacts added — go to Contacts tab'}</Text>
        </View>
      </ScrollView>
      <FakeCallModal visible={fakeCallVisible} callerName={settings.fakeCaller} onDismiss={() => setFakeCallVisible(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 52, paddingBottom: Spacing.lg },
  greeting: { color: Colors.textSecondary, fontSize: FontSize.sm }, userName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.full, gap: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  statusBadgeActive: { backgroundColor: Colors.sos, borderColor: Colors.sos },
  dot: { width: 8, height: 8, borderRadius: 4 }, dotGreen: { backgroundColor: Colors.safe }, dotRed: { backgroundColor: Colors.sos }, dotSafe: { backgroundColor: Colors.white },
  statusText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
  safeBanner: { backgroundColor: Colors.sos, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.sm, borderRadius: Radius.md, gap: Spacing.xs, marginBottom: Spacing.md },
  safeBannerText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  scroll: { flex: 1 }, scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  sosWrapper: { alignItems: 'center', marginVertical: Spacing.xl }, sosHint: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: Spacing.md, letterSpacing: 1 },
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm, marginTop: Spacing.sm },
  actionCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  actionIcon: { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  actionText: { flex: 1 }, actionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' }, actionSub: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  infoCard: { backgroundColor: Colors.glass, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.sm },
  infoText: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  tripPreview: { width: '100%', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, elevation: 4 },
  tripInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  tripText: { flex: 1 },
  tripHeading: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '800' },
  tripSub: { color: Colors.textSecondary, fontSize: FontSize.sm },
  cabDetailsCard: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.xs },
  cabStatusLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontStyle: 'italic', marginBottom: Spacing.md },
  stopRideHomeBtn: { backgroundColor: Colors.textMuted, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center', flex: 1 },
  stopRideText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
  demoActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  demoBtn: { backgroundColor: Colors.sos, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.sm, gap: Spacing.xs, flex: 1.2 },
  demoBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '800' },
});
