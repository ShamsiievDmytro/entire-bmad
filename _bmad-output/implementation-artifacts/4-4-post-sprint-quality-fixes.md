# Story 4.4: Post-Sprint Quality Fixes

Status: ready-for-dev

## Story

As a developer,
I want three targeted quality issues resolved that were surfaced during the devil's advocate cross-cutting review,
So that the codebase is free of a race condition, a TypeScript type gap, and an accessibility oversight before the project ships.

## Acceptance Criteria

1. **Given** `attemptPromotion()` fires a successful probe WebSocket `onopen` **When** `connect()` is called AND `scheduleReconnect()` fires concurrently from a CoinCap `onclose` at the same time **Then** only one connection attempt proceeds — a private `isConnecting` boolean flag prevents re-entry into `connectBinance()`.

2. **Given** the `toChartData` function in `ChartCard.astro` **When** TypeScript strict mode compiles the file **Then** the `points` parameter is typed as `ChartPoint[]` (imported from `../lib/types`).

3. **Given** the `.stale-badge` element in `PriceCard.astro` is hidden (no `.visible` class) **When** assistive technology reads the page **Then** the badge has `aria-hidden="true"` and it is toggled to `aria-hidden="false"` when the `.visible` class is added, and back to `aria-hidden="true"` when `.visible` is removed.

## Tasks / Subtasks

- [ ] Task 1: Add `isConnecting` guard to `ConnectionManager` (AC: #1)
  - [ ] Add private instance variable: `private isConnecting: boolean = false`
  - [ ] At the top of `connectBinance()`: if `this.isConnecting` is true, return immediately
  - [ ] Set `this.isConnecting = true` right after the guard check in `connectBinance()`
  - [ ] Set `this.isConnecting = false` in `this.ws.onopen` (Binance success path)
  - [ ] Set `this.isConnecting = false` in `this.ws.onclose` (Binance failure path — before calling `scheduleReconnect()`)
  - [ ] Also reset `this.isConnecting = false` in `cleanup()` so any abandoned in-progress flag is always cleared
  - [ ] Add a test: mock `connectBinance` to verify it is not called a second time when `isConnecting` is true
  - [ ] All 46+ existing tests must still pass

- [ ] Task 2: Type `toChartData` parameter in `ChartCard.astro` (AC: #2)
  - [ ] In the `<script>` block of `ChartCard.astro`, add import: `import type { ChartPoint } from '../lib/types'`
  - [ ] Change `function toChartData(points)` to `function toChartData(points: ChartPoint[])`
  - [ ] Verify `npm run build` passes with no TypeScript errors
  - [ ] No logic changes — types only

- [ ] Task 3: Toggle `aria-hidden` on stale badge in `PriceCard.astro` (AC: #3)
  - [ ] In the HTML, add `aria-hidden="true"` to the `.stale-badge` div (initial hidden state)
  - [ ] In the `<script>` block, find the two places where `.visible` class is toggled on `staleBadgeEl`:
    - When adding `.visible` (stale detected): also set `staleBadgeEl.setAttribute('aria-hidden', 'false')`
    - When removing `.visible` (connection restored): also set `staleBadgeEl.setAttribute('aria-hidden', 'true')`
  - [ ] Verify `npm run build` passes
  - [ ] No style or logic changes — attribute management only

## Dev Agent Guardrails

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/services/connection-manager.ts` | Add `isConnecting` flag + guard in `connectBinance()` and `cleanup()` |
| `src/lib/services/connection-manager.test.ts` | Add 1 test for re-entry guard |
| `src/components/ChartCard.astro` | Add `ChartPoint` import + type annotation on `toChartData` |
| `src/components/PriceCard.astro` | Add `aria-hidden` attribute + toggle in script |

### DO NOT Touch

- Do NOT change any logic in `connectCoinCap()`, `enterRestMode()`, `attemptPromotion()`, `scheduleReconnect()`, or `startStaleCheck()`
- Do NOT change any CSS
- Do NOT change any store reads or writes
- Do NOT change test coverage for existing behaviors — only add the 1 new guard test

### Architecture Constraints (must follow)

- Singleton pattern: `ConnectionManager` uses `static instance` — do not alter getInstance/resetInstance
- TypeScript strict mode: `tsconfig.json` has `"strict": true` — all new code must be fully typed
- No barrel files: import `ChartPoint` directly from `../lib/types`, not from any index
- Test co-location: tests live alongside source as `.test.ts` files
- Package manager: npm — do not use yarn/pnpm

### Key Code Locations

**connection-manager.ts**
- Class declaration: line 75
- `connect()` public method: line 102 — resets state and calls `connectBinance()`
- `connectBinance()` private method: line 110 — where the guard must be applied
- `cleanup()` private method: line 328 — must also reset `isConnecting = false`
- `attemptPromotion()`: lines 285–311 — the source of the race condition (calls `this.connect()` on probe success at line 301)

**ChartCard.astro**
- `toChartData` function: line 89 — `function toChartData(points)` → add `: ChartPoint[]`
- `ChartPoint` interface is in `src/lib/types.ts`

**PriceCard.astro**
- `.stale-badge` HTML element: lines 32–37 — add `aria-hidden="true"` attribute
- The script block manages `.visible` class on `staleBadgeEl` — find those locations and add the `aria-hidden` toggles alongside

### Running Tests

```bash
npm run test       # runs all Vitest unit tests
npm run build      # TypeScript compile + Astro build
npm run lint       # ESLint check
```

All three must pass before marking story complete.

## Previous Story Intelligence

- Story 4.2 established the full `ConnectionManager` fallback chain including `attemptPromotion()` — the race condition lives in that flow
- Story 4.3 added the `.stale-badge` to `PriceCard.astro` and its `statusStore` subscription in the script block
- Story 3.3 added `ChartCard.astro` with the untyped `toChartData` function
- The devil's advocate noted: "promotion canary WS not tracked in this.ws — low-probability race if disconnect called during 5s probe" — the `isConnecting` guard addresses this without changing the canary pattern itself
