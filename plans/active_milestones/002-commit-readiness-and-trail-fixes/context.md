# Context Report: Commit Readiness & Trail Fixes (`002-commit-readiness-and-trail-fixes`)

## 1. Goal & Scope (`002-commit-readiness-and-trail-fixes`)
- Resolve all blockers and issues found during commit-readiness review of the current working tree on `main` (`origin`: `git@github.com:jjdelorme/mtb-properties.git`), preserving all valid uncommitted trail-mapping and address-resolution improvements (`11` modified files in `backend/` and `frontend/` plus `3` untracked test files: `backend/src/tests/setup.ts`, `backend/src/tests/groundTruthTrails.test.ts`, `backend/src/tests/adversarialChallenger.test.ts`).
- Note on roadmaps/campaigns: `plans/00-ROADMAP.md` does not yet exist (`00-ROADMAP.md` at repo root is a legacy template file; `plans/active_campaigns/001-mtb-property-mapper/` contains the initial MVP specs). `product_owner` owns creating and updating `plans/00-ROADMAP.md`.

### Existing Uncommitted Changes Summary
- **Backend modified**: `backend/jest.config.js`, `backend/package.json`, `backend/src/controllers/searchController.ts`, `backend/src/services/addressParser.ts`, `backend/src/services/geocodingService.ts`, `backend/src/services/overpassService.ts`, `backend/src/tests/apiServices.test.ts`, `backend/src/tests/server.test.ts`
- **Backend untracked (required)**: `backend/src/tests/setup.ts`, `backend/src/tests/groundTruthTrails.test.ts`, `backend/src/tests/adversarialChallenger.test.ts`
- **Frontend modified**: `frontend/src/App.tsx`, `frontend/src/components/PropertyMap.tsx`, `frontend/src/components/PropertySidebar.tsx`

---

## 2. Issue 1 — 24h Sandbox Cache Expiry Bug & Failing Backend Test (BLOCKER)
- **Failing test**: `backend/src/tests/server.test.ts` (`Server Endpoints › GET /api/search › should return 200 and sandbox data for Golden ZIP (80401) without calling Nominatim or RentCast axios`, line 82: `expect(mockedAxios.get).not.toHaveBeenCalled()` received `1` call to `https://api.rentcast.io/v1/listings/sale`).
- **Root cause in `backend/src/services/cacheService.ts` (lines 7–60)**:
  - `PRELOADED_MAPPINGS` maps `'rentcast_39.7555_-105.2211'` (`80401_properties.json`), `'rentcast_38.5733_-109.5498'` (`84532_properties.json`), and `'rentcast_48.7519_-122.4787'` (`98225_properties.json`) from `backend/src/data/sandbox/`.
  - `cacheService.get<T>(key)` only checks `PRELOADED_MAPPINGS[key]` when `!fs.existsSync(filePath)`. When `filePath` (`backend/data/cache/${key}.json`) exists on disk and has expired (`parsed.expiry && Date.now() > parsed.expiry`), `cacheService.get()` unlinks `filePath` and immediately returns `null` instead of falling back to `PRELOADED_MAPPINGS[key]`.
  - Furthermore, once it returned `null` during a mocked test run, `fetchRentCastListings` caught an error on undefined `mockedAxios.get` response and wrote simulated properties (`id: "sim_*"`, `fallback: true`) into `backend/data/cache/rentcast_39.7555_-105.2211.json` with a fresh 24h expiry.
- **Root cause in `backend/src/tests/server.test.ts` (lines 13–31)**:
  - `cleanTestCache()` replaced `cacheService.clear()` (to preserve cached Nominatim/Overpass responses for ground-truth tests), but omitted `'rentcast_39.7555_-105.2211'` from its `keys` list.
- **Required resolution**:
  - Update `backend/src/services/cacheService.ts` so that if `filePath` does not exist, OR if `filePath` is expired and unlinked, OR if `key` is in `PRELOADED_MAPPINGS` and the cached payload has `fallback === true` (polluted by simulated fallback data), `cacheService.get()` loads from `PRELOADED_MAPPINGS[key]`, re-populates the cache file, and returns the preloaded sandbox data.
  - Update `cleanTestCache()` in `backend/src/tests/server.test.ts` to also unlink `'rentcast_39.7555_-105.2211'`.
  - Add unit test coverage in `backend/src/tests/sandbox.test.ts` verifying `cacheService.get('rentcast_39.7555_-105.2211')` returns sandbox properties (`fallback: false`, non-`sim_` IDs) both when the cache file is expired on disk and when polluted with `fallback: true`.

---

## 3. Issue 2 — Untracked Multi-Agent Scratch Artifacts & `.gitignore` Hygiene (BLOCKER)
- Untracked temporary files from an earlier `/teamwork` run currently pollute `git status`:
  - `.agents/teamwork/` (all subdirectories and files)
  - Root files: `DEAD_ENDS.md`, `ORIGINAL_REQUEST.md`, `PROJECT.md`
- Tracked `.agents/` files that MUST be preserved: `.agents/agents/property_advisor/agent.md` and `.agents/skills/rentcast/**`.
- Untracked legitimate test files that MUST be preserved and committed:
  - `backend/src/tests/setup.ts` (referenced by `backend/jest.config.js` `setupFilesAfterEnv`)
  - `backend/src/tests/groundTruthTrails.test.ts`
  - `backend/src/tests/adversarialChallenger.test.ts`
- **Required resolution**:
  - Add `.agents/teamwork/` to `.gitignore`.
  - Delete the untracked temporary `/teamwork` artifacts (`.agents/teamwork/`, `DEAD_ENDS.md`, `ORIGINAL_REQUEST.md`, `PROJECT.md`) so the working tree contains only intentional project code, tests, and `plans/` artifacts.

---

## 4. Issue 3 — Overpass `relation["route"="mtb"]` Parsing Consistency (`backend/src/services/overpassService.ts`)
- `fetchOSMTrails` (line 346) queries `relation["route"="mtb"](${bboxStr});` with `out geom;`, while `parseOverpassElements` (lines 291–329) currently ignores `el.type === 'relation'` and only processes `el.type === 'way'`.
- **Required resolution**:
  - Update `parseOverpassElements` in `backend/src/services/overpassService.ts` (or export it for direct unit testing if helpful) to also handle `el.type === 'relation'` elements returned by Overpass `out geom;`: inspect relation `members` (`m.type === 'way'` with `Array.isArray(m.geometry)`), avoid duplicating ways already present as standalone `el.type === 'way'` elements in the same response (by tracking way IDs, while optionally enriching `"Unnamed Trail"` ways if a parent MTB relation provides a `name` or difficulty tag, and emitting member ways that were only returned inside the relation).
  - Add unit test coverage in `backend/src/tests/apiServices.test.ts` verifying `relation["route"="mtb"]` elements with `out geom` member geometries are properly parsed without duplicating standalone ways.

---

## 5. Invariants & Governance Constraints (Must Not Regress)
- **RentCast API Protection**: Zero live HTTP requests to `api.rentcast.io` during test runs (`backend/src/tests/setup.ts` Axios request interceptor must remain active and throw `CRITICAL INTEGRITY VIOLATION` on any unmocked `api.rentcast.io` call; `RENTCAST_API_KEY=test_mock_key` in `backend/package.json` test script).
- **Anti-Hardcoding**: Zero occurrences of `'400 Forest Service Rd #550'`, `'678 Pine St'`, or `'158 Camp Rd'` in non-test source files under `backend/src/` and `frontend/src/`.
- **Ground-Truth Unmocked Trail Verification**: `groundTruthTrails.test.ts` and `adversarialChallenger.test.ts` must continue passing against real/cached OSM & Nominatim data (`1100ms` Nominatim throttling intact; `backend/data/cache/` must NOT be wiped wholesale by `cacheService.clear()` in test suites).
- **Git Governance**: No subagent (`engineer`, `architect`, `product_owner`, `auditor`) may run `git commit`, `git tag`, or `git push`; only the Supervisor runs git write commands after passing `audit_code` and explicit user commit approval.
- **Canonical Build & Test Commands**:
  - Backend Build: `cd /home/delormej/dev/mtb-properties/backend && npm run build`
  - Backend Tests: `cd /home/delormej/dev/mtb-properties/backend && npm test`
  - Frontend Build: `cd /home/delormej/dev/mtb-properties/frontend && npm run build`
  - Frontend Tests: `cd /home/delormej/dev/mtb-properties/frontend && npm test`
