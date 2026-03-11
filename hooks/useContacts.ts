import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

export interface Contact { id: string; name: string; phone: string; }
const STORAGE_KEY = '@emergency_contacts';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const load = useCallback(async () => {
    try { const raw = await AsyncStorage.getItem(STORAGE_KEY); if (raw) setContacts(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => { load(); }, []);

  const addContact = async (name: string, phone: string) => {
    if (contacts.length >= 5) return false;
    const newList = [...contacts, { id: Date.now().toString(), name, phone }];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    setContacts(newList); return true;
  };

  const removeContact = async (id: string) => {
    const newList = contacts.filter(c => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    setContacts(newList);
  };

  return { contacts, addContact, removeContact, reload: load };
}
