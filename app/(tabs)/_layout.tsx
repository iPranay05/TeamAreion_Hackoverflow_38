import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { View, StyleSheet } from 'react-native';
import SOSButton from '../../components/SOSButton';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: Colors.surface, 
          borderTopColor: Colors.border, 
          borderTopWidth: 1, 
          height: 70, 
          paddingBottom: 10,
          paddingTop: 5
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
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> 
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
        name="sos" 
        options={{ 
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.sosTabIcon}>
              <View style={[styles.sosRing, focused && styles.sosRingActive]} />
              <View style={styles.sosButton}>
                <Ionicons name="alert-circle" size={32} color={Colors.white} />
              </View>
            </View>
          ),
          tabBarLabel: () => null
        }} 
      />
      <Tabs.Screen 
        name="community" 
        options={{ 
          title: 'Community', 
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: 'Settings', 
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> 
        }} 
      />
      {/* Hidden tabs */}
      <Tabs.Screen 
        name="contacts" 
        options={{ 
          href: null
        }} 
      />
      <Tabs.Screen 
        name="complaints" 
        options={{ 
          href: null
        }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  sosTabIcon: {
    position: 'relative',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20
  },
  sosRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(236,72,153,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(236,72,153,0.3)'
  },
  sosRingActive: {
    backgroundColor: 'rgba(236,72,153,0.3)',
    borderColor: Colors.sos
  },
  sosButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.sos,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8
  }
});
