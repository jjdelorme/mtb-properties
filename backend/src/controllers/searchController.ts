import { Request, Response } from 'express';
import { geocodeAddress } from '../services/geocodingService';
import { fetchRentCastListings } from '../services/rentCastService';
import { fetchOSMTrails } from '../services/overpassService';
import { calculateProximity, haversineDistanceMiles } from '../services/proximityService';
import { cacheService } from '../services/cacheService';
import { SearchResponse, CustomAddressAnalysis } from '../types';

export async function searchController(req: Request, res: Response): Promise<void> {
  try {
    const { q, type } = req.query;
    const searchType = type === 'address' ? 'address' : 'area';

    if (!q || typeof q !== 'string' || q.trim() === '') {
      res.status(400).json({ error: "Search query 'q' is required." });
      return;
    }

    const searchQuery = q.trim();

    // 1. Geocode address via parcel-level RentCast lookups & intelligent geocoding waterfall
    let geocodeResult;
    try {
      geocodeResult = await geocodeAddress(searchQuery);
    } catch (error: any) {
      res.status(404).json({
        error: error.message || `Location "${searchQuery}" not found. Please try a valid US city, zip code, or street address.`
      });
      return;
    }

    const { lat, lon, display_name, address, matchType, propertyDetails } = geocodeResult;

    // 2. Determine if this location lies within Golden, Moab, or Bellingham to map to preloaded sandbox data
    let lookupLat = lat;
    let lookupLon = lon;
    let isPreloaded = false;

    const postcode = address?.postcode;
    const city = address?.city?.toLowerCase();

    if (postcode === '80401' || city === 'golden') {
      lookupLat = 39.7555;
      lookupLon = -105.2211;
      isPreloaded = true;
    } else if (postcode === '84532' || city === 'moab') {
      lookupLat = 38.5733;
      lookupLon = -109.5498;
      isPreloaded = true;
    } else if (postcode === '98225' || city === 'bellingham') {
      lookupLat = 48.7519;
      lookupLon = -122.4787;
      isPreloaded = true;
    }

    // 3. Check full search result cache (searchType & normalized-location based)
    const searchCacheKey = `search_${searchType}_${Buffer.from(display_name.toLowerCase()).toString('hex')}`;
    const cachedResponse = cacheService.get<SearchResponse>(searchCacheKey);
    if (cachedResponse) {
      res.status(200).json({
        ...cachedResponse,
        source: 'cache'
      });
      return;
    }

    // 4. Parallel fetch trails & listings around the exact coordinate location
    const [rentCastResult, trails] = await Promise.all([
      fetchRentCastListings(lookupLat, lookupLon, address),
      fetchOSMTrails(lat, lon)
    ]);

    // 5. Calculate proximity metrics & sort surrounding properties
    const processedProperties = calculateProximity(rentCastResult.properties, trails);

    // 6. Handle Custom Address analysis if requested or if query is a specific street address
    let customAddressAnalysis: CustomAddressAnalysis | undefined = undefined;
    const isStreetAddress = searchType === 'address' || /^\d+[\w-]*\s+/.test(searchQuery) || /\([^)]+\)/.test(searchQuery) || matchType === 'exact';

    if (isStreetAddress) {
      let minDistance = Infinity;
      let nearestTrail: any = undefined;

      for (const trail of trails) {
        for (const point of trail.coordinates) {
          const dist = haversineDistanceMiles(lat, lon, point.latitude, point.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            nearestTrail = {
              trailId: trail.id,
              name: trail.name,
              distanceMiles: parseFloat(dist.toFixed(1)),
              closestPoint: point
            };
          }
        }
      }

      customAddressAnalysis = {
        formattedAddress: display_name,
        latitude: lat,
        longitude: lon,
        matchType,
        ...(propertyDetails ? {
          propertyType: propertyDetails.propertyType,
          lotSize: propertyDetails.lotSize,
          yearBuilt: propertyDetails.yearBuilt,
          bedrooms: propertyDetails.bedrooms,
          bathrooms: propertyDetails.bathrooms,
          squareFootage: propertyDetails.squareFootage,
        } : {}),
        ...(nearestTrail ? { nearestTrail } : {})
      };
    }

    // 7. Build response
    const source = isPreloaded ? 'sandbox' : (rentCastResult.fallback ? 'fallback' : 'live');
    const message = rentCastResult.fallback
      ? 'Live listings limit reached. Showing demo/cached listings for this area.'
      : undefined;

    const responseData: SearchResponse = {
      searchQuery,
      normalizedLocation: display_name,
      center: (searchType === 'address' || isStreetAddress) ? { latitude: lat, longitude: lon } : { latitude: lookupLat, longitude: lookupLon },
      properties: processedProperties,
      trails,
      source,
      ...(customAddressAnalysis ? { customAddress: customAddressAnalysis } : {}),
      ...(message ? { message } : {})
    };

    // 8. Store in persistent cache
    cacheService.set(searchCacheKey, responseData);

    res.status(200).json(responseData);
  } catch (error: any) {
    console.error('Error in searchController:', error);
    res.status(500).json({ error: 'An internal server error occurred while processing your request.' });
  }
}
