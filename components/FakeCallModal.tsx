import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Vibration, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';

export default function FakeCallModal({ visible, callerName, onDismiss }: { visible: boolean; callerName: string; onDismiss: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (visible) {
      Vibration.vibrate([1000, 500, 1000, 500, 1000], true);
      Animated.loop(Animated.sequence([ Animated.timing(pulse, { toValue: 1.1, duration: 600, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }) ])).start();
    } else { Vibration.cancel(); pulse.stopAnimation(); }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={s.c}><View style={s.bg} /><View style={s.cont}>
        <Text style={s.inc}>Incoming Call</Text>
        <Animated.View style={[s.ar, { transform: [{ scale: pulse }] }]}><View style={s.av}><Ionicons name="person" size={60} color={Colors.text} /></View></Animated.View>
        <Text style={s.cN}>{callerName}</Text><Text style={s.cS}>Mobile • +91 ••••••••••</Text>
        <View style={s.act}>
          <View style={s.aC}><TouchableOpacity style={[s.aB, s.dB]} onPress={onDismiss}><Ionicons name="call" size={30} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} /></TouchableOpacity><Text style={s.aL}>Decline</Text></View>
          <View style={s.aC}><TouchableOpacity style={[s.aB, s.aA]} onPress={onDismiss}><Ionicons name="call" size={30} color={Colors.white} /></TouchableOpacity><Text style={s.aL}>Accept</Text></View>
        </View>
      </View></View>
    </Modal>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }, bg: { position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.95)' },
  cont: { alignItems: 'center', paddingHorizontal: Spacing.xl }, inc: { color: Colors.textSecondary, fontSize: FontSize.md, letterSpacing: 2, marginBottom: Spacing.xl, textTransform: 'uppercase' },
  ar: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: Colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, shadowColor: Colors.accent, shadowOpacity: 0.5, shadowRadius: 20 },
  av: { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  cN: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.xs }, cS: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.xxl * 2 },
  act: { flexDirection: 'row', gap: Spacing.xxl * 2 }, aC: { alignItems: 'center', gap: Spacing.sm },
  aB: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  aA: { backgroundColor: Colors.safe, shadowColor: Colors.safe }, dB: { backgroundColor: Colors.sos, shadowColor: Colors.sos }, aL: { color: Colors.textSecondary, fontSize: FontSize.sm }
});
