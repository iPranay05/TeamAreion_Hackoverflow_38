import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';

export interface CabTripInfo {
  destinationName: string;
  trackingUrl: string;
  originalText: string;
  driverName?: string;
  plateNumber?: string;
}

/**
 * Parses a string to find cab sharing patterns (Ola, Uber, etc.)
 */
export function parseCabSharingText(text: string): CabTripInfo | null {
  console.log('[cabSync] Parsing text:', text);
  
  // 1. First, try to extract Driver Name and Plate Number from ANY text
  // Indian Plate Pattern: MH 01 AB 1234 or UP16AB1234
  const plateRegex = /([A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4})/i;
  const plateMatch = text.match(plateRegex);
  const plateNumber = plateMatch ? plateMatch[1].toUpperCase() : undefined;

  // Driver Name Patterns: "Driver: Rahul", "Rahul is your driver", "Your driver Rahul"
  const driverRegex = /(?:driver:?\s+|your driver\s+|driver\s+named\s+)([A-Z][a-z]+)/i;
  const driverMatch = text.match(driverRegex);
  const driverName = driverMatch ? driverMatch[1] : undefined;

  // 2. Parse for specific cab provider patterns
  const patterns = [
    { name: 'Ola', regex: /ride with Ola:?\s*(https:\/\/ola\.onelink\.me\/\S+)/i },
    { name: 'Uber', regex: /trip to\s+(.*?)\.?\s*Follow along:?\s*(https:\/\/t\.uber\.com\/\S+)/i },
    { name: 'Generic', regex: /Track my journey to\s+(.*?):?\s*(https?:\/\/\S+)/i }
  ];

  for (const p of patterns) {
    const match = text.match(p.regex);
    if (match) {
      console.log(`[cabSync] Pattern matched: ${p.name}`);
      if (p.name === 'Ola') {
        return {
          destinationName: 'Ola Destination',
          trackingUrl: match[1],
          originalText: text,
          driverName,
          plateNumber
        };
      } else {
        return {
          destinationName: match[1].trim(),
          trackingUrl: match[2],
          originalText: text,
          driverName,
          plateNumber
        };
      }
    }
  }

  // 3. Check for specific cab domains anywhere in the text
  const urlMatches = text.match(/(https?:\/\/\S+)/gi);
  if (urlMatches) {
    for (const url of urlMatches) {
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('t.uber.com') || lowerUrl.includes('ola.onelink.me') || lowerUrl.includes('maps.google.com') || lowerUrl.includes('goo.gl/maps')) {
        console.log('[cabSync] Specific domain URL detected:', url);
        return {
          destinationName: 'Shared Destination',
          trackingUrl: url,
          originalText: text,
          driverName,
          plateNumber
        };
      }
    }
  }

  // Backup: Just look for a URL and keywords like "ride", "trip", "track"
  const urlMatch = text.match(/(https?:\/\/\S+)/);
  if (urlMatch && (/ride|trip|track|follow|journey/i.test(text))) {
    console.log('[cabSync] Backup URL match found');
    return {
      destinationName: 'Shared Destination',
      trackingUrl: urlMatch[0],
      originalText: text
    };
  }

  console.log('[cabSync] No match found');
  return null;
}

/**
 * Convenience function to get clipboard text and parse it
 */
export async function getCabTripFromClipboard(): Promise<CabTripInfo | null> {
  try {
    const text = await Clipboard.getStringAsync();
    if (!text) return null;
    return parseCabSharingText(text);
  } catch (error) {
    console.warn('Clipboard read error:', error);
    return null;
  }
}
