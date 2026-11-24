<Technical Plan: 002-commit-readiness-and-trail-fixes>
## 🔍 Analysis & Context
*   **Objective:** Stabilize tests by fixing cache fallbacks, correctly parsing Overpass relations for MTB trails, and cleaning up untracked teamwork artifacts for a clean commit to `main`.
*   **Affected Files:**
    *   `backend/src/services/cacheService.ts`
    *   `backend/src/services/overpassService.ts`
    *   `backend/src/tests/server.test.ts`
    *   `backend/src/tests/sandbox.test.ts`
    *   `backend/src/tests/apiServices.test.ts`
    *   `.gitignore`
*   **Key Dependencies:** Overpass API, Jest, filesystem (fs).
*   **Risks / Edge Cases:** Corrupted cache recovery logic could infinite-loop if preloaded data is missing; overpass relation members could lack geometry or duplicate standalone ways.

## 🛠️ Verification Commands
*Canonical commands identified from repository governance (backend/package.json, frontend/package.json, and context).*
- **Backend Build:** `cd /home/delormej/dev/mtb-properties/backend && npm run build`
- **Backend Test:** `cd /home/delormej/dev/mtb-properties/backend && npm test`
- **Frontend Build:** `cd /home/delormej/dev/mtb-properties/frontend && npm run build`
- **Frontend Test:** `cd /home/delormej/dev/mtb-properties/frontend && npm test`

## 🏛️ Governance Mandates
| Mandate | Source Document | Addressed in Task |
| :--- | :--- | :--- |
| Zero live HTTP requests to `api.rentcast.io` during test runs | context.md §5 | Task 1.D |
| Zero occurrences of hardcoded mock addresses in non-test source files | context.md §5 | Task 1.D |
| Ground-truth tests must pass, `backend/data/cache/` must not be wholesale wiped | context.md §5 | Task 1.A, 1.D |
| No subagent may run `git commit`, `git tag`, or `git push` | spec.md §Constraints (C-01) | All Tasks (Constraints) |

## 🧭 Decisions & Alternatives
| Decision | Chosen | Alternatives Rejected (and why) | Settled by |
| :--- | :--- | :--- | :--- |
| Overpass relation parsing strategy | Extract valid ways into the flat list, tracking way IDs via a Set to skip duplicates | Merge relation members into a single logical trail (Rejected: overcomplicates geometry and lengths when member ways have their own tags/names) | Architect |
| Polluted Cache recovery logic | Check `parsed.data.fallback === true` for keys in `PRELOADED_MAPPINGS` and overwrite immediately | Delete the cache file and let the *next* request recreate it (Rejected: Next request might fail and write fallback again) | Architect |

## 📋 Requirements Traceability Matrix (RTM)
| Requirement ID | Summary | Addressed in Task(s) | Verification (exact test or check) |
| :--- | :--- | :--- | :--- |
| INV-01 | Zero live HTTP requests to `api.rentcast.io` during test runs | Task 1.A, 1.D | `cd backend && npm test` passes |
| INV-02 | Zero hardcoded mock addresses in non-test source files | Task 1.D | `grep -E '400 Forest Service Rd #550|678 Pine St|158 Camp Rd'` |
| INV-03 | Ground truth tests pass without wholesale cache clear | Task 1.A, 1.D | `cd backend && npm test` passes |
| AC-01 | Sandbox Cache Expiry & Fallback Recovery logic | Task 1.A | `npx jest src/tests/sandbox.test.ts` |
| AC-02 | Unlink `'rentcast_39.7555_-105.2211'` in `cleanTestCache()` | Task 1.A | `npx jest src/tests/server.test.ts` |
| AC-03 | Sandbox cache test coverage for expired/polluted cache | Task 1.A | `npx jest src/tests/sandbox.test.ts` |
| AC-04 | Overpass `type === 'relation'` extracts member ways | Task 1.B | `npx jest src/tests/apiServices.test.ts` |
| AC-05 | Avoid duplicating way IDs from relations and standalone ways | Task 1.B | `npx jest src/tests/apiServices.test.ts` |
| AC-06 | Overpass relation parsing test coverage | Task 1.B | `npx jest src/tests/apiServices.test.ts` |
| AC-07 | Explicitly ignore `.agents/teamwork/` in `.gitignore` | Task 1.C | `grep '.agents/teamwork/' .gitignore` |
| AC-08 | Delete untracked temporary teamwork artifacts | Task 1.C | `git status --porcelain` |
| EC-01 | Polluted Cache Recovery checks `fallback === true` | Task 1.A | `npx jest src/tests/sandbox.test.ts` |
| EC-02 | Overpass missing geometry safely ignored | Task 1.B | `npx jest src/tests/apiServices.test.ts` |
| C-01 | Subagents must not run git commands | All Tasks | Auditor verify git log has no new commits |
| C-02 | `cacheService.clear()` must not wholesale wipe in test suites | Task 1.A, 1.D | `grep -r 'cacheService.clear()' backend/src/tests` |

## 📋 Task Execution (Parallel Groups)

### Group 1 (Parallel Execution - Independent Tasks)
- [x] Task 1.A: Sandbox Cache Logic & Fallback Fixes (`backend/src/services/cacheService.ts`, `backend/src/tests/server.test.ts`, `backend/src/tests/sandbox.test.ts`) — satisfies AC-01, AC-02, AC-03, EC-01
- [x] Task 1.B: Overpass Relation Parsing Fixes (`backend/src/services/overpassService.ts`, `backend/src/tests/apiServices.test.ts`) — satisfies AC-04, AC-05, AC-06, EC-02
- [x] Task 1.C: Git Hygiene & Artifact Cleanup (`.gitignore`, filesystem) — satisfies AC-07, AC-08
- [x] Task 1.D: Project Integrity Checks — satisfies INV-01, INV-02, INV-03, C-01, C-02

## 📝 Step-by-Step Implementation Details

### Prerequisites
*None. No git commands such as `git commit` or `git push` are allowed during the execution of this plan.*

#### Task 1.A: Sandbox Cache Logic & Fallback Fixes
1.  **Step 1 (Unit Test Harness):**
    *   *Target File:* `backend/src/tests/sandbox.test.ts`
    *   *Test Cases:* Add tests under `describe('Preloaded Cache Fallbacks')` verifying that `cacheService.get('rentcast_39.7555_-105.2211')` correctly returns properties with `fallback: false` when:
        1. The cache file exists but is expired.
        2. The cache file exists, is not expired, but contains `fallback: true` inside `data`.
2.  **Step 2 (Implementation):**
    *   *Target File 1:* `backend/src/services/cacheService.ts`
    *   *Exact Change:* Update `get<T>(key: string)` so that after reading and parsing the file (`parsed = JSON.parse(fileContent)`), it checks if `PRELOADED_MAPPINGS[key]` exists. If `parsed.expiry && Date.now() > parsed.expiry` OR `(parsed.data as any)?.fallback === true`, it unlinks the file and runs the exact same preloaded mapping hydration block as the `!fs.existsSync` case.
    *   *Target File 2:* `backend/src/tests/server.test.ts`
    *   *Exact Change:* In `cleanTestCache()`, add `'rentcast_39.7555_-105.2211'` to the `keys` array that is iterated and unlinked.
3.  **Step 3 (Verification):**
    *   *Action:* Run `cd /home/delormej/dev/mtb-properties/backend && npx jest src/tests/sandbox.test.ts src/tests/server.test.ts` and ensure tests pass.

#### Task 1.B: Overpass Relation Parsing Fixes
1.  **Step 1 (Unit Test Harness):**
    *   *Target File:* `backend/src/tests/apiServices.test.ts`
    *   *Test Cases:* In `describe('Overpass Service (OSM Trails)')`, add a test mocking `axios.post` returning a `relation` element (with a member `type: 'way'` that has geometry), a standalone `way` element duplicating that member, and a relation member missing geometry. Assert that `fetchOSMTrails` parses the relation members, ignores the duplicate standalone way, ignores the member missing geometry, and correctly maps tags.
2.  **Step 2 (Implementation):**
    *   *Target File:* `backend/src/services/overpassService.ts`
    *   *Exact Change:* In `parseOverpassElements(elements: any[]): Trail[]`:
        *   Initialize a `const seenWayIds = new Set<string>();`
        *   Create an inline helper `processWay(wayEl: any, inheritedTags?: any)` that takes a way element, extracts its ID, tags, geometry, length, and maps difficulty. If `seenWayIds.has(wayEl.id)`, it skips it. Otherwise, it calculates the length, constructs the `Trail` object (merging inherited relation tags like `name` if missing), adds to `trails` array, and adds `wayEl.id` to `seenWayIds`.
        *   Iterate over `elements` twice or handle inline: For `el.type === 'relation'`, iterate over `el.members || []`. If `m.type === 'way'` and `Array.isArray(m.geometry) && m.geometry.length > 0`, call `processWay(m, el.tags)`. Then, for elements where `el.type === 'way'`, call `processWay(el)`.
3.  **Step 3 (Verification):**
    *   *Action:* Run `cd /home/delormej/dev/mtb-properties/backend && npx jest src/tests/apiServices.test.ts` and confirm it passes.

#### Task 1.C: Git Hygiene & Artifact Cleanup
1.  **Step 1 (Implementation):**
    *   *Target File 1:* `.gitignore`
    *   *Exact Change:* Append `.agents/teamwork/` to the end of the file.
    *   *Action:* Use a command line tool (e.g., bash) to run `rm -rf .agents/teamwork/ DEAD_ENDS.md ORIGINAL_REQUEST.md PROJECT.md`. Do NOT delete `.agents/agents/property_advisor/agent.md` or `.agents/skills/rentcast/**`.
2.  **Step 2 (Verification):**
    *   *Action:* Run `git status --porcelain` in the project root and confirm none of the deleted files appear, and `.agents/teamwork/` is properly ignored.

#### Task 1.D: Project Integrity Checks
1.  **Step 1 (Verification):**
    *   *Action 1:* Run `cd /home/delormej/dev/mtb-properties/backend && npm test` and ensure all tests pass.
    *   *Action 2:* Run `grep -r -E "400 Forest Service Rd #550|678 Pine St|158 Camp Rd" backend/src/ frontend/src/ || true` and ensure no matches in source code files.
    *   *Action 3:* Run `cd /home/delormej/dev/mtb-properties/frontend && npm test` and ensure frontend tests pass.

### 📦 Data & Asset Contracts
*None required for this milestone.*

### 🧪 Global Testing Strategy
*   **Unit Tests:** Local isolated tests in `sandbox.test.ts` and `apiServices.test.ts` to verify cache logic and relation parsing in a controlled mock environment.
*   **Integration Tests:** The full `backend` test suite run with `RENTCAST_API_KEY=test_mock_key` verifies the system logic without external API side effects.

## 🎯 Success Criteria
*   All RTM rows verified by the Auditor.
*   The `git status` is completely clean of untracked temporary files.
*   No `CRITICAL INTEGRITY VIOLATION` errors during testing.

## 🚧 Blockers
*Engineers append here when blocked. Format: `Task X.Y — [blocker] — [proposed resolution] — [needs: Architect | User]`.*
</Technical Plan: 002-commit-readiness-and-trail-fixes>