# Context: MTB Property Mapper Integration

This context report consolidates technical findings, research, and data structures for building the MVP of the MTB Property Mapper.

## 1. Property Listing Data Source: RentCast API
RentCast offers real-time property listings and rental data. For our MVP, we will leverage the RentCast API.

### API Highlights
* **Endpoint for active listings:** `https://api.rentcast.io/v1/listings/sale` (or `/listings/rental/long-term`)
* **Request parameters:** `zipCode`, `city`, `state`, `status=active`, `limit=50`
* **Free Tier Quota:** 50 requests/month.
* **Fallbacks:** Due to the 50-request limit, the MVP must incorporate:
  1. **Strict Local Caching:** Caching search results in LocalStorage or an in-memory storage layer by city/zip code.
  2. **Mock Data Engine:** A robust mock generator that mimics the RentCast JSON structure for a few pre-defined high-profile MTB destinations (e.g., Golden, CO; Moab, UT; Bellingham, WA) to enable infinite local development and testing without burning API credits.

### Payload Structure (Example)
```json
[
  {
    "id": "prop_101",
    "formattedAddress": "123 Singletrack Way, Golden, CO 80401",
    "price": 650000,
    "bedrooms": 3,
    "bathrooms": 2,
    "squareFootage": 1800,
    "propertyType": "Single Family",
    "latitude": 39.7555,
    "longitude": -105.2211,
    "status": "Active"
  }
]
```

---

## 2. MTB Trail Data Source: OpenStreetMap (OSM) via Overpass API
Overpass API is a read-only API that serves custom queries of OpenStreetMap data. It is 100% free, has no API key requirement, and supports global geospatial queries.

### Query Strategy
To retrieve MTB trails in a bounding box centered on the user's searched coordinates:
1. Geocode the user's city/zip to get a center point (lat/lon).
2. Calculate a bounding box (e.g., +/- 10-mile radius).
3. Send an Overpass QL query searching for bicycle routes and mountain-bike specific ways.

### Overpass QL Query Template
```overpass
[out:json][timeout:25];
(
  // Find mountain bike routes
  relation["route"="mtb"]({{bbox}});
  way["route"="mtb"]({{bbox}});
  
  // Find paths tagged as mountain bike trails
  way["highway"="path"]["bicycle"="yes"]({{bbox}});
  way["highway"="path"]["mtb:scale"]({{bbox}});
);
out body;
>;
out skel qt;
```

---

## 3. Map Engine: Leaflet.js
To avoid costly Google Maps API bills, we will use **Leaflet.js** (open-source) with OpenStreetMap tile overlays.
* **Markers:** Property listings will be custom markers (e.g., showing the listing price directly on the pin).
* **Polylines:** MTB trails will be drawn as styled polylines (colored green/blue/black if `mtb:scale` or difficulty tags are present, or a default vibrant orange trail color).
* **Distance Calculations:** The system will calculate straight-line (Haversine) distance between each property coordinate and the nearest point on any trail polyline.

---

## 4. MVP Target Destinations (Golden Sandbox)
To make the app immediately testable, the system will provide a pre-loaded local "Sandbox Mode" for three iconic mountain bike towns:
1. **Golden, Colorado (Zip: 80401)**
2. **Moab, Utah (Zip: 84532)**
3. **Bellingham, Washington (Zip: 98225)**
