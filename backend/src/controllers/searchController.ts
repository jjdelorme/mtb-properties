import { Request, Response } from 'express';
import { isSandboxQuery, getSandboxData } from '../services/mockDataService';
import { geocodeAddress } from '../services/geocodingService';
import { fetchRentCastListings } from '../services/rentCastService';
import { fetchOSMTrails } from '../services/overpassService';
import { calculateProximity } from '../services/proximityService';
import { cacheService } from '../services/cacheService';
import { SearchResponse } from '../types';

export async function searchController(req: Request, res: Response): Promise<void> {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim() === '') {
      res.status(400).json({ error: "Search query 'q' is required." });
      return;
    }

    const searchQuery = q.trim();

    // 1. Check if sandbox query
    if (isSandboxQuery(searchQuery)) {
      const result = getSandboxData(searchQuery);
      res.status(200).json(result);
      return;
    }

    // 2. Geocode address via Nominatim
    let geocodeResult;
    try {
      geocodeResult = await geocodeAddress(searchQuery);
    } catch (error: any) {
      res.status(404).json({
        error: error.message || `Location "${searchQuery}" not found. Please try a valid US city or zip code.`
      });
      return;
    }

    const { lat, lon, display_name, address } = geocodeResult;

    // 3. Check full search result cache (normalized location based)
    const searchCacheKey = `search_${Buffer.from(display_name.toLowerCase()).toString('hex')}`;
    const cachedResponse = cacheService.get<SearchResponse>(searchCacheKey);
    if (cachedResponse) {
      res.status(200).json({
        ...cachedResponse,
        source: 'cache' // Ensure source is cache on cache hit
      });
      return;
    }

    // 4. Parallel fetch from RentCast & Overpass (with robust fallbacks)
    const [rentCastResult, trails] = await Promise.all([
      fetchRentCastListings(lat, lon, address),
      fetchOSMTrails(lat, lon)
    ]);

    // 5. Calculate proximity metrics & sort properties
    const processedProperties = calculateProximity(rentCastResult.properties, trails);

    // 6. Build response
    const source = rentCastResult.fallback ? 'fallback' : 'live';
    const message = rentCastResult.fallback
      ? 'Live listings limit reached. Showing demo/cached listings for this area.'
      : undefined;

    const responseData: SearchResponse = {
      searchQuery,
      normalizedLocation: display_name,
      center: { latitude: lat, longitude: lon },
      properties: processedProperties,
      trails,
      source,
      ...(message ? { message } : {})
    };

    // 7. Store in cache
    cacheService.set(searchCacheKey, responseData);

    res.status(200).json(responseData);
  } catch (error: any) {
    console.error('Error in searchController:', error);
    res.status(500).json({ error: 'An internal server error occurred while processing your request.' });
  }
}
