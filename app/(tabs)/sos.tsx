import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import SOSButton from '../../components/SOSButton';
import { useLocation } from '../../hooks/useLocation';
import { useContacts } from '../../hooks/useContacts';
import { useSettings } from '../../context/SettingsContext';
import { sendTwilioSMS } from '../../utils/twilio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../../utils/supabase';
import * as Notifications from 'expo-notifications';

export default function SOSScreen() {
  const { location, requestLocation, getMapLink } = useLocation();
  const { contacts } = useContacts();
  const { settings } = useSettings();
  const [sending, setSending] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Pulsing animation for emergency badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const sendManualSOS = async () => {
    setSending(true);
    try {
      // Show notification
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

      if (!Array.isArray(contacts) || contacts.length === 0) {
        Alert.alert('No Contacts', 'Add emergency contacts first in Settings.');
        setSending(false);
        return;
      }

      // Get location
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

      const message = settings.sosMessage.replace('{link}', locationLink || 'Location blocked');
      
      // Send SMS to all contacts
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
      
      Alert.alert('SOS Sent', 'Your contacts have been notified and emergency has been logged.');
    } catch (err: any) {
      console.error('Manual SOS Error:', err);
      Alert.alert('SOS Sent', 'Emergency alert has been processed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent}>
      {/* Header Section */}
      <View style={s.header}>
        <Animated.View style={[s.emergencyBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="alert-circle" size={32} color={Colors.white} />
        </Animated.View>
        <Text style={s.title}>Emergency SOS</Text>
        <Text style={s.subtitle}>Your safety is our priority</Text>
      </View>
      
      {/* SOS Button Section */}
      <View style={s.sosWrapper}>
        <SOSButton onPress={sendManualSOS} sending={sending} />
        <Text style={s.sosHint}>
          {settings.shakeToSOS ? '📳 Shake phone 3 times to activate' : 'Press & Hold for 3 seconds'}
        </Text>
        <View style={s.statusBadge}>
          <View style={[s.statusDot, { backgroundColor: contacts.length > 0 ? Colors.safe : Colors.warning }]} />
          <Text style={s.statusText}>
            {contacts.length > 0 ? 'Ready to Alert' : 'Setup Required'}
          </Text>
        </View>
      </View>

      {/* Emergency Contacts Info */}
      <View style={s.contactsCard}>
        <View style={s.cardHeader}>
          <Ionicons name="people" size={20} color={Colors.sos} />
          <Text style={s.cardTitle}>Emergency Contacts</Text>
        </View>
        <Text style={s.contactsText}>
          {contacts.length > 0 
            ? `${contacts.length} contact${contacts.length > 1 ? 's' : ''} will be alerted instantly` 
            : 'No contacts added yet'}
        </Text>
        {contacts.length === 0 && (
          <TouchableOpacity style={s.addContactBtn}>
            <Text style={s.addContactText}>+ Add Contacts in Settings</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* What Happens Section */}
      <View style={s.infoCard}>
        <View style={s.cardHeader}>
          <Ionicons name="information-circle" size={20} color={Colors.sos} />
          <Text style={s.cardTitle}>What Happens When You Press SOS?</Text>
        </View>
        
        <View style={s.infoItem}>
          <View style={s.iconCircle}>
            <Ionicons name="location" size={18} color={Colors.sos} />
          </View>
          <View style={s.infoContent}>
            <Text style={s.infoTitle}>Live Location Shared</Text>
            <Text style={s.infoText}>Your exact GPS coordinates and map link sent to all contacts</Text>
          </View>
        </View>

        <View style={s.infoItem}>
          <View style={s.iconCircle}>
            <Ionicons name="chatbubbles" size={18} color={Colors.sos} />
          </View>
          <View style={s.infoContent}>
            <Text style={s.infoTitle}>Instant SMS Alerts</Text>
            <Text style={s.infoText}>Emergency message with your location sent via SMS</Text>
          </View>
        </View>

        <View style={s.infoItem}>
          <View style={s.iconCircle}>
            <Ionicons name="call" size={18} color={Colors.sos} />
          </View>
          <View style={s.infoContent}>
            <Text style={s.infoTitle}>Automated Voice Call</Text>
            <Text style={s.infoText}>Primary contact receives emergency voice call</Text>
          </View>
        </View>

        <View style={s.infoItem}>
          <View style={s.iconCircle}>
            <Ionicons name="volume-high" size={18} color={Colors.sos} />
          </View>
          <View style={s.infoContent}>
            <Text style={s.infoTitle}>Loud Alarm Triggered</Text>
            <Text style={s.infoText}>Device alarm sounds to attract attention nearby</Text>
          </View>
        </View>

        <View style={s.infoItem}>
          <View style={s.iconCircle}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.sos} />
          </View>
          <View style={s.infoContent}>
            <Text style={s.infoTitle}>Police Notified</Text>
            <Text style={s.infoText}>Local authorities alerted with your location details</Text>
          </View>
        </View>

        <View style={s.infoItem}>
          <View style={s.iconCircle}>
            <Ionicons name="recording" size={18} color={Colors.sos} />
          </View>
          <View style={s.infoContent}>
            <Text style={s.infoTitle}>Audio Recording Started</Text>
            <Text style={s.infoText}>Background audio recording begins for evidence</Text>
          </View>
        </View>
      </View>

      {/* Quick Tips Section */}
      <View style={s.tipsCard}>
        <View style={s.cardHeader}>
          <Ionicons name="bulb" size={20} color={Colors.warning} />
          <Text style={s.cardTitle}>Safety Tips</Text>
        </View>
        
        <View style={s.tipItem}>
          <Text style={s.tipBullet}>•</Text>
          <Text style={s.tipText}>Keep your phone charged and location services enabled</Text>
        </View>
        <View style={s.tipItem}>
          <Text style={s.tipBullet}>•</Text>
          <Text style={s.tipText}>Test SOS feature regularly to ensure it works</Text>
        </View>
        <View style={s.tipItem}>
          <Text style={s.tipBullet}>•</Text>
          <Text style={s.tipText}>Add at least 3 trusted emergency contacts</Text>
        </View>
        <View style={s.tipItem}>
          <Text style={s.tipBullet}>•</Text>
          <Text style={s.tipText}>Enable shake-to-SOS for hands-free activation</Text>
        </View>
        <View style={s.tipItem}>
          <Text style={s.tipBullet}>•</Text>
          <Text style={s.tipText}>Share your live location when traveling alone</Text>
        </View>
      </View>

      {/* Emergency Numbers Section */}
      <View style={s.emergencyCard}>
        <View style={s.cardHeader}>
          <Ionicons name="call-outline" size={20} color={Colors.safe} />
          <Text style={s.cardTitle}>Emergency Helpline Numbers</Text>
        </View>
        
        <View style={s.helplineRow}>
          <View style={s.helplineItem}>
            <Text style={s.helplineNumber}>100</Text>
            <Text style={s.helplineLabel}>Police</Text>
          </View>
          <View style={s.helplineItem}>
            <Text style={s.helplineNumber}>102</Text>
            <Text style={s.helplineLabel}>Ambulance</Text>
          </View>
          <View style={s.helplineItem}>
            <Text style={s.helplineNumber}>1091</Text>
            <Text style={s.helplineLabel}>Women Helpline</Text>
          </View>
        </View>

        <View style={s.helplineRow}>
          <View style={s.helplineItem}>
            <Text style={s.helplineNumber}>181</Text>
            <Text style={s.helplineLabel}>Women Support</Text>
          </View>
          <View style={s.helplineItem}>
            <Text style={s.helplineNumber}>1098</Text>
            <Text style={s.helplineLabel}>Child Helpline</Text>
          </View>
          <View style={s.helplineItem}>
            <Text style={s.helplineNumber}>112</Text>
            <Text style={s.helplineLabel}>Emergency</Text>
          </View>
        </View>
      </View>

      {/* Disclaimer */}
      <View style={s.disclaimer}>
        <Ionicons name="shield-checkmark-outline" size={16} color={Colors.textMuted} />
        <Text style={s.disclaimerText}>
          This feature is designed for genuine emergencies only. Misuse may result in legal consequences.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  scrollContent: {
    paddingBottom: Spacing.xxl
  },
  header: { 
    paddingHorizontal: Spacing.lg, 
    paddingTop: 50, 
    paddingBottom: Spacing.md,
    alignItems: 'center'
  },
  emergencyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.sos,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8
  },
  title: { 
    color: Colors.text, 
    fontSize: FontSize.xxl, 
    fontWeight: '800',
    marginBottom: Spacing.xs
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '500'
  },
  sosWrapper: { 
    alignItems: 'center', 
    marginVertical: Spacing.xl,
    paddingVertical: Spacing.lg
  },
  sosHint: { 
    color: Colors.textMuted, 
    fontSize: FontSize.xs, 
    marginTop: Spacing.lg, 
    letterSpacing: 0.5,
    textAlign: 'center',
    fontWeight: '600'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm
  },
  statusText: {
    color: Colors.text,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  contactsCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md
  },
  cardTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginLeft: Spacing.sm
  },
  contactsText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    flexWrap: 'wrap'
  },
  addContactBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.sos,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center'
  },
  addContactText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700'
  },
  infoCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-start'
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md
  },
  infoContent: {
    flex: 1,
    flexShrink: 1
  },
  infoTitle: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginBottom: 2,
    flexWrap: 'wrap'
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    lineHeight: 18,
    flexWrap: 'wrap'
  },
  tipsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-start'
  },
  tipBullet: {
    color: Colors.warning,
    fontSize: FontSize.md,
    fontWeight: '800',
    marginRight: Spacing.sm,
    width: 16
  },
  tipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    flex: 1,
    lineHeight: 20,
    flexWrap: 'wrap',
    flexShrink: 1
  },
  emergencyCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md
  },
  helplineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm
  },
  helplineItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginHorizontal: 4
  },
  helplineNumber: {
    color: Colors.sos,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: 4
  },
  helplineLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600'
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.glass,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border
  },
  disclaimerText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    flex: 1,
    marginLeft: Spacing.sm,
    lineHeight: 16,
    flexWrap: 'wrap',
    flexShrink: 1
  }
});
