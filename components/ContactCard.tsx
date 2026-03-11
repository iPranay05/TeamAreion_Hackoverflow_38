import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Contact } from '../hooks/useContacts';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';

export default function ContactCard({ contact, onDelete }: { contact: Contact, onDelete: (id: string) => void }) {
  const init = contact.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
  return (
    <View style={styles.card}>
      <View style={styles.avatar}><Text style={styles.init}>{init}</Text></View>
      <View style={styles.info}>
        <Text style={styles.name}>{contact.name}</Text>
        <Text style={styles.phone}>{contact.phone}</Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(contact.id)} style={styles.del}>
        <Ionicons name="trash-outline" size={18} color={Colors.sos} />
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  init: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  info: { flex: 1 }, name: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  phone: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  del: { padding: Spacing.sm }
});
