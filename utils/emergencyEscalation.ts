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
export async function escalateToFamily(cabInfo: any, location: any, settings: any) {
  const contactsStr = await AsyncStorage.getItem(CONTACTS_KEY);
  if (!contactsStr) return;
  
  const contacts = JSON.parse(contactsStr);
  if (contacts.length === 0) return;

  const phones = contacts.map((c: any) => c.phone);
  const primaryPhone = contacts[0].phone;
  
  const locLink = `https://www.google.com/maps?q=${location.latitude}%2C${location.longitude}`;
  const message = `🚨 EMERGENCY: ${settings.userName || 'User'}'s cab has deviated from its route! 
🚕 Cab Plate: ${cabInfo?.plateNumber || 'Unknown'}
👤 Driver: ${cabInfo?.driverName || 'Unknown'}
📍 Last Location: ${locLink}`;

  // 1. Send SMS to ALL contacts
  await sendTwilioSMS(phones, message, settings.twilioSid, settings.twilioToken, settings.twilioNumber);

  // 2. Make Automated Call ONLY to the Primary Contact
  const twiml = `<Response>
    <Say voice="alice" loop="2">Are you Safe? This is a safety alert for ${settings.userName || 'User'}. Their cab has deviated from its route. We have sent their live location and cab details to your phone via SMS. Please check on them immediately.</Say>
  </Response>`;
  await makeTwilioCall([primaryPhone], twiml, settings.twilioSid, settings.twilioToken, settings.twilioNumber);
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
