# API Contracts: MTB Property Mapper MVP

This document describes the API interactions, including internal routes and third-party external integrations.

## 1. Internal Backend API

### `GET /api/search`
Core endpoint to perform geocoding, real-estate listings fetching, MTB trail retrieval, and proximity calculations.

*   **Query Parameters:**
    *   `q` (string, required): The search query, which can be a ZIP code (e.g., `80401`) or a city and state (e.g., `Golden, CO`).
*   **Successful Response (200 OK):**
    *   **Content-Type:** `application/json`
    *   **Body:** Returns a `SearchResponse` object (see `data-model.md`).
*   **Error Responses:**
    *   **400 Bad Request:** Missing or empty search query.
        ```json
        { "error": "Search query 'q' is required." }
        ```
    *   **404 Not Found:** Location could not be geocoded.
        ```json
        { "error": "Location not found. Please try a valid US city or zip code." }
        ```
    *   **500 Internal Server Error:** Unexpected backend failures.
        ```json
        { "error": "An internal server error occurred while processing your request." }
        ```

---

## 2. External API Integrations

### A. Geocoding (OpenStreetMap Nominatim)
Used to convert the user's text search string into a precise latitude and longitude.

*   **URL:** `https://nominatim.openstreetmap.org/search`
*   **Method:** `GET`
*   **Query Parameters:**
    *   `q`: Search query string
    *   `format`: `json`
    *   `addressdetails`: `1`
    *   `limit`: `1`
    *   `countrycodes`: `us` (strictly filter US locations for the MVP)
*   **Headers:**
    *   `User-Agent`: `MTBPropertyMapper/1.0.0 (github.com/your-username/mtb-property-mapper)` (Mandatory by OSM Usage Policy)
*   **Raw Response Structure (Example):**
    ```json
    [
      {
        "place_id": 298150438,
        "licence": "Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright",
        "lat": "39.7555",
        "lon": "-105.2211",
        "display_name": "Golden, Jefferson County, Colorado, 80401, United States",
        "address": {
          "city": "Golden",
          "county": "Jefferson County",
          "state": "Colorado",
          "postcode": "80401",
          "country": "United States",
          "country_code": "us"
        }
      }
    ]
    ```

---

### B. Real Estate Listings (RentCast API)
Used to fetch active real estate listings.

*   **URL:** `https://api.rentcast.io/v1/listings/sale`
*   **Method:** `GET`
*   **Headers:**
    *   `X-Api-Key`: `<RENTCAST_API_KEY>` (Read from backend `.env`)
*   **Query Parameters:**
    *   `zipCode`: Passed if the search term maps to a zip.
    *   `city`: Passed if the search term maps to a city.
    *   `state`: Passed if the search term maps to a state (2-letter abbreviation).
    *   `status`: `active`
    *   `limit`: `50`
*   **Raw Response Structure (Example):**
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

### C. MTB Trails (OpenStreetMap Overpass API)
Used to fetch trails in a spatial bounding box.

*   **URL:** `https://overpass-api.de/api/interpreter`
*   **Method:** `POST`
*   **Content-Type:** `application/x-www-form-urlencoded`
*   **Request Body:** `data=<OverpassQL>` (URL encoded)
*   **Overpass QL Body:**
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
    *Note: Bounding box parameters `{{bbox}}` are formatted as `(south, west, north, east)`, calculated by calculating a 10-mile radius around the center coordinates.*

---

## 3. Sandboxed Local Datasets

To preserve free-tier API quotas and enable continuous integration and development, searches targeting the following regions bypass RentCast & Overpass entirely:
1.  **Golden, CO** (ZIP: `80401`)
2.  **Moab, UT** (ZIP: `84532`)
3.  **Bellingham, WA** (ZIP: `98225`)

### Mock/Pre-Fetched Payload Implementation
When a user searches for these cities, the backend routes the request to load cached files:
*   `backend/src/data/sandbox/80401_properties.json` and `80401_trails.json`
*   `backend/src/data/sandbox/84532_properties.json` and `84532_trails.json`
*   `backend/src/data/sandbox/98225_properties.json` and `98225_trails.json`

The backend reads these local files, executes the Proximity Calculation and Sorting on-the-fly, and responds immediately with `source: "sandbox"`.
