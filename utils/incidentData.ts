export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

/**
 * Mock data for safety heatmaps.
 * In a real app, this would come from a backend API of reported incidents.
 */
export const MOCK_INCIDENT_DATA: HeatmapPoint[] = [
  // Delhi Hub (High density clusters)
  { latitude: 28.6139, longitude: 77.2090, weight: 5 },
  { latitude: 28.6145, longitude: 77.2095, weight: 4 },
  { latitude: 28.6250, longitude: 77.2210, weight: 3 },
  { latitude: 28.6100, longitude: 77.2300, weight: 4 },
  { latitude: 28.6300, longitude: 77.2150, weight: 2 },
  { latitude: 28.6500, longitude: 77.1500, weight: 5 },
  { latitude: 28.6550, longitude: 77.1600, weight: 3 },

  // Mumbai & Thane (including Mumbra) Clusters
  { latitude: 19.0760, longitude: 72.8777, weight: 4 },
  { latitude: 19.0850, longitude: 72.8950, weight: 5 },
  { latitude: 19.0330, longitude: 72.8515, weight: 3 },
  { latitude: 19.1906, longitude: 73.0229, weight: 5 }, // Mumbra Center
  { latitude: 19.1850, longitude: 73.0300, weight: 4 }, // Near Mumbra Station
  { latitude: 19.1950, longitude: 73.0150, weight: 3 }, // Kausa area
  { latitude: 19.1764, longitude: 72.9781, weight: 4 }, // Thane vicinity
  { latitude: 19.1136, longitude: 72.8697, weight: 2 },

  // Bangalore Clusters
  { latitude: 12.9716, longitude: 77.5946, weight: 3 },
  { latitude: 12.9279, longitude: 77.6271, weight: 4 },
  { latitude: 12.9352, longitude: 77.5350, weight: 2 },
  { latitude: 13.0358, longitude: 77.5970, weight: 5 },
  { latitude: 12.9784, longitude: 77.6408, weight: 4 },

  // Chennai
  { latitude: 13.0827, longitude: 80.2707, weight: 3 },
  { latitude: 13.0405, longitude: 80.2337, weight: 2 },
  { latitude: 12.9171, longitude: 80.2281, weight: 4 },

  // Hyderabad
  { latitude: 17.3850, longitude: 78.4867, weight: 3 },
  { latitude: 17.4483, longitude: 78.3915, weight: 5 },
  { latitude: 17.3616, longitude: 78.4747, weight: 2 },

  // Kolkata
  { latitude: 22.5726, longitude: 88.3639, weight: 4 },
  { latitude: 22.5050, longitude: 88.3450, weight: 3 },
  { latitude: 22.5850, longitude: 88.4150, weight: 5 },
];
