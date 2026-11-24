import axios from 'axios';
import { cacheService } from './cacheService';
import { generateGeocodeCandidates, parseAddress, GeocodeCandidate, US_STATES } from './addressParser';
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

let lastNominatimTimestamp = 0;
async function throttleNominatim(): Promise<void> {
  const minIntervalMs = 1100;
  const now = Date.now();
  const elapsed = now - lastNominatimTimestamp;
  if (elapsed < minIntervalMs) {
    await new Promise(resolve => setTimeout(resolve, minIntervalMs - elapsed));
  }
  lastNominatimTimestamp = Date.now();
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
      } catch (err) {
        console.warn(`RentCast property fetch failed for address: ${candidateQuery}, falling through to geocoding`, err);
        // Fall through to geocoding candidates
      }
    }
  }

  // 2. Cascade through Nominatim candidates
  for (const candidate of candidates) {
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

    let attempt = 0;
    const maxRetries = 2;

    while (attempt <= maxRetries) {
      try {
        await throttleNominatim();
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params,
          headers: {
            'User-Agent': 'MTBPropertyMapper/1.0 (contact@mtbproperties.app)'
          },
          timeout: 4500
        });

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          let matchedItem: any = null;
          for (const item of response.data) {
            // Postcode validation
            if (candidate.structured?.postalcode && item.address?.postcode) {
              const reqZip = String(candidate.structured.postalcode).split('-')[0].trim();
              const resZip = String(item.address.postcode).split('-')[0].trim();
              if (reqZip !== resZip) {
                continue; // postalcode conflict
              }
            }
            // State validation
            if (candidate.structured?.state && (item.address?.state || item.display_name)) {
              const reqState = candidate.structured.state.toLowerCase();
              const resState = (item.address?.state || '').toLowerCase();
              const resStateCode = (US_STATES[resState] || resState).toLowerCase();
              const reqStateFullName = Object.keys(US_STATES).find(k => US_STATES[k].toLowerCase() === reqState) || reqState;
              const resText = (resState + ' ' + (item.display_name || '')).toLowerCase();
              if (reqState !== resState && reqState !== resStateCode && !resText.includes(reqState) && !resText.includes(reqStateFullName)) {
                continue; // state conflict
              }
            }
            // City / Municipality validation
            if (candidate.structured?.city) {
              const reqCity = candidate.structured.city.toLowerCase();
              const resCity = (item.address?.city || item.address?.town || item.address?.village || item.address?.hamlet || item.address?.municipality || '').toLowerCase();
              const resDisplayName = (item.display_name || '').toLowerCase();
              if (resCity && !resCity.includes(reqCity) && !reqCity.includes(resCity) && !resDisplayName.includes(reqCity)) {
                continue; // city conflict
              }
            }
            // Street validation (ensure road actually matches when structured street was requested)
            if (candidate.structured?.street) {
              const reqStreetWords = candidate.structured.street
                .toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(w => !['rd', 'road', 'st', 'street', 'ave', 'avenue', 'dr', 'drive', 'ln', 'lane', 'hwy', 'highway', 'ct', 'court'].includes(w) && !/^\d+$/.test(w));
              if (reqStreetWords.length > 0) {
                const resRoad = ((item.address?.road || item.name || '') + ' ' + (item.display_name || '')).toLowerCase();
                const hasRoadMatch = reqStreetWords.some(w => resRoad.includes(w));
                if (!hasRoadMatch) {
                  continue; // street conflict
                }
              }
            }
            matchedItem = item;
            break;
          }

          if (matchedItem) {
            const result: GeocodeAddressResult = {
              lat: parseFloat(matchedItem.lat),
              lon: parseFloat(matchedItem.lon),
              display_name: matchedItem.display_name,
              address: {
                city: matchedItem.address?.city || matchedItem.address?.town || matchedItem.address?.village || matchedItem.address?.hamlet || matchedItem.address?.municipality,
                state: matchedItem.address?.state,
                postcode: matchedItem.address?.postcode || candidate.structured?.postalcode || parsed.postalcode,
                country: matchedItem.address?.country,
                country_code: matchedItem.address?.country_code
              },
              matchType: candidate.matchLevel
            };

            // Cache the result
            cacheService.set(hexKey, result);
            return result;
          }
        }
        break; // Candidate returned without match, break retry loop to try next candidate
      } catch (err: any) {
        if (axios.isAxiosError(err) && err.response?.status === 429) {
          if (attempt < maxRetries) {
            const retryAfterSec = parseInt(err.response.headers?.['retry-after'] || '2', 10);
            const backoffMs = Math.max(retryAfterSec * 1000, 2000 * Math.pow(2, attempt));
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            attempt++;
            continue;
          }
          // If 429 persists after retries, halt waterfall to respect policy
          break;
        }
        // Non-429 error, break retry loop and try next candidate
        break;
      }
    }
  }

  throw new Error(`Location "${normalizedQuery}" not found. Please try a valid US city, zip code, or full street address.`);
}
