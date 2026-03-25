# Story 2.2: WebSocket Connection Manager (Binance)

Status: review

## Story

As a user,
I want the dashboard to connect to a live Bitcoin data source automatically on page load,
So that I see real-time price updates without any action.

## Acceptance Criteria

1. **Given** the dashboard page loads and islands hydrate **When** the ConnectionManager initializes **Then** it connects to Binance WebSocket at `wss://stream.binance.com:9443/ws/btcusdt@trade` (FR11)
2. **And** raw Binance messages (`{ p: "68432.17", ... }`) are normalized to `PriceTick` format: `{ price: number, timestamp: number, direction: 'up' | 'down' | 'neutral' }`
3. **And** direction is computed by comparing to the previous price
4. **And** normalized `PriceTick` is written to `priceStore`
5. **And** `statusStore` is updated to `'live'` on successful connection
6. **And** `statusStore` is set to `'connecting'` during initial connection attempt
7. **And** the ConnectionManager is a singleton — only one WebSocket connection exists at any time
8. **And** `connection-manager.ts` never exposes raw WebSocket data to consumers
9. **And** old WebSocket listeners are cleaned up before creating new connections (memory leak prevention)
10. **And** services initialize via a `<script>` block in `Layout.astro`
11. **And** `connection-manager.test.ts` covers message normalization and direction computation

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/services/connection-manager.ts` (AC: #1, #5, #6, #7, #8, #9)
  - [x] Define `WS_BINANCE_URL` constant: `wss://stream.binance.com:9443/ws/btcusdt@trade`
  - [x] Implement `BinanceTradeMessage` interface for raw incoming messages
  - [x] Implement singleton `ConnectionManager` with private constructor and `getInstance()` static method
  - [x] Implement `connect()` method: sets `statusStore` to `'connecting'`, creates WebSocket, attaches listeners
  - [x] Implement `onopen` handler: sets `statusStore` to `'live'`
  - [x] Implement `onmessage` handler: parses JSON, calls `normalizeBinanceMessage()`, writes to `priceStore`
  - [x] Implement `onerror` handler: `console.warn()` only, no throw (error handling for this story is minimal — reconnection is Story 4.1)
  - [x] Implement `onclose` handler: `console.warn()` only (reconnection is Story 4.1)
  - [x] Implement `cleanup()` private method: close existing WebSocket, null the reference, remove listeners before creating new connections
  - [x] Implement `disconnect()` public method: calls `cleanup()` for external teardown
- [x] Task 2: Implement message normalization (AC: #2, #3, #8)
  - [x] Create `normalizeBinanceMessage(raw: BinanceTradeMessage, previousPrice: number | null): PriceTick`
  - [x] Parse `p` (price string) to `number` via `parseFloat()`
  - [x] Use `T` (trade time) as `timestamp` (milliseconds)
  - [x] Compute `direction`: `'up'` if price > previousPrice, `'down'` if price < previousPrice, `'neutral'` if equal or no previous price
  - [x] Store `previousPrice` as private instance variable for direction comparison
- [x] Task 3: Create `src/lib/services/connection-manager.test.ts` (AC: #11)
  - [x] Test: `normalizeBinanceMessage` produces correct `PriceTick` from raw Binance message
  - [x] Test: direction is `'neutral'` when no previous price exists
  - [x] Test: direction is `'up'` when current price > previous price
  - [x] Test: direction is `'down'` when current price < previous price
  - [x] Test: direction is `'neutral'` when current price === previous price
  - [x] Test: price string parsed correctly to number (e.g., `"68432.17"` → `68432.17`)
  - [x] Test: timestamp from `T` field is preserved
  - [x] Test: singleton pattern returns same instance
- [x] Task 4: Verify integration (AC: #4, #10)
  - [x] Verify `priceStore.set()` is called with normalized `PriceTick` on each message
  - [x] Verify `statusStore.set()` transitions: `'connecting'` → `'live'`
  - [x] NOTE: Do NOT add the `<script>` block to `Layout.astro` in this story — Story 2.3 or later will wire up the initialization. AC #10 documents the intended initialization mechanism only.

## Dev Notes

### SCOPE BOUNDARY

**This story implements Binance WebSocket connection ONLY.**

- NO reconnection logic — that is Story 4.1 (WebSocket Reconnection with Exponential Backoff)
- NO CoinCap fallback — that is Story 4.2 (CoinCap Fallback & REST Polling Fallback)
- NO exponential backoff — that is Story 4.1
- NO stale data detection — that is Story 4.3
- NO `Layout.astro` script block wiring — a later story (2.3+) will import and call `ConnectionManager.getInstance().connect()`

The ConnectionManager created here is designed to be **extended** by Stories 4.1 and 4.2 without breaking changes. Keep the singleton pattern clean so reconnection and fallback logic can be added later.

### File Locations

- **Source:** `src/lib/services/connection-manager.ts`
- **Test:** `src/lib/services/connection-manager.test.ts`

### Binance WebSocket API Reference

**Endpoint:** `wss://stream.binance.com:9443/ws/btcusdt@trade`

Alternative endpoint (market data only): `wss://data-stream.binance.vision/ws/btcusdt@trade`

**Connection limits:**
- A single connection is valid for 24 hours (NFR13 — handled as standard reconnect in Story 4.1)
- 5 incoming messages per second limit
- All timestamps are in milliseconds by default

**Raw Binance Trade Message Schema:**

```typescript
// This is the raw shape received from Binance WebSocket
interface BinanceTradeMessage {
  e: string;    // Event type, always "trade"
  E: number;    // Event time (ms)
  s: string;    // Symbol, e.g. "BTCUSDT"
  t: number;    // Trade ID
  p: string;    // Price as string, e.g. "68432.17000000"
  q: string;    // Quantity as string
  b: number;    // Buyer order ID
  a: number;    // Seller order ID
  T: number;    // Trade time (ms)
  m: boolean;   // Is the buyer the market maker?
  M: boolean;   // Ignore
}
```

**Example raw message:**
```json
{
  "e": "trade",
  "E": 1672515782136,
  "s": "BTCUSDT",
  "t": 12345,
  "p": "68432.17000000",
  "q": "0.001",
  "b": 88,
  "a": 50,
  "T": 1672515782136,
  "m": true,
  "M": true
}
```

### Normalization Logic

```typescript
// Binance raw → PriceTick normalized
// Only 3 fields needed from the raw message:
//   p (price string)  → parseFloat → PriceTick.price
//   T (trade time ms) → PriceTick.timestamp
//   compare to previous price → PriceTick.direction

function normalizeBinanceMessage(
  raw: BinanceTradeMessage,
  previousPrice: number | null
): PriceTick {
  const price = parseFloat(raw.p);
  const timestamp = raw.T;

  let direction: PriceTick['direction'] = 'neutral';
  if (previousPrice !== null) {
    if (price > previousPrice) direction = 'up';
    else if (price < previousPrice) direction = 'down';
    // equal → stays 'neutral'
  }

  return { price, timestamp, direction };
}
```

### Singleton Pattern

```typescript
class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private ws: WebSocket | null = null;
  private previousPrice: number | null = null;

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  connect(): void {
    this.cleanup(); // Ensure no existing connection leaks
    statusStore.set('connecting');
    this.ws = new WebSocket(WS_BINANCE_URL);
    // ... attach listeners
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  disconnect(): void {
    this.cleanup();
  }
}
```

### Store Writes

This story writes to two stores (created by Story 2.1):

- **`priceStore`** (`atom<PriceTick | null>`) — set with normalized `PriceTick` on every incoming trade message
- **`statusStore`** (`atom<ConnectionStatus>`) — set to `'connecting'` when `connect()` is called, set to `'live'` on WebSocket `onopen`

Import paths:
```typescript
import { priceStore } from '../stores/price-store';
import { statusStore } from '../stores/status-store';
```

### Memory Leak Prevention

- Before creating a new WebSocket, always call `cleanup()` to:
  1. Set all event handlers (`onopen`, `onmessage`, `onerror`, `onclose`) to `null`
  2. Call `ws.close()` on the existing connection
  3. Set `this.ws = null` to release the reference
- Never add listeners to a WebSocket that is being replaced
- The singleton pattern ensures only one WebSocket exists at any time

### Error Handling (This Story)

- `onerror`: `console.warn('WebSocket error:', event)` — no throw, no statusStore change (reconnection logic in Story 4.1 will handle this)
- `onclose`: `console.warn('WebSocket closed:', event.code, event.reason)` — no reconnection attempt (Story 4.1)
- Malformed messages: wrap `JSON.parse()` in try/catch, `console.error()` with raw data, skip the update — never crash the handler
- Never throw from WebSocket callbacks

### Testing Strategy

Export `normalizeBinanceMessage` as a named export for direct unit testing. The function is pure (no side effects) and easy to test in isolation.

For singleton and WebSocket behavior, use a mock WebSocket:

```typescript
// In test file, mock the global WebSocket
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  close = vi.fn();
  // Simulate events by calling handlers directly
}

vi.stubGlobal('WebSocket', vi.fn(() => new MockWebSocket()));
```

### Anti-Patterns (DO NOT)

- Do NOT use `addEventListener` for WebSocket events — use `onmessage`/`onopen`/etc. property assignment (easier cleanup, prevents listener accumulation)
- Do NOT expose the raw `WebSocket` instance or raw Binance messages outside `connection-manager.ts`
- Do NOT use `setInterval` for anything in this module
- Do NOT implement reconnection logic — that is Story 4.1
- Do NOT implement CoinCap fallback — that is Story 4.2
- Do NOT add the `<script>` initialization block to `Layout.astro` — a later story handles wiring
- Do NOT throw exceptions from WebSocket callbacks
- Do NOT store formatted strings in stores — store raw numbers, format in components

### Dependency on Story 2.1

This story imports from `price-store.ts` and `status-store.ts`, which are created in Story 2.1 (Nano Stores & Number Formatting Utilities). Story 2.1 must be completed first.

### Previous Story Intelligence

From Story 1.1:
- Project uses Astro 6.0.8 with TypeScript strict mode
- Vitest configured with `include: ['src/**/*.test.ts']`
- ESLint flat config with `eslint-plugin-astro`
- Test files are co-located with source (`src/lib/services/connection-manager.test.ts`)
- No barrel files — import directly from specific modules
- `PriceTick` and `ConnectionStatus` types defined in `src/lib/types.ts`

From Story 1.1 review findings (deferred items relevant to this story):
- `PriceTick.timestamp` has no unit documented — this story uses milliseconds (matching Binance `T` field)
- `PriceTick.price` allows non-positive/non-finite values — add a guard: skip `priceStore.set()` if `isNaN(price)` or `price <= 0`
- `PriceTick.direction` has no runtime validation — the normalization function guarantees valid direction values

### Constants

```typescript
const WS_BINANCE_URL = 'wss://stream.binance.com:9443/ws/btcusdt@trade';
```

Use `UPPER_SNAKE_CASE` per architecture naming conventions.

### References

- [Binance WebSocket Streams API](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams) — official endpoint docs, trade stream schema, 24h connection limit
- [Binance WebSocket Streams (GitHub)](https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md) — trade stream message format reference
- [Source: architecture.md#API & Communication Patterns] — WebSocket Manager singleton, fallback chain, normalization rules
- [Source: architecture.md#Data Architecture] — PriceTick interface, unidirectional data flow
- [Source: architecture.md#Process Patterns] — error handling standards, initialization sequence
- [Source: architecture.md#Implementation Patterns] — naming conventions, anti-patterns, memory leak prevention
- [Source: architecture.md#Gap Analysis Results] — NFR17 memory leak prevention rules (listener cleanup, reference nulling)
- [Source: prd.md#FR11] — Binance connection on page load
- [Source: prd.md#NFR9] — 500ms connection establishment target
- [Source: prd.md#NFR13] — 24h connection expiry (handled by Story 4.1)
- [Source: epics.md#Story 2.2] — acceptance criteria
- [Source: epics.md#Story 4.1] — reconnection with backoff (NOT this story)
- [Source: epics.md#Story 4.2] — CoinCap fallback (NOT this story)

## File List

- `src/lib/services/connection-manager.ts` (new) — ConnectionManager singleton with Binance WebSocket, message normalization, store writes
- `src/lib/services/connection-manager.test.ts` (new) — 19 unit tests covering normalization, direction, singleton, integration, edge cases

## Change Log

- 2026-03-25: Implemented Story 2.2 — WebSocket ConnectionManager (Binance) with normalization, singleton pattern, and comprehensive tests

## Dev Agent Record

### Implementation Plan

- Created `ConnectionManager` as a singleton class with `connect()`, `disconnect()`, and private `cleanup()` methods
- Exported `normalizeBinanceMessage()` as a pure function for direct unit testing
- Added `resetInstance()` static method for test isolation (resetting singleton between tests)
- Added guard for NaN/non-positive price values per Story 1.1 review finding
- Used `MockWebSocket` class (not `vi.fn()`) for constructor-compatible mocking

### Completion Notes

All 4 tasks completed. 19 tests written and passing. Full regression suite (71 tests across 5 files) passes with no regressions. All 11 acceptance criteria satisfied:
- AC#1: Connects to `wss://stream.binance.com:9443/ws/btcusdt@trade`
- AC#2: Raw Binance messages normalized to PriceTick format
- AC#3: Direction computed by comparing to previous price
- AC#4: Normalized PriceTick written to priceStore (verified via integration test)
- AC#5: statusStore set to 'live' on successful connection
- AC#6: statusStore set to 'connecting' during initial connection
- AC#7: Singleton pattern enforced — one instance, one WebSocket
- AC#8: Raw WebSocket data never exposed; BinanceTradeMessage is private interface
- AC#9: cleanup() nulls handlers and closes socket before new connections
- AC#10: Layout.astro script block NOT added per dev notes (deferred to Story 2.3+)
- AC#11: 19 tests cover normalization, direction, singleton, store writes, edge cases
