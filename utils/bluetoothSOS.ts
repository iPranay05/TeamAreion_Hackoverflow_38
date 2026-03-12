import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

/**
 * BLUETOOTH SOS CONFIGURATION
 * We use a specific Service UUID to identify SOS signals.
 */
export const SOS_SERVICE_UUID = '550e8400-e29b-41d4-a716-446655440000';
const GUARDIAN_SCAN_TASK = 'BACKGROUND_BLE_SOS_SCAN';

/**
 * @dev This utility requires 'react-native-ble-manager' or similar. 
 * Since we are in an Expo environment, we provide the logic structure 
 * which requires a Dev Client build with the native library.
 */

// Mock state for simulation if library is missing
let isAdvertising = false;
let isScanning = false;
let simulatedSOS: BluetoothSignal | null = null;

export interface BluetoothSignal {
  id: string;
  name: string;
  rssi: number;
  type: 'SOS' | 'DEVICE';
  timestamp: number;
}

/**
 * Starts advertising the device as an SOS beacon.
 * This makes the device discoverable by nearby Guardians via Bluetooth.
 */
export const startSOSAdvertising = async (userName: string) => {
  if (isAdvertising) return;
  
  console.log(`[BLE] Starting SOS Advertising for ${userName}...`);
  try {
    // In a real implementation with react-native-ble-manager:
    // await BleManager.start({ showAlert: false });
    // await BleManager.advertise(SOS_SERVICE_UUID, [userName], { ...options });
    
    isAdvertising = true;
    return true;
  } catch (error) {
    console.error('[BLE] Advertising failed:', error);
    return false;
  }
};

/**
 * Stops the SOS beacon advertising.
 */
export const stopSOSAdvertising = async () => {
  if (!isAdvertising) return;
  
  console.log('[BLE] Stopping SOS Advertising...');
  isAdvertising = false;
};

/**
 * Starts background scanning for nearby SOS beacons.
 * This is for Guardians to detect people in trouble nearby without network.
 */
export const startGuardianScanning = async () => {
  if (isScanning) return;
  
  console.log('[BLE] Starting background Guardian scan...');
  try {
    // Register background task if not already
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GUARDIAN_SCAN_TASK);
    if (!isRegistered) {
      // In a real environment, we'd start a BLE scan here that triggers the task
      // For now, we simulate the scan initiation
    }
    
    isScanning = true;
    return true;
  } catch (error) {
    console.error('[BLE] Scanning initiation failed:', error);
    return false;
  }
};

/**
 * Stops the background Guardian scan.
 */
export const stopGuardianScanning = async () => {
  if (!isScanning) return;
  
  console.log('[BLE] Stopping Guardian scan...');
  isScanning = false;
};

/**
 * Define the background task that handles signal detection
 */
TaskManager.defineTask(GUARDIAN_SCAN_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error(`[BLE Task] Error: ${error.message}`);
    return;
  }
  
  if (data) {
    const { device, rssi, name } = data;
    // Check if device is advertising our SOS UUID
    // If found, trigger a high-priority local notification
    console.log(`[BLE Task] Detected nearby SOS from: ${name} (RSSI: ${rssi})`);
    
    Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 NEARBY OFFLINE SOS DETECTED!",
        body: `A help signal was found via Bluetooth from ${name || 'someone'} very close to you.`,
        data: { type: 'BLE_SOS', name, rssi },
        sound: 'alert.wav',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  }
});

/**
 * Distance estimation based on RSSI (Signal Strength)
 * -30 to -50: Very Close (< 5m)
 * -50 to -70: Near (5-15m)
 * -70 to -90: Far (15-30m)
 */
export const estimateDistance = (rssi: number): string => {
  if (rssi >= -50) return 'Very Close (within 5m)';
  if (rssi >= -70) return 'Near (within 15m)';
  return 'In Vicinity (within 30m)';
};

/**
 * MOCK: Simulates scanning for nearby devices
 * Returns a list of signals found in the air
 */
export const getNearbyBluetoothSignals = async (): Promise<BluetoothSignal[]> => {
  // In a real implementation, this would query the native BLE manager for recently scanned peripherals
  // For now, we simulate a realistic environment
  
  const mockSignals: BluetoothSignal[] = [
    { id: 'dev-1', name: 'Unknown iPhone', rssi: -65, type: 'DEVICE', timestamp: Date.now() },
    { id: 'dev-2', name: 'Bluetooth Speaker', rssi: -82, type: 'DEVICE', timestamp: Date.now() },
    { id: 'dev-3', name: 'Smart Watch', rssi: -45, type: 'DEVICE', timestamp: Date.now() },
  ];

  // Randomly add some jitter to RSSI to make it look alive
  const results = mockSignals.map(s => ({
    ...s,
    rssi: s.rssi + Math.floor(Math.random() * 10) - 5
  }));

  if (simulatedSOS) {
    results.unshift({
      ...simulatedSOS,
      rssi: -35 + Math.floor(Math.random() * 5), // Constant strong signal for simulation
      timestamp: Date.now()
    });
  }

  return results;
};

/**
 * TRIGGER: Injects a specific SOS signal for the radar to find
 */
export const injectSimulatedSOS = (name: string) => {
  simulatedSOS = {
    id: `sim-${Date.now()}`,
    name: name,
    rssi: -35,
    type: 'SOS',
    timestamp: Date.now()
  };
  
  // Auto-clear after 30 seconds
  setTimeout(() => {
    simulatedSOS = null;
  }, 30000);
};
