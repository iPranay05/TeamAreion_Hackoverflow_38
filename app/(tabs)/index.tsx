import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import FakeCallModal from '../../components/FakeCallModal';
import { useLocation } from '../../hooks/useLocation';
import { useContacts } from '../../hooks/useContacts';
import { useSettings } from '../../context/SettingsContext';
import { router } from 'expo-router';
import { useSafeRide } from '../../context/SafeRideContext';

export default function HomeScreen() {
  const { location } = useLocation();
  const { contacts } = useContacts();
  const { settings } = useSettings();
  const { rideState } = useSafeRide();
  const [fakeCallVisible, setFakeCallVisible] = useState(false);


  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Welcome Header */}
      <View style={s.welcomeHeader}>
        <View>
          <Text style={s.welcomeText}>Welcome,</Text>
          <Text style={s.userName}>{settings.userName} 💜</Text>
        </View>
        <View style={[s.statusBadge, location && s.statusBadgeActive]}>
          <View style={[s.dot, location ? s.dotGreen : s.dotRed]} />
          <Text style={s.statusText}>{location ? 'Protected' : 'No GPS'}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Fake Call Card */}
        <TouchableOpacity style={s.fakeCallCard} onPress={() => setFakeCallVisible(true)}>
          <View style={s.fakeCallIcon}>
            <Ionicons name="call" size={28} color={Colors.safe} />
          </View>
          <View style={s.fakeCallContent}>
            <Text style={s.fakeCallTitle}>Fake Call</Text>
            <Text style={s.fakeCallSubtitle}>Simulate incoming call to escape uncomfortable situations</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* App Info Section */}
        <View style={s.appInfoSection}>
          <Text style={s.sectionTitle}>Quick Overview</Text>
          
          {/* Safe Travel Card */}
          <TouchableOpacity style={s.infoCard} onPress={() => router.push('/map')}>
            <View style={s.infoCardHeader}>
              <View style={[s.infoIcon, { backgroundColor: '#FDE68A' }]}>
                <Ionicons name="navigate" size={24} color="#D97706" />
              </View>
              <View style={s.infoCardContent}>
                <Text style={s.infoCardTitle}>Safe Travel</Text>
                <Text style={s.infoCardDesc}>
                  {rideState.isTripActive 
                    ? `Active ${rideState.tripType === 'driving' ? 'Ride' : 'Walk'} in progress`
                    : 'Monitor your journey with route tracking'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={Colors.accent} />
            </View>
            {rideState.isTripActive && (
              <View style={s.activeIndicator}>
                <View style={s.activeDot} />
                <Text style={s.activeText}>Currently Active</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Emergency Contacts Card */}
          <TouchableOpacity style={s.infoCard} onPress={() => router.push('/(tabs)/contacts')}>
            <View style={s.infoCardHeader}>
              <View style={[s.infoIcon, { backgroundColor: Colors.accentGlow }]}>
                <Ionicons name="people" size={24} color={Colors.accent} />
              </View>
              <View style={s.infoCardContent}>
                <Text style={s.infoCardTitle}>Emergency Contacts</Text>
                <Text style={s.infoCardDesc}>
                  {contacts.length > 0 
                    ? `${contacts.length} contact(s) will be alerted during SOS`
                    : 'Add trusted contacts for emergencies'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={Colors.accent} />
            </View>
          </TouchableOpacity>

          {/* Community Card */}
          <TouchableOpacity style={s.infoCard} onPress={() => router.push('/(tabs)/community')}>
            <View style={s.infoCardHeader}>
              <View style={[s.infoIcon, { backgroundColor: Colors.sosGlow }]}>
                <Ionicons name="people-circle" size={24} color={Colors.sos} />
              </View>
              <View style={s.infoCardContent}>
                <Text style={s.infoCardTitle}>Community</Text>
                <Text style={s.infoCardDesc}>Share experiences and report incidents</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={Colors.accent} />
            </View>
          </TouchableOpacity>

          {/* Safety Map Card */}
          <TouchableOpacity style={s.infoCard} onPress={() => router.push('/(tabs)/map')}>
            <View style={s.infoCardHeader}>
              <View style={[s.infoIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="map" size={24} color="#3B82F6" />
              </View>
              <View style={s.infoCardContent}>
                <Text style={s.infoCardTitle}>Safety Map</Text>
                <Text style={s.infoCardDesc}>View unsafe areas and plan safe routes</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={Colors.accent} />
            </View>
          </TouchableOpacity>

          {/* Helplines Card */}
          <View style={s.helplinesCard}>
            <View style={s.helplinesHeader}>
              <Ionicons name="call" size={20} color={Colors.sos} />
              <Text style={s.helplinesTitle}>Emergency Helplines</Text>
            </View>
            <View style={s.helplinesList}>
              <View style={s.helplineItem}>
                <Text style={s.helplineNumber}>112</Text>
                <Text style={s.helplineName}>National Emergency</Text>
              </View>
              <View style={s.helplineItem}>
                <Text style={s.helplineNumber}>1091</Text>
                <Text style={s.helplineName}>Women Helpline</Text>
              </View>
              <View style={s.helplineItem}>
                <Text style={s.helplineNumber}>100</Text>
                <Text style={s.helplineName}>Police</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Safety Tips */}
        <View style={s.tipsCard}>
          <View style={s.tipsHeader}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
            <Text style={s.tipsTitle}>Safety Tip</Text>
          </View>
          <Text style={s.tipsText}>
            Always share your live location with trusted contacts when traveling alone, especially at night.
          </Text>
        </View>
      </ScrollView>

      <FakeCallModal 
        visible={fakeCallVisible} 
        callerName={settings.fakeCaller} 
        onDismiss={() => setFakeCallVisible(false)} 
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  welcomeHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: Spacing.lg, 
    paddingTop: 60, 
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  welcomeText: { 
    color: Colors.textSecondary, 
    fontSize: FontSize.md,
    fontWeight: '600'
  },
  userName: { 
    color: Colors.text, 
    fontSize: FontSize.xxl, 
    fontWeight: '900',
    marginTop: 4
  },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.card, 
    paddingHorizontal: Spacing.md, 
    paddingVertical: Spacing.sm, 
    borderRadius: Radius.full, 
    gap: Spacing.xs, 
    borderWidth: 1, 
    borderColor: Colors.border 
  },
  statusBadgeActive: { 
    backgroundColor: Colors.safeGlow, 
    borderColor: Colors.safe 
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: Colors.safe },
  dotRed: { backgroundColor: Colors.sos },
  statusText: { 
    color: Colors.textSecondary, 
    fontSize: FontSize.xs, 
    fontWeight: '700' 
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxl },
  
  fakeCallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  fakeCallIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.safeGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md
  },
  fakeCallContent: { flex: 1 },
  fakeCallTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: 4
  },
  fakeCallSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    lineHeight: 18
  },
  
  appInfoSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.md
  },
  infoCard: {
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md
  },
  infoCardContent: { flex: 1 },
  infoCardTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 4
  },
  infoCardDesc: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    lineHeight: 18
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.safe,
    marginRight: Spacing.xs
  },
  activeText: {
    color: Colors.safe,
    fontSize: FontSize.xs,
    fontWeight: '700'
  },
  
  helplinesCard: {
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm
  },
  helplinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs
  },
  helplinesTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700'
  },
  helplinesList: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  helplineItem: {
    alignItems: 'center'
  },
  helplineNumber: {
    color: Colors.sos,
    fontSize: FontSize.lg,
    fontWeight: '900',
    marginBottom: 4
  },
  helplineName: {
    color: Colors.textSecondary,
    fontSize: 10,
    textAlign: 'center'
  },
  
  tipsCard: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs
  },
  tipsTitle: {
    color: '#92400E',
    fontSize: FontSize.sm,
    fontWeight: '800'
  },
  tipsText: {
    color: '#78350F',
    fontSize: FontSize.xs,
    lineHeight: 18
  }
});
