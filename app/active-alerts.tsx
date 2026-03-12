import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import * as Notifications from 'expo-notifications';
import { supabase } from '../utils/supabase';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { getNearbyBluetoothSignals, BluetoothSignal, estimateDistance } from '../utils/bluetoothSOS';
import { Animated, Easing } from 'react-native';

interface EmergencyAlert {
  id: string;
  user_name: string;
  latitude: number;
  longitude: number;
  created_at: string;
  distance?: number;
}

export default function ActiveAlertsScreen() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nearbySignals, setNearbySignals] = useState<BluetoothSignal[]>([]);
  const radarAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAlerts();
    startRadarAnimation();
    
    // Poll for nearby bluetooth signals every 3 seconds for the "Radar" feel
    const interval = setInterval(async () => {
      const signals = await getNearbyBluetoothSignals();
      setNearbySignals(signals);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const startRadarAnimation = () => {
    Animated.loop(
      Animated.timing(radarAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    ).start();
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let currentLoc = null;
        if (status === 'granted') {
          currentLoc = await Location.getCurrentPositionAsync({});
        }

        const enrichedAlerts = data.map((alert: any) => {
          let distance = 0;
          if (currentLoc) {
            distance = getDistance(
              currentLoc.coords.latitude,
              currentLoc.coords.longitude,
              alert.latitude,
              alert.longitude
            );
          }
          return { ...alert, distance };
        });

        setAlerts(enrichedAlerts);
      }
    } catch (e) {
      console.error('Error loading active alerts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const simulateNearbySignal = async () => {
    console.log('[BLE] Simulating nearby signal...');
    Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 NEARBY OFFLINE SOS DETECTED!",
        body: `A help signal was found via Bluetooth from John (Simulation) very close to you.`,
        data: { type: 'BLE_SOS', name: 'John (Simulation)', rssi: -45 },
        sound: 'alert.wav',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
    Alert.alert("Signal Injected", "A mock Bluetooth SOS signal has been sent to your device. Check your notifications and the main layout overlay!");
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Active Rescues</Text>
        <TouchableOpacity onPress={simulateNearbySignal} style={s.simBtn}>
          <Ionicons name="flask" size={20} color={Colors.sos} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.sos} />}
      >
        {/* Bluetooth Radar Visualization */}
        <View style={s.radarContainer}>
          <View style={s.radarHeader}>
            <Ionicons name="scan-outline" size={18} color={Colors.sos} />
            <Text style={s.radarTitle}>BLUETOOTH RADAR</Text>
            <View style={s.scanningBadge}>
              <View style={s.scanningDot} />
              <Text style={s.scanningText}>SCANNING</Text>
            </View>
          </View>
          
          <View style={s.radarVisual}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                style={[
                  s.radarCircle,
                  {
                    transform: [{ scale: radarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1.5 + (i * 0.5)]
                    }) }],
                    opacity: radarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6 - (i * 0.2), 0]
                    })
                  }
                ]}
              />
            ))}
            <View style={s.radarCenter}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.white} />
            </View>
          </View>

          <View style={s.radarSignals}>
            <Text style={s.signalScanTitle}>Nearby Signals Detected:</Text>
            {nearbySignals.length === 0 ? (
              <Text style={s.noSignalText}>Searching for airwaves...</Text>
            ) : (
              nearbySignals.map(sig => (
                <View key={sig.id} style={s.signalItem}>
                  <Ionicons 
                    name={sig.type === 'SOS' ? 'alert-circle' : 'bluetooth'} 
                    size={16} 
                    color={sig.type === 'SOS' ? Colors.sos : Colors.textMuted} 
                  />
                  <Text style={[s.signalName, sig.type === 'SOS' && { color: Colors.sos, fontWeight: '800' }]}>
                    {sig.name}
                  </Text>
                  <Text style={s.signalDist}>{sig.rssi} dBm</Text>
                  <View style={s.signalTypeBadge}>
                    <Text style={s.signalTypeText}>{estimateDistance(sig.rssi).split(' ')[0]}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={s.sectionDivider}>
          <Text style={s.sectionTitle}>ACTIVE SOS ALERTS</Text>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.sos} size="large" />
        ) : alerts.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="shield-checkmark" size={64} color={Colors.textMuted} />
            <Text style={s.emptyTitle}>All Safe!</Text>
            <Text style={s.emptySub}>No active emergency alerts in your area.</Text>
          </View>
        ) : (
          alerts.map(alert => (
            <View key={alert.id} style={s.alertCard}>
              <View style={s.alertHeader}>
                <View style={[s.pulse, { backgroundColor: Colors.sos }]} />
                <Text style={s.alertName}>{alert.user_name}</Text>
                <Text style={s.alertTime}>{new Date(alert.created_at).toLocaleTimeString()}</Text>
              </View>
              
              <Text style={s.alertDesc}>
                Emergency SOS triggered. Help is requested immediately!
              </Text>

              <View style={s.alertMeta}>
                <Ionicons name="navigate" size={16} color={Colors.textSecondary} />
                <Text style={s.alertDist}>{alert.distance?.toFixed(1)} km away</Text>
              </View>

              <TouchableOpacity 
                style={s.rescueBtn}
                onPress={() => {
                  router.replace({
                    pathname: '/(tabs)/map',
                    params: { 
                      targetLat: alert.latitude.toString(), 
                      targetLng: alert.longitude.toString(),
                      targetName: `${alert.user_name} (SOS)`
                    }
                  });
                }}
              >
                <Text style={s.rescueText}>RESPOND NOW</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: Spacing.lg, 
    paddingTop: 60, 
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backBtn: { marginRight: Spacing.md },
  simBtn: { marginLeft: 'auto', padding: 8 },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  list: { flex: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100, padding: Spacing.xl },
  emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.md },
  emptySub: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.xs },
  alertCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.sos,
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  pulse: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  alertName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '800', flex: 1 },
  alertTime: { color: Colors.textMuted, fontSize: FontSize.xs },
  alertDesc: { color: Colors.text, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
  alertMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  alertDist: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  rescueBtn: {
    backgroundColor: Colors.sos,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rescueText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '800' },
  
  // Radar Styles
  radarContainer: {
    backgroundColor: Colors.card,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  radarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.xl,
    gap: 8,
  },
  radarTitle: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    flex: 1,
  },
  scanningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  scanningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.sos,
  },
  scanningText: {
    color: Colors.sos,
    fontSize: 8,
    fontWeight: '900',
  },
  radarVisual: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  radarCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  radarCenter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: Colors.sos,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  radarSignals: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  signalScanTitle: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  noSignalText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  signalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  signalName: {
    color: Colors.text,
    fontSize: FontSize.xs,
    flex: 1,
  },
  signalDist: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  signalTypeBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  signalTypeText: {
    color: Colors.textSecondary,
    fontSize: 8,
    fontWeight: '700',
  },
  sectionDivider: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    color: Colors.sos,
    fontSize: FontSize.xs,
    fontWeight: '900',
    letterSpacing: 1,
  }
});
