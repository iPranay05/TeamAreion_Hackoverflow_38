import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import { Colors, FontSize } from '../constants/theme';

export default function SOSButton({ onPress, sending = false, style }: { onPress: () => void, sending?: boolean, style?: ViewStyle }) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const p1Op = useRef(new Animated.Value(0.7)).current;
  const p2Op = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const cp = (anim: Animated.Value, op: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim, { toValue: 1.8, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration: 1500, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(anim, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0.7, duration: 0, useNativeDriver: true })
        ])
      ]));
    const a1 = cp(pulse1, p1Op, 0); const a2 = cp(pulse2, p2Op, 750);
    a1.start(); a2.start();
    return () => { a1.stop(); a2.stop(); };
  }, []);

  return (
    <View style={[styles.wrapper, style]}>
      <Animated.View style={[styles.ring, { transform: [{ scale: pulse1 }], opacity: p1Op }]} />
      <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: pulse2 }], opacity: p2Op }]} />
      <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.85} disabled={sending}>
        <Text style={styles.label}>{sending ? 'SENDING...' : 'SOS'}</Text>
        <Text style={styles.sub}>{sending ? 'Alerting contacts' : 'Hold for help'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const SIZE = 180;
const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', width: SIZE*2, height: SIZE*2 },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE/2, backgroundColor: Colors.sosGlow },
  ring2: { backgroundColor: 'rgba(236,72,153,0.2)' },
  button: { width: SIZE, height: SIZE, borderRadius: SIZE/2, backgroundColor: Colors.sos, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.sos, shadowOpacity: 0.8, shadowRadius: 30, elevation: 20 },
  label: { color: Colors.white, fontSize: FontSize.xxxl, fontWeight: '900', letterSpacing: 4 },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginTop: 4, letterSpacing: 1 },
});
