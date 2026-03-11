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
    if (!enabled) return;
    
    // Low update interval is critical for detection
    Accelerometer.setUpdateInterval(50);
    
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x*x + y*y + z*z);
      const now = Date.now();

      if (mag > SHAKE_THRESHOLD) {
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
