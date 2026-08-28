export interface Property {
  id: string;                  // Unique identifier (from RentCast or Mock Engine)
  formattedAddress: string;    // e.g., "123 Singletrack Way, Golden, CO 80401"
  price: number;               // Asking price in USD
  bedrooms: number;            // Number of bedrooms
  bathrooms: number;           // Number of bathrooms
  squareFootage: number;       // Square footage of the home
  propertyType: string;        // e.g., "Single Family", "Condo", "Townhouse"
  latitude: number;            // Latitude coordinate
  longitude: number;           // Longitude coordinate
  status: "Active" | "Pending" | "Sold"; // Listing status
  photoUrl?: string;           // URL to listing photo (or null if unavailable)
  nearestTrail?: NearestTrailMetrics; // Calculated proximity to closest MTB trail
}

export interface NearestTrailMetrics {
  trailId: string;             // OSM Way/Relation ID of closest trail
  name: string;                // Name of the closest trail (e.g., "Apex Trail")
  distanceMiles: number;       // Straight-line distance in miles (formatted to 1 decimal)
  closestPoint: {
    latitude: number;          // Latitude of closest point on the trail polyline
    longitude: number;         // Longitude of closest point on the trail polyline
  };
}

export interface TrailPoint {
  latitude: number;
  longitude: number;
}

export type TrailDifficulty = "easy" | "intermediate" | "advanced" | "expert" | "unknown";

export interface Trail {
  id: string;                  // OSM element ID (e.g., "way/1234567")
  name: string;                // Trail name (falls back to "Unnamed Trail" if missing)
  coordinates: TrailPoint[];   // Ordered list of coordinates representing the trail line
  difficulty: TrailDifficulty; // Standardized difficulty level for color rendering
  highway: string;             // OSM highway classification (e.g., "path", "track", "cycleway")
  rawTags: Record<string, string>; // Unparsed OSM tags for extensibility
  lengthMiles?: number;        // Calculated trail length in miles
}

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
  searchQuery: string;         // The user's original query (e.g., "Golden, CO")
  normalizedLocation: string;  // Geocoded clean location (e.g., "Golden, CO, USA")
  center: {
    latitude: number;          // Lat of geocoded search center
    longitude: number;         // Lon of geocoded search center
  };
  properties: Property[];      // Property listings (sorted by nearestTrail.distanceMiles ascending)
  trails: Trail[];             // Array of nearby MTB trails
  source: "live" | "sandbox" | "cache" | "fallback"; // Highlighting current data source
  message?: string;            // Fallback warning if RentCast rate limits hit
  customAddress?: CustomAddressAnalysis;
}
