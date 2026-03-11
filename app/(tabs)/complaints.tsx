import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { supabase } from '../../utils/supabase';

const COMPLAINTS_KEY = '@app_complaints';

interface Complaint {
  id: string;
  category: string;
  description: string;
  location: string;
  timestamp: string;
}

const CATEGORIES = [
  'Harassment',
  'Unsafe Area',
  'Driver Behavior',
  'Street Lighting',
  'Other'
];

export default function ComplaintsScreen() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [addr, setAddr] = useState('');
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<{name: string, phone: string} | null>(null);

  useEffect(() => { 
    loadComplaints();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setUserProfile({ name: data.full_name, phone: data.phone_number });
    }
  };

  const loadComplaints = async () => {
    try {
      // First try to load from Supabase for global history
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setComplaints(data.map((d: any) => ({
          id: d.id,
          category: d.category,
          description: d.description,
          location: d.location_addr,
          timestamp: new Date(d.created_at).toLocaleString()
        })));
      } else {
        // Fallback to local storage if needed
        const raw = await AsyncStorage.getItem(COMPLAINTS_KEY);
        if (raw) setComplaints(JSON.parse(raw));
      }
    } catch (e) {
      console.error('Supabase load error:', e);
    }
  };

  const getCurrentLocation = async () => {
    setLoadingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Allow location access to tag your complaint.'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      const [rev] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (rev) setAddr(`${rev.name || ''} ${rev.street || ''}, ${rev.city || ''}`);
    } catch (e) { Alert.alert('Error', 'Failed to fetch location.'); }
    finally { setLoadingLoc(false); }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description');
      return;
    }
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('complaints').insert([
        {
          category,
          description,
          location_addr: addr || 'Not specified',
          latitude: coords?.lat,
          longitude: coords?.lng,
          status: 'pending',
          user_id: user?.id,
          user_email: user?.email,
          user_name: userProfile?.name,
          user_phone: userProfile?.phone,
        },
      ]);

      if (error) throw error;

      // Also update local list for immediate feedback
      const newComplaint: Complaint = {
        id: Date.now().toString(),
        category,
        description,
        location: addr || 'Not specified',
        timestamp: new Date().toLocaleString()
      };
      const updated = [newComplaint, ...complaints];
      setComplaints(updated);
      setDescription('');
      setAddr('');
      setCoords(null);
      Alert.alert('Success', 'Your complaint has been filed and sent for admin review.');
    } catch (e) {
      console.error('Submission error:', e);
      Alert.alert('Error', 'Failed to report to server. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}><Text style={s.title}>File a Complaint</Text></View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.section}>
          <Text style={s.label}>Category</Text>
          <View style={s.categories}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.catBtn, category === cat && s.catBtnActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[s.catText, category === cat && s.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.label}>Description</Text>
          <TextInput
            style={s.textArea}
            placeholder="Tell us what happened..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={s.section}>
          <Text style={s.label}>Location (Optional)</Text>
          <View style={s.locInputRow}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Address or Landmarks"
              placeholderTextColor={Colors.textMuted}
              value={addr}
              onChangeText={setAddr}
            />
            <TouchableOpacity style={s.locBtn} onPress={getCurrentLocation}>
              {loadingLoc ? <ActivityIndicator size="small" color={Colors.white} /> : <Ionicons name="location" size={20} color={Colors.white} />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={s.submitText}>Report Incident</Text>}
        </TouchableOpacity>

        <View style={s.historyHeader}>
          <Text style={s.historyTitle}>Your Reported Incidents</Text>
        </View>
        {complaints.length === 0 ? (
          <Text style={s.noHistory}>History will appear here after reporting.</Text>
        ) : (
          complaints.map(item => (
            <View key={item.id} style={s.reportItem}>
              <View style={s.reportHeader}>
                <Text style={s.reportCat}>{item.category}</Text>
                <Text style={s.reportTime}>{item.timestamp}</Text>
              </View>
              <Text style={s.reportDesc}>{item.description}</Text>
              <View style={s.reportLocRow}>
                <Ionicons name="pin" size={14} color={Colors.textMuted} />
                <Text style={s.reportLoc}>{item.location}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  content: { padding: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  label: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catBtn: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  catBtnActive: { backgroundColor: Colors.sos, borderColor: Colors.sos },
  catText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  catTextActive: { color: Colors.white, fontWeight: '700' },
  textArea: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md, height: 120, textAlignVertical: 'top' },
  locInputRow: { flexDirection: 'row', gap: Spacing.sm },
  input: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md },
  locBtn: { backgroundColor: Colors.accent, padding: Spacing.md, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', width: 50 },
  submitBtn: { backgroundColor: Colors.sos, padding: Spacing.lg, borderRadius: Radius.md, alignItems: 'center', marginBottom: 40, elevation: 5, shadowColor: Colors.sos, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  submitText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800' },
  historyHeader: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.xl, marginBottom: Spacing.md },
  historyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  noHistory: { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl, fontStyle: 'italic' },
  reportItem: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  reportCat: { color: Colors.sos, fontWeight: '800', fontSize: FontSize.sm },
  reportTime: { color: Colors.textMuted, fontSize: 10 },
  reportDesc: { color: Colors.text, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.sm },
  reportLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportLoc: { color: Colors.textMuted, fontSize: FontSize.xs }
});
