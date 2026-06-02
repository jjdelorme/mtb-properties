import axios from 'axios';
import { Trail, TrailDifficulty, TrailPoint } from '../types';
import { cacheService } from './cacheService';

// Bounding box helper (10 miles in degrees)
function getBoundingBox(lat: number, lon: number, radiusMiles: number = 10) {
  const milesPerDegreeLat = 69.0;
  const latOffset = radiusMiles / milesPerDegreeLat;

  const latRad = (lat * Math.PI) / 180;
  const milesPerDegreeLon = 69.17 * Math.cos(latRad);
  const lonOffset = radiusMiles / milesPerDegreeLon;

  return {
    south: lat - latOffset,
    west: lon - lonOffset,
    north: lat + latOffset,
    east: lon + lonOffset
  };
}

// Maps OSM tags to standardized TrailDifficulty
function mapDifficulty(tags: Record<string, string>): TrailDifficulty {
  const mtbScale = tags['mtb:scale'];
  if (mtbScale !== undefined) {
    const scale = parseInt(mtbScale, 10);
    if (scale === 0) return 'easy';
    if (scale === 1 || scale === 2) return 'intermediate';
    if (scale === 3 || scale === 4) return 'advanced';
    if (scale >= 5) return 'expert';
  }

  const difficulty = tags['difficulty']?.toLowerCase() || '';
  if (difficulty.includes('easy') || difficulty.includes('novice') || difficulty.includes('green')) {
    return 'easy';
  }
  if (difficulty.includes('intermediate') || difficulty.includes('blue')) {
    return 'intermediate';
  }
  if (difficulty.includes('advanced') || difficulty.includes('black')) {
    return 'advanced';
  }
  if (difficulty.includes('expert') || difficulty.includes('double_black')) {
    return 'expert';
  }

  const highway = tags['highway']?.toLowerCase() || '';
  if (highway === 'cycleway') {
    return 'easy';
  }

  return 'unknown';
}

export async function fetchOSMTrails(lat: number, lon: number): Promise<Trail[]> {
  const cacheKey = `overpass_${lat.toFixed(4)}_${lon.toFixed(4)}`;

  // Check Cache
  const cached = cacheService.get<Trail[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const bbox = getBoundingBox(lat, lon, 10);
  const bboxStr = `${bbox.south.toFixed(6)},${bbox.west.toFixed(6)},${bbox.north.toFixed(6)},${bbox.east.toFixed(6)}`;

  // Formulate Overpass QL Query using 'out geom' to get coordinates directly on ways
  const query = `
[out:json][timeout:25];
(
  way["route"="mtb"](${bboxStr});
  way["mtb:scale"](${bboxStr});
  way["highway"="path"]["bicycle"="yes"](${bboxStr});
  way["highway"~"path|track"](${bboxStr});
);
out geom;
  `.trim();

  try {
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MTBPropertyMapper/1.0.0 (contact@mtbpropertymapper.com)'
        }
      }
    );

    const elements = response.data?.elements || [];
    const trails: Trail[] = [];

    for (const el of elements) {
      if (el.type === 'way' && el.geometry && Array.isArray(el.geometry) && el.geometry.length > 0) {
        const tags = el.tags || {};
        const name = tags.name || tags.ref || 'Unnamed Trail';
        const highway = tags.highway || 'path';
        const difficulty = mapDifficulty(tags);

        const coordinates: TrailPoint[] = el.geometry.map((pt: any) => ({
          latitude: pt.lat,
          longitude: pt.lon
        }));

        trails.push({
          id: `way_${el.id}`,
          name,
          coordinates,
          difficulty,
          highway,
          rawTags: tags
        });
      }
    }

    // Cache the parsed trails
    cacheService.set(cacheKey, trails);

    return trails;
  } catch (error) {
    console.error('Overpass fetch error:', error);
    // Return empty array instead of crashing, caching empty is fine or don't cache on error
    return [];
  }
}
