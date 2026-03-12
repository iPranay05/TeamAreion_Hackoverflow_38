import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../utils/supabase';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        if (!fullName || !phone) {
          Alert.alert('Error', 'Full name and phone are required for signup');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone
            },
            emailRedirectTo: undefined // Skip email confirmation in development
          }
        });

        if (error) throw error;
        
        // Auto-login after signup (database triggers now handle confirmation and profile creation)
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
        Alert.alert('Success', 'Account created! You are now logged in.');
        router.replace('/');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={s.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <View style={s.logoContainer}>
            <Ionicons name="shield-checkmark" size={60} color={Colors.sos} />
          </View>
          <Text style={s.title}>SafeStree</Text>
          <Text style={s.subtitle}>Empowering Women's Safety</Text>
        </View>

        <View style={s.form}>
          <Text style={s.formTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
          
          {isSignUp && (
            <>
              <View style={s.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={s.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={Colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Mobile Number"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </>
          )}

          <View style={s.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={s.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={s.btn} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>{isSignUp ? 'Sign Up' : 'Login'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={s.toggle} onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={s.toggleText}>
              {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  header: { alignItems: 'center', marginBottom: Spacing.xxl },
  logoContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  title: { color: Colors.text, fontSize: 32, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: Colors.sos, fontSize: FontSize.sm, fontWeight: '700', marginTop: 4 },
  form: { backgroundColor: Colors.surface, padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, elevation: 5 },
  formTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.xl, textAlign: 'center' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, marginBottom: Spacing.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, height: 50, color: Colors.text, fontSize: FontSize.md },
  btn: { backgroundColor: Colors.sos, padding: Spacing.lg, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.md },
  btnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800' },
  toggle: { marginTop: Spacing.xl, alignItems: 'center' },
  toggleText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' }
});
