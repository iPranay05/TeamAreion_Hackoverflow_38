import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { Vibration } from 'react-native';

const SHAKE_THRESHOLD = 2.4; // Slightly lower for easier triggering
const PATTERN_WINDOW_MS = 2500;
const DEBOUNCE_MS = 500;

export function useShakeDetector(onShake: () => void, enabled: boolean) {
  const shakeCount = useRef(0);
  const firstShakeTime = useRef(0);
  const lastShakeTime = useRef(0);

  useEffect(() => {
    console.log('Shake detector enabled:', enabled);
    
    if (!enabled) return;

    // Check if accelerometer is available
    Accelerometer.isAvailableAsync().then(available => {
      console.log('Accelerometer available:', available);
      if (!available) {
        console.warn('Accelerometer not available on this device');
        return;
      }
    });
    
    // Low update interval is critical for detection
    Accelerometer.setUpdateInterval(50);
    
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x*x + y*y + z*z);
      const now = Date.now();

      // Debug: Log high magnitude readings
      if (mag > 1.5) {
        console.log('Accelerometer reading:', mag.toFixed(2));
      }

      if (mag > SHAKE_THRESHOLD) {
        console.log('Shake detected! Magnitude:', mag.toFixed(2), 'Count:', shakeCount.current + 1);
        
        if (now - lastShakeTime.current < DEBOUNCE_MS) return;

        Vibration.vibrate(100); // Feedback for detection

        if (now - firstShakeTime.current > PATTERN_WINDOW_MS) {
          shakeCount.current = 1;
          firstShakeTime.current = now;
        } else {
          shakeCount.current += 1;
        }

        lastShakeTime.current = now;

        if (shakeCount.current >= 3) {
          console.log('SOS TRIGGERED by shake!');
          Vibration.vibrate([0, 500, 200, 500]); // Major vibration for trigger
          shakeCount.current = 0;
          onShake();
        }
      }
    });

    return () => {
      sub.remove();
      shakeCount.current = 0;
    };
  }, [onShake, enabled]);
}
