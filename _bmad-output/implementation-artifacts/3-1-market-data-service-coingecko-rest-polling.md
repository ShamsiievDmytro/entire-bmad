# Story 3.1: Market Data Service (CoinGecko REST Polling)

Status: done

## Story

As a user,
I want the dashboard to fetch market data automatically in the background,
So that I see up-to-date market cap, 24h change, and chart data without any action.

## Acceptance Criteria

1. **Given** the dashboard page loads and services initialize, **When** the MarketDataService starts, **Then** it fetches market cap, 24h change (percentage + absolute), 24h high/low, and hourly historical price data from CoinGecko REST API.
2. `marketStore` is populated with a `MarketData` object: `{ marketCap, change24h, changePercent24h, high24h, low24h }`.
3. `chartStore` is populated with an array of `ChartPoint` objects: `{ time: number, value: number }` for hourly data.
4. `chartStore` is capped at 24 entries maximum — oldest point shifted when appending new data.
5. Polling uses recursive `setTimeout` (not `setInterval`) with a 60-second interval (NFR11).
6. On CoinGecko API failure, last known store values are retained — stores are never cleared (NFR12).
7. API errors are logged via `console.warn()` with endpoint and status code — no user-facing error UI.
8. Timer references are stored and cleared before scheduling new timers (memory leak prevention).
9. `market-data-service.test.ts` covers data mapping, store updates, and error retention behavior.

## Tasks / Subtasks

- [x] Task 1: Create MarketDataService module (AC: #1, #5, #8)
  - [x] Create `src/lib/services/market-data-service.ts`
  - [x] Define API endpoint constants: `COINGECKO_MARKETS_URL` and `COINGECKO_MARKET_CHART_URL`
  - [x] Define `REST_POLL_INTERVAL_MS` constant as `60_000` (60 seconds)
  - [x] Define `CHART_MAX_ENTRIES` constant as `24`
  - [x] Implement `MarketDataService` class with singleton pattern (private constructor, `getInstance()`)
  - [x] Implement private `timerId: ReturnType<typeof setTimeout> | null = null` for timer reference tracking
  - [x] Implement `start(): void` method that calls `fetchAndSchedule()` immediately
  - [x] Implement `stop(): void` method that clears the timer and nulls the reference
  - [x] Implement private `fetchAndSchedule(): Promise<void>` that fetches data, then schedules next poll via recursive `setTimeout`

- [x] Task 2: Implement CoinGecko market data fetch (AC: #1, #2, #6, #7)
  - [x] Implement private `fetchMarketData(): Promise<void>` method
  - [x] Fetch from CoinGecko `/coins/markets` endpoint for bitcoin market data
  - [x] Parse response and extract: `market_cap`, `price_change_24h`, `price_change_percentage_24h`, `high_24h`, `low_24h`
  - [x] Map to `MarketData` interface: `{ marketCap, change24h, changePercent24h, high24h, low24h }`
  - [x] Write to `marketStore.set()` with the mapped data
  - [x] Wrap in try/catch: on error, `console.warn()` with endpoint URL and error message, do NOT clear stores

- [x] Task 3: Implement CoinGecko chart data fetch (AC: #1, #3, #4, #6, #7)
  - [x] Implement private `fetchChartData(): Promise<void>` method
  - [x] Fetch from CoinGecko `/coins/bitcoin/market_chart` endpoint with `vs_currency=usd&days=1`
  - [x] Parse `prices` array from response (array of `[timestamp, price]` pairs)
  - [x] Map to `ChartPoint[]`: `{ time: timestamp, value: price }`
  - [x] Cap at 24 entries: take the last 24 entries from the response array
  - [x] Write to `chartStore.set()` with the mapped and capped data
  - [x] Wrap in try/catch: on error, `console.warn()`, retain existing chartStore values

- [x] Task 4: Implement recursive setTimeout polling (AC: #5, #8)
  - [x] In `fetchAndSchedule()`: call both `fetchMarketData()` and `fetchChartData()` (can be parallel via `Promise.allSettled()`)
  - [x] After both fetches complete (regardless of success/failure), schedule next poll: `this.timerId = setTimeout(() => this.fetchAndSchedule(), REST_POLL_INTERVAL_MS)`
  - [x] In `stop()`: if `this.timerId !== null`, call `clearTimeout(this.timerId)` and set `this.timerId = null`
  - [x] In `fetchAndSchedule()`: always clear previous timer before scheduling new one

- [x] Task 5: Wire up initialization in Layout.astro (AC: #1)
  - [x] Add import of `MarketDataService` in the service initialization `<script>` block in `src/layouts/Layout.astro`
  - [x] Call `MarketDataService.getInstance().start()` alongside other service initialization

- [x] Task 6: Create unit tests (AC: #9)
  - [x] Create `src/lib/services/market-data-service.test.ts`
  - [x] Mock `global.fetch` for controlled test responses
  - [x] Test: successful market data fetch populates `marketStore` with correct `MarketData` shape
  - [x] Test: successful chart data fetch populates `chartStore` with `ChartPoint[]`
  - [x] Test: chartStore is capped at 24 entries
  - [x] Test: on fetch error, stores retain previous values (not cleared)
  - [x] Test: `console.warn` is called on fetch error with endpoint info
  - [x] Test: singleton pattern returns same instance
  - [x] Test: `stop()` clears the timer
  - [x] Run `npm run test` to verify all pass

- [x] Task 7: Verify integration
  - [x] Verify `marketStore` populates with real CoinGecko data on page load
  - [x] Verify `chartStore` populates with hourly price data
  - [x] Verify polling repeats every 60 seconds (check Network tab)
  - [x] Verify error handling by temporarily blocking the API (stores retain data)
  - [x] `npm run build` succeeds
  - [x] `npm run lint` passes

## Dev Notes

### File: `src/lib/services/market-data-service.ts`

This is the REST polling service that fetches supplementary market data from CoinGecko. It writes to `marketStore` and `chartStore` and follows the same singleton pattern as `ConnectionManager`.

### CoinGecko API Endpoints

**Market Data (for marketStore):**
```
GET https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h
```

Response shape (array of 1 item):
```json
[{
  "id": "bitcoin",
  "symbol": "btc",
  "name": "Bitcoin",
  "current_price": 68432.17,
  "market_cap": 1340000000000,
  "price_change_24h": 1534.22,
  "price_change_percentage_24h": 2.3,
  "high_24h": 68900,
  "low_24h": 66900,
  ...
}]
```

Mapping to `MarketData`:
```typescript
{
  marketCap: response[0].market_cap,
  change24h: response[0].price_change_24h,
  changePercent24h: response[0].price_change_percentage_24h,
  high24h: response[0].high_24h,
  low24h: response[0].low_24h,
}
```

**Chart Data (for chartStore):**
```
GET https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1
```

Response shape:
```json
{
  "prices": [[1711972200000, 68432.17], [1711975800000, 68510.30], ...],
  "market_caps": [...],
  "total_volumes": [...]
}
```

CoinGecko granularity rules:
- `days=1` returns 5-minute interval data (approximately 288 points)
- We need hourly data, so sample every 12th point OR use `days=1` and take the data as-is, then cap at 24 entries

For simplicity and to get approximately hourly data points, the best approach is to take every 12th entry from the `prices` array (288 points / 12 = 24 hourly points). Alternatively, take the last 24 entries for the most recent hour-level granularity.

**Recommended approach:** Fetch with `days=1`, then sample the `prices` array to get approximately 24 evenly-spaced hourly points:

```typescript
function sampleHourlyPoints(prices: [number, number][]): ChartPoint[] {
  if (prices.length <= CHART_MAX_ENTRIES) {
    return prices.map(([time, value]) => ({ time, value }));
  }
  const step = Math.floor(prices.length / CHART_MAX_ENTRIES);
  const sampled: ChartPoint[] = [];
  for (let i = 0; i < prices.length && sampled.length < CHART_MAX_ENTRIES; i += step) {
    sampled.push({ time: prices[i][0], value: prices[i][1] });
  }
  return sampled;
}
```

### Exact Implementation

```typescript
import { marketStore } from '../stores/market-store';
import { chartStore } from '../stores/chart-store';
import type { MarketData, ChartPoint } from '../types';

const COINGECKO_MARKETS_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h';

const COINGECKO_MARKET_CHART_URL =
  'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1';

const REST_POLL_INTERVAL_MS = 60_000;
const CHART_MAX_ENTRIES = 24;

interface CoinGeckoMarketResponse {
  market_cap: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
}

interface CoinGeckoChartResponse {
  prices: [number, number][];
}

export class MarketDataService {
  private static instance: MarketDataService | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  start(): void {
    this.fetchAndSchedule();
  }

  stop(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private async fetchAndSchedule(): Promise<void> {
    await Promise.allSettled([this.fetchMarketData(), this.fetchChartData()]);
    this.scheduleNext();
  }

  private scheduleNext(): void {
    // Clear any existing timer before scheduling (memory leak prevention)
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
    }
    this.timerId = setTimeout(() => this.fetchAndSchedule(), REST_POLL_INTERVAL_MS);
  }

  private async fetchMarketData(): Promise<void> {
    try {
      const response = await fetch(COINGECKO_MARKETS_URL);
      if (!response.ok) {
        console.warn(`CoinGecko markets API error: ${COINGECKO_MARKETS_URL} — status ${response.status}`);
        return; // Retain existing store values
      }
      const data: CoinGeckoMarketResponse[] = await response.json();
      if (!data || data.length === 0) {
        console.warn(`CoinGecko markets API returned empty data`);
        return;
      }
      const item = data[0];
      const marketData: MarketData = {
        marketCap: item.market_cap,
        change24h: item.price_change_24h,
        changePercent24h: item.price_change_percentage_24h,
        high24h: item.high_24h,
        low24h: item.low_24h,
      };
      marketStore.set(marketData);
    } catch (error) {
      console.warn(`CoinGecko markets fetch failed: ${COINGECKO_MARKETS_URL}`, error);
      // Do NOT clear marketStore — retain last known values (NFR12)
    }
  }

  private async fetchChartData(): Promise<void> {
    try {
      const response = await fetch(COINGECKO_MARKET_CHART_URL);
      if (!response.ok) {
        console.warn(`CoinGecko chart API error: ${COINGECKO_MARKET_CHART_URL} — status ${response.status}`);
        return;
      }
      const data: CoinGeckoChartResponse = await response.json();
      if (!data || !data.prices || data.prices.length === 0) {
        console.warn(`CoinGecko chart API returned empty prices`);
        return;
      }
      const chartPoints = sampleHourlyPoints(data.prices);
      chartStore.set(chartPoints);
    } catch (error) {
      console.warn(`CoinGecko chart fetch failed: ${COINGECKO_MARKET_CHART_URL}`, error);
      // Do NOT clear chartStore — retain last known values (NFR12)
    }
  }
}

function sampleHourlyPoints(prices: [number, number][]): ChartPoint[] {
  if (prices.length <= CHART_MAX_ENTRIES) {
    return prices.map(([time, value]) => ({ time, value }));
  }
  const step = Math.floor(prices.length / CHART_MAX_ENTRIES);
  const sampled: ChartPoint[] = [];
  for (let i = 0; i < prices.length && sampled.length < CHART_MAX_ENTRIES; i += step) {
    sampled.push({ time: prices[i][0], value: prices[i][1] });
  }
  return sampled;
}
```

### Export the Sampling Function for Testing

Export `sampleHourlyPoints` as a named export so it can be unit tested directly:

```typescript
export function sampleHourlyPoints(prices: [number, number][]): ChartPoint[] {
  // ... implementation above
}
```

### Layout.astro Integration

Add to the existing `<script>` block in `Layout.astro`:

```astro
<script>
  // Existing imports
  import { ConnectionManager } from '../lib/services/connection-manager';
  import { initTabTitleUpdater } from '../lib/services/tab-title-updater';

  // Market data service (Story 3.1)
  import { MarketDataService } from '../lib/services/market-data-service';

  // Initialize services
  ConnectionManager.getInstance().connect();
  initTabTitleUpdater();
  MarketDataService.getInstance().start();
</script>
```

### Recursive setTimeout vs setInterval

The architecture mandates recursive `setTimeout` (not `setInterval`) for REST polling. The reason: `setInterval` can stack calls if a response takes longer than the interval. With recursive `setTimeout`, the next poll is scheduled only after the current fetch completes:

```
fetch → wait for response → process → schedule setTimeout(60s) → fetch → ...
```

This prevents drift and ensures the 60s interval is measured from the end of one fetch to the start of the next.

### Memory Leak Prevention (NFR17)

Three leak vectors addressed:
1. **Timer references:** `this.timerId` stores the current setTimeout ID. `stop()` clears it. `scheduleNext()` clears the previous timer before creating a new one.
2. **Chart data array:** `chartStore` is capped at `CHART_MAX_ENTRIES` (24) via `sampleHourlyPoints()`. The store is set with a new array on each fetch (not appended to).
3. **Fetch abort:** For v1, fetch requests are not aborted on `stop()`. This is acceptable because the fetch will complete and the result is harmless (store set after stop is a no-op). If needed in the future, add `AbortController` support.

### Error Handling

Per architecture error handling standards:
- REST errors: `console.warn()` with endpoint URL and status code
- Network errors: `console.warn()` with endpoint URL and error object
- Malformed responses: caught by the try/catch, logged, stores retained
- No user-facing error UI — the UX spec explicitly avoids error states
- On error, the next poll is still scheduled (the `scheduleNext()` call happens in `fetchAndSchedule()` after `Promise.allSettled()`)
- `Promise.allSettled()` ensures both fetches complete even if one fails

### CoinGecko Free Tier Rate Limits

- Free tier: 30 requests/minute, no API key required
- This service makes 2 requests per poll cycle (markets + chart), every 60 seconds = 2 requests/minute
- Well within the 30 req/min limit (NFR11)
- If rate limited (HTTP 429), the error handler retains last known data and logs the warning

### Store Writes

This service writes to two stores (created by Story 2.1):

- **`marketStore`** (`atom<MarketData | null>`) — set with `MarketData` object from CoinGecko markets endpoint
- **`chartStore`** (`atom<ChartPoint[]>`) — set with sampled `ChartPoint[]` from CoinGecko chart endpoint

Import paths:
```typescript
import { marketStore } from '../stores/market-store';
import { chartStore } from '../stores/chart-store';
import type { MarketData, ChartPoint } from '../types';
```

### Test Strategy

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { marketStore } from '../stores/market-store';
import { chartStore } from '../stores/chart-store';
import { MarketDataService, sampleHourlyPoints } from './market-data-service';

// Mock global.fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const MOCK_MARKET_RESPONSE = [{
  market_cap: 1340000000000,
  price_change_24h: 1534.22,
  price_change_percentage_24h: 2.3,
  high_24h: 68900,
  low_24h: 66900,
}];

const MOCK_CHART_RESPONSE = {
  prices: Array.from({ length: 288 }, (_, i) => [
    1711972200000 + i * 300000, // 5-min intervals
    68000 + Math.random() * 1000,
  ]),
};

describe('MarketDataService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    marketStore.set(null);
    chartStore.set([]);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('populates marketStore on successful fetch', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_MARKET_RESPONSE) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_CHART_RESPONSE) });

    // Trigger fetch manually (test the fetch logic, not the timer)
    // ... implementation details left for dev agent
  });

  it('retains stores on fetch error', async () => {
    // Set initial data
    marketStore.set({ marketCap: 1000, change24h: 10, changePercent24h: 1, high24h: 100, low24h: 90 });

    mockFetch.mockRejectedValue(new Error('Network error'));

    // Trigger fetch — stores should retain previous values
    // ... verify marketStore still has initial data
  });

  it('logs console.warn on API error', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch.mockResolvedValue({ ok: false, status: 429 });

    // Trigger fetch — should call console.warn
    // ... verify warnSpy called with endpoint info
    warnSpy.mockRestore();
  });
});

describe('sampleHourlyPoints', () => {
  it('returns all points when <= 24', () => {
    const prices: [number, number][] = Array.from({ length: 10 }, (_, i) => [i * 1000, 68000 + i]);
    const result = sampleHourlyPoints(prices);
    expect(result).toHaveLength(10);
    expect(result[0]).toEqual({ time: 0, value: 68000 });
  });

  it('caps at 24 entries when input is larger', () => {
    const prices: [number, number][] = Array.from({ length: 288 }, (_, i) => [i * 300000, 68000 + i]);
    const result = sampleHourlyPoints(prices);
    expect(result.length).toBeLessThanOrEqual(24);
  });

  it('samples evenly from input array', () => {
    const prices: [number, number][] = Array.from({ length: 288 }, (_, i) => [i * 300000, 68000 + i]);
    const result = sampleHourlyPoints(prices);
    // First point should be from beginning, last from near end
    expect(result[0].time).toBe(0);
    expect(result.length).toBe(24);
  });
});
```

**Test notes:**
- Mock `global.fetch` using `vi.stubGlobal('fetch', mockFetch)` — Vitest's recommended approach
- Use `vi.useFakeTimers()` to control setTimeout for timer tests
- The singleton pattern means tests share state — consider resetting the instance between tests or testing methods directly
- `sampleHourlyPoints` is a pure function and easy to test in isolation

### Anti-Patterns (DO NOT)

- **Never** use `setInterval` for polling. Use recursive `setTimeout` per architecture mandate.
- **Never** clear stores on API error. Always retain last known values (NFR12).
- **Never** show error UI to the user. Log to `console.warn()` only.
- **Never** call `marketStore.set(null)` or `chartStore.set([])` on error — this clears data the user was seeing.
- **Never** create a barrel file. Import directly from `market-data-service.ts`.
- **Never** add an API key or authentication header — CoinGecko free tier requires no key.
- **Never** poll faster than 60 seconds — stay within 30 req/min free tier (NFR11).
- **Never** store formatted strings in stores — store raw numbers, format in components.
- **Never** import this service in components — components subscribe to stores only.

### Scope Boundary

This story implements the CoinGecko REST polling service ONLY. It does NOT:
- Create UI components (Market Cap Card is Story 3.2, Chart Card is Story 3.3)
- Handle REST as a fallback for WebSocket failure (that is Story 4.2)
- Display any market data — it only populates the stores

### Previous Story Intelligence

**Story 2.1 establishes:**
- `src/lib/stores/market-store.ts`: `export const marketStore = atom<MarketData | null>(null);`
- `src/lib/stores/chart-store.ts`: `export const chartStore = atom<ChartPoint[]>([]);`
- `MarketData` interface: `{ marketCap: number, change24h: number, changePercent24h: number, high24h: number, low24h: number }`
- `ChartPoint` interface: `{ time: number, value: number }`
- nanostores v1.2.0 installed

**Story 2.2 establishes:**
- Singleton pattern for services (ConnectionManager as reference implementation)
- Services write to stores via `store.set()`
- `Layout.astro` `<script>` block as the service initialization point
- Memory leak prevention patterns (cleanup before creating new resources)

**Story 2.3 establishes:**
- PriceCard subscribes to `marketStore` for 24h change display — this service populates that data
- The change row in PriceCard will show data once `marketStore` is populated by this service

**Story 2.4 establishes:**
- Tab title updater initialized in `Layout.astro` `<script>` block — this service joins alongside it
- `initTabTitleUpdater()` pattern for service initialization

**Story 1.1 establishes:**
- Vitest v4.1.1, TypeScript strict mode, ESLint flat config
- Co-located test files, no barrel files
- `src/lib/types.ts` defines all interfaces

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/services/market-data-service.ts` | CREATE | CoinGecko REST polling service |
| `src/lib/services/market-data-service.test.ts` | CREATE | Unit tests |
| `src/layouts/Layout.astro` | MODIFY | Add MarketDataService initialization to script block |

### Project Structure Notes

- `market-data-service.ts` goes in `src/lib/services/` per the architecture's project structure
- Follows the same singleton pattern as `connection-manager.ts`
- Test file co-located at `src/lib/services/market-data-service.test.ts`
- No new directories needed — all paths already exist from Story 1.1

### References

- [Source: epics.md#Story 3.1] — Acceptance criteria
- [Source: architecture.md#API & Communication Patterns] — REST Polling Service spec, 60s interval, error handling
- [Source: architecture.md#Data Architecture] — MarketData and ChartPoint interfaces, data flow diagram
- [Source: architecture.md#Process Patterns] — Error handling (retain stale data, console.warn), initialization sequence
- [Source: architecture.md#Gap Analysis Results] — NFR17 memory leak prevention (timer references, chart data cap)
- [Source: architecture.md#Naming Patterns] — UPPER_SNAKE_CASE for constants, kebab-case for files
- [Source: architecture.md#Structure Patterns] — services in `src/lib/services/`, co-located tests
- [Source: architecture.md#Integration Points] — CoinGecko REST endpoint, 60s polling, retain last known data
- [Source: prd.md#NFR11] — CoinGecko polling interval >= 60 seconds
- [Source: prd.md#NFR12] — Tolerate CoinGecko unavailability, display last known data
- [Source: prd.md#NFR17] — No memory leaks over 24h+ sessions
- [Source: prd.md#FR6] — Market cap display
- [Source: prd.md#FR7] — Periodic market data refresh
- [Source: prd.md#FR10] — Hourly chart data points
- [Source: epics.md#Epic 3] — Market Context & Price Chart epic objectives
- [CoinGecko API Docs](https://docs.coingecko.com/reference/coins-markets) — Markets endpoint reference
- [CoinGecko API Docs](https://docs.coingecko.com/) — Market chart endpoint, granularity rules

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- All 16 unit tests pass (market-data-service.test.ts)
- `npm run build` succeeds
- `npm run lint` passes clean
- Pre-existing test failure in connection-manager.test.ts (from concurrent Story 2.2 work) — not a regression from this story

### Completion Notes List
- Implemented MarketDataService as singleton class with recursive setTimeout polling (60s interval)
- CoinGecko markets endpoint fetches market cap, 24h change, high/low and populates marketStore
- CoinGecko market_chart endpoint fetches 24h price data, sampled to 24 hourly points, populates chartStore
- sampleHourlyPoints exported for direct unit testing
- Error handling retains last known store values on API failure (NFR12)
- API errors logged via console.warn with endpoint URL (no user-facing error UI)
- Timer references tracked and cleared before scheduling new timers (memory leak prevention, NFR17)
- Added resetInstance() static method for test isolation
- Wired up MarketDataService.getInstance().start() in Layout.astro script block
- 16 tests covering: data mapping, store population, error retention, console.warn logging, singleton pattern, timer cleanup, sampling edge cases

### File List
- `src/lib/services/market-data-service.ts` — CREATED — CoinGecko REST polling service
- `src/lib/services/market-data-service.test.ts` — CREATED — 16 unit tests
- `src/layouts/Layout.astro` — MODIFIED — Added MarketDataService initialization script block

### Review Findings
- Clean review — all layers passed (Blind Hunter, Edge Case Hunter, Acceptance Auditor). No issues found.
- All 9 acceptance criteria verified and satisfied.
- All 16 unit tests pass.
- Reviewed by: reviewer-2 (2026-03-25)

### Change Log
- 2026-03-25: Story 3.1 implemented — MarketDataService with CoinGecko REST polling, 16 tests, Layout.astro integration
