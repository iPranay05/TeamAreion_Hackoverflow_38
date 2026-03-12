import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { useSettings } from '../../context/SettingsContext';
import { useLocation } from '../../hooks/useLocation';
import { useContacts } from '../../hooks/useContacts';
import { registerBackgroundSOS, unregisterBackgroundSOS } from '../../utils/backgroundSOS';
import { supabase } from '../../utils/supabase';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { injectSimulatedSOS } from '../../utils/bluetoothSOS';

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const { location, loading: locationLoading, getMapLink } = useLocation();
  const { contacts } = useContacts();
  const [userName, setUserName] = useState(settings.userName);
  const [username, setUsername] = useState(settings.username);
  const [sosMessage, setSosMessage] = useState(settings.sosMessage);
  const [fakeCaller, setFakeCaller] = useState(settings.fakeCaller);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setUserProfile(data);
          const dbUsername = data.username || user.email?.split('@')[0] || settings.username;
          setUsername(dbUsername);
          setUserName(data.full_name || settings.userName);
          
          // Sync to settings if different
          if (dbUsername !== settings.username) {
            updateSettings({ username: dbUsername });
          }
        }
      }
    } catch (e) {
      console.error('Profile fetch error:', e);
    } finally {
      setLoadingProfile(false);
    }
  };

  const toggleSafeMode = async (v: boolean) => {
    if (v) await registerBackgroundSOS();
    else await unregisterBackgroundSOS();
    updateSettings({ safeMode: v });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) console.error('Logout error:', error);
          }
        }
      ]
    );
  };

  const toggleGuardianMode = async (v: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('profiles').update({ is_guardian: v }).eq('id', user.id);
        if (error) throw error;
        updateSettings({ joinSafetyNetwork: v });
        if (v) {
          Alert.alert('Guardian Activated', 'Thank you for joining the safety network! You may receive alerts when someone nearby needs help.');
        }
      }
    } catch (e) {
      console.error('Guardian toggle error:', e);
      Alert.alert('Error', 'Failed to update guardian status.');
    }
  };

  const shareLocation = () => {
    if (location) {
      const link = getMapLink(location);
      if (link) {
        Alert.alert('Your Live Location', link, [
          { text: 'OK' }
        ]);
      }
    } else {
      Alert.alert('Location Unavailable', 'Please enable GPS to share your location.');
    }
  };

  const simulateOfflineSOS = async () => {
    injectSimulatedSOS('Guardian Test (Settings)');
    Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 NEARBY OFFLINE SOS DETECTED!",
        body: `A help signal was found via Bluetooth from Guardian Test very close to you.`,
        data: { type: 'BLE_SOS', name: 'Guardian Test', rssi: -42 },
        sound: 'alert.wav',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
    Alert.alert("Test Active", "Look for the simulation overlay on your screen!");
  };

  return (
    <ScrollView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
      </View>
      
      <View style={s.content}>
        {/* User Profile Section */}
        <View style={s.group}>
          <Text style={s.gT}>User Profile</Text>
          {loadingProfile ? (
            <View style={s.crd}>
              <ActivityIndicator color={Colors.accent} />
            </View>
          ) : (
            <>
              <View style={s.profileCard}>
                <View style={s.profileAvatar}>
                  <Ionicons name="person" size={32} color={Colors.text} />
                </View>
                <View style={s.profileInfo}>
                  <Text style={s.profileName}>{userProfile?.full_name || userName}</Text>
                  <Text style={s.profileEmail}>{userProfile?.email || 'No email'}</Text>
                  {userProfile?.phone_number && (
                    <Text style={s.profilePhone}>📱 {userProfile.phone_number}</Text>
                  )}
                </View>
              </View>
              <View style={s.crd}>
                <Text style={s.cL}>Username</Text>
                <TextInput 
                  style={s.input} 
                  value={username} 
                  onChangeText={setUsername} 
                  onBlur={async () => {
                    updateSettings({ username });
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await supabase.from('profiles').update({ username }).eq('id', user.id);
                    }
                  }} 
                  placeholder="username" 
                  placeholderTextColor={Colors.textMuted} 
                  autoCapitalize="none"
                />
              </View>
              <View style={s.crd}>
                <Text style={s.cL}>Full Name</Text>
                <TextInput 
                  style={s.input} 
                  value={userName} 
                  onChangeText={setUserName} 
                  onBlur={async () => {
                    updateSettings({ userName });
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await supabase.from('profiles').update({ full_name: userName }).eq('id', user.id);
                    }
                  }} 
                  placeholder="Your Full Name" 
                  placeholderTextColor={Colors.textMuted} 
                />
              </View>
            </>
          )}
        </View>

        {/* Live Location Section */}
        <View style={s.group}>
          <Text style={s.gT}>Live Location</Text>
          <View style={s.locationCard}>
            <View style={s.locationHeader}>
              <Ionicons name="location" size={24} color={Colors.accent} />
              <Text style={s.locationTitle}>Current GPS Status</Text>
            </View>
            {locationLoading ? (
              <View style={s.locationLoading}>
                <ActivityIndicator color={Colors.accent} />
                <Text style={s.locationLoadingText}>Getting location...</Text>
              </View>
            ) : location ? (
              <>
                <View style={s.coordsRow}>
                  <View style={s.coordItem}>
                    <Text style={s.coordLabel}>LAT</Text>
                    <Text style={s.coordValue}>{location.latitude.toFixed(5)}</Text>
                  </View>
                  <View style={s.coordItem}>
                    <Text style={s.coordLabel}>LNG</Text>
                    <Text style={s.coordValue}>{location.longitude.toFixed(5)}</Text>
                  </View>
                  <View style={s.coordItem}>
                    <Text style={s.coordLabel}>ACC</Text>
                    <Text style={s.coordValue}>±{Math.round(location.accuracy || 0)}m</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.shareLocationBtn} onPress={shareLocation}>
                  <Ionicons name="share-outline" size={18} color={Colors.white} />
                  <Text style={s.shareLocationText}>Share Live Location</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={s.locationError}>Location unavailable. Enable GPS in device settings.</Text>
            )}
          </View>
        </View>

        {/* Emergency Contacts Quick Access */}
        <View style={s.group}>
          <Text style={s.gT}>Emergency Contacts</Text>
          <TouchableOpacity style={s.contactsCard} onPress={() => router.push('/(tabs)/contacts')}>
            <View style={s.contactsInfo}>
              <Ionicons name="people" size={24} color={Colors.accent} />
              <View style={s.contactsText}>
                <Text style={s.contactsCount}>{contacts.length} Contact(s)</Text>
                <Text style={s.contactsSub}>Manage your emergency contacts</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Citizen Guardian Network */}
        <View style={s.group}>
          <Text style={s.gT}>Citizen Guardian Network 🏘️</Text>
          <View style={[s.crd, s.rowCrd]}>
            <View style={s.rT}>
              <Text style={s.cL2}>Join Safety Network</Text>
              <Text style={s.cS2}>Volunteer to receive alerts and help others nearby in emergencies</Text>
            </View>
            <Switch 
              value={settings.joinSafetyNetwork} 
              onValueChange={toggleGuardianMode} 
              trackColor={{ false: Colors.surface, true: Colors.accent }} 
              thumbColor={Colors.white} 
            />
          </View>
          <TouchableOpacity style={s.simLink} onPress={simulateOfflineSOS}>
            <Ionicons name="flask" size={16} color={Colors.accent} />
            <Text style={s.simLinkText}>Test Bluetooth Detection Overlay</Text>
          </TouchableOpacity>
        </View>

        {/* SOS Configuration */}
        <View style={s.group}>
          <Text style={s.gT}>SOS Configuration</Text>
          <View style={[s.crd, s.rowCrd, { borderBottomWidth: 1, borderBottomColor: Colors.border, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <View style={s.rT}>
              <Text style={s.cL2}>Safe Mode (Background Protection)</Text>
              <Text style={s.cS2}>Keep SOS active when phone is locked</Text>
            </View>
            <Switch 
              value={settings.safeMode} 
              onValueChange={toggleSafeMode} 
              trackColor={{ false: Colors.surface, true: Colors.sos }} 
              thumbColor={Colors.white} 
            />
          </View>
          <View style={[s.crd, s.rowCrd, { borderBottomWidth: 1, borderBottomColor: Colors.border, borderRadius: 0 }]}>
            <View style={s.rT}>
              <Text style={s.cL2}>Shake to SOS</Text>
              <Text style={s.cS2}>Trigger SOS by shaking phone 3 times</Text>
            </View>
            <Switch 
              value={settings.shakeToSOS} 
              onValueChange={(v) => updateSettings({ shakeToSOS: v })} 
              trackColor={{ false: Colors.surface, true: Colors.safe }} 
              thumbColor={Colors.white} 
            />
          </View>
          <View style={[s.crd, { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
            <Text style={s.cL}>SOS Message Template</Text>
            <Text style={s.cS}>Use {'{link}'} to include live location</Text>
            <TextInput 
              style={[s.input, s.mA]} 
              value={sosMessage} 
              onChangeText={setSosMessage} 
              onBlur={() => updateSettings({ sosMessage })} 
              multiline 
              numberOfLines={3} 
              placeholder="Help me! {link}" 
              placeholderTextColor={Colors.textMuted} 
            />
          </View>
        </View>

        {/* Fake Call Settings */}
        <View style={s.group}>
          <Text style={s.gT}>Fake Call Settings</Text>
          <View style={s.crd}>
            <Text style={s.cL}>Caller Name</Text>
            <TextInput 
              style={s.input} 
              value={fakeCaller} 
              onChangeText={setFakeCaller} 
              onBlur={() => updateSettings({ fakeCaller })} 
              placeholder="E.g. Mom, Dad, Boss" 
              placeholderTextColor={Colors.textMuted} 
            />
          </View>
        </View>

        {/* Twilio Configuration */}
        <View style={s.group}>
          <Text style={s.gT}>Twilio SMS API (Silent SOS)</Text>
          <View style={[s.crd, s.rowCrd, { borderBottomWidth: 1, borderBottomColor: Colors.border, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <View style={s.rT}><Text style={s.cL2}>Account SID</Text></View>
            <TextInput 
              style={[s.input, { flex: 2 }]} 
              value={settings.twilioSid} 
              onChangeText={(v) => updateSettings({ twilioSid: v })} 
              placeholder="AC..." 
              placeholderTextColor={Colors.textMuted} 
            />
          </View>
          <View style={[s.crd, s.rowCrd, { borderBottomWidth: 1, borderBottomColor: Colors.border, borderRadius: 0 }]}>
            <View style={s.rT}><Text style={s.cL2}>Auth Token</Text></View>
            <TextInput 
              style={[s.input, { flex: 2 }]} 
              secureTextEntry 
              value={settings.twilioToken} 
              onChangeText={(v) => updateSettings({ twilioToken: v })} 
              placeholder="Token" 
              placeholderTextColor={Colors.textMuted} 
            />
          </View>
          <View style={[s.crd, s.rowCrd, { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
            <View style={s.rT}><Text style={s.cL2}>Twilio Number</Text></View>
            <TextInput 
              style={[s.input, { flex: 2 }]} 
              value={settings.twilioNumber} 
              onChangeText={(v) => updateSettings({ twilioNumber: v })} 
              keyboardType="phone-pad" 
              placeholder="+1234567890" 
              placeholderTextColor={Colors.textMuted} 
            />
          </View>
        </View>

        {/* Logout */}
        <View style={s.group}>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.white} />
            <Text style={s.logoutText}>Sign Out of SafeStree</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={s.f}>
          <Ionicons name="shield-checkmark" size={24} color={Colors.textMuted} />
          <Text style={s.fT}>WomenSafe App v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    paddingHorizontal: Spacing.lg, 
    paddingTop: 60, 
    paddingBottom: Spacing.md, 
    backgroundColor: Colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border 
  },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  content: { padding: Spacing.lg },
  group: { marginBottom: Spacing.xl },
  gT: { 
    color: Colors.textSecondary, 
    fontSize: FontSize.md, 
    fontWeight: '700', 
    marginBottom: Spacing.sm, 
    letterSpacing: 1, 
    textTransform: 'uppercase' 
  },
  
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md
  },
  profileInfo: { flex: 1 },
  profileName: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: 4
  },
  profileEmail: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: 2
  },
  profilePhone: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm
  },
  
  locationCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm
  },
  locationTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700'
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md
  },
  locationLoadingText: {
    color: Colors.textSecondary,
    marginLeft: Spacing.sm
  },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md
  },
  coordItem: { alignItems: 'center' },
  coordLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4
  },
  coordValue: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600'
  },
  locationError: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.md
  },
  shareLocationBtn: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: Radius.sm,
    gap: Spacing.xs
  },
  shareLocationText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700'
  },
  
  contactsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border
  },
  contactsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md
  },
  contactsText: { flex: 1 },
  contactsCount: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 2
  },
  contactsSub: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs
  },
  
  crd: { 
    backgroundColor: Colors.card, 
    borderRadius: Radius.md, 
    padding: Spacing.md, 
    borderWidth: 1, 
    borderColor: Colors.border 
  },
  rowCrd: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  rT: { flex: 1, paddingRight: Spacing.md },
  cL: { 
    color: Colors.text, 
    fontSize: FontSize.md, 
    fontWeight: '600', 
    marginBottom: Spacing.sm 
  },
  cS: { 
    color: Colors.textSecondary, 
    fontSize: FontSize.xs, 
    marginBottom: Spacing.md 
  },
  cL2: { 
    color: Colors.text, 
    fontSize: FontSize.md, 
    fontWeight: '600', 
    marginBottom: 2 
  },
  cS2: { 
    color: Colors.textSecondary, 
    fontSize: FontSize.xs 
  },
  input: { 
    backgroundColor: Colors.background, 
    borderWidth: 1, 
    borderColor: Colors.border, 
    borderRadius: Radius.sm, 
    padding: Spacing.md, 
    color: Colors.text, 
    fontSize: FontSize.md 
  },
  mA: { height: 80, textAlignVertical: 'top' },
  
  logoutBtn: { 
    backgroundColor: Colors.sos, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: Spacing.lg, 
    borderRadius: Radius.md, 
    marginTop: Spacing.md,
    gap: Spacing.sm
  },
  logoutText: { 
    color: Colors.white, 
    fontSize: FontSize.md, 
    fontWeight: '800' 
  },
  
  f: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: Spacing.xxl, 
    gap: Spacing.xs, 
    opacity: 0.5 
  },
  fT: { 
    color: Colors.textMuted, 
    fontSize: FontSize.sm, 
    fontWeight: '600' 
  },
  simLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  simLinkText: {
    color: Colors.accent,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
