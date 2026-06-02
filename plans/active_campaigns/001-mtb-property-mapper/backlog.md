# Backlog: 001-mtb-property-mapper

This backlog translates the Product Specification into highly actionable engineering tasks grouped by logical milestones. To maximize development efficiency and conserve the 50-request/month RentCast API quota, we employ a **"Local-First"** implementation strategy.

---

## 📅 Roadmap Milestones
*   **Milestone 1: Local Foundation & Mock Data Engine** (Zero API dependency, handles Golden, Moab, Bellingham sandboxes)
*   **Milestone 2: Map Visualization & Double-Overlay (Leaflet.js)** (Renders static/mock layers)
*   **Milestone 3: Geospatial Calculations & Sidebar Integration** (Haversine formula, sorting, interactive sync)
*   **Milestone 4: Real APIs & Robust Fallback Orchestrator** (RentCast/Overpass queries, LocalStorage caching, 429 fallback)
*   **Milestone 5: Error Handling, UI Polish & Final QA** (Empty states, invalid input handling, mobile responsiveness)

---

## 👤 User Stories & Prioritized Backlog

### Epic 1: Sandbox & Data Layer (Milestone 1)

#### 📝 US-1.1: Sandbox Cities Mock Data Engine
*   **As an** engineer developing or testing the application,
    **I want** a pre-loaded local mock data service containing high-fidelity property listings for Golden, Moab, and Bellingham,
    **So that** I can build and test the interface without using any RentCast API quota.
*   **Acceptance Criteria:**
    *   **Given** a search request for one of the three sandbox zip codes/cities (Golden, CO / 80401; Moab, UT / 84532; Bellingham, WA / 98225),
    *   **When** the data fetching layer receives the request,
    *   **Then** it must bypass the external RentCast API entirely and return the local mock data immediately.
    *   **Given** a mock property record is returned,
    *   **When** inspected,
    *   **Then** it must exactly match the RentCast API JSON format (containing `id`, `formattedAddress`, `price`, `bedrooms`, `bathrooms`, `squareFootage`, `propertyType`, `latitude`, `longitude`, `status`).
*   **Tasks:**
    *   [x] **Task 1.1.1:** Create local mock JSON files for Golden (80401), Moab (84532), and Bellingham (98225) with at least 5-10 realistic properties each. (Status: ✅ Implemented)
    *   [x] **Task 1.1.2:** Design a mock service/module (`MockDataService`) that serves these JSON files based on city/zip queries. (Status: ✅ Implemented)
    *   [x] **Task 1.1.3:** Build unit tests verifying that search requests for sandbox cities do not trigger actual HTTP requests to the RentCast API endpoint. (Status: ✅ Implemented)

#### 📝 US-1.2: Overpass Query Mocking & Caching
*   **As an** offline developer,
    **I want** to have pre-compiled OSM trail responses for the sandbox cities,
    **So that** development is fast, stable, and completely offline-capable.
*   **Acceptance Criteria:**
    *   **Given** a search is initiated in Golden, Moab, or Bellingham under local sandbox conditions,
    *   **When** the application attempts to fetch trails,
    *   **Then** it loads local geojson/mock OSM response files for trails in that area, allowing instant map rendering.
*   **Tasks:**
    *   [x] **Task 1.2.1:** Gather or generate OSM Overpass QL mock response payloads for the 3 sandbox zones. (Status: ✅ Implemented)
    *   [x] **Task 1.2.2:** Wire the mock Overpass service to supply these pre-loaded trails when sandbox mode is active. (Status: ✅ Implemented)

---

### Epic 2: Mapping & Visualization (Milestone 2 & 3)

#### 📝 US-2.1: Leaflet Map Setup & Custom Property Markers
*   **As a** homebuyer,
    **I want** to see search locations displayed on an interactive map with properties represented as price tags,
    **So that** I can visually inspect real estate options in my budget.
*   **Acceptance Criteria:**
    *   **Given** a set of property listings are loaded,
    *   **When** displayed on the Leaflet.js map,
    *   **Then** each listing must appear as a custom HTML marker containing the formatted price (e.g., "$650k" or "$1.2M") instead of a generic pin.
    *   **Given** a user clicks on a property map marker,
    *   **When** clicked,
    *   **Then** a Leaflet popup must display the property details (price, address, beds/baths, square footage, and photo/placeholder).
*   **Tasks:**
    *   [ ] **Task 2.1.1:** Integrate Leaflet.js into the front-end layout using OpenStreetMap tiles (no Google Maps).
    *   [ ] **Task 2.1.2:** Create a custom Leaflet DivIcon class/factory to render property listings as clickable text-based price tags.
    *   [ ] **Task 2.1.3:** Implement detail popup templates with image placeholders.

#### 📝 US-2.2: MTB Trail Overlay Styling
*   **As a** mountain biker,
    **I want** to see local trails drawn on the map as colored lines based on their difficulty level,
    **So that** I can quickly distinguish easy cruiser trails from technical descents.
*   **Acceptance Criteria:**
    *   **Given** OSM trail data is successfully loaded,
    *   **When** rendered as polylines on the Leaflet map,
    *   **Then** the lines must be styled dynamically:
        *   **Green** for easy trails (`mtb:scale` = 0 or similar tags).
        *   **Blue** for intermediate trails (`mtb:scale` = 1 or 2).
        *   **Black** for expert/advanced trails (`mtb:scale` >= 3 or `difficulty` = advanced/expert).
        *   **Vibrant Orange** as a fallback/default color if difficulty tags are missing.
*   **Tasks:**
    *   [ ] **Task 2.2.1:** Implement a parser that transforms OSM nodes/ways/relations from Overpass JSON into Leaflet multi-polylines.
    *   [ ] **Task 2.2.2:** Create a color mapping utility to read OSM tags (e.g., `mtb:scale`, `difficulty`, `highway`, `bicycle`) and assign the appropriate hex color.
    *   [ ] **Task 2.2.3:** Add trail name tooltips/popups when hovering or clicking trail lines.

#### 📝 US-2.3: Proximity Calculation Engine & Sidebar List
*   **As a** rider looking for prime trail access,
    **I want** to see how far each property is from the nearest singletrack and have the properties automatically sorted,
    **So that** I can focus my search on the most trail-accessible properties.
*   **Acceptance Criteria:**
    *   **Given** active properties and trail polylines are rendered,
    *   **When** the page loads/updates,
    *   **Then** the system must calculate the straight-line (Haversine) distance from each property's coordinates to the closest coordinate point on any trail line.
    *   **Given** the sidebar list of properties,
    *   **When** rendered,
    *   **Then** each card must show the distance (e.g., "0.4 miles to Apex Trail") and be sorted by default from closest to furthest.
*   **Tasks:**
    *   [ ] **Task 2.3.1:** Implement a pure JS/TS mathematical utility to find the minimum distance from a point to a segmented polyline using the Haversine formula.
    *   [ ] **Task 2.3.2:** Build the sidebar property list UI component with responsive scroll and hover/active states.
    *   [ ] **Task 2.3.3:** Integrate the distance calculation into the listings data array and trigger automatic sorting prior to rendering.

---

### Epic 3: Core API Integration & Quota Protection (Milestone 4)

#### 📝 US-3.1: Live Geocoding & Parallel Query Orchestrator
*   **As a** user searching for a non-sandbox city,
    **I want** the search bar to locate that city and load real data in real-time,
    **So that** I can explore any trail network in the US.
*   **Acceptance Criteria:**
    *   **Given** a user inputs an address/city/zip (not in the sandbox list),
    *   **When** they submit,
    *   **Then** the application geocodes the query using an open-source geocoder (e.g., Nominatim OSM) to find the center point coordinates.
    *   **Given** resolved coordinates,
    *   **When** fetching data,
    *   **Then** it fires simultaneous, parallel asynchronous calls to RentCast (`/listings/sale`) and Overpass API with a bounding box calculation (+/- 10-mile radius).
*   **Tasks:**
    *   [ ] **Task 3.1.1:** Integrate an open-source geocoding fetch client with rate-limiting respect (max 1 request/second).
    *   [ ] **Task 3.1.2:** Build the coordinate-to-bounding-box helper (calculating lat/lon offsets for a ~10-mile box).
    *   [ ] **Task 3.1.3:** Build the parallel coordinator that fires the geocoder, RentCast API client, and Overpass API client using `Promise.all` or structured async state.

#### 📝 US-3.2: RentCast API client with Strict Cache & Fallback Protection
*   **As an** administrator of the service,
    **I want** to protect the limited 50-request/month free tier RentCast API from exhaustion,
    **So that** the app remains functional for real visitors even if automated traffic or repeated queries occur.
*   **Acceptance Criteria:**
    *   **Given** a query for a non-sandbox city is initiated,
    *   **When** checked against LocalStorage/In-Memory Cache,
    *   **Then** if the same city/zip has been requested in the last 24 hours, the cached properties are loaded without hit to the external API.
    *   **Given** a live RentCast request is fired but fails due to a `429 Too Many Requests` or `402 Payment Required` code,
    *   **When** the failure occurs,
    *   **Then** the system must:
        1. Display a clean, non-disruptive inline banner: *"Live listings limit reached. Showing demo/cached listings for this area."*
        2. Fall back to generating realistic mock listings distributed randomly around the searched coordinates to keep the map fully operational.
*   **Tasks:**
    *   [ ] **Task 3.2.1:** Build a LocalStorage-backed caching engine (`PropertyCache`) that expires records after 24 hours.
    *   [ ] **Task 3.2.2:** Write the HTTP Client for RentCast API that captures 429, 402, and network errors.
    *   [ ] **Task 3.2.3:** Build a coordinate-based dynamic Mock Listing Generator that takes a center lat/lon and returns a realistic-looking array of 10-15 mock RentCast JSON listings.

---

### Epic 4: Edge Cases & Error Handling (Milestone 5)

#### 📝 US-4.1: Edge-Case Handling (No Trails / Invalid Location)
*   **As a** user,
    **I want** the system to gracefully handle bad inputs or areas with no trails,
    **So that** I never experience a frozen screen or broken map.
*   **Acceptance Criteria:**
    *   **Given** a search for a location that cannot be geocoded (e.g. "xyz123abc"),
    *   **When** submitted,
    *   **Then** the application shows an error: *"Location not found. Please try a valid US city or zip code."* and does not reset/crash the current map state.
    *   **Given** a search in a flat city with zero OSM trail lines (e.g. a flat metropolitan grid),
    *   **When** the Overpass query returns empty,
    *   **Then** the map displays the property markers normally, and the sidebar list shows: *"No MTB trails found within a 15-mile radius."* instead of failing math operations.
*   **Tasks:**
    *   [ ] **Task 4.1.1:** Add validation on the search input and robust try/catch blocks around the geocoder process.
    *   [ ] **Task 4.1.2:** Add checks to the distance calculation algorithm so that if the trail array is empty, it assigns a `null` or infinity distance, and the UI displays a clean fallback message.
    *   [ ] **Task 4.1.3:** Build interactive UI notifications and alert toasts for user feedback.

---

## 🛠️ Prioritized Engineering Backlog (Linear Checklist)

### Phase A: Setup & Sandboxes (Milestone 1)
- [x] **Task 1:** Initialize the frontend codebase framework (e.g., React, Vue, or Vanilla JS + Bundler). (Status: ✅ Completed)
- [x] **Task 2:** Create static sandbox asset JSONs: Golden (80401), Moab (84532), Bellingham (98225) containing mock properties and pre-queried trails. (Status: ✅ Completed)
- [x] **Task 3:** Create the Mock / Bypass logic to intercept calls to sandbox locations, ensuring zero API calls are made. (Status: ✅ Completed)

### Phase B: Mapping & Math (Milestones 2 & 3)
- [x] **Task 4:** Set up Leaflet map container and integrate free OpenStreetMap tile layers. (Status: ✅ Implemented)
- [x] **Task 5:** Build dynamic price-tag custom markers and trail multi-polyline parsing (including difficulty dynamic styling). (Status: ✅ Implemented)
- [x] **Task 6:** Implement the Haversine point-to-polyline minimum distance formula in JavaScript. (Status: ✅ Implemented)
- [x] **Task 7:** Code the responsive sidebar list with card highlights and sorting based on distance. (Status: ✅ Implemented)
- [x] **Task 8:** Wire up the map-to-sidebar selection sync (clicking pin opens sidebar details / clicking sidebar card highlights pin and opens map popup). (Status: ✅ Implemented)

### Phase C: API Orchestration & Cache (Milestone 4)
- [x] **Task 9:** Implement Nominatim geocoding engine with proper bounding box calculations. (Status: ✅ Implemented in backend/src/services/geocodingService.ts)
- [x] **Task 10:** Create RentCast and Overpass API query connectors. (Status: ✅ Implemented in backend/src/services/rentCastService.ts & overpassService.ts)
- [x] **Task 11:** Build LocalStorage caching middleware with a 24-hour expiration threshold. (Status: ✅ Implemented backend 24-hour persistent file caching in backend/src/services/cacheService.ts)
- [x] **Task 12:** Implement the RentCast Quota Exhaustion fallback mechanism (intercepting 429/402, showing warning banner, and auto-generating coordinates-based mock data). (Status: ✅ Implemented in rentCastService.ts and frontend StatusBanner.tsx)

### Phase D: Testing & Validation (Milestone 5)
- [ ] **Task 13:** Add input sanitization and geocoding failure screen overlays.
- [ ] **Task 14:** Handle "No trails found" scenario gracefully in distance calculation and UI lists.
- [ ] **Task 15:** Perform end-to-end sandbox mock testing and live validation on non-sandbox locations.
