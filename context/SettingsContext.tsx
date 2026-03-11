import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings { userName: string; shakeToSOS: boolean; safeMode: boolean; sosMessage: string; fakeCaller: string; twilioSid: string; twilioToken: string; twilioNumber: string; }
const defaultSettings: Settings = { 
  userName: 'My Name', 
  shakeToSOS: true, 
  safeMode: false, 
  sosMessage: '🆘 I need help! My live location: {link}', 
  fakeCaller: 'Mom', 
  twilioSid: process.env.EXPO_PUBLIC_TWILIO_SID || '', 
  twilioToken: process.env.EXPO_PUBLIC_TWILIO_TOKEN || '', 
  twilioNumber: process.env.EXPO_PUBLIC_TWILIO_NUMBER || '' 
};
const KEY = '@app_settings';

const SettingsContext = createContext<{ settings: Settings; updateSettings: (p: Partial<Settings>) => void }>({
  settings: defaultSettings, updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  useEffect(() => { AsyncStorage.getItem(KEY).then(r => { if (r) setSettings({ ...defaultSettings, ...JSON.parse(r) }); }); }, []);
  const updateSettings = async (p: Partial<Settings>) => {
    const next = { ...settings, ...p };
    setSettings(next); await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };
  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
