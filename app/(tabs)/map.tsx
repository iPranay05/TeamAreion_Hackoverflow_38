import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator, Dimensions, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { useLocation } from '../../hooks/useLocation';
import MapView, { Heatmap, Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { MOCK_INCIDENT_DATA } from '../../utils/incidentData';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { getDistance } from '../../utils/arrivalMonitor';
import { useSafeRide } from '../../context/SafeRideContext';
import { useSettings } from '../../context/SettingsContext';
import CabInfoModal from '../../components/CabInfoModal';
import SafeWalkTimer from '../../components/SafeWalkTimer';
import { isOffRoute } from '../../utils/routeMonitor';
import { triggerLoudAlarm, escalateToFamily, escalateToPolice } from '../../utils/emergencyEscalation';
import { supabase } from '../../utils/supabase';

const HELPLINES = [
  { id: '1', name: 'National Emergency', number: '112', desc: 'All-in-one emergency number' },
  { id: '2', name: 'Police', number: '100', desc: 'Local police assistance' },
  { id: '3', name: 'Women Helpline', number: '1091', desc: 'Women in distress' },
  { id: '4', name: 'Domestic Abuse', number: '181', desc: 'Women helpline domestic abuse' },
  { id: '5', name: 'Ambulance', number: '102', desc: 'Medical emergencies' },
];

export default function MapScreen() {
  const { location, loading, requestLocation } = useLocation();
  const { settings } = useSettings();
  const { rideState, startRide, stopRide, setEmergencyPhase, setEscalationTimer } = useSafeRide();
  const [viewMode, setViewMode] = useState<'heatmap' | 'helplines'>('heatmap');
  const [selectedDestination, setSelectedDestination] = useState<{ latitude: number, longitude: number, name?: string } | null>(null);
  const [unsafeSpots, setUnsafeSpots] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [routeData, setRouteData] = useState<{ distance: string, time: string, walkTime?: string } | null>(null);
  const [polylineCoords, setPolylineCoords] = useState<{ latitude: number, longitude: number }[]>([]);
  const [transportMode, setTransportMode] = useState<'walking' | 'driving'>('walking');
  const [cabModalVisible, setCabModalVisible] = useState(false);

  const fetchRoute = async (start: { latitude: number, longitude: number }, end: { latitude: number, longitude: number }, mode: 'walking' | 'driving') => {
    try {
      const osrmProfile = mode === 'walking' ? 'foot' : 'car';
      const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const json = await response.json();

      if (json.routes && json.routes.length > 0) {
        const route = json.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        
        setPolylineCoords(coordinates);
        
        const distMeters = route.distance;
        let distanceStr = "";
        if (distMeters < 1000) {
          distanceStr = `${Math.round(distMeters)} m`;
        } else {
          distanceStr = `${(distMeters / 1000).toFixed(1)} km`;
        }

        // Use OSRM duration as base (it's already realistic)
        let timeSecs = route.duration;
        let finalMins = Math.round(timeSecs / 60);
        
        // For Indian city conditions, add realistic buffers
        if (mode === 'walking') {
          // Walking: Add 15% for signals and crowds
          finalMins = Math.round(finalMins * 1.15);
        } else {
          // Driving: Add 30% for Indian traffic conditions
          finalMins = Math.round(finalMins * 1.3);
        }

        // Calculate walking time for comparison when driving
        let walkTime = undefined;
        if (mode === 'driving') {
          const walkSecs = distMeters / 1.4; // 1.4 m/s = 5 km/h
          const walkMins = Math.round((walkSecs / 60) * 1.15);
          walkTime = `${walkMins} min walk`;
        }

        setRouteData({
          distance: distanceStr,
          time: `${finalMins} min`,
          walkTime
        });
      } else {
        throw new Error("No routes found");
      }
    } catch (error) {
      console.warn("Routing API error, using fallback calculation:", error);
      setPolylineCoords([start, end]);
      const distMeters = getDistance(start.latitude, start.longitude, end.latitude, end.longitude);
      
      let finalMins = 0;
      let walkTime = undefined;
      
      if (mode === 'walking') {
        // Walking: 5 km/h = 1.4 m/s with 15% buffer
        finalMins = Math.round((distMeters / 1.4 / 60) * 1.15);
      } else {
        // Driving: 25 km/h = 6.9 m/s with 30% buffer for city traffic
        finalMins = Math.round((distMeters / 6.9 / 60) * 1.3);
        
        // Calculate walking time
        const walkMins = Math.round((distMeters / 1.4 / 60) * 1.15);
        walkTime = `${walkMins} min walk`;
      }

      setRouteData({
        distance: distMeters < 1000 ? `${Math.round(distMeters)} m` : `${(distMeters / 1000).toFixed(1)} km`,
        time: `${finalMins} min`,
        walkTime
      });
    }
  };

  useEffect(() => {
    if (rideState.isTripActive && rideState.destination) {
      if (!selectedDestination || selectedDestination.latitude !== rideState.destination.latitude) {
        setSelectedDestination(rideState.destination);
      }
    }
    loadUnsafeSpots();
  }, [rideState.isTripActive, rideState.destination]);

  const loadUnsafeSpots = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('status', 'approved');
      if (data) setUnsafeSpots(data);
    } catch (e) {
      console.error('Error loading unsafe spots:', e);
    }
  };

  useEffect(() => {
    if (location && selectedDestination) {
      fetchRoute(
        { latitude: location.latitude, longitude: location.longitude },
        { latitude: selectedDestination.latitude, longitude: selectedDestination.longitude },
        transportMode
      );
    } else {
      setRouteData(null);
      setPolylineCoords([]);
    }
  }, [location, selectedDestination, transportMode]);

  const handleCall = (num: string) => { Linking.openURL(`tel:${num}`).catch(() => alert('Failed to open dialer')); };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    try {
      const results = await Location.geocodeAsync(searchText);
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        
        // Get detailed address for the searched location
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        let formattedAddress = searchText;
        
        if (address) {
          const parts = [];
          if (address.name && address.name !== address.street) parts.push(address.name);
          if (address.street) parts.push(address.street);
          if (address.district || address.subregion) parts.push(address.district || address.subregion);
          if (address.city) parts.push(address.city);
          if (address.region && address.region !== address.city) parts.push(address.region);
          formattedAddress = parts.filter(p => p).join(', ') || searchText;
        }
        
        const newDest = { latitude, longitude, name: formattedAddress };
        setSelectedDestination(newDest);
      } else {
        Alert.alert("Not Found", "Could not find that location. Please try another search.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to search location. Check your internet connection.");
    } finally {
      setSearching(false);
    }
  };

  const handleMapLongPress = async (e: any) => {
    const coords = e.nativeEvent.coordinate;
    try {
      // Reverse geocode to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      
      let formattedAddress = 'Selected Location';
      
      if (address) {
        const parts = [];
        if (address.name && address.name !== address.street) parts.push(address.name);
        if (address.street) parts.push(address.street);
        if (address.district || address.subregion) parts.push(address.district || address.subregion);
        if (address.city) parts.push(address.city);
        if (address.region && address.region !== address.city) parts.push(address.region);
        formattedAddress = parts.filter(p => p).join(', ') || 'Selected Location';
      }
      
      setSelectedDestination({ ...coords, name: formattedAddress });
    } catch (error) {
      setSelectedDestination({ ...coords, name: 'Selected Location' });
    }
    setSearchText('');
  };

  const handleCabConfirm = (info: { plateNumber: string; driverName: string }) => {
    setCabModalVisible(false);
    startRide('driving', polylineCoords, selectedDestination, info);
  };
 
  const startSafeJourney = () => {
    if (!selectedDestination) return;
 
    if (transportMode === 'driving') {
      setCabModalVisible(true);
      return;
    }
 
    Alert.alert(
      "Start Safe Walk",
      "We will monitor your path. If you reach the destination safely, the journey will end auto-cancelled.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Start Walk", 
          onPress: () => {
            startRide('walking', polylineCoords, selectedDestination);
          }
        }
      ]
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Safety Map</Text>
        <View style={s.tabBar}>
          <TouchableOpacity 
            style={[s.tab, viewMode === 'heatmap' && s.tabActive]} 
            onPress={() => setViewMode('heatmap')}
          >
            <Text style={[s.tabText, viewMode === 'heatmap' && s.tabTextActive]}>Safety Map</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.tab, viewMode === 'helplines' && s.tabActive]} 
            onPress={() => setViewMode('helplines')}
          >
            <Text style={[s.tabText, viewMode === 'helplines' && s.tabTextActive]}>Helplines</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'heatmap' ? (
        <View style={s.mapContainer}>
          {!rideState.isTripActive && (
            <View style={s.searchContainer}>
              <View style={s.searchBar}>
                <Ionicons name="search" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search destination..."
                  placeholderTextColor={Colors.textMuted}
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                {searching ? (
                  <ActivityIndicator size="small" color={Colors.sos} />
                ) : searchText ? (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={s.modeToggleContainer}>
                <TouchableOpacity 
                  style={[s.modeBtn, transportMode === 'walking' && s.modeBtnActive]} 
                  onPress={() => setTransportMode('walking')}
                >
                  <Ionicons name="walk" size={16} color={transportMode === 'walking' ? Colors.white : Colors.textMuted} />
                  <Text style={[s.modeBtnText, transportMode === 'walking' && s.modeBtnTextActive]}>Walk</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.modeBtn, transportMode === 'driving' && s.modeBtnActive]} 
                  onPress={() => setTransportMode('driving')}
                >
                  <Ionicons name="car" size={16} color={transportMode === 'driving' ? Colors.white : Colors.textMuted} />
                  <Text style={[s.modeBtnText, transportMode === 'driving' && s.modeBtnTextActive]}>Cab/Auto</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loading ? (
            <View style={s.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.sos} />
              <Text style={s.loadingText}>Initializing Map...</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {!rideState.isTripActive && (
                <View style={s.engineBadge}>
                   <Ionicons name="logo-google" size={12} color={Colors.white} />
                   <Text style={s.engineBadgeText}>Google Maps Engine Active</Text>
                </View>
              )}
              <MapView
                style={s.map}
                provider={PROVIDER_GOOGLE}
                mapType="standard"
                showsUserLocation={true}
                showsMyLocationButton={true}
                initialRegion={{
                  latitude: location?.latitude || 28.6139,
                  longitude: location?.longitude || 77.2090,
                  latitudeDelta: 0.1,
                  longitudeDelta: 0.1,
                }}
                // Removed customMapStyle for a more colourful standard view
                onLongPress={handleMapLongPress}
              >
              {location && (
                <Marker coordinate={location} title="You are here">
                  <View style={s.userMarker}><View style={s.userMarkerDot} /></View>
                </Marker>
              )}

              {selectedDestination && (
                <>
                  <Marker 
                    coordinate={selectedDestination} 
                    pinColor={Colors.sos}
                    title={selectedDestination.name || "Destination"}
                  />
                  {polylineCoords.length > 0 && (
                    <Polyline
                      coordinates={polylineCoords}
                      strokeColor={Colors.sos}
                      strokeWidth={3}
                    />
                  )}
                </>
              )}

              {unsafeSpots.map(spot => (
                <Marker
                  key={spot.id}
                  coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
                  title={`Unsafe Area: ${spot.category}`}
                  description={spot.description}
                >
                  <View style={s.unsafeMarker}>
                    <Ionicons name="warning" size={20} color={Colors.sos} />
                  </View>
                </Marker>
              ))}
              {/* Heatmap with smooth color blending */}
              <Heatmap
                points={MOCK_INCIDENT_DATA}
                radius={50}
                opacity={0.6}
                gradient={{
                  colors: [
                    'rgba(0, 255, 0, 0)',      // Transparent green (safe)
                    'rgba(0, 255, 0, 0.4)',    // Light green
                    'rgba(100, 255, 0, 0.5)',  // Yellow-green
                    'rgba(255, 255, 0, 0.6)',  // Yellow
                    'rgba(255, 200, 0, 0.7)',  // Orange-yellow
                    'rgba(255, 150, 0, 0.8)',  // Orange
                    'rgba(255, 100, 0, 0.85)', // Red-orange
                    'rgba(255, 50, 0, 0.9)',   // Light red
                    'rgba(255, 0, 0, 0.95)',   // Red (danger)
                  ],
                  startPoints: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 1],
                  colorMapSize: 512,
                }}
              />
            </MapView>
          </View>
        )}

      <CabInfoModal 
        visible={cabModalVisible} 
        onCancel={() => setCabModalVisible(false)} 
        onConfirm={handleCabConfirm} 
      />

      {selectedDestination ? (
        <View style={s.destinationOverlay}>
          <View style={s.destTextContainer}>
            <View style={s.destHeader}>
              <Ionicons name="location" size={20} color={Colors.sos} />
              <Text style={s.destLabel}>Destination</Text>
            </View>
            <Text style={s.destAddress} numberOfLines={2}>
              {selectedDestination.name || "Selected Location"}
            </Text>
            {routeData && (
              <View style={s.routeInfoContainer}>
                <View style={s.routeInfoRow}>
                  <View style={s.routeInfoItem}>
                    <Ionicons 
                      name={transportMode === 'walking' ? 'walk' : 'car'} 
                      size={18} 
                      color={Colors.sos} 
                    />
                    <Text style={s.routeTimeText}>{routeData.time}</Text>
                  </View>
                  <View style={s.routeDivider} />
                  <View style={s.routeInfoItem}>
                    <Ionicons name="navigate" size={18} color={Colors.accent} />
                    <Text style={s.routeDistanceText}>{routeData.distance}</Text>
                  </View>
                </View>
                {transportMode === 'driving' && routeData.walkTime && (
                  <Text style={s.altTimeText}>
                    🚶 {routeData.walkTime} on foot
                  </Text>
                )}
              </View>
            )}
          </View>
          {rideState.isTripActive ? (
            <View style={{ gap: Spacing.sm }}>
              {rideState.tripType === 'walking' && (
                <SafeWalkTimer 
                  onTimeout={() => Alert.alert("SOS Triggered", "Emergency contacts will be notified.")} 
                  destination={rideState.destination} 
                  onCancel={stopRide}
                />
              )}
              <TouchableOpacity style={[s.startJourneyBtn, { backgroundColor: Colors.textMuted }]} onPress={stopRide}>
                <Text style={s.startJourneyText}>Stop Safe Ride</Text>
                <Ionicons name="stop-circle" size={18} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.startJourneyBtn, { backgroundColor: Colors.sos }]} 
                onPress={() => {
                  Alert.alert("Demo Mode", "Simulating route detour for judges...");
                  setEscalationTimer(10);
                  setEmergencyPhase('CHECKING_IN');
                }}
              >
                <Text style={s.startJourneyText}>Simulate Detour</Text>
                <Ionicons name="flask" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.startJourneyBtn} onPress={startSafeJourney}>
              <Text style={s.startJourneyText}>{transportMode === 'driving' ? 'Start Safe Ride' : 'Start Safe Walk'}</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setSelectedDestination(null); setRouteData(null); if(rideState.isTripActive) stopRide(); }} style={s.clearDest}>
            <Text style={s.clearDestText}>Cancel</Text>
          </TouchableOpacity>
        </View>
          ) : (
            <View style={s.mapLegend}>
              <View style={[s.legendDot, { backgroundColor: Colors.sos }]} />
              <Text style={s.legendText}>Long press or search to set a destination</Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.card}>
            <View style={s.cardH}><Ionicons name="location" size={24} color={Colors.accent} /><Text style={s.cardHT}>Current GPS Status</Text></View>
            {loading ? (
              <View style={s.locS}><ActivityIndicator color={Colors.accent} /><Text style={s.locT}>Getting location...</Text></View>
            ) : location ? (
              <View style={s.locS}>
                <View style={s.coord}><Text style={s.cL}>LAT</Text><Text style={s.cV}>{location.latitude.toFixed(5)}</Text></View>
                <View style={s.coord}><Text style={s.cL}>LNG</Text><Text style={s.cV}>{location.longitude.toFixed(5)}</Text></View>
                <View style={s.coord}><Text style={s.cL}>ACC</Text><Text style={s.cV}>±{Math.round(location.accuracy || 0)}m</Text></View>
              </View>
            ) : (
              <View style={s.locS}><Text style={s.eT}>Location unavailable</Text><TouchableOpacity onPress={requestLocation} style={s.eB}><Text style={s.eBT}>Retry</Text></TouchableOpacity></View>
            )}
          </View>

          <Text style={s.sT}>National Helplines (India)</Text>
          {HELPLINES.map((h: any) => (
            <TouchableOpacity key={h.id} style={s.hC} onPress={() => handleCall(h.number)}>
              <View style={s.hI}><Text style={s.hN}>{h.name}</Text><Text style={s.hD}>{h.desc}</Text></View>
              <View style={s.hAc}><Ionicons name="call" size={20} color={Colors.white} /><Text style={s.hAcT}>{h.number}</Text></View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}


const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 0, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.md },
  tabBar: { flexDirection: 'row', gap: Spacing.md },
  tab: { paddingVertical: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.sos },
  tabText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.sos, fontWeight: '700' },
  mapContainer: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: '100%' },
  loadingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: FontSize.sm },
  userMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3b82f6' },
  userMarkerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6' },
  mapLegend: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', padding: Spacing.md, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, elevation: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: '#1f2937', fontSize: FontSize.xs, fontWeight: '600' },
  
  engineBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 100 },
  engineBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },

  searchContainer: { position: 'absolute', top: 20, left: 20, right: 20, zIndex: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  searchInput: { flex: 1, height: 44, color: Colors.text, fontSize: FontSize.md, marginLeft: Spacing.sm },
  modeToggleContainer: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: Radius.full, marginTop: Spacing.sm, padding: 4, borderWidth: 1, borderColor: Colors.border, alignSelf: 'flex-start' },
  modeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, gap: Spacing.xs },
  modeBtnActive: { backgroundColor: Colors.sos },
  modeBtnText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
  modeBtnTextActive: { color: Colors.white, fontWeight: '700' },

  destinationOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  destTextContainer: { marginBottom: Spacing.md },
  destHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  destLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  destAddress: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', lineHeight: 20, marginBottom: Spacing.sm },
  routeInfoContainer: { backgroundColor: Colors.background, padding: Spacing.sm, borderRadius: Radius.sm, marginTop: Spacing.xs },
  routeInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  routeInfoItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  routeTimeText: { color: Colors.sos, fontSize: FontSize.lg, fontWeight: '800' },
  routeDistanceText: { color: Colors.accent, fontSize: FontSize.lg, fontWeight: '800' },
  routeDivider: { width: 1, height: 20, backgroundColor: Colors.border },
  altTimeText: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.xs },
  startJourneyBtn: { backgroundColor: Colors.sos, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md, gap: Spacing.sm },
  startJourneyText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800' },
  clearDest: { marginTop: Spacing.sm, alignItems: 'center', padding: Spacing.xs },
  clearDestText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },

  content: { padding: Spacing.lg },

  card: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl },
  cardH: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.sm }, cardHT: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  locS: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  coord: { alignItems: 'center' }, cL: { color: Colors.textMuted, fontSize: 10, fontWeight: '800', marginBottom: 2 }, cV: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  eT: { color: Colors.textSecondary }, eB: { padding: Spacing.xs }, eBT: { color: Colors.accent, fontWeight: '700' }, locT: { color: Colors.textSecondary, marginLeft: Spacing.sm },
  sT: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md, marginTop: Spacing.md },
  hC: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  hI: { flex: 1 }, hN: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' }, hD: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  hAc: { backgroundColor: Colors.safe, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, gap: Spacing.xs },
  hAcT: { color: Colors.white, fontWeight: '800', fontSize: FontSize.sm },
  unsafeMarker: { backgroundColor: 'rgba(255,59,48,0.2)', padding: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.sos }
});

