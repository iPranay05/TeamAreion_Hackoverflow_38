import { getDistance } from './arrivalMonitor';

/**
 * Calculates the shortest distance between a point and a line segment.
 */
function distToSegment(lat: number, lng: number, lat1: number, lng1: number, lat2: number, lng2: number) {
  const d2 = Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2);
  if (d2 === 0) return getDistance(lat, lng, lat1, lng1);
  
  let t = ((lat - lat1) * (lat2 - lat1) + (lng - lng1) * (lng2 - lng1)) / d2;
  t = Math.max(0, Math.min(1, t));
  
  const projLat = lat1 + t * (lat2 - lat1);
  const projLng = lng1 + t * (lng2 - lng1);
  
  return getDistance(lat, lng, projLat, projLng);
}

/**
 * Checks if a location is further than 'threshold' meters from the given route polyline.
 */
export function isOffRoute(
  location: { latitude: number; longitude: number },
  polyline: { latitude: number; longitude: number }[],
  thresholdMeters: number = 75 // 75m buffer for road width and GPS jitter
) {
  if (polyline.length < 2) return false;

  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distToSegment(
      location.latitude,
      location.longitude,
      polyline[i].latitude,
      polyline[i].longitude,
      polyline[i + 1].latitude,
      polyline[i + 1].longitude
    );
    if (d < minDistance) minDistance = d;
  }

  return minDistance > thresholdMeters;
}
