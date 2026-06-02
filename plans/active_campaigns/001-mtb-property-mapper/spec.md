# Spec: 001-mtb-property-mapper

## User Story (The Why)
As an active mountain biker looking to purchase or rent a home,
I want to search for real estate listings by city or zip code and visualize them on a map combined with nearby mountain bike trail networks,
So that I can evaluate and prioritize properties based on their physical distance and convenient access to trails.

---

## Acceptance Criteria (The Contract)

### 1. Unified Search and Map Navigation
*   **Given** a user is on the homepage with an empty search bar,
*   **When** the user types in a valid city or zip code (e.g., "Golden, CO" or "80401") and triggers the search,
*   **Then** the application geocodes the location, pans/zooms the map to the target area, and fetches active real estate listings and MTB trails in parallel.

### 2. Double-Overlay Mapping
*   **Given** the search is successfully completed and coordinates are acquired,
*   **When** the map is rendered,
*   **Then** real estate listings must be represented as clickable pins (styled with price tags, e.g., "$650k"), and MTB trails must be rendered as colored polylines directly overlaying the map.

### 3. Automatic Proximity Calculation & Sorting
*   **Given** a set of active real estate listings and MTB trails are loaded,
*   **When** the user looks at the list view/sidebar,
*   **Then** each property listing must display the calculated straight-line distance to the closest MTB trail point (e.g., "0.8 miles to Apex Trail"), and the list must be sorted by default from closest to furthest.

### 4. Property Detail popups and Interactive Sync
*   **Given** property markers are loaded on the map,
*   **When** the user clicks a marker on the map or a list item in the sidebar,
*   **Then** the selected property is highlighted in both views, and a popup/detail card displays:
    *   Property price, beds, baths, address, and square footage.
    *   A photograph of the property (or placeholder if unavailable).
    *   The specific name and distance of the nearest trail network or trailhead.

---

## Edge Cases & Error Handling (Negative Space)

### 1. API Rate Limiting or Quota Exhaustion (RentCast API)
*   **Given** the system is running under the 50 calls/month free tier,
*   **When** an API call returns a `429 Too Many Requests` or `402 Payment Required`,
*   **Then** the system must display an inline notification: *"Live listings limit reached. Showing demo/cached listings for this area."*, and seamlessly fall back to local cached listings or generating realistic mock listings.

### 2. Invalid Location Search
*   **Given** the user inputs a gibberish search string (e.g., "xyz123abc"),
*   **When** the geocoding service fails to resolve coordinates,
*   **Then** the UI must display a clear message: *"Location not found. Please try a valid US city or zip code."* without crashing or displaying empty map tiles.

### 3. No Trails Found in Search Radius
*   **Given** the user searches for a city with no mapped mountain bike trails (e.g., a flat metropolitan area with no trail relations),
*   **When** the Overpass API returns an empty set of trail lines,
*   **Then** the map should display the property markers normally, and the sidebar list must indicate *"No MTB trails found within a 15-mile radius"* instead of throwing reference/calculation errors.

---

## Constraints (The "Do Nots")

*   **Do NOT** use commercial Google Maps APIs for geocoding, tile rendering, or routing (to keep costs at zero for the MVP). Use OpenStreetMap / Leaflet / Open-source geocoders.
*   **Do NOT** make real-time API requests to RentCast if a query is within the list of sandbox cities (**Golden, CO; Moab, UT; Bellingham, WA**). These must load immediately from pre-configured local mock JSON files to preserve API quota.
*   **Do NOT** load more than 50 properties at once per search to prevent rendering and API lag on the interactive map.
