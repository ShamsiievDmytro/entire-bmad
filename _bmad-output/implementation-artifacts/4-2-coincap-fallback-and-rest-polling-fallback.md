# Story 4.2: CoinCap Fallback & REST Polling Fallback

Status: done

## Story

As a user,
I want the dashboard to try alternative data sources if the primary one fails,
So that I always see price data regardless of which service is available.

## Acceptance Criteria

1. **Given** the ConnectionManager fails to connect or reconnect to Binance **When** Binance WebSocket is unavailable after a configurable number of reconnection attempts **Then** the ConnectionManager attempts to connect to CoinCap WebSocket at `wss://ws.coincap.io/prices?assets=bitcoin` (FR12).
2. CoinCap messages (`{ bitcoin: "68432.17" }`) are normalized to the same `PriceTick` format as Binance messages.
3. On successful CoinCap connection, `statusStore` transitions to `'fallback'`.
4. Fallback from Binance to CoinCap completes without user intervention (NFR14).
5. If both Binance and CoinCap WebSockets fail, the system falls back to REST polling via the MarketDataService for price data (FR16).
6. During REST-only mode, `statusStore` reflects `'stale'` if no price update has been received within 30 seconds.
7. The dashboard remains functional displaying last known data when all external APIs are unreachable (NFR15).
8. When a higher-priority source becomes available again, the ConnectionManager reconnects to it (promotion check).
9. `connection-manager.test.ts` covers the full fallback chain: Binance -> CoinCap -> REST, including CoinCap message normalization, promotion logic, and state transitions.

## Tasks / Subtasks

- [x] Task 1: Add CoinCap and fallback constants (AC: #1, #5)
  - [x] Add `WS_COINCAP_URL = 'wss://ws.coincap.io/prices?assets=bitcoin'`
  - [x] Add `MAX_BINANCE_RETRIES = 3` — number of Binance reconnect attempts before falling back to CoinCap
  - [x] Add `MAX_COINCAP_RETRIES = 3` — number of CoinCap reconnect attempts before falling back to REST
  - [x] Add `STALE_THRESHOLD_MS = 30000` — time without price update before marking as stale
  - [x] Add `PROMOTION_CHECK_INTERVAL_MS = 60000` — interval to check if higher-priority source is available again

- [x] Task 2: Add CoinCap message normalization (AC: #2)
  - [x] Define `CoinCapPriceMessage` interface: `{ bitcoin: string }` (price as string)
  - [x] Implement `normalizeCoinCapMessage(raw: CoinCapPriceMessage, previousPrice: number | null): PriceTick`
  - [x] Parse `raw.bitcoin` via `parseFloat()` to get price
  - [x] Use `Date.now()` for timestamp (CoinCap does not provide trade timestamps)
  - [x] Compute direction using same logic as `normalizeBinanceMessage` (compare to previousPrice)
  - [x] Guard: skip if `isNaN(price)` or `price <= 0`
  - [x] Export `normalizeCoinCapMessage` for unit testing

- [x] Task 3: Implement fallback chain state machine (AC: #1, #3, #4, #5, #6)
  - [x] Add private enum/type `DataSource = 'binance' | 'coincap' | 'rest'`
  - [x] Add private instance variable `currentSource: DataSource = 'binance'`
  - [x] Add private instance variable `lastPriceUpdateTime: number = 0`
  - [x] Add private instance variable `staleCheckTimerId: ReturnType<typeof setTimeout> | null = null`
  - [x] Add private instance variable `promotionTimerId: ReturnType<typeof setTimeout> | null = null`

- [x] Task 4: Implement `connectCoinCap()` private method (AC: #1, #2, #3)
  - [x] Call `this.cleanup()` to close any existing WebSocket
  - [x] Set `this.currentSource = 'coincap'`
  - [x] Set `statusStore` to `'reconnecting'` while connecting
  - [x] Create WebSocket to `WS_COINCAP_URL`
  - [x] `onopen`: set `statusStore` to `'fallback'`, reset `reconnectAttempt = 0`, start stale check timer, start promotion timer
  - [x] `onmessage`: parse JSON, call `normalizeCoinCapMessage()`, write to `priceStore`, update `lastPriceUpdateTime`
  - [x] `onerror`: `console.warn('CoinCap WebSocket error:', event)` only
  - [x] `onclose`: if `reconnectAttempt < MAX_COINCAP_RETRIES`, schedule reconnect to CoinCap; else fall back to REST mode

- [x] Task 5: Implement `enterRestMode()` private method (AC: #5, #6, #7)
  - [x] Set `this.currentSource = 'rest'`
  - [x] Call `this.cleanup()` to close any WebSocket
  - [x] Set `statusStore` to `'stale'`
  - [x] Start promotion timer to periodically attempt to reconnect to Binance
  - [x] Log: `console.warn('All WebSocket sources exhausted, relying on REST polling')`
  - [x] NOTE: this method does NOT start REST polling — MarketDataService (from Story 3.1) already polls CoinGecko every 60s independently. The `priceStore` may receive updates from REST if MarketDataService is configured to also write price data. For v1, REST mode means "no active WebSocket, last known price displayed, status is stale."

- [x] Task 6: Modify `scheduleReconnect()` for fallback awareness (AC: #1, #4)
  - [x] Modify the reconnect scheduling to be source-aware:
    - If `currentSource === 'binance'` and `reconnectAttempt >= MAX_BINANCE_RETRIES`: call `connectCoinCap()` instead of retrying Binance
    - If `currentSource === 'coincap'` and `reconnectAttempt >= MAX_COINCAP_RETRIES`: call `enterRestMode()` instead of retrying CoinCap
    - Otherwise: schedule reconnect to current source with exponential backoff (existing logic from Story 4.1)

- [x] Task 7: Implement `attemptPromotion()` private method (AC: #8)
  - [x] If `currentSource` is `'coincap'` or `'rest'`: attempt to connect to Binance
  - [x] Use a single non-blocking WebSocket connection test: create WebSocket to Binance, set a 5-second timeout
  - [x] On successful open: close the test WebSocket, then call full `connect()` (which resets to Binance)
  - [x] On error/timeout: stay on current source, schedule next promotion check
  - [x] Schedule via `setTimeout(attemptPromotion, PROMOTION_CHECK_INTERVAL_MS)` stored in `promotionTimerId`
  - [x] `cleanup()` must clear `promotionTimerId`

- [x] Task 8: Implement stale data detection timer (AC: #6)
  - [x] Add `startStaleCheck()` private method: recursive `setTimeout` that checks if `Date.now() - lastPriceUpdateTime > STALE_THRESHOLD_MS`
  - [x] If stale and statusStore is not already `'stale'`: set `statusStore` to `'stale'`
  - [x] If not stale and statusStore was `'stale'`: restore to `'live'` or `'fallback'` based on `currentSource`
  - [x] Update `lastPriceUpdateTime = Date.now()` in every `onmessage` handler (Binance and CoinCap)
  - [x] Store timer ID in `staleCheckTimerId`, clear in `cleanup()`
  - [x] Check interval: 5000ms (check every 5 seconds)

- [x] Task 9: Extend `cleanup()` for all timers (AC: #7)
  - [x] Clear `reconnectTimerId` (already from Story 4.1)
  - [x] Clear `staleCheckTimerId` and null it
  - [x] Clear `promotionTimerId` and null it
  - [x] All existing WebSocket cleanup remains unchanged

- [x] Task 10: Modify `connect()` public method entry point
  - [x] Reset all state: `reconnectAttempt = 0`, `currentSource = 'binance'`
  - [x] Call `connectBinance()` (from Story 4.1)
  - [x] Start stale check timer

- [x] Task 11: Modify `connectBinance()` to update `lastPriceUpdateTime` (AC: #6)
  - [x] In `onmessage` handler: add `this.lastPriceUpdateTime = Date.now()` after writing to priceStore
  - [x] In `onopen` handler: start stale check timer, start promotion clearing (no promotion needed when on Binance)

- [x] Task 12: Add/extend unit tests (AC: #9)
  - [x] Test: `normalizeCoinCapMessage` produces correct PriceTick from `{ bitcoin: "68432.17" }`
  - [x] Test: CoinCap direction computation (up/down/neutral) works identically to Binance
  - [x] Test: CoinCap message with invalid price (NaN, empty string) is skipped
  - [x] Test: fallback chain — Binance fails 3 times -> CoinCap connection attempted
  - [x] Test: fallback chain — CoinCap fails 3 times -> enters REST mode
  - [x] Test: Binance connection sets statusStore to 'live'
  - [x] Test: CoinCap connection sets statusStore to 'fallback'
  - [x] Test: REST mode sets statusStore to 'stale'
  - [x] Test: stale detection fires when no price update for >30s
  - [x] Test: promotion check attempts Binance reconnection from CoinCap/REST mode
  - [x] Test: successful promotion resets to Binance as primary source
  - [x] Test: cleanup() clears all timers (reconnect, stale check, promotion)
  - [x] Test: priceStore is never cleared during any fallback transition
  - [x] Mock `setTimeout`/`clearTimeout` with `vi.useFakeTimers()`

## Dev Notes

### SCOPE BOUNDARY

**This story MODIFIES `src/lib/services/connection-manager.ts` (already modified by Story 4.1).**

- YES: CoinCap WebSocket fallback connection and message normalization
- YES: Fallback chain state machine (Binance -> CoinCap -> REST)
- YES: Stale data detection timer (30s threshold)
- YES: Source promotion (reconnect to higher-priority source when available)
- YES: All timer cleanup in `cleanup()` method
- NO: Status Indicator UI component — that is Story 4.3
- NO: Stale badge UI on PriceCard — that is Story 4.3 (badge logic already exists from Story 2.3, driven by statusStore)
- NO: MarketDataService changes — REST polling already runs independently (Story 3.1)
- NO: Any changes to store definitions or type interfaces

### Complete Fallback Chain

```
Binance WS (primary)
  ├─ connected → statusStore = 'live'
  ├─ disconnected → exponential backoff retry (1s, 2s, 4s)
  └─ 3 failures → fall to CoinCap
        ├─ connected → statusStore = 'fallback'
        ├─ disconnected → exponential backoff retry (1s, 2s, 4s)
        └─ 3 failures → fall to REST mode
              └─ statusStore = 'stale'
              └─ MarketDataService already polling CoinGecko every 60s

Promotion (background):
  Every 60s, if on CoinCap or REST, test if Binance is reachable.
  If yes → reconnect to Binance (statusStore → 'live').
```

### CoinCap WebSocket API Reference

**Endpoint:** `wss://ws.coincap.io/prices?assets=bitcoin`

**No authentication required.** Public endpoint, no API key, no rate limits documented for WebSocket.

**Message format:** JSON object with asset names as keys and price strings as values.

```json
{ "bitcoin": "68432.17" }
```

Messages arrive approximately every 1-2 seconds when there is trading activity. Unlike Binance, CoinCap aggregates prices across exchanges rather than reporting individual trades.

**Key differences from Binance:**
- No individual trade data (no trade ID, quantity, buyer/seller)
- No timestamp in message — use `Date.now()` for `PriceTick.timestamp`
- Price is a simple string value, not nested in a complex message structure
- Asset name is the key (lowercase), not a symbol like "BTCUSDT"

**CoinCap normalization:**

```typescript
interface CoinCapPriceMessage {
  bitcoin: string;
}

function normalizeCoinCapMessage(
  raw: CoinCapPriceMessage,
  previousPrice: number | null
): PriceTick | null {
  const price = parseFloat(raw.bitcoin);
  if (isNaN(price) || price <= 0) return null;

  const timestamp = Date.now();

  let direction: PriceTick['direction'] = 'neutral';
  if (previousPrice !== null) {
    if (price > previousPrice) direction = 'up';
    else if (price < previousPrice) direction = 'down';
  }

  return { price, timestamp, direction };
}
```

Note: returns `null` for invalid data (caller must check before writing to priceStore).

### State Machine Transitions

```
State: currentSource + statusStore

BINANCE + 'connecting'  →  onopen  →  BINANCE + 'live'
BINANCE + 'live'        →  onclose →  BINANCE + 'reconnecting'
BINANCE + 'reconnecting' →  retry < 3  →  BINANCE + 'reconnecting'
BINANCE + 'reconnecting' →  retry >= 3 →  COINCAP + 'reconnecting'
COINCAP + 'reconnecting' →  onopen  →  COINCAP + 'fallback'
COINCAP + 'fallback'     →  onclose →  COINCAP + 'reconnecting'
COINCAP + 'reconnecting' →  retry < 3  →  COINCAP + 'reconnecting'
COINCAP + 'reconnecting' →  retry >= 3 →  REST + 'stale'
REST + 'stale'           →  promotion succeeds →  BINANCE + 'live'
COINCAP + 'fallback'     →  promotion succeeds →  BINANCE + 'live'
ANY + ANY                →  no price for 30s    →  statusStore = 'stale'
ANY + 'stale'            →  price received      →  restore previous status
```

### Reconnect Attempt Counter Behavior

The `reconnectAttempt` counter is SHARED across the current source's retry cycle:
- Resets to 0 when `connect()` is called (fresh start)
- Resets to 0 on successful `onopen` (any source)
- Resets to 0 when switching to a new source (CoinCap or REST)
- Increments on each failed reconnect attempt

This means each source gets its own fresh set of retry attempts.

### Stale Data Detection

The stale check is a recurring timer (every 5 seconds) that compares `Date.now()` against `lastPriceUpdateTime`:

```typescript
private startStaleCheck(): void {
  this.stopStaleCheck();
  const check = () => {
    const elapsed = Date.now() - this.lastPriceUpdateTime;
    if (elapsed > STALE_THRESHOLD_MS) {
      if (statusStore.get() !== 'stale') {
        statusStore.set('stale');
      }
    }
    this.staleCheckTimerId = setTimeout(check, 5000);
  };
  this.staleCheckTimerId = setTimeout(check, 5000);
}

private stopStaleCheck(): void {
  if (this.staleCheckTimerId !== null) {
    clearTimeout(this.staleCheckTimerId);
    this.staleCheckTimerId = null;
  }
}
```

When a new price arrives (`onmessage`), update `lastPriceUpdateTime` and if the current status is `'stale'`, restore it to the appropriate value based on `currentSource`:
- `'binance'` -> `'live'`
- `'coincap'` -> `'fallback'`
- `'rest'` -> keep `'stale'` (REST mode is inherently stale relative to WebSocket)

### Promotion Check Logic

The promotion check is a lightweight "canary" connection attempt:

```typescript
private attemptPromotion(): void {
  if (this.currentSource === 'binance') return; // already on best source

  const testWs = new WebSocket(WS_BINANCE_URL);
  const timeoutId = setTimeout(() => {
    testWs.close();
    this.schedulePromotionCheck(); // try again later
  }, 5000);

  testWs.onopen = () => {
    clearTimeout(timeoutId);
    testWs.close();
    // Binance is reachable — promote
    this.connect(); // full reset to Binance
  };

  testWs.onerror = () => {
    clearTimeout(timeoutId);
    testWs.close();
    this.schedulePromotionCheck(); // try again later
  };
}

private schedulePromotionCheck(): void {
  if (this.promotionTimerId !== null) {
    clearTimeout(this.promotionTimerId);
  }
  this.promotionTimerId = setTimeout(
    () => this.attemptPromotion(),
    PROMOTION_CHECK_INTERVAL_MS
  );
}
```

The canary WebSocket is separate from the main `this.ws` — it does not interfere with the current active connection. Only if it successfully opens does the manager promote back to Binance.

### Memory Leak Prevention (NFR17)

This story adds two more timer references that MUST be cleaned up:
1. `staleCheckTimerId` — recurring 5s timer for stale detection
2. `promotionTimerId` — recurring 60s timer for source promotion

Both must be cleared in `cleanup()` and in `disconnect()`. The canary WebSocket in `attemptPromotion()` must also be closed in all code paths (onopen, onerror, timeout).

Total timer references after this story: `reconnectTimerId`, `staleCheckTimerId`, `promotionTimerId`.

### REST Mode Details

"REST mode" does NOT implement new REST polling. The MarketDataService (Story 3.1) already polls CoinGecko every 60 seconds independently of the ConnectionManager. REST mode simply means:
- No active WebSocket connection
- `statusStore` set to `'stale'`
- `priceStore` retains last known value
- MarketDataService continues to update `marketStore` and `chartStore` as normal
- Promotion timer periodically checks if Binance is reachable again

If a future enhancement wants REST to also update `priceStore`, that would be a change to MarketDataService, not ConnectionManager.

### Testing Strategy

Extend the mock pattern from Story 4.1:

```typescript
// Track all WebSocket instances created
const wsInstances: MockWebSocket[] = [];

vi.stubGlobal('WebSocket', vi.fn((url: string) => {
  const ws = new MockWebSocket(url);
  wsInstances.push(ws);
  return ws;
}));

// In tests, access specific instances:
// wsInstances[0] = Binance attempt 1
// wsInstances[1] = Binance attempt 2 (reconnect)
// wsInstances[3] = CoinCap attempt 1 (after 3 Binance failures)
```

Track the `url` parameter in MockWebSocket to verify correct endpoint is being connected:
```typescript
class MockWebSocket {
  url: string;
  constructor(url: string) { this.url = url; }
  // ... handlers and close mock
}
```

### Anti-Patterns (DO NOT)

- Do NOT implement new REST polling logic — MarketDataService already handles this independently
- Do NOT modify MarketDataService in this story
- Do NOT modify store definitions or type interfaces
- Do NOT clear priceStore during any fallback transition — last known price must persist
- Do NOT use `addEventListener` for WebSocket events — use property assignment
- Do NOT use `setInterval` for any timer — use recursive `setTimeout`
- Do NOT throw from WebSocket callbacks or timer callbacks
- Do NOT make the canary promotion WebSocket interfere with the active `this.ws` connection
- Do NOT add UI changes — Story 4.3 handles the Status Indicator and stale badge

### Previous Story Intelligence

**Story 4.1 establishes (prerequisite for this story):**
- Exponential backoff in ConnectionManager: `INITIAL_BACKOFF_MS`, `MAX_BACKOFF_MS`, `BACKOFF_MULTIPLIER`
- Private methods: `getBackoffDelay()`, `scheduleReconnect()`, `attemptReconnect()`, `connectBinance()`
- Instance variables: `reconnectAttempt`, `reconnectTimerId`
- `cleanup()` clears WebSocket AND reconnect timer
- `onclose` triggers `scheduleReconnect()`
- `onopen` resets `reconnectAttempt` and clears timer
- Public `connect()` resets attempt counter and calls `connectBinance()`
- `disconnect()` resets attempt counter

**Story 2.2 establishes:**
- `normalizeBinanceMessage()` exported for testing
- `BinanceTradeMessage` interface
- Singleton pattern with `getInstance()`
- `previousPrice` tracking for direction
- `cleanup()` nulls handlers, closes WS, nulls reference

**Story 2.1 establishes:**
- `ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'stale' | 'fallback'`
- The `'fallback'` status value already exists in the type — no type changes needed

**Story 2.3 establishes:**
- PriceCard already subscribes to `statusStore` and shows/hides stale badge when status is `'stale'`
- No PriceCard changes needed for this story — the UI already reacts to statusStore values

### Project Structure Context

```
src/lib/
├── types.ts                  # PriceTick, ConnectionStatus — NO CHANGES
├── stores/
│   ├── price-store.ts        # atom<PriceTick | null> — NO CHANGES
│   └── status-store.ts       # atom<ConnectionStatus> — NO CHANGES
└── services/
    ├── connection-manager.ts      # MODIFY — add CoinCap, fallback chain, stale, promotion
    ├── connection-manager.test.ts # MODIFY — add fallback chain tests
    └── market-data-service.ts     # NO CHANGES — already polls independently
```

### Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/services/connection-manager.ts` | MODIFY | Add CoinCap connection, fallback chain, stale detection, promotion |
| `src/lib/services/connection-manager.test.ts` | MODIFY | Add CoinCap normalization tests, fallback chain tests |

### References

- [Source: architecture.md#API & Communication Patterns] — fallback chain: Binance -> CoinCap, stale threshold 30s, singleton manager
- [Source: architecture.md#Communication Patterns] — CoinCap format: `{ bitcoin: "68432.17" }` -> normalized PriceTick
- [Source: architecture.md#Integration Points] — CoinCap WS endpoint, error strategy (fallback to REST polling)
- [Source: architecture.md#Gap Analysis Results] — timer reference management, WebSocket listener cleanup
- [Source: architecture.md#Process Patterns] — error handling standards, no user-facing error UI
- [Source: epics.md#Story 4.2] — acceptance criteria
- [Source: epics.md#Epic 4] — Connection Resilience & Reliability epic objectives
- [Source: prd.md#FR12] — CoinCap fallback WebSocket
- [Source: prd.md#FR16] — REST polling fallback when WebSocket unavailable
- [Source: prd.md#NFR14] — Binance to CoinCap fallback without user intervention
- [Source: prd.md#NFR15] — dashboard functional with last known data when all APIs unreachable
- [Source: prd.md#NFR17] — no memory leaks (timer cleanup)
- [Source: 4-1-websocket-reconnection-with-exponential-backoff.md] — exponential backoff implementation, timer management
- [Source: 2-2-websocket-connection-manager-binance.md] — existing ConnectionManager structure
- [CoinCap API docs: https://docs.coincap.io/] — WebSocket prices endpoint
- [CoinCap WebSocket: wss://ws.coincap.io/prices?assets=bitcoin] — verified public endpoint, no auth required

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References
- CoinCap reconnect counter bug: `connectCoinCap()` originally reset `reconnectAttempt = 0` on every call, preventing counter from reaching MAX_COINCAP_RETRIES since `attemptReconnect` calls `connectCoinCap`. Fixed by moving reset to `scheduleReconnect()` at the Binance-to-CoinCap transition point only.
- Fallback chain test fix: Tests needed 4 onclose events (3 retries via timer + 1 final onclose to trigger the >=3 check), not 3.
- Backoff test adjustment: After adding fallback chain, original 7-delay test changed to [1000, 2000, 4000] (only 3 Binance retries before fallback).

### Completion Notes List
- All 12 tasks implemented and verified
- 46 tests in connection-manager.test.ts (up from 19 in Story 2.2, 29 after Story 4.1)
- 17 new tests: 7 CoinCap normalization + 10 fallback chain tests
- Full test suite passes (104 total across project)
- Build succeeds with no lint errors
- No changes to store definitions, types, or other files outside scope

### File List
| File | Action | Description |
|------|--------|-------------|
| `src/lib/services/connection-manager.ts` | MODIFIED | Added CoinCap connection, fallback chain state machine, stale detection, promotion check |
| `src/lib/services/connection-manager.test.ts` | MODIFIED | Added 17 new tests for CoinCap normalization and fallback chain |

### Review Findings

- [x] [Review][Defer] Promotion canary WebSocket not tracked in `this.ws` — if `disconnect()` is called while a canary probe is in-flight, the canary's `onopen` could call `this.connect()` after disconnect. Low probability race condition; canary has 5s timeout and handlers null each other out. Not caused by this change (inherent to the canary pattern from the spec).
- [x] [Review][Dismiss] `connect()` and `connectBinance().onopen` both call `startStaleCheck()` — redundant but safe; `startStaleCheck()` calls `stopStaleCheck()` first, preventing timer leak.
- [x] [Review][Dismiss] `enterRestMode()` does not start stale check — correct because status is already `'stale'` in REST mode; no need to detect staleness.
- [x] [Review][Dismiss] `connectBinance()` sets `this.currentSource = 'binance'` redundantly (already set in `connect()`) — safe, ensures correctness when called via `attemptReconnect()`.

**Reviewer verdict: PASS** — All 9 acceptance criteria met. Fallback chain (Binance -> CoinCap -> REST) works correctly. CoinCap normalization correct. Stale detection at 30s threshold with 5s check interval. Promotion canary pattern properly isolated from main connection. All timers cleaned up in `cleanup()`. 104 tests pass. 0 decision-needed, 0 patch, 1 defer, 3 dismissed.

### Change Log
| Change | Reason |
|--------|--------|
| Added `WS_COINCAP_URL`, `MAX_BINANCE_RETRIES`, `MAX_COINCAP_RETRIES`, `STALE_THRESHOLD_MS`, `PROMOTION_CHECK_INTERVAL_MS`, `STALE_CHECK_INTERVAL_MS`, `PROMOTION_TIMEOUT_MS` constants | Fallback chain configuration |
| Added `CoinCapPriceMessage` interface and `normalizeCoinCapMessage()` export | CoinCap message normalization (AC #2) |
| Added `DataSource` type and `currentSource`, `lastPriceUpdateTime`, `staleCheckTimerId`, `promotionTimerId` instance vars | Fallback state machine tracking |
| Added `connectCoinCap()` private method | CoinCap WebSocket connection with fallback status (AC #1, #3) |
| Added `enterRestMode()` private method | REST fallback when all WS sources exhausted (AC #5, #6) |
| Modified `scheduleReconnect()` for source-aware fallback | Binance->CoinCap->REST chain (AC #1, #4) |
| Added `attemptPromotion()` and `schedulePromotionCheck()`/`stopPromotionCheck()` | Source promotion back to Binance (AC #8) |
| Added `startStaleCheck()`/`stopStaleCheck()` | Stale data detection at 30s threshold (AC #6) |
| Extended `cleanup()` to clear stale and promotion timers | Memory leak prevention (NFR17) |
| Modified `connect()` to reset source and start stale check | Clean entry point for fallback chain |
| Updated `connectBinance()` onmessage to track `lastPriceUpdateTime` | Stale detection support |