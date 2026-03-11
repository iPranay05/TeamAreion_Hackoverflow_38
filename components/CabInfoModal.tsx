import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';

interface CabInfoModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (info: { plateNumber: string; driverName: string }) => void;
}

export default function CabInfoModal({ visible, onCancel, onConfirm }: CabInfoModalProps) {
  const [plate, setPlate] = useState('');
  const [name, setName] = useState('');

  const handleConfirm = () => {
    if (!plate.trim()) return;
    onConfirm({ plateNumber: plate, driverName: name || 'Unknown' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.overlay}>
        <View style={s.content}>
          <View style={s.header}>
            <Text style={s.title}>Safe Ride Details</Text>
            <TouchableOpacity onPress={onCancel}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={s.subtitle}>Enter cab details to enable route monitoring and automatic emergency escalation.</Text>

          <View style={s.inputGroup}>
            <Text style={s.label}>Cab Plate Number*</Text>
            <TextInput 
              style={s.input} 
              placeholder="e.g. MH 04 AB 1234" 
              placeholderTextColor={Colors.textMuted}
              value={plate}
              onChangeText={setPlate}
              autoCapitalize="characters"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Driver Name (Optional)</Text>
            <TextInput 
              style={s.input} 
              placeholder="e.g. Rahul Singh" 
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
            <Text style={s.confirmText}>Secure My Ride</Text>
            <Ionicons name="shield-checkmark" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing.xl },
  content: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.xl, lineHeight: 20 },
  inputGroup: { marginBottom: Spacing.md },
  label: { color: Colors.text, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md },
  confirmBtn: { backgroundColor: Colors.sos, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md, gap: Spacing.sm, marginTop: Spacing.md },
  confirmText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800' },
});
