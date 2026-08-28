export interface Property {
  id: string;
  formattedAddress: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  propertyType: string;
  latitude: number;
  longitude: number;
  status: "Active" | "Pending" | "Sold";
  photoUrl?: string;
  nearestTrail?: NearestTrailMetrics;
}

export interface NearestTrailMetrics {
  trailId: string;
  name: string;
  distanceMiles: number;
  closestPoint: {
    latitude: number;
    longitude: number;
  };
}

export interface TrailPoint {
  latitude: number;
  longitude: number;
}

export interface Trail {
  id: string;
  name: string;
  coordinates: TrailPoint[];
  difficulty: TrailDifficulty;
  highway: string;
  rawTags: Record<string, string>;
  lengthMiles?: number;
}

export type TrailDifficulty = "easy" | "intermediate" | "advanced" | "expert" | "unknown";

export interface CustomAddressAnalysis {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  nearestTrail?: NearestTrailMetrics;
  propertyType?: string;
  lotSize?: number;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  matchType?: 'exact' | 'alias' | 'street' | 'area';
}

export interface SearchResponse {
  searchQuery: string;
  normalizedLocation: string;
  center: {
    latitude: number;
    longitude: number;
  };
  properties: Property[];
  trails: Trail[];
  source: "live" | "sandbox" | "cache" | "fallback";
  message?: string;
  customAddress?: CustomAddressAnalysis;
}
