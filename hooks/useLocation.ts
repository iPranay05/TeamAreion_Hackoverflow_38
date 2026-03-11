import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export interface LocationData { latitude: number; longitude: number; accuracy: number | null; }

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setErrorMsg('Location permission denied'); setLoading(false); return null; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const data: LocationData = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, accuracy: loc.coords.accuracy };
      setLocation(data); setLoading(false); return data;
    } catch { setErrorMsg('Unable to get location'); setLoading(false); return null; }
  }, []);

  useEffect(() => { requestLocation(); }, []);

  const getMapLink = (loc?: LocationData | null) => {
    const l = loc ?? location;
    return l ? `https://maps.google.com/?q=${l.latitude},${l.longitude}` : '';
  };
  return { location, errorMsg, loading, requestLocation, getMapLink };
}
