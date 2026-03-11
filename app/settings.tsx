import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { registerBackgroundSOS, unregisterBackgroundSOS } from '../utils/backgroundSOS';

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const [userName, setUserName] = useState(settings.userName);
  const [sosMessage, setSosMessage] = useState(settings.sosMessage);
  const [fakeCaller, setFakeCaller] = useState(settings.fakeCaller);

  const toggleSafeMode = async (v: boolean) => {
    if (v) await registerBackgroundSOS();
    else await unregisterBackgroundSOS();
    updateSettings({ safeMode: v });
  };

  return (
    <ScrollView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={s.header}><Text style={s.title}>Settings</Text></View>
      <View style={s.content}>
        <View style={s.group}>
          <Text style={s.gT}>Personal Info</Text>
          <View style={s.crd}>
            <Text style={s.cL}>Your Name</Text><TextInput style={s.input} value={userName} onChangeText={setUserName} onBlur={() => updateSettings({ userName })} placeholder="Your Full Name" placeholderTextColor={Colors.textMuted} />
          </View>
        </View>

        <View style={s.group}>
          <Text style={s.gT}>SOS Configuration</Text>
          <View style={[s.crd, s.rowCrd, { borderBottomWidth: 1, borderBottomColor: Colors.border, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <View style={s.rT}><Text style={s.cL2}>Safe Mode (Background Protection)</Text><Text style={s.cS2}>Keep SOS active when phone is locked</Text></View>
            <Switch value={settings.safeMode} onValueChange={toggleSafeMode} trackColor={{ false: Colors.surface, true: Colors.sos }} thumbColor={Colors.white} />
          </View>
          <View style={[s.crd, s.rowCrd, { borderBottomWidth: 1, borderBottomColor: Colors.border, borderRadius: 0 }]}>
            <View style={s.rT}><Text style={s.cL2}>Shake to SOS</Text><Text style={s.cS2}>Trigger SOS by shaking phone</Text></View>
            <Switch value={settings.shakeToSOS} onValueChange={(v) => updateSettings({ shakeToSOS: v })} trackColor={{ false: Colors.surface, true: Colors.safe }} thumbColor={Colors.white} />
          </View>
          <View style={[s.crd, { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
            <Text style={s.cL}>SOS Message Template</Text><Text style={s.cS}>Use {'{link}'} to include live location</Text>
            <TextInput style={[s.input, s.mA]} value={sosMessage} onChangeText={setSosMessage} onBlur={() => updateSettings({ sosMessage })} multiline numberOfLines={3} placeholder="Help me! {link}" placeholderTextColor={Colors.textMuted} />
          </View>
        </View>

        <View style={s.group}>
          <Text style={s.gT}>Fake Call Settings</Text>
          <View style={s.crd}>
            <Text style={s.cL}>Caller Name</Text><TextInput style={s.input} value={fakeCaller} onChangeText={setFakeCaller} onBlur={() => updateSettings({ fakeCaller })} placeholder="E.g. Mom, Dad, Boss" placeholderTextColor={Colors.textMuted} />
          </View>
        </View>

        <View style={s.group}>
          <Text style={s.gT}>Twilio SMS API (Silent SOS)</Text>
          <View style={[s.crd, s.rowCrd, { borderBottomWidth: 1, borderBottomColor: Colors.border, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <View style={s.rT}><Text style={s.cL2}>Account SID</Text></View>
            <TextInput style={[s.input, { flex: 2 }]} value={settings.twilioSid} onChangeText={(v) => updateSettings({ twilioSid: v })} placeholder="AC..." placeholderTextColor={Colors.textMuted} />
          </View>
          <View style={[s.crd, s.rowCrd, { borderBottomWidth: 1, borderBottomColor: Colors.border, borderRadius: 0 }]}>
            <View style={s.rT}><Text style={s.cL2}>Auth Token</Text></View>
            <TextInput style={[s.input, { flex: 2 }]} secureTextEntry value={settings.twilioToken} onChangeText={(v) => updateSettings({ twilioToken: v })} placeholder="Token" placeholderTextColor={Colors.textMuted} />
          </View>
          <View style={[s.crd, s.rowCrd, { borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
            <View style={s.rT}><Text style={s.cL2}>Twilio Number</Text></View>
            <TextInput style={[s.input, { flex: 2 }]} value={settings.twilioNumber} onChangeText={(v) => updateSettings({ twilioNumber: v })} keyboardType="phone-pad" placeholder="+1234567890" placeholderTextColor={Colors.textMuted} />
          </View>
        </View>

        <View style={s.f}>
          <Ionicons name="shield-checkmark" size={24} color={Colors.textMuted} /><Text style={s.fT}>WomenSafe App v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  content: { padding: Spacing.lg }, group: { marginBottom: Spacing.xl }, gT: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm, letterSpacing: 1, textTransform: 'uppercase' },
  crd: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  rowCrd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, rT: { flex: 1, paddingRight: Spacing.md },
  cL: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600', marginBottom: Spacing.sm }, cS: { color: Colors.textSecondary, fontSize: FontSize.xs, marginBottom: Spacing.md },
  cL2: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600', marginBottom: 2 }, cS2: { color: Colors.textSecondary, fontSize: FontSize.xs },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md }, mA: { height: 80, textAlignVertical: 'top' },
  f: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl, gap: Spacing.xs, opacity: 0.5 }, fT: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' }
});
