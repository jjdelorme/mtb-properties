import axios from 'axios';
import { Property } from '../types';
import { cacheService } from './cacheService';
import { config } from '../config';

// 50 US States to 2-letter codes mapping
const STATE_MAP: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
  "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
  "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
  "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO",
  "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH",
  "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
  "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY"
};

function getStateCode(stateName?: string): string | undefined {
  if (!stateName) return undefined;
  const clean = stateName.trim().toLowerCase();
  if (clean.length === 2) return clean.toUpperCase();
  return STATE_MAP[clean];
}

export interface RentCastFetchResult {
  properties: Property[];
  fallback: boolean;
}

export async function fetchRentCastListings(
  lat: number,
  lon: number,
  addressDetails?: { city?: string; state?: string; postcode?: string }
): Promise<RentCastFetchResult> {
  const cacheKey = `rentcast_${lat.toFixed(4)}_${lon.toFixed(4)}`;

  // Check Cache
  const cached = cacheService.get<RentCastFetchResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const apiKey = config.RENTCAST_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.warn('RentCast API key is missing. Falling back to simulated listings.');
    const simulated = generateSimulatedProperties(lat, lon, addressDetails);
    const result: RentCastFetchResult = { properties: simulated, fallback: true };
    cacheService.set(cacheKey, result);
    return result;
  }

  try {
    const params: Record<string, any> = {
      status: 'active',
      limit: 50
    };

    // Use postcode or city/state if available
    const stateCode = getStateCode(addressDetails?.state);
    if (addressDetails?.postcode) {
      params.zipCode = addressDetails.postcode;
    } else if (addressDetails?.city && stateCode) {
      params.city = addressDetails.city;
      params.state = stateCode;
    } else {
      // If we don't have location parameters, RentCast allows searching by lat/long & radius
      params.latitude = lat;
      params.longitude = lon;
      params.radius = 10; // Default radius miles
    }

    const response = await axios.get('https://api.rentcast.io/v1/listings/sale', {
      params,
      headers: {
        'X-Api-Key': apiKey
      }
    });

    const listings = response.data || [];
    const properties: Property[] = listings.map((item: any) => ({
      id: item.id || `rentcast_${Math.random().toString(36).substr(2, 9)}`,
      formattedAddress: item.formattedAddress || 'Unknown Address',
      price: item.price || 0,
      bedrooms: item.bedrooms || 0,
      bathrooms: item.bathrooms || 0,
      squareFootage: item.squareFootage || 0,
      propertyType: item.propertyType || 'Single Family',
      latitude: item.latitude ? parseFloat(item.latitude) : lat,
      longitude: item.longitude ? parseFloat(item.longitude) : lon,
      status: 'Active',
      photoUrl: item.photoUrl
    }));

    const result: RentCastFetchResult = { properties, fallback: false };
    cacheService.set(cacheKey, result);
    return result;
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 429 || status === 402 || status === 401) {
      console.warn(`RentCast API returned status ${status}. Falling back to simulated listings.`);
      const simulated = generateSimulatedProperties(lat, lon, addressDetails);
      const result: RentCastFetchResult = { properties: simulated, fallback: true };
      cacheService.set(cacheKey, result);
      return result;
    }

    console.error('RentCast fetch error:', error);
    // On other API errors (e.g. network down), also fall back gracefully to keep map operational
    const simulated = generateSimulatedProperties(lat, lon, addressDetails);
    const result: RentCastFetchResult = { properties: simulated, fallback: true };
    cacheService.set(cacheKey, result);
    return result;
  }
}

function generateSimulatedProperties(
  lat: number,
  lon: number,
  addressDetails?: { city?: string; state?: string; postcode?: string }
): Property[] {
  const count = 12; // Standard 10-15 mock listings
  const properties: Property[] = [];
  const city = addressDetails?.city || 'Local Area';
  const state = getStateCode(addressDetails?.state) || addressDetails?.state || 'US';
  const postcode = addressDetails?.postcode || '';

  const streetNames = ['Apex', 'Oak', 'Pine', 'Singletrack', 'Ridgeline', 'Summit', 'Canyon', 'Boulder', 'Vista', 'Forest', 'Flow', 'Slickrock'];
  const propertyTypes = ['Single Family', 'Townhouse', 'Condo'];

  for (let i = 1; i <= count; i++) {
    // Generate lat/lon within +/- ~0.05 degrees (roughly 3.5 miles)
    const latOffset = (Math.random() - 0.5) * 0.08;
    const lonOffset = (Math.random() - 0.5) * 0.08;
    
    // Generate correlated prices, bed, bath, sqft
    const bedrooms = Math.floor(Math.random() * 4) + 2; // 2-5
    const bathrooms = bedrooms - (Math.random() > 0.5 ? 1 : 0.5); // reasonable bath count
    const squareFootage = bedrooms * 600 + Math.floor(Math.random() * 500); // 1200 - 3500
    const price = squareFootage * (250 + Math.floor(Math.random() * 200)); // correlated price

    const streetNum = Math.floor(Math.random() * 9000) + 100;
    const streetName = streetNames[i % streetNames.length];
    const formattedAddress = `${streetNum} ${streetName} Trail, ${city}, ${state} ${postcode}`.trim();

    properties.push({
      id: `sim_${Math.random().toString(36).substr(2, 9)}`,
      formattedAddress,
      price,
      bedrooms,
      bathrooms,
      squareFootage,
      propertyType: propertyTypes[i % propertyTypes.length],
      latitude: lat + latOffset,
      longitude: lon + lonOffset,
      status: 'Active'
    });
  }

  return properties;
}
