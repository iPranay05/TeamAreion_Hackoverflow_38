import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { useContacts } from '../hooks/useContacts';
import ContactCard from '../components/ContactCard';
import * as Contacts from 'expo-contacts';

export default function ContactsScreen() {
  const { contacts, addContact, removeContact } = useContacts();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) { Alert.alert('Error', 'Name and phone are required'); return; }
    if (contacts.length >= 5) { Alert.alert('Limit Reached', 'You can only add up to 5 emergency contacts.'); return; }
    const success = await addContact(name.trim(), phone.trim());
    if (success) { setName(''); setPhone(''); }
  };

  const handleImport = async () => {
    if (contacts.length >= 5) { Alert.alert('Limit Reached', 'You can only add up to 5 emergency contacts.'); return; }
    
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      const contact = await Contacts.presentContactPickerAsync();
      
      if (contact) {
        const cName = contact.name;
        // Get the first phone number available
        const cPhone = contact.phoneNumbers?.[0]?.number;
        
        if (cName && cPhone) {
          await addContact(cName, cPhone);
        } else {
          Alert.alert('Error', 'Contact does not have a valid name or phone number.');
        }
      }
    } else {
      Alert.alert('Permission Denied', 'We need access to your contacts to import them.');
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={s.header}><Text style={s.title}>Emergency Contacts</Text><Text style={s.sub}>{contacts.length}/5 Contacts Added</Text></View>
      <ScrollView style={s.list} contentContainerStyle={s.listContent}>
        {contacts.length === 0 ? (
          <View style={s.empty}><Ionicons name="people-outline" size={48} color={Colors.textMuted} /><Text style={s.emptyT}>No contacts added yet.</Text><Text style={s.emptyS}>Add trusted people who should be notified when you press SOS.</Text></View>
        ) : (
          contacts.map(c => <ContactCard key={c.id} contact={c} onDelete={removeContact} />)
        )}
      </ScrollView>
      <View style={s.addForm}>
        <Text style={s.formT}>New Contact</Text>
        <TextInput style={s.input} placeholder="Full Name" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
        <TextInput style={s.input} placeholder="Phone Number (e.g. +91XXXXXXXXXX)" placeholderTextColor={Colors.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TouchableOpacity 
          style={[s.btn, s.importBtn, contacts.length >= 5 && s.btnD]} 
          onPress={handleImport}
          disabled={contacts.length >= 5}
        >
          <Ionicons name="person-add-outline" size={20} color={Colors.white} />
          <Text style={s.btnT}>Import from Contacts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.btn, (contacts.length >= 5 || !name || !phone) && s.btnD]} onPress={handleAdd} disabled={contacts.length >= 5 || !name || !phone}>
          <Text style={s.btnT}>Add Manually</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' }, sub: { color: Colors.safe, fontSize: FontSize.sm, fontWeight: '600', marginTop: 4 },
  list: { flex: 1 }, listContent: { padding: Spacing.lg },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }, emptyT: { color: Colors.textSecondary, fontSize: FontSize.lg, fontWeight: '600', marginTop: Spacing.md }, emptyS: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.xl },
  addForm: { backgroundColor: Colors.surface, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg },
  formT: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md, marginBottom: Spacing.sm },
  btn: { backgroundColor: Colors.accent, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.xs, flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm }, 
  importBtn: { backgroundColor: Colors.safe, marginBottom: Spacing.sm },
  btnD: { opacity: 0.5 }, 
  btnT: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' }
});
