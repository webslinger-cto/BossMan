export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Rate limiter for Nominatim (requires 1 second between requests per their TOS)
let lastGeocodeRequest = 0;
const GEOCODE_RATE_LIMIT_MS = 1100; // 1.1 seconds to be safe

// Simple cache to reduce duplicate requests
const geocodeCache = new Map<string, Coordinates | null>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour cache
const cacheTimestamps = new Map<string, number>();

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastGeocodeRequest;
  
  if (elapsed < GEOCODE_RATE_LIMIT_MS) {
    const waitTime = GEOCODE_RATE_LIMIT_MS - elapsed;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastGeocodeRequest = Date.now();
}

function getCachedResult(address: string): Coordinates | null | undefined {
  const cached = geocodeCache.get(address);
  const timestamp = cacheTimestamps.get(address);
  
  if (cached !== undefined && timestamp && Date.now() - timestamp < CACHE_TTL_MS) {
    return cached;
  }
  
  // Cache expired
  geocodeCache.delete(address);
  cacheTimestamps.delete(address);
  return undefined;
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  // Check cache first
  const cached = getCachedResult(address);
  if (cached !== undefined) {
    console.log('Geocode cache hit for:', address);
    return cached;
  }
  
  try {
    // Rate limit compliance
    await waitForRateLimit();
    
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'ChicagoSewerExpertsCRM/1.0'
        }
      }
    );
    
    if (!response.ok) {
      console.error('Geocoding API error:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      console.log('No results found for address:', address);
      geocodeCache.set(address, null);
      cacheTimestamps.set(address, Date.now());
      return null;
    }
    
    const result: Coordinates = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon)
    };
    
    // Cache the result
    geocodeCache.set(address, result);
    cacheTimestamps.set(address, Date.now());
    
    return result;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
