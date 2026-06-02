import axios from 'axios';
import { cacheService } from './cacheService';

export interface GeocodeAddressResult {
  lat: number;
  lon: number;
  display_name: string;
  address: {
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export async function geocodeAddress(query: string): Promise<GeocodeAddressResult> {
  const normalizedQuery = query.trim();
  const hexKey = `geocode_${Buffer.from(normalizedQuery.toLowerCase()).toString('hex')}`;
  
  // Check Cache
  const cached = cacheService.get<GeocodeAddressResult>(hexKey);
  if (cached) {
    return cached;
  }

  // API Request to Nominatim
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: normalizedQuery,
        format: 'json',
        addressdetails: 1,
        limit: 1,
        countrycodes: 'us' // Filter strictly to US locations for MVP
      },
      headers: {
        'User-Agent': 'MTBPropertyMapper/1.0.0 (contact@mtbpropertymapper.com)'
      }
    });

    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      throw new Error(`Location "${normalizedQuery}" not found.`);
    }

    const first = response.data[0];
    const result: GeocodeAddressResult = {
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      display_name: first.display_name,
      address: {
        city: first.address?.city || first.address?.town || first.address?.village || first.address?.hamlet || first.address?.municipality,
        state: first.address?.state,
        postcode: first.address?.postcode,
        country: first.address?.country,
        country_code: first.address?.country_code
      }
    };

    // Cache the result
    cacheService.set(hexKey, result);

    return result;
  } catch (error: any) {
    if (error.message && error.message.includes('not found')) {
      throw error;
    }
    console.error(`Geocoding error for query "${normalizedQuery}":`, error);
    throw new Error(`Location "${normalizedQuery}" not found. Please try a valid US city or zip code.`);
  }
}
