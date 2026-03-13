import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, Alert } from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { getDistance, ARRIVAL_THRESHOLD_METERS } from '../utils/arrivalMonitor';
import * as Location from 'expo-location';

export default function SafeWalkTimer({ 
  onTimeout, 
  destination,
  onCancel
}: { 
  onTimeout: () => void,
  destination?: { latitude: number, longitude: number } | null,
  onCancel?: () => void
}) {
  const [active, setActive] = useState(false);
  const [mins, setMins] = useState(15);
  const [secs, setSecs] = useState(0);
  const [pick, setPick] = useState(false);
  const intRef = useRef<any>(null);
  const prog = useRef(new Animated.Value(0)).current;
  const locSub = useRef<Location.LocationSubscription | null>(null);

  // Removed auto-open effect to allow previewing

  const start = () => {
    const t = mins * 60; setSecs(t); setActive(true); setPick(false);
    Animated.timing(prog, { toValue: 1, duration: t * 1000, useNativeDriver: false }).start();
  };
  const cancel = () => { 
    if (intRef.current) clearInterval(intRef.current); 
    setActive(false); 
    setSecs(0); 
    prog.stopAnimation(); 
    prog.setValue(0); 
    if (onCancel) onCancel();
  };

  useEffect(() => {
    if (active) {
      intRef.current = setInterval(() => {
        setSecs(s => { if (s <= 1) { clearInterval(intRef.current); setActive(false); onTimeout(); return 0; } return s - 1; });
      }, 1000);

      // If destination tracking is active
      if (destination) {
        startLocationTracking();
      }
    } else {
      stopLocationTracking();
    }
    return () => { if (intRef.current) clearInterval(intRef.current); stopLocationTracking(); };
  }, [active, destination?.latitude, destination?.longitude]);

  const startLocationTracking = async () => {
    locSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      (loc) => {
        if (destination) {
          const dist = getDistance(
            loc.coords.latitude, 
            loc.coords.longitude, 
            destination.latitude, 
            destination.longitude
          );
          if (dist < ARRIVAL_THRESHOLD_METERS) {
            cancel();
            Alert.alert("Safe Arrival!", "You've reached your destination. Safe Walk timer has been cancelled.");
          }
        }
      }
    );
  };

  const stopLocationTracking = () => {
    if (locSub.current) {
      locSub.current.remove();
      locSub.current = null;
    }
  };

  const fTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const bw = prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (active) return (
    <View style={s.activeCard}>
      <View style={s.row}><Text style={s.em}>⏱️</Text><View style={s.inf}><Text style={s.lbl}>Safe Walk Active</Text><Text style={s.cnt}>{fTime(secs)}</Text></View><TouchableOpacity style={s.btn} onPress={cancel}><Text style={s.btnTxt}>SAFE</Text></TouchableOpacity></View>
      <View style={s.trk}><Animated.View style={[s.bar, { width: bw }]} /></View>
    </View>
  );

  return (
    <>
      <TouchableOpacity style={s.card} onPress={() => setPick(true)}>
        <Text style={s.emCard}>⏱️</Text><View><Text style={s.title}>Safe Walk</Text><Text style={s.sub}>Auto-SOS if not cancelled</Text></View><Text style={s.arr}>›</Text>
      </TouchableOpacity>
      <Modal visible={pick} transparent animationType="slide">
        <View style={s.mod}><View style={s.modC}>
          <Text style={s.modT}>Set Walk Duration</Text>
          {[0.25, 5, 10, 15, 30, 60].map(m => (
            <TouchableOpacity 
              key={m} 
              style={[s.dBtn, mins===m && s.dBtnS]} 
              onPress={() => setMins(m)}
            >
              <Text style={[s.dTxt, mins===m && s.dTxtS]}>
                {m === 0.25 ? '15 seconds' : `${m} minutes`}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={s.sBtn} onPress={start}><Text style={s.sBtnTxt}>Start Timer</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setPick(false)} style={s.cBtn}><Text style={s.cBtnTxt}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, gap: Spacing.sm },
  emCard: { fontSize: 24 }, title: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' }, sub: { color: Colors.textSecondary, fontSize: FontSize.xs }, arr: { color: Colors.textMuted, fontSize: 22, marginLeft: 'auto' },
  activeCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.warning, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }, em: { fontSize: 24, marginRight: Spacing.sm }, inf: { flex: 1 }, lbl: { color: Colors.warning, fontSize: FontSize.sm, fontWeight: '600' }, cnt: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  btn: { backgroundColor: Colors.safe, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }, btnTxt: { color: Colors.white, fontWeight: '800', fontSize: FontSize.sm },
  trk: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' }, bar: { height: 4, backgroundColor: Colors.warning, borderRadius: 2 },
  mod: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }, modC: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl },
  modT: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.lg },
  dBtn: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm }, dBtnS: { backgroundColor: Colors.accentGlow, borderColor: Colors.accent },
  dTxt: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center' }, dTxtS: { color: Colors.text, fontWeight: '700' },
  sBtn: { backgroundColor: Colors.sos, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md }, sBtnTxt: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800' },
  cBtn: { padding: Spacing.md, alignItems: 'center' }, cBtnTxt: { color: Colors.textSecondary, fontSize: FontSize.md }
});
