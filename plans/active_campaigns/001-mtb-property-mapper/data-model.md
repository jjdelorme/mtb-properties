# Data Models: MTB Property Mapper MVP

This document outlines the TypeScript interfaces and internal data models utilized across the backend and frontend of the MTB Property Mapper MVP.

## 1. Core Interfaces

### Property
Represents a real estate listing. It extends the raw RentCast listing data with computed trail proximity metrics.

```typescript
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
```

### Trail (MTB Path)
Represents a mountain bike trail parsed and simplified from OpenStreetMap/Overpass API data.

```typescript
export interface TrailPoint {
  latitude: number;
  longitude: number;
}

export interface Trail {
  id: string;                  // OSM element ID (e.g., "way/1234567")
  name: string;                // Trail name (falls back to "Unnamed Trail" if missing)
  coordinates: TrailPoint[];   // Ordered list of coordinates representing the trail line
  difficulty: TrailDifficulty; // Standardized difficulty level for color rendering
  highway: string;             // OSM highway classification (e.g., "path", "track", "cycleway")
  rawTags: Record<string, string>; // Unparsed OSM tags for extensibility
}

export type TrailDifficulty = "easy" | "intermediate" | "advanced" | "expert" | "unknown";
```

### Difficulty Mapping Rule
To translate OpenStreetMap tags into standardized UI colors:
* **`easy` (Green):** `mtb:scale` is `"0"` or `"1"`, OR `difficulty` is `"easy"`.
* **`intermediate` (Blue):** `mtb:scale` is `"2"`, OR `difficulty` is `"intermediate"` or `"moderate"`.
* **`advanced` (Black):** `mtb:scale` is `"3"` or `"4"`, OR `difficulty` is `"advanced"` or `"hard"`.
* **`expert` (Double Black):** `mtb:scale` is `"5"` or `"6"`, OR `difficulty` is `"expert"`.
* **`unknown` (Orange - Default):** Default fallback if no difficulty metadata is available.

---

## 2. API Responses

### Search Response
Returned by the backend `GET /api/search` endpoint.

```typescript
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
}
```

---

## 3. Cache Data Layout
To maximize caching efficiency under severe API limits, cache files will be stored in `backend/data/cache/` using the file-system:

### Geocoding Cache File
* **Filename:** `geocode_<hash_of_query>.json`
* **Structure:**
  ```json
  {
    "query": "golden co",
    "normalized": "Golden, Colorado, United States",
    "lat": 39.7555,
    "lon": -105.2211,
    "cachedAt": 1718134400000
  }
  ```

### Listings/Trails Cache File
* **Filename:** `data_<hash_of_query>.json`
* **Structure:** Saves the entire `SearchResponse` schema so the backend can serve repeated searches with ZERO external API overhead.
