import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: Colors.surface, 
          borderTopColor: Colors.border, 
          borderTopWidth: 1, 
          height: 64, 
          paddingBottom: 8 
        },
        tabBarActiveTintColor: Colors.sos, 
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home', 
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="contacts" 
        options={{ 
          title: 'Contacts', 
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="map" 
        options={{ 
          title: 'Map', 
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="complaints" 
        options={{ 
          title: 'Report', 
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: 'Settings', 
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> 
        }} 
      />
    </Tabs>
  );
}
