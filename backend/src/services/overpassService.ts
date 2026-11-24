import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Trail, TrailDifficulty, TrailPoint } from '../types';
import { cacheService } from './cacheService';
import { haversineDistanceMiles } from './proximityService';

// Purge any stale synthetic cache files on load
export function purgeStaleSyntheticCache(): void {
  try {
    const cacheDir = path.join(__dirname, '../../data/cache');
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      for (const file of files) {
        if (file.startsWith('overpass_') && file.endsWith('.json')) {
          const filePath = path.join(cacheDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (
              content.includes('sim_trail') ||
              content.includes('Lower Loop Singletrack') ||
              content.includes('"data":[]') ||
              content.includes('"data": []')
            ) {
              fs.unlinkSync(filePath);
            }
          } catch (err) {
            console.debug(`Failed to read or unlink file during cleanOverpassCache: ${filePath}`);
          }
        }
      }
    }
  } catch (err) {
    console.debug(`Failed to read cache directory during cleanOverpassCache`);
  }
}

purgeStaleSyntheticCache();

// Bounding box helper (default 8 miles in degrees)
function getBoundingBox(lat: number, lon: number, radiusMiles: number = 8) {
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

function parseOSMMapXml(xmlData: string): Trail[] {
  const nodeMap = new Map<string, { latitude: number; longitude: number }>();
  const nodeRegex = /<node\s+([^>]*?)(?:\/>|>[\s\S]*?<\/node>)/g;
  let match: RegExpExecArray | null;
  while ((match = nodeRegex.exec(xmlData)) !== null) {
    const attrs = match[1];
    const idMatch = attrs.match(/\bid=["\x27]([^"\x27]+)["\x27]/);
    const latMatch = attrs.match(/\blat=["\x27]([^"\x27]+)["\x27]/);
    const lonMatch = attrs.match(/\blon=["\x27]([^"\x27]+)["\x27]/);
    if (idMatch && latMatch && lonMatch) {
      nodeMap.set(idMatch[1], {
        latitude: parseFloat(latMatch[1]),
        longitude: parseFloat(lonMatch[1])
      });
    }
  }

  const trails: Trail[] = [];
  const wayRegex = /<way\s+([^>]*?)>([\s\S]*?)<\/way>/g;
  while ((match = wayRegex.exec(xmlData)) !== null) {
    const wayAttrs = match[1];
    const wayBody = match[2];
    const idMatch = wayAttrs.match(/\bid=["\x27]([^"\x27]+)["\x27]/);
    if (!idMatch) continue;
    const wayId = idMatch[1];

    const tags: Record<string, string> = {};
    const tagRegex = /<tag\s+([^>]*?)\/?>/g;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRegex.exec(wayBody)) !== null) {
      const kMatch = tagMatch[1].match(/\bk=["\x27]([^"\x27]+)["\x27]/);
      const vMatch = tagMatch[1].match(/\bv=["\x27]([^"\x27]*?)["\x27]/);
      if (kMatch && vMatch) {
        tags[kMatch[1]] = vMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
      }
    }

    const highway = tags.highway;
    const isMtb = tags.route === 'mtb' || tags['mtb:scale'] !== undefined ||
      highway === 'path' || highway === 'cycleway' || highway === 'track' ||
      (highway === 'footway' && (tags.bicycle === 'yes' || tags.bicycle === 'designated'));

    if (!isMtb) continue;

    const ndRefs: string[] = [];
    const ndRegex = /<nd\s+[^>]*?ref=["\x27]([^"\x27]+)["\x27]/g;
    let ndMatch: RegExpExecArray | null;
    while ((ndMatch = ndRegex.exec(wayBody)) !== null) {
      ndRefs.push(ndMatch[1]);
    }

    const coordinates: TrailPoint[] = [];
    for (const ref of ndRefs) {
      const node = nodeMap.get(ref);
      if (node) coordinates.push(node);
    }
    if (coordinates.length < 2) continue;

    let lengthMiles = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      lengthMiles += haversineDistanceMiles(
        coordinates[i].latitude,
        coordinates[i].longitude,
        coordinates[i + 1].latitude,
        coordinates[i + 1].longitude
      );
    }

    trails.push({
      id: `way_${wayId}`,
      name: tags.name || tags.ref || 'Unnamed Trail',
      coordinates,
      difficulty: mapDifficulty(tags),
      highway: highway || 'path',
      rawTags: tags,
      lengthMiles: parseFloat(lengthMiles.toFixed(2))
    });
  }

  return trails;
}

function parseOSMMapJson(data: any): Trail[] {
  const elements = data.elements || [];
  const nodeMap = new Map<number | string, { latitude: number; longitude: number }>();
  for (const el of elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      nodeMap.set(el.id, { latitude: el.lat, longitude: el.lon });
    }
  }

  const trails: Trail[] = [];
  for (const el of elements) {
    if (el.type === 'way') {
      const tags = el.tags || {};
      const highway = tags.highway;
      const isMtb = tags.route === 'mtb' || tags['mtb:scale'] !== undefined ||
        highway === 'path' || highway === 'cycleway' || highway === 'track' ||
        (highway === 'footway' && (tags.bicycle === 'yes' || tags.bicycle === 'designated'));
      if (!isMtb) continue;

      let coordinates: TrailPoint[] = [];
      if (el.geometry && Array.isArray(el.geometry)) {
        coordinates = el.geometry.map((pt: any) => ({ latitude: pt.lat, longitude: pt.lon }));
      } else if (el.nodes && Array.isArray(el.nodes)) {
        for (const ref of el.nodes) {
          const node = nodeMap.get(ref);
          if (node) coordinates.push(node);
        }
      }
      if (coordinates.length < 2) continue;

      let lengthMiles = 0;
      for (let i = 0; i < coordinates.length - 1; i++) {
        lengthMiles += haversineDistanceMiles(
          coordinates[i].latitude,
          coordinates[i].longitude,
          coordinates[i + 1].latitude,
          coordinates[i + 1].longitude
        );
      }

      trails.push({
        id: `way_${el.id}`,
        name: tags.name || tags.ref || 'Unnamed Trail',
        coordinates,
        difficulty: mapDifficulty(tags),
        highway: highway || 'path',
        rawTags: tags,
        lengthMiles: parseFloat(lengthMiles.toFixed(2))
      });
    }
  }
  return trails;
}

async function fetchDirectOSMMap(lat: number, lon: number, radiusMiles: number = 8): Promise<Trail[]> {
  // Clamp bbox span to < 0.20° to prevent OSM 400 errors
  const maxSpan = 0.18;
  const latSpan = Math.min(2 * (radiusMiles / 69.0), maxSpan);
  const latRad = (lat * Math.PI) / 180;
  const lonSpan = Math.min(2 * (radiusMiles / (69.17 * Math.cos(latRad))), maxSpan);

  const attempts = [
    { latSpan, lonSpan },
    { latSpan: Math.min(latSpan, 0.08), lonSpan: Math.min(lonSpan, 0.08) },
    { latSpan: Math.min(latSpan, 0.05), lonSpan: Math.min(lonSpan, 0.05) },
    { latSpan: Math.min(latSpan, 0.03), lonSpan: Math.min(lonSpan, 0.03) }
  ];

  for (const span of attempts) {
    const west = lon - span.lonSpan / 2;
    const east = lon + span.lonSpan / 2;
    const south = lat - span.latSpan / 2;
    const north = lat + span.latSpan / 2;
    const bboxStr = `${west.toFixed(6)},${south.toFixed(6)},${east.toFixed(6)},${north.toFixed(6)}`;
    const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${bboxStr}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'MTBPropertyMapper/1.0 (contact@mtbproperties.app)',
          'Accept': 'application/xml, application/json, */*'
        },
        timeout: 10000,
        responseType: 'text'
      });

      if (response && response.status === 200 && response.data) {
        if (typeof response.data === 'string' && (response.data.includes('<osm') || response.data.startsWith('<?xml'))) {
          const parsed = parseOSMMapXml(response.data);
          if (parsed.length > 0) return parsed;
        } else if (typeof response.data === 'object') {
          const parsed = parseOSMMapJson(response.data);
          if (parsed.length > 0) return parsed;
        } else if (typeof response.data === 'string' && response.data.trim().startsWith('{')) {
          try {
            const parsed = parseOSMMapJson(JSON.parse(response.data));
            if (parsed.length > 0) return parsed;
          } catch (err) {
            console.warn('Failed to parse Overpass text response as JSON', err);
          }
        }
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        // Area had too many nodes (> 50,000), retry with smaller span
        continue;
      }
      break;
    }
  }

  return [];
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

function parseOverpassElements(elements: any[]): Trail[] {
  const trails: Trail[] = [];
  const seenWayIds = new Set<string>();
  const trailMap = new Map<string, Trail>();

  // Process standalone ways FIRST
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

      let lengthMiles = 0;
      for (let i = 0; i < coordinates.length - 1; i++) {
        lengthMiles += haversineDistanceMiles(
          coordinates[i].latitude,
          coordinates[i].longitude,
          coordinates[i + 1].latitude,
          coordinates[i + 1].longitude
        );
      }

      const wayId = String(el.id);
      seenWayIds.add(wayId);
      
      const trail: Trail = {
        id: `way_${wayId}`,
        name,
        coordinates,
        difficulty,
        highway,
        rawTags: tags,
        lengthMiles: parseFloat(lengthMiles.toFixed(2))
      };
      trails.push(trail);
      trailMap.set(wayId, trail);
    }
  }

  // Then process relation elements
  for (const el of elements) {
    if (el.type === 'relation') {
      for (const m of (el.members || [])) {
        if (m.type !== 'way' || !Array.isArray(m.geometry) || m.geometry.length === 0) {
          continue;
        }

        const wayId = String(m.ref ?? m.id);

        if (seenWayIds.has(wayId)) {
          // Do NOT duplicate. Only backfill name/difficulty if unnamed/unknown.
          const existing = trailMap.get(wayId);
          if (existing) {
            if (existing.name === 'Unnamed Trail' && el.tags?.name) {
              existing.name = el.tags.name;
            }
            if (existing.difficulty === 'unknown') {
              existing.difficulty = mapDifficulty(el.tags || {});
            }
          }
        } else {
          // Construct and push the Trail merging tags
          const mergedTags = { ...(el.tags || {}), ...(m.tags || {}) };
          const name = mergedTags.name || mergedTags.ref || 'Unnamed Trail';
          const highway = mergedTags.highway || 'path';
          const difficulty = mapDifficulty(mergedTags);

          const coordinates: TrailPoint[] = m.geometry.map((pt: any) => ({
            latitude: pt.lat,
            longitude: pt.lon
          }));

          let lengthMiles = 0;
          for (let i = 0; i < coordinates.length - 1; i++) {
            lengthMiles += haversineDistanceMiles(
              coordinates[i].latitude,
              coordinates[i].longitude,
              coordinates[i + 1].latitude,
              coordinates[i + 1].longitude
            );
          }

          seenWayIds.add(wayId);
          
          const trail: Trail = {
            id: `way_${wayId}`,
            name,
            coordinates,
            difficulty,
            highway,
            rawTags: mergedTags,
            lengthMiles: parseFloat(lengthMiles.toFixed(2))
          };
          trails.push(trail);
          trailMap.set(wayId, trail);
        }
      }
    }
  }

  return trails;
}

export async function fetchOSMTrails(lat: number, lon: number, radiusMiles: number = 8): Promise<Trail[]> {
  const cacheKey = `overpass_${lat.toFixed(4)}_${lon.toFixed(4)}`;

  // Check Cache
  const cached = cacheService.get<Trail[]>(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  const bbox = getBoundingBox(lat, lon, radiusMiles);
  const bboxStr = `${bbox.south.toFixed(6)},${bbox.west.toFixed(6)},${bbox.north.toFixed(6)},${bbox.east.toFixed(6)}`;

  const query = `
[out:json][timeout:10];
(
  relation["route"="mtb"](${bboxStr});
  way["route"="mtb"](${bboxStr});
  way["mtb:scale"](${bboxStr});
  way["highway"="cycleway"](${bboxStr});
  way["highway"="path"](${bboxStr});
  way["highway"="track"](${bboxStr});
);
out geom;
  `.trim();

  // Tier 1: Try Overpass mirrors
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await axios.post(
        endpoint,
        query,
        {
          headers: {
            'Content-Type': 'text/plain',
            'Accept': 'application/json',
            'User-Agent': 'MTBPropertyMapper/1.0 (contact@mtbproperties.app)'
          },
          timeout: 4000
        }
      );
      if (response && response.status === 200 && response.data?.elements && Array.isArray(response.data.elements)) {
        const trails = parseOverpassElements(response.data.elements);
        if (trails.length > 0) {
          cacheService.set(cacheKey, trails);
          return trails;
        }
        // If elements returned 0 trails, do NOT terminate or cache [] — try next mirror or direct OSM fallback
      }
    } catch (err: any) {
      console.warn(`Overpass mirror request failed, trying next`, err.message);
      // Continue to next mirror
    }
  }

  // Tier 2: Fallback to direct OSM 0.6 Map API
  try {
    const directTrails = await fetchDirectOSMMap(lat, lon, radiusMiles);
    if (directTrails.length > 0) {
      cacheService.set(cacheKey, directTrails);
      return directTrails;
    }
  } catch (osmError: any) {
    console.warn('Direct OSM 0.6 Map API fallback failed:', osmError?.message || osmError);
  }

  // Tier 3: Only cache [] if BOTH Overpass and direct OSM return 0 trails
  cacheService.set(cacheKey, []);
  return [];
}
