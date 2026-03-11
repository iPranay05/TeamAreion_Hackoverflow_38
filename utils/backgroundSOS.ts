import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Alert, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendTwilioSMS } from '../utils/twilio';

const BACKGROUND_SOS_TASK = 'BACKGROUND_SOS_TASK';
const STORAGE_KEY = '@emergency_contacts';
const SETTINGS_KEY = '@app_settings';

// Shared state between foreground and background is hard in Expo.
// We use a simplified pattern detector for the background task if possible.
// Note: Accelerometer might not fire in all background states, but Foreground Service helps.

export async function registerBackgroundSOS() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    Alert.alert('Permission Required', 'Foreground location is needed for Safe Mode.');
    return;
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    Alert.alert('Important', 'Go to Settings > App Permissions > Location and select "Allow all the time" to keep protection active when the screen is off.');
    return;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_SOS_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 1000,
    distanceInterval: 0,
    foregroundService: {
      notificationTitle: "WomenSafe is Protecting You 🛡️",
      notificationBody: "Monitoring for Triple-Shake SOS pattern.",
      notificationColor: "#EC4899",
    },
  });
  Vibration.vibrate([0, 100, 50, 100]);
}

export async function unregisterBackgroundSOS() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SOS_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_SOS_TASK);
  }
}

// Define the task
TaskManager.defineTask(BACKGROUND_SOS_TASK, async ({ data, error }: any) => {
  if (error) return;
  // This task is primarily here to keep the process alive for the Accelerometer to work.
});
