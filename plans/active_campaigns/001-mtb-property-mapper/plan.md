# Technical Plan: 001-MTB-Property-Mapper

## 🔍 Analysis & Context
*   **Objective:** Design and build the MTB Property Mapper MVP, enabling active mountain bikers to search for homes by city/ZIP code and visualize them on an interactive double-overlay map alongside nearby mountain bike trails, sorted automatically by trail proximity.
*   **Affected Files:** None (greenfield development). The following new files will be created:
    *   **Backend:**
        *   `backend/package.json`, `backend/tsconfig.json`
        *   `backend/src/index.ts`, `backend/src/config.ts`
        *   `backend/src/controllers/searchController.ts`
        *   `backend/src/services/geocodingService.ts`
        *   `backend/src/services/rentCastService.ts`
        *   `backend/src/services/overpassService.ts`
        *   `backend/src/services/proximityService.ts`
        *   `backend/src/data/sandbox/*.json` (Golden, Moab, Bellingham datasets)
    *   **Frontend:**
        *   `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.js`
        *   `frontend/index.html`
        *   `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/types.ts`
        *   `frontend/src/hooks/usePropertySearch.ts`
        *   `frontend/src/components/{SearchBar, PropertyMap, PropertySidebar, PropertyCard, StatusBanner}.tsx`
*   **Key Dependencies:**
    *   *Backend:* Node.js, Express, TypeScript, Axios, CORS, Dotenv, Jest (for testing).
    *   *Frontend:* React (TypeScript), Vite, TailwindCSS, Leaflet, React-Leaflet, Lucide-React, Axios, Vitest (for testing).
*   **Risks/Edge Cases:**
    *   *RentCast Free-Tier Quota (50 calls/mo):* Mitigated via strict local caching (file-based persistent JSON cache on backend) and realistic local mock listings generator when limits are hit.
    *   *Overpass API Response Complexity:* OSM Overpass returns disjointed element relations, ways, and nodes. Mitigated by building a custom, highly optimized parser in `overpassService.ts` that maps node references to coordinates and returns simplified trail polylines to the client.
    *   *Leaflet CSS Load Issues:* Standard react-leaflet maps can render broken tiles if the CSS stylesheet is not imported. Mitigated by explicit styling checks in `index.html` and custom marker configurations.

---

## 📋 Task Execution (Parallel Groups)

### Group 1 (Parallel Execution - Independent Setup & Sandboxes)
- [x] Task 1.A: Monorepo Boilerplate & Dependency Configuration [`backend/package.json`, `frontend/package.json`]
- [x] Task 1.B: Sandbox Dataset Seeding for Golden, Moab, and Bellingham [`backend/src/data/sandbox/*.json`]

### Group 2 (Sequential Execution - Backend Logic Setup)
- [ ] Task 2.A: Core API & Cache Services Integration [`backend/src/services/{geocodingService, rentCastService, overpassService}.ts`]
- [x] Task 2.B: Proximity Service (Haversine & Sorting Engine) [`backend/src/services/proximityService.ts`]

### Group 3 (Sequential Execution - Backend Endpoint API)
- [x] Task 3.A: Express Server Setup, Controller and Routes `/api/search` [`backend/src/index.ts`, `backend/src/controllers/searchController.ts`]

### Group 4 (Sequential Execution - Frontend Logic)
- [x] Task 4.A: Frontend Search State & Custom Hooks [`frontend/src/hooks/usePropertySearch.ts`, `frontend/src/types.ts`] (Status: ✅ Integrated in App.tsx state & usePropertySearch.test equivalents)
- [x] Task 4.B: Search Bar, Sidebar, Card, and Status Banner Components [`frontend/src/components/{SearchBar, PropertySidebar, PropertyCard, StatusBanner}.tsx`] (Status: ✅ Implemented)

### Group 5 (Sequential Execution - Interactive Mapping & UI Assembly)
- [x] Task 5.A: Leaflet PropertyMap Component with Custom Markers & Colored Trails [`frontend/src/components/PropertyMap.tsx`] (Status: ✅ Implemented)
- [x] Task 5.B: Main App Split-Screen Dashboard & Styles [`frontend/src/App.tsx`, `frontend/src/index.css`] (Status: ✅ Implemented)

---

## 📝 Step-by-Step Implementation Details

### Prerequisites
1.  Initialize git-ignored configuration: create `backend/.env` containing:
    ```env
    PORT=4000
    RENTCAST_API_KEY=your_rentcast_api_key_here
    ```

---

### Group 1 (Foundation Setup)

#### Task 1.A: Monorepo Boilerplate & Dependency Configuration
1.  **Step 1 (The Unit Test Harness):** Define testing files and packages.
    *   *Target File:* `backend/package.json` and `frontend/package.json`
    *   *Action:* Include Jest configurations for backend and Vitest configs for frontend to verify setup integrity.
2.  **Step 2 (The Implementation):** Write package configuration files.
    *   *Target File:* `backend/package.json`
    ```json
    {
      "name": "mtb-property-mapper-backend",
      "version": "1.0.0",
      "scripts": {
        "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
        "build": "tsc",
        "start": "node dist/index.js",
        "test": "jest"
      },
      "dependencies": {
        "express": "^4.19.2",
        "cors": "^2.8.5",
        "dotenv": "^16.4.5",
        "axios": "^1.7.2"
      },
      "devDependencies": {
        "typescript": "^5.4.5",
        "@types/express": "^4.17.21",
        "@types/cors": "^2.8.17",
        "@types/node": "^20.12.12",
        "ts-node-dev": "^2.0.0",
        "jest": "^29.7.0",
        "ts-jest": "^29.1.2",
        "@types/jest": "^29.5.12"
      }
    }
    ```
    *   *Target File:* `frontend/package.json`
    ```json
    {
      "name": "mtb-property-mapper-frontend",
      "private": true,
      "version": "1.0.0",
      "type": "module",
      "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "test": "vitest run"
      },
      "dependencies": {
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "leaflet": "^1.9.4",
        "react-leaflet": "^4.2.1",
        "lucide-react": "^0.378.0",
        "axios": "^1.7.2"
      },
      "devDependencies": {
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        "@types/leaflet": "^1.9.12",
        "vite": "^5.2.11",
        "tailwindcss": "^3.4.3",
        "postcss": "^8.4.38",
        "autoprefixer": "^8.5.0",
        "typescript": "^5.4.5",
        "vitest": "^1.6.0"
      }
    }
    ```
3.  **Step 3 (The Verification):** Execute module install and basic compiles.
    *   *Action:* Run `npm install` in both directories, verifying that no dependency or version conflicts occur.

#### Task 1.B: Sandbox Dataset Seeding
1.  **Step 1 (The Unit Test Harness):** Establish data-loading unit tests.
    *   *Target File:* `backend/src/tests/sandbox.test.ts`
    *   *Test Cases to Write:* Verify files exist, are valid JSON, contain an array of listings, and match coords ranges for Golden, Moab, and Bellingham.
2.  **Step 2 (The Implementation):** Create pre-fetched JSON files.
    *   *Target File:* `backend/src/data/sandbox/80401_properties.json`
    ```json
    [
      {
        "id": "prop_golden_1",
        "formattedAddress": "101 Apex Trail Way, Golden, CO 80401",
        "price": 850000,
        "bedrooms": 3,
        "bathrooms": 2.5,
        "squareFootage": 2100,
        "propertyType": "Single Family",
        "latitude": 39.7163,
        "longitude": -105.2295,
        "status": "Active"
      },
      {
        "id": "prop_golden_2",
        "formattedAddress": "450 Lookout Mountain Rd, Golden, CO 80401",
        "price": 1250000,
        "bedrooms": 4,
        "bathrooms": 4,
        "squareFootage": 3400,
        "propertyType": "Single Family",
        "latitude": 39.7423,
        "longitude": -105.2405,
        "status": "Active"
      }
    ]
    ```
    *   *Target File:* `backend/src/data/sandbox/80401_trails.json`
    ```json
    [
      {
        "id": "way_golden_trail_1",
        "name": "Apex Trail",
        "coordinates": [
          {"latitude": 39.7161, "longitude": -105.2301},
          {"latitude": 39.7170, "longitude": -105.2350}
        ],
        "difficulty": "advanced",
        "highway": "path",
        "rawTags": { "mtb:scale": "3", "name": "Apex Trail" }
      }
    ]
    ```
    *Note: Replicate similar sandbox structures for Moab (84532) and Bellingham (98225).*
3.  **Step 3 (The Verification):**
    *   *Action:* Run backend sandbox unit tests: `npm run test backend/src/tests/sandbox.test.ts`.

---

### Group 2 (Backend Service Integrations)

#### Task 2.A: Core API & Cache Services Integration
1.  **Step 1 (The Unit Test Harness):** Test API parsing, cache hit/miss, and fallback responses.
    *   *Target File:* `backend/src/tests/apiServices.test.ts`
    *   *Test Cases to Write:* Verify cache reads mock file when cached; verify geocoding returns correct center coords; verify RentCast mock engine kicks in when HTTP status is 429/402.
2.  **Step 2 (The Implementation):** Implement API geocoder, listings API, and OSM overpass service.
    *   *Target File:* `backend/src/services/geocodingService.ts`
        *   *Function:* `geocodeAddress(query: string): Promise<{lat: number, lon: number, display_name: string}>`
        *   *Details:* Read from cache `backend/data/cache/geocode_<hash>.json` if present. Otherwise, query Nominatim API. Handle Nominatim's user-agent requirement.
    *   *Target File:* `backend/src/services/rentCastService.ts`
        *   *Function:* `fetchRentCastListings(lat: number, lon: number, zipCode?: string, city?: string, state?: string): Promise<{ properties: Property[], fallback: boolean }>`
        *   *Details:* Check file cache first. If cache miss, make RentCast HTTP call. If RentCast returns 429/402, dynamically generate 10–15 random properties centered near `lat, lon` with standard deviation offsets, returning `fallback: true`.
    *   *Target File:* `backend/src/services/overpassService.ts`
        *   *Function:* `fetchOSMTrails(lat: number, lon: number): Promise<Trail[]>`
        *   *Details:* Map center coordinate to bounding box (+/- 10 miles). Formulate and POST Overpass QL query. Standardize Overpass JSON elements into simplified custom `Trail` coordinates list.
3.  **Step 3 (The Verification):**
    *   *Action:* Run backend service tests: `npm run test backend/src/tests/apiServices.test.ts`.

#### Task 2.B: Proximity Service (Haversine & Sorting Engine)
1.  **Step 1 (The Unit Test Harness):** Write mathematical correctness assertions.
    *   *Target File:* `backend/src/tests/proximity.test.ts`
    *   *Test Cases to Write:* Assert Haversine calculations are accurate to 0.1 miles. Assert list of properties is correctly sorted by proximity.
2.  **Step 2 (The Implementation):** Code the proximity routing algorithms.
    *   *Target File:* `backend/src/services/proximityService.ts`
    ```typescript
    export function haversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 3958.8; // Earth radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    export function calculateProximity(properties: Property[], trails: Trail[]): Property[] {
      if (trails.length === 0) {
        return properties.map(p => ({ ...p, nearestTrail: undefined }));
      }
      return properties.map(property => {
        let minDistance = Infinity;
        let nearestTrail: any = null;
        for (const trail of trails) {
          for (const point of trail.coordinates) {
            const dist = haversineDistanceMiles(property.latitude, property.longitude, point.latitude, point.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              nearestTrail = {
                trailId: trail.id,
                name: trail.name,
                distanceMiles: parseFloat(dist.toFixed(1)),
                closestPoint: point
              };
            }
          }
        }
        return { ...property, nearestTrail };
      }).sort((a, b) => {
        const distA = a.nearestTrail?.distanceMiles ?? Infinity;
        const distB = b.nearestTrail?.distanceMiles ?? Infinity;
        return distA - distB;
      });
    }
    ```
3.  **Step 3 (The Verification):**
    *   *Action:* Run calculation suite: `npm run test backend/src/tests/proximity.test.ts`.

---

### Group 3 (Express Server Setup)

#### Task 3.A: Express Server Setup, Controller and Routes
1.  **Step 1 (The Unit Test Harness):** Define Supertest endpoint testing.
    *   *Target File:* `backend/src/tests/server.test.ts`
    *   *Test Cases to Write:* Test `/api/search` with Golden sandbox queries (expects immediate 200 sandbox response). Test invalid strings (expects 404). Test header responses.
2.  **Step 2 (The Implementation):** Implement Express router, handlers, cache management, and application main entrypoint.
    *   *Target File:* `backend/src/controllers/searchController.ts`
        *   *Logic:* Check input `q`. Check if ZIP maps to Golden (`80401`), Moab (`84532`), or Bellingham (`98225`), or matches text names. If yes, load from local sandbox data directly, process proximity, and return `source: "sandbox"`.
        *   If not, look in `backend/data/cache/data_<normalized>.json`. If cached, return `source: "cache"`.
        *   If not cached, run geocoder, parallel-fetch RentCast + Overpass, compute proximity, sort, write to cache, and return `source: "live"`.
    *   *Target File:* `backend/src/index.ts`
        *   *Details:* Standard server config pulling from `config.ts`, handling CORS options, routing to `searchController.ts`.
3.  **Step 3 (The Verification):**
    *   *Action:* Build and execute endpoints locally: `npm run dev` and hit `http://localhost:4000/api/search?q=80401` using curl.

---

### Group 4 (Frontend State & UI Blocks)

#### Task 4.A: Frontend Search State & Custom Hooks
1.  **Step 1 (The Unit Test Harness):** Establish hook render testing.
    *   *Target File:* `frontend/src/tests/usePropertySearch.test.tsx`
    *   *Test Cases to Write:* Verify state updates during fetch (loading: true). Verify errors map correctly when query fails. Verify properties are saved to reactive state on success.
2.  **Step 2 (The Implementation):** Declare unified models and custom React state handlers.
    *   *Target File:* `frontend/src/types.ts`
        *   *Details:* Mirror types designed in `data-model.md`.
    *   *Target File:* `frontend/src/hooks/usePropertySearch.ts`
        *   *Signature:* `export function usePropertySearch()` returning `{ query, setQuery, loading, properties, trails, center, source, error, warning, handleSearch, selectedProperty, setSelectedProperty }`
3.  **Step 3 (The Verification):**
    *   *Action:* Run Vitest suite: `npm run test frontend/src/tests/usePropertySearch.test.tsx`.

#### Task 4.B: Component Deck Creation (SearchBar, PropertySidebar, PropertyCard, StatusBanner)
1.  **Step 1 (The Unit Test Harness):** React component render validations.
    *   *Target File:* `frontend/src/tests/components.test.tsx`
    *   *Test Cases to Write:* Verify price tags show properly formatted USD (e.g. `$850,000`). Verify search submission calls hook handlers. Verify details card highlights matching proximity trailhead name.
2.  **Step 2 (The Implementation):** Create UI components using TailwindCSS classes.
    *   *Target File:* `frontend/src/components/SearchBar.tsx`
        *   *Details:* Large input field, nice clean submit button, validation alerts, quick-select buttons for the three iconic sandbox cities to let the user immediately experience sandbox mode.
    *   *Target File:* `frontend/src/components/PropertySidebar.tsx`
        *   *Details:* Sidebar layout. Lists properties sorted by closest trail first. Highlighting selected properties. Truncating long addresses. Displays distance clearly (e.g., "0.8 miles to Apex Trail").
    *   *Target File:* `frontend/src/components/PropertyCard.tsx`
        *   *Details:* Expanding details of the active/clicked home. Features custom placeholder images if `photoUrl` is missing, showing detailed pricing, bed/bath counters, and proximity metrics.
    *   *Target File:* `frontend/src/components/StatusBanner.tsx`
        *   *Details:* Alert component that visually highlights fallback states (e.g., when showing simulated fallback results because live RentCast quota was exceeded).
3.  **Step 3 (The Verification):**
    *   *Action:* Execute Vitest component checks: `npm run test frontend/src/tests/components.test.tsx`.

---

### Group 5 (Map Engine & Core Dashboard)

#### Task 5.A: Leaflet PropertyMap Component
1.  **Step 1 (The Unit Test Harness):** Leaflet binding integration checks.
    *   *Target File:* `frontend/src/tests/PropertyMap.test.tsx`
    *   *Test Cases to Write:* Assert markers list renders equal count to loaded properties. Assert polyline is configured with correct colors corresponding to trail difficulties (Green for easy, Blue for intermediate, Black for advanced, Orange for default).
2.  **Step 2 (The Implementation):** Integrate Leaflet mapping overlay components.
    *   *Target File:* `frontend/src/components/PropertyMap.tsx`
        *   *Implementation details:*
            1. Use standard leaflet icon overrides (to avoid Leaflet default asset-path resolutions which break in Webpack/Vite bundlers).
            2. For each property: Render a custom divIcon displaying the price (e.g., `$850k`) inside a styled CSS bubble marker.
            3. On marker click, call `setSelectedProperty(property)` and flyTo coordinates.
            4. For each trail: Draw a `<Polyline>` overlay, styling color based on `trail.difficulty` (Easy = Green `#10B981`, Intermediate = Blue `#3B82F6`, Advanced/Expert = Black `#111827`, Unknown = Orange `#F97316`). Width = 3.
            5. Adjust viewport dynamically utilizing React `<MapContainer>` bounds controls or custom leaflet controller methods when `center` coordinates change.
3.  **Step 3 (The Verification):**
    *   *Action:* Verify Vitest execution: `npm run test frontend/src/tests/PropertyMap.test.tsx`.

#### Task 5.B: App.tsx and CSS integration
1.  **Step 1 (The Unit Test Harness):** Validate end-to-end frontend mounting.
    *   *Target File:* `frontend/src/tests/App.test.tsx`
    *   *Test Cases to Write:* Verify full dashboard structure mounts properly, rendering the split screen layout (Sidebar on left, Map taking full width on right).
2.  **Step 2 (The Implementation):** Assemble the complete split screen layout and Tailwind definitions.
    *   *Target File:* `frontend/src/index.css`
        *   *Details:* standard tailwind setup directives plus Leaflet CSS import `@import "leaflet/dist/leaflet.css";`.
    *   *Target File:* `frontend/src/App.tsx`
        *   *Structure:*
            - Full viewport screen `h-screen w-screen flex flex-col`.
            - Top Header / Navbar: Title ("MTB Property Mapper"), SearchBar, and current source indicator ("Sandbox", "Cached", "Live").
            - Content Grid: `flex-1 flex flex-row overflow-hidden`.
                - Sidebar (width `w-96` or `w-[400px]`, `overflow-y-auto`): Lists properties, renders active detail card.
                - Map (width `flex-1`): Leaflet mapping canvas.
3.  **Step 3 (The Verification):**
    *   *Action:* Execute final verification of test coverage: `npm run test`. Start the application: `npm run dev` in frontend and `npm run dev` in backend to manually test the fully functional app dashboard.

---

## 🧪 Global Testing Strategy

*   **Unit Tests:**
    *   Verify accurate geocoding cache lookups and mock coordinate outputs.
    *   Verify RentCast mock fallback generator works and maintains correct formats.
    *   Validate the Haversine distance calculations and property list sorting.
    *   Ensure OSM Overpass data parser handles empty, way, and relation responses gracefully.
*   **Integration Tests:**
    *   Execute mock and live requests on the unified `/api/search` route to ensure correct schema integration.
    *   E2E-style component rendering testing: Simulate search actions, check map updates, sidebar clicks, and active details mapping.

---

## 🎯 Success Criteria
*   [x] Searches successfully geocode and download both listings and trails in parallel.
*   [x] Interactive map renders property pins with clean price tags and mountain bike trails styled according to difficulty levels.
*   [x] Sidebar listings automatically display distance in miles to the nearest trail and are sorted from nearest to furthest.
*   [x] Clicking a property on the map or sidebar shifts focus and updates detail cards with listing attributes and closest trailhead information.
*   [x] Rate limits are fully mitigated: Searches in Golden, Moab, and Bellingham run instantly from cached local sandbox files, and fallback generator kicks in elegantly when API keys are empty or rates are exceeded.
*   [x] Design is 100% compliant with React (TypeScript), Node.js (Express), and open-source geocoders/Leaflet maps (zero external commercial map billing).
