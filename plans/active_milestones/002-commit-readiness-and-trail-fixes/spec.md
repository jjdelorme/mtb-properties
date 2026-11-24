<Spec: 002-commit-readiness-and-trail-fixes>
## User Story (The Why)
As a developer preparing the current MVP codebase for a clean commit to `main`,
I need to fix failing cache behavior, properly handle Overpass relation elements for accurate trail rendering, and clean up untracked temporary files,
So that the codebase is completely stable, tests are green without live API dependencies, and the git tree is clean and review-ready.

## Domain Invariants & Heuristics
*   **INV-01:** Zero live HTTP requests to `api.rentcast.io` during test runs. The Axios request interceptor must remain active and throw a `CRITICAL INTEGRITY VIOLATION` on any unmocked call. — *Source: context.md §5*
*   **INV-02:** Zero occurrences of hardcoded mock addresses (`'400 Forest Service Rd #550'`, `'678 Pine St'`, `'158 Camp Rd'`) in non-test source files under `backend/src/` and `frontend/src/`. — *Source: context.md §5*
*   **INV-03:** Ground-truth unmocked trail verification tests (`groundTruthTrails.test.ts`, `adversarialChallenger.test.ts`) must continue passing against real/cached OSM & Nominatim data. `backend/data/cache/` must NOT be wiped wholesale by `cacheService.clear()` in test suites. — *Source: context.md §5*

## Acceptance Criteria (The Contract)

### 1. Sandbox Cache Expiry & Fallback Recovery
*   **AC-01:** **Given** a cache key that exists in `PRELOADED_MAPPINGS` (e.g., `'rentcast_39.7555_-105.2211'`), **When** the corresponding cache file does not exist, is expired on disk, or contains a payload with `fallback === true`, **Then** `cacheService.get()` must load from `PRELOADED_MAPPINGS`, re-populate the cache file, and return the preloaded sandbox data.
*   **AC-02:** **Given** the test environment setup, **When** `cleanTestCache()` is invoked in `backend/src/tests/server.test.ts`, **Then** it must explicitly unlink `'rentcast_39.7555_-105.2211'` in addition to its existing keys.
*   **AC-03:** **Given** the `backend/src/tests/sandbox.test.ts` suite, **When** tests are run, **Then** there must be explicit unit test coverage verifying `cacheService.get('rentcast_39.7555_-105.2211')` returns sandbox properties (`fallback: false`, non-`sim_` IDs) even when the cache file is expired or polluted with `fallback: true`.

### 2. Overpass Relation Parsing
*   **AC-04:** **Given** a response from the Overpass API containing elements of `type === 'relation'` with `route=mtb` and member geometries via `out geom`, **When** `parseOverpassElements` processes the response, **Then** it must correctly extract member ways (`type === 'way'` with geometry) and include them in the trail output.
*   **AC-05:** **Given** a relation that contains member ways also present as standalone `type === 'way'` elements in the same response, **When** parsing the response, **Then** the parsing logic must avoid duplicating way IDs.
*   **AC-06:** **Given** the `backend/src/tests/apiServices.test.ts` suite, **When** tests are run, **Then** there must be unit test coverage verifying that `relation["route"="mtb"]` elements are properly parsed without duplicating standalone ways.

### 3. Git Hygiene & Artifact Cleanup
*   **AC-07:** **Given** the project `.gitignore`, **When** inspected, **Then** it must explicitly ignore `.agents/teamwork/`.
*   **AC-08:** **Given** the working directory, **When** `git status` is run, **Then** untracked temporary teamwork artifacts (`.agents/teamwork/`, `DEAD_ENDS.md`, `ORIGINAL_REQUEST.md`, `PROJECT.md`) must be deleted, while `.agents/agents/property_advisor/agent.md` and `.agents/skills/rentcast/**` must be preserved.

## Edge Cases & Error Handling (Negative Space)
*   **EC-01:** [Polluted Cache Recovery] → If the on-disk cache for a sandbox key is corrupted or populated with simulated fallback data, the system must detect the `fallback === true` flag and transparently restore the authentic sandbox data from `PRELOADED_MAPPINGS`.
*   **EC-02:** [Overpass Missing Geometry] → If an Overpass relation member lacks an `Array.isArray(m.geometry)`, it must be safely ignored during parsing without crashing.

## Constraints (The "Do Nots")
*   **C-01:** No subagent (engineer, architect, product_owner, auditor) may run `git commit`, `git tag`, or `git push`.
*   **C-02:** `cacheService.clear()` must not be used to wipe the entire `backend/data/cache/` directory in test suites.

## Out of Scope
*   Adding new map features or frontend UI components.
*   Refactoring code outside the specific fix areas (cache service, overpass service, tests, and gitignore).
</Spec: 002-commit-readiness-and-trail-fixes>
