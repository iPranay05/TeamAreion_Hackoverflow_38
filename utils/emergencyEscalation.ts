import { Audio } from 'expo-av';
import { makeTwilioCall, sendTwilioSMS } from './twilio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTACTS_KEY = '@emergency_contacts';

/**
 * Triggers a loud alarm. 
 * Note: In a real app, you'd bundle a 'siren.mp3'. 
 * For this mock, we'll use a system sound if possible or a placeholder.
 */
export async function triggerLoudAlarm() {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/universfield-new-notification-022-370046.mp3'),
      { shouldPlay: true, isLooping: true, volume: 1.0 }
    );
    await sound.setIsLoopingAsync(true);
    await sound.setVolumeAsync(1.0);
    await sound.playAsync(); // Explicit play call
    return sound;
  } catch (e) {
    console.error("Failed to play alarm", e);
    return null;
  }
}

/**
 * Escalates to family via Twilio calls (Primary) and SMS (All).
 */
export async function escalateToFamily(cabInfo: any, location: any, settings: any, type: 'ride' | 'walk' | 'manual' = 'ride') {
  console.log(`[Escalation] Starting escalation to family (Type: ${type})...`);
  const contactsStr = await AsyncStorage.getItem(CONTACTS_KEY);
  if (!contactsStr) {
    console.warn("[Escalation] No contacts found in AsyncStorage");
    return;
  }
  
  const allContacts = JSON.parse(contactsStr);
  const contacts = Array.isArray(allContacts) ? allContacts.filter((c: any) => c && c.phone) : [];
  
  if (contacts.length === 0) {
    console.warn("[Escalation] No valid emergency contacts found");
    return;
  }

  const phones = contacts.map((c: any) => c.phone.trim());
  const primaryPhone = phones[0];
  
  const locLink = `https://www.google.com/maps?q=${location?.latitude}%2C${location?.longitude}`;
  
  let message = "";
  let twiml = "";

  if (type === 'walk') {
    message = `🚨 SOS: ${settings.userName || 'User'}'s Safe Walk timer expired!
📍 ${locLink}`;
    twiml = `<Response>
      <Say voice="alice" loop="2">Safety Alert for ${settings.userName || 'User'}. Their Safe Walk timer has expired, and they have not checked in. Please check on them immediately. We have sent an SMS with their live location.</Say>
    </Response>`;
  } else {
    message = `🚨 SOS: ${settings.userName || 'User'}'s ride deviated!
🚕 ${cabInfo?.plateNumber || 'Cab'}
👤 ${cabInfo?.driverName || 'Driver'}
📍 ${locLink}`;
    twiml = `<Response>
      <Say voice="alice" loop="2">Safety Alert for ${settings.userName || 'User'}. Their cab has deviated from its route. Please check on them immediately. Are they safe? We have sent an SMS with their live location.</Say>
    </Response>`;
  }

  console.log(`[Escalation] Sending SMS to ${phones.length} contacts...`);
  
  // 1. Send SMS to ALL contacts
  try {
    await sendTwilioSMS(phones, message, settings.twilioSid, settings.twilioToken, settings.twilioNumber);
  } catch (smsErr: any) {
    console.error("[Escalation] SMS step failed:", smsErr);
    // Alert the user so they can see why Twilio is failing (e.g. unverified number)
    const { Alert } = await import('react-native');
    Alert.alert("SMS Failed ⚠️", `Twilio could not send the SMS: ${smsErr.message || 'Unknown error'}. The emergency call will still be attempted.`);
  }

  // 2. Make Automated Call ONLY to the Primary Contact
  console.log(`[Escalation] Triggering call to primary: ${primaryPhone}`);
  
  try {
    await makeTwilioCall([primaryPhone], twiml, settings.twilioSid, settings.twilioToken, settings.twilioNumber);
  } catch (callErr) {
    console.error("[Escalation] Call step failed:", callErr);
  }
}

/**
 * Escalates to Police (Mock).
 */
export async function escalateToPolice(cabInfo: any, location: any, settings: any) {
  console.log("👮 POLICE NOTIFIED AUTOMATICALLY", {
    location,
    cabInfo,
    audioRecording: "Started",
    routeMap: "Sent"
  });
  // In a real scenario, this would hit a government API or local dispatch service.
}
