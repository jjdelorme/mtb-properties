import fs from 'fs';
import path from 'path';
import { Property, Trail, SearchResponse } from '../types';
import { calculateProximity } from './proximityService';

interface SandboxConfig {
  zips: string[];
  names: string[];
  normalized: string;
  center: { latitude: number; longitude: number };
  propertiesFile: string;
  trailsFile: string;
}

const SANDBOXES: Record<string, SandboxConfig> = {
  golden: {
    zips: ['80401'],
    names: ['golden', 'golden, co', 'golden co'],
    normalized: 'Golden, Colorado, USA',
    center: { latitude: 39.7555, longitude: -105.2211 },
    propertiesFile: '80401_properties.json',
    trailsFile: '80401_trails.json'
  },
  moab: {
    zips: ['84532'],
    names: ['moab', 'moab, ut', 'moab ut'],
    normalized: 'Moab, Utah, USA',
    center: { latitude: 38.5733, longitude: -109.5498 },
    propertiesFile: '84532_properties.json',
    trailsFile: '84532_trails.json'
  },
  bellingham: {
    zips: ['98225'],
    names: ['bellingham', 'bellingham, wa', 'bellingham wa'],
    normalized: 'Bellingham, Washington, USA',
    center: { latitude: 48.7519, longitude: -122.4787 },
    propertiesFile: '98225_properties.json',
    trailsFile: '98225_trails.json'
  }
};

export function getSandboxConfig(query: string): SandboxConfig | null {
  const normalizedQuery = query.trim().toLowerCase();
  
  for (const key of Object.keys(SANDBOXES)) {
    const config = SANDBOXES[key];
    if (config.zips.includes(normalizedQuery) || 
        config.names.includes(normalizedQuery) ||
        normalizedQuery.includes(key)) {
      return config;
    }
  }
  return null;
}

export function isSandboxQuery(query: string): boolean {
  return getSandboxConfig(query) !== null;
}

export function getSandboxData(query: string): SearchResponse {
  const config = getSandboxConfig(query);
  if (!config) {
    throw new Error(`Query "${query}" is not a sandbox query.`);
  }

  const dataDir = path.join(__dirname, '../data/sandbox');
  const propertiesPath = path.join(dataDir, config.propertiesFile);
  const trailsPath = path.join(dataDir, config.trailsFile);

  let rawProperties: Property[] = [];
  let rawTrails: Trail[] = [];

  try {
    const propertiesContent = fs.readFileSync(propertiesPath, 'utf8');
    rawProperties = JSON.parse(propertiesContent);
  } catch (err) {
    console.error(`Error reading sandbox properties from ${propertiesPath}:`, err);
  }

  try {
    const trailsContent = fs.readFileSync(trailsPath, 'utf8');
    rawTrails = JSON.parse(trailsContent);
  } catch (err) {
    console.error(`Error reading sandbox trails from ${trailsPath}:`, err);
  }

  // Execute proximity calculations and sorting on the fly
  const processedProperties = calculateProximity(rawProperties, rawTrails);

  return {
    searchQuery: query,
    normalizedLocation: config.normalized,
    center: config.center,
    properties: processedProperties,
    trails: rawTrails,
    source: 'sandbox'
  };
}
