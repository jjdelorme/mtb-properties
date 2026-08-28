import axios from 'axios';
import { cacheService } from './cacheService';
import { generateGeocodeCandidates, parseAddress, GeocodeCandidate } from './addressParser';
import { fetchRentCastProperty, RentCastPropertyRecord } from './rentCastService';

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
  matchType?: 'exact' | 'alias' | 'street' | 'area';
  propertyDetails?: RentCastPropertyRecord;
}

export async function geocodeAddress(query: string): Promise<GeocodeAddressResult> {
  const normalizedQuery = query.trim();
  const hexKey = `geocode_${Buffer.from(normalizedQuery.toLowerCase()).toString('hex')}`;
  
  // Check Cache
  const cached = cacheService.get<GeocodeAddressResult>(hexKey);
  if (cached) {
    return cached;
  }

  // Preloaded/Offline geocoding shortcuts
  const q = normalizedQuery.toLowerCase();
  if (['80401', 'golden', 'golden, co', 'golden co'].includes(q)) {
    const result: GeocodeAddressResult = {
      lat: 39.7555,
      lon: -105.2211,
      display_name: "Golden, Colorado, USA",
      address: { city: "Golden", state: "Colorado", postcode: "80401", country: "USA", country_code: "us" },
      matchType: 'exact'
    };
    cacheService.set(hexKey, result);
    return result;
  }
  if (['84532', 'moab', 'moab, ut', 'moab ut'].includes(q)) {
    const result: GeocodeAddressResult = {
      lat: 38.5733,
      lon: -109.5498,
      display_name: "Moab, Utah, USA",
      address: { city: "Moab", state: "Utah", postcode: "84532", country: "USA", country_code: "us" },
      matchType: 'exact'
    };
    cacheService.set(hexKey, result);
    return result;
  }
  if (['98225', 'bellingham', 'bellingham, wa', 'bellingham wa'].includes(q)) {
    const result: GeocodeAddressResult = {
      lat: 48.7519,
      lon: -122.4787,
      display_name: "Bellingham, Washington, USA",
      address: { city: "Bellingham", state: "Washington", postcode: "98225", country: "USA", country_code: "us" },
      matchType: 'exact'
    };
    cacheService.set(hexKey, result);
    return result;
  }

  const parsed = parseAddress(normalizedQuery);
  const candidates: GeocodeCandidate[] = generateGeocodeCandidates(normalizedQuery);

  // 1. If a house number is present, check RentCast property records for exact parcel-level pinpoint
  if (parsed.houseNumber) {
    const exactQueries = candidates
      .filter(c => c.query && (c.matchLevel === 'exact' || c.matchLevel === 'alias'))
      .map(c => c.query as string);

    for (const candidateQuery of exactQueries) {
      try {
        const propertyRecord = await fetchRentCastProperty(candidateQuery);
        if (propertyRecord && propertyRecord.latitude && propertyRecord.longitude) {
          const result: GeocodeAddressResult = {
            lat: propertyRecord.latitude,
            lon: propertyRecord.longitude,
            display_name: `${normalizedQuery}`,
            address: {
              city: propertyRecord.city || parsed.city,
              state: propertyRecord.state || parsed.state,
              postcode: propertyRecord.zipCode || parsed.postalcode,
              country: 'United States',
              country_code: 'us'
            },
            matchType: 'exact',
            propertyDetails: propertyRecord
          };

          cacheService.set(hexKey, result);
          return result;
        }
      } catch (_) {
        // Fall through to geocoding candidates
      }
    }
  }

  // 2. Cascade through Nominatim candidates
  for (const candidate of candidates) {
    try {
      const params: Record<string, any> = {
        format: 'json',
        addressdetails: 1,
        limit: 1,
        countrycodes: 'us'
      };

      if (candidate.structured) {
        if (candidate.structured.street) params.street = candidate.structured.street;
        if (candidate.structured.city) params.city = candidate.structured.city;
        if (candidate.structured.state) params.state = candidate.structured.state;
        if (candidate.structured.postalcode) params.postalcode = candidate.structured.postalcode;
      } else if (candidate.query) {
        params.q = candidate.query;
      }

      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params,
        headers: {
          'User-Agent': 'MTBPropertyMapper/1.0.0 (contact@mtbpropertymapper.com)'
        },
        timeout: 4500
      });

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
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
          },
          matchType: candidate.matchLevel
        };

        // Cache the result
        cacheService.set(hexKey, result);
        return result;
      }
    } catch (err) {
      continue;
    }
  }

  throw new Error(`Location "${normalizedQuery}" not found. Please try a valid US city, zip code, or full street address.`);
}
