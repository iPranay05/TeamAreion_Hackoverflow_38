import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings { username: string; userName: string; shakeToSOS: boolean; safeMode: boolean; sosMessage: string; fakeCaller: string; twilioSid: string; twilioToken: string; twilioNumber: string; joinSafetyNetwork: boolean; }
const defaultSettings: Settings = { 
  username: 'user',
  userName: 'My Name', 
  shakeToSOS: true, 
  safeMode: false, 
  sosMessage: '🆘 I need help! My live location: {link}', 
  fakeCaller: 'Mom', 
  twilioSid: process.env.EXPO_PUBLIC_TWILIO_SID || '', 
  twilioToken: process.env.EXPO_PUBLIC_TWILIO_TOKEN || '', 
  twilioNumber: process.env.EXPO_PUBLIC_TWILIO_NUMBER || '',
  joinSafetyNetwork: false
};
const KEY = '@app_settings';

const SettingsContext = createContext<{ settings: Settings; updateSettings: (p: Partial<Settings>) => void }>({
  settings: defaultSettings, updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  useEffect(() => { 
    const initSettings = async () => {
      const r = await AsyncStorage.getItem(KEY);
      let currentSettings = defaultSettings;
      
      if (r) {
        const saved = JSON.parse(r);
        currentSettings = { 
          ...defaultSettings, 
          ...saved,
        };
        
        // Force ENV variables to override saved settings if they exist
        if (process.env.EXPO_PUBLIC_TWILIO_SID) currentSettings.twilioSid = process.env.EXPO_PUBLIC_TWILIO_SID;
        if (process.env.EXPO_PUBLIC_TWILIO_TOKEN) currentSettings.twilioToken = process.env.EXPO_PUBLIC_TWILIO_TOKEN;
        if (process.env.EXPO_PUBLIC_TWILIO_NUMBER) currentSettings.twilioNumber = process.env.EXPO_PUBLIC_TWILIO_NUMBER;
      }
      
      setSettings(currentSettings);

      // Fetch latest profile from Supabase
      try {
        const { supabase } = await import('../utils/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (profile) {
            const next = { 
              ...currentSettings, 
              userName: profile.full_name || currentSettings.userName,
              username: profile.username || user.email?.split('@')[0] || currentSettings.username
            };
            setSettings(next);
            await AsyncStorage.setItem(KEY, JSON.stringify(next));
          }
        }
      } catch (e) {
        console.error('SettingsProvider sync error:', e);
      }
    };

    initSettings();
  }, []);
  const updateSettings = async (p: Partial<Settings>) => {
    const next = { ...settings, ...p };
    setSettings(next); await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };
  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
