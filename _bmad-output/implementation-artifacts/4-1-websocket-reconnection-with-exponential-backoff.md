# Story 4.1: WebSocket Reconnection with Exponential Backoff

Status: done

## Story

As a user,
I want the dashboard to automatically recover from connection drops without my intervention,
So that the live price feed resumes seamlessly after network interruptions.

## Acceptance Criteria

1. **Given** the ConnectionManager has an active Binance WebSocket connection **When** the WebSocket connection drops (error, close, or network failure) **Then** `statusStore` transitions to `'reconnecting'` (FR14).
2. Reconnection attempts begin with exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s cap (NFR10).
3. On successful reconnection, `statusStore` transitions back to `'live'`.
4. The previous WebSocket instance is fully closed (`ws.close()`) and its reference nulled before creating a new connection (memory leak prevention, NFR17).
5. No JavaScript errors or white screens occur during disconnection or reconnection (NFR16).
6. Binance 24-hour connection expiry is handled as a standard disconnect/reconnect cycle — no special logic (NFR13).
7. The last known price remains displayed in the Price Card during reconnection (NFR15) — priceStore is never cleared on disconnect.
8. `connection-manager.test.ts` covers backoff timing calculation, timer cleanup, listener cleanup, and reconnection state transitions.

## Tasks / Subtasks

- [x] Task 1: Add reconnection state and constants to ConnectionManager (AC: #1, #2)
  - [x] Add constants: `INITIAL_BACKOFF_MS = 1000`, `MAX_BACKOFF_MS = 30000`, `BACKOFF_MULTIPLIER = 2`
  - [x] Add private instance variables: `reconnectAttempt: number = 0`, `reconnectTimerId: ReturnType<typeof setTimeout> | null = null`
  - [x] Add private method `getBackoffDelay(): number` that computes `Math.min(INITIAL_BACKOFF_MS * (BACKOFF_MULTIPLIER ** this.reconnectAttempt), MAX_BACKOFF_MS)`

- [x] Task 2: Implement `scheduleReconnect()` private method (AC: #1, #2, #3, #4)
  - [x] Set `statusStore` to `'reconnecting'` (only if not already `'reconnecting'`)
  - [x] Clear any existing `reconnectTimerId` via `clearTimeout()` before scheduling
  - [x] Compute delay via `getBackoffDelay()`
  - [x] Schedule `setTimeout(() => this.attemptReconnect(), delay)` and store timer ID in `reconnectTimerId`
  - [x] Increment `reconnectAttempt`
  - [x] Log reconnection attempt: `console.warn('Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})')`

- [x] Task 3: Implement `attemptReconnect()` private method (AC: #3, #4)
  - [x] Call `this.cleanup()` (existing method from Story 2.2 — closes WebSocket, nulls handlers and reference)
  - [x] Call `this.connectBinance()` (renamed from `connect()` — see Task 4)

- [x] Task 4: Modify existing `connect()` and event handlers (AC: #1, #3, #5, #6)
  - [x] Rename internal Binance connection logic to private `connectBinance()` method
  - [x] Keep public `connect()` as the entry point — it calls `connectBinance()` and resets `reconnectAttempt = 0`
  - [x] Modify `onopen` handler: set `statusStore` to `'live'`, reset `reconnectAttempt = 0`, clear `reconnectTimerId`
  - [x] Modify `onclose` handler: replace `console.warn` only with call to `this.scheduleReconnect()`
  - [x] Modify `onerror` handler: keep `console.warn()`, do NOT call `scheduleReconnect()` here (onclose always fires after onerror, so reconnect is handled there)

- [x] Task 5: Extend `cleanup()` for timer management (AC: #4)
  - [x] Add `clearTimeout(this.reconnectTimerId)` and `this.reconnectTimerId = null` to existing `cleanup()`
  - [x] Existing WebSocket cleanup (null handlers, close, null reference) remains unchanged

- [x] Task 6: Extend `disconnect()` public method (AC: #4)
  - [x] Call `this.cleanup()` (already present)
  - [x] Reset `this.reconnectAttempt = 0` to prevent stale backoff state on manual disconnect
  - [x] Set `statusStore` to `'connecting'` (neutral state after intentional disconnect)

- [x] Task 7: Add/extend unit tests in `connection-manager.test.ts` (AC: #8)
  - [x] Test: `getBackoffDelay()` returns correct delays: 1000, 2000, 4000, 8000, 16000, 30000, 30000 (capped)
  - [x] Test: `scheduleReconnect()` sets statusStore to `'reconnecting'`
  - [x] Test: `scheduleReconnect()` clears previous timer before scheduling new one
  - [x] Test: successful reconnection resets `reconnectAttempt` to 0
  - [x] Test: successful reconnection sets statusStore to `'live'`
  - [x] Test: `cleanup()` clears reconnect timer
  - [x] Test: `disconnect()` resets reconnect attempt counter
  - [x] Test: `onclose` triggers `scheduleReconnect()` (not `onerror`)
  - [x] Test: priceStore is NOT cleared on disconnect (last known price preserved)
  - [x] Mock `setTimeout`/`clearTimeout` using `vi.useFakeTimers()`

## Dev Notes

### SCOPE BOUNDARY

**This story MODIFIES `src/lib/services/connection-manager.ts` created in Story 2.2.**

- YES: Exponential backoff reconnection for Binance WebSocket
- YES: Timer management and cleanup for reconnection
- YES: statusStore transitions for reconnecting state
- NO: CoinCap fallback — that is Story 4.2
- NO: REST polling fallback — that is Story 4.2
- NO: Stale data detection/badge — that is Story 4.3
- NO: Status Indicator UI component — that is Story 4.3
- NO: Any changes to priceStore, statusStore definitions, or PriceCard component

After this story, the ConnectionManager reconnects to Binance on disconnect. Story 4.2 will add the fallback chain (Binance -> CoinCap -> REST) on top of this.

### File to Modify

**`src/lib/services/connection-manager.ts`** — this is the ONLY source file modified. All changes are additive or modify existing handler bodies. The public API surface remains the same (`connect()`, `disconnect()`).

**`src/lib/services/connection-manager.test.ts`** — extend with reconnection tests.

### Existing ConnectionManager Structure (from Story 2.2)

The ConnectionManager created in Story 2.2 has this structure that you MUST understand before modifying:

```typescript
// Constants
const WS_BINANCE_URL = 'wss://stream.binance.com:9443/ws/btcusdt@trade';

class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private ws: WebSocket | null = null;
  private previousPrice: number | null = null;

  private constructor() {}

  static getInstance(): ConnectionManager { /* singleton */ }

  connect(): void {
    this.cleanup();
    statusStore.set('connecting');
    this.ws = new WebSocket(WS_BINANCE_URL);
    // onopen → statusStore.set('live')
    // onmessage → normalize → priceStore.set()
    // onerror → console.warn only
    // onclose → console.warn only
  }

  private cleanup(): void {
    // nulls handlers, closes ws, nulls reference
  }

  disconnect(): void {
    this.cleanup();
  }
}

// Also exports: normalizeBinanceMessage()
```

### What to ADD (new members)

```typescript
// NEW constants
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const BACKOFF_MULTIPLIER = 2;

// NEW private instance variables
private reconnectAttempt: number = 0;
private reconnectTimerId: ReturnType<typeof setTimeout> | null = null;

// NEW private methods
private getBackoffDelay(): number { /* exponential with cap */ }
private scheduleReconnect(): void { /* status + timer + increment */ }
private attemptReconnect(): void { /* cleanup + connectBinance */ }
private connectBinance(): void { /* extracted from connect() */ }
```

### What to MODIFY (existing members)

```typescript
// MODIFY connect() — extract Binance logic to connectBinance(), reset attempt counter
connect(): void {
  this.reconnectAttempt = 0;
  this.connectBinance();
}

// MODIFY cleanup() — add timer cleanup
private cleanup(): void {
  if (this.reconnectTimerId !== null) {
    clearTimeout(this.reconnectTimerId);
    this.reconnectTimerId = null;
  }
  // ... existing WebSocket cleanup unchanged
}

// MODIFY disconnect() — add attempt reset
disconnect(): void {
  this.cleanup();
  this.reconnectAttempt = 0;
}

// MODIFY onclose handler — call scheduleReconnect() instead of console.warn
// MODIFY onopen handler — reset reconnectAttempt, clear timer
```

### Exponential Backoff Algorithm

```typescript
private getBackoffDelay(): number {
  return Math.min(
    INITIAL_BACKOFF_MS * (BACKOFF_MULTIPLIER ** this.reconnectAttempt),
    MAX_BACKOFF_MS
  );
}
```

Sequence of delays: 1000ms, 2000ms, 4000ms, 8000ms, 16000ms, 30000ms (cap), 30000ms, ...

The `reconnectAttempt` counter increments AFTER computing the delay (so first attempt uses `2^0 = 1`, giving 1000ms).

### Timer Lifecycle

1. `onclose` fires -> `scheduleReconnect()` called
2. `scheduleReconnect()` clears any existing timer -> computes delay -> schedules new timer -> increments attempt
3. Timer fires -> `attemptReconnect()` -> `cleanup()` (clears timer again for safety) -> `connectBinance()`
4. If `onopen` fires -> reset `reconnectAttempt = 0`, clear timer -> we're live
5. If `onclose` fires again -> back to step 1 with incremented attempt

### Critical: onerror vs onclose

Per the WebSocket spec, `onerror` is ALWAYS followed by `onclose`. Therefore:
- `onerror`: log only (`console.warn`). Do NOT schedule reconnect here.
- `onclose`: schedule reconnect. This is the single reconnection trigger.

If reconnect were triggered in both handlers, it would fire twice on every error.

### Critical: Never Clear priceStore

When a disconnect occurs, the ConnectionManager must NOT call `priceStore.set(null)`. The last known price remains displayed in the Price Card. The `statusStore` transition to `'reconnecting'` is sufficient to indicate the connection state. Story 4.3 will add a stale badge based on time since last update.

### Memory Leak Prevention (NFR17)

Three leak vectors addressed:
1. **WebSocket listeners** — `cleanup()` nulls all handlers before `ws.close()` (already from Story 2.2)
2. **Reconnection timers** — `cleanup()` now also calls `clearTimeout(reconnectTimerId)` and nulls the reference
3. **Stale WebSocket references** — `cleanup()` sets `this.ws = null` after closing (already from Story 2.2)

Every path that creates a new WebSocket MUST go through `cleanup()` first to prevent accumulation.

### Binance 24-Hour Connection Expiry (NFR13)

Binance automatically closes WebSocket connections after 24 hours. This fires the standard `onclose` event. No special detection or handling is needed — the normal reconnection cycle handles it. The reconnect attempt counter starts at 0 after a successful connection, so even after a 24h expiry, the first reconnection attempt happens after just 1 second.

### Testing Strategy

Use `vi.useFakeTimers()` to control timer execution:

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock WebSocket
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readyState = WebSocket.CONNECTING;
  close = vi.fn();
}

vi.stubGlobal('WebSocket', vi.fn(() => new MockWebSocket()));

describe('reconnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules reconnect with exponential backoff', () => {
    // Trigger onclose, verify setTimeout called with correct delays
    // vi.advanceTimersByTime() to trigger reconnection attempts
  });
});
```

Key test patterns:
- Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` to test backoff delays without real waiting
- Access the MockWebSocket instance via `vi.mocked(WebSocket).mock.results[n].value` to trigger events
- Reset singleton between tests by accessing `ConnectionManager['instance'] = null` (or expose a test-only reset)

### Anti-Patterns (DO NOT)

- Do NOT use `setInterval` for reconnection — use `setTimeout` with exponential backoff
- Do NOT reconnect in `onerror` handler — only in `onclose` (onerror is always followed by onclose)
- Do NOT clear `priceStore` on disconnect — last known price must remain displayed
- Do NOT add CoinCap or REST fallback — that is Story 4.2
- Do NOT add stale data detection — that is Story 4.3
- Do NOT add jitter to backoff — keep it simple for v1 (exact powers of 2)
- Do NOT use `addEventListener` for WebSocket events — use property assignment (onopen, onclose, etc.)
- Do NOT throw from any WebSocket callback or timer callback

### Previous Story Intelligence

**Story 2.2 establishes:**
- `connection-manager.ts` with singleton ConnectionManager, `connect()`, `cleanup()`, `disconnect()`, `normalizeBinanceMessage()`
- WebSocket event handlers using property assignment (onopen, onmessage, onerror, onclose)
- `previousPrice` tracking for direction computation
- Imports: `priceStore` from `../stores/price-store`, `statusStore` from `../stores/status-store`
- `BinanceTradeMessage` interface for raw messages
- `cleanup()` nulls all handlers, calls `ws.close()`, nulls `this.ws`
- `onerror` and `onclose` currently only do `console.warn()`

**Story 2.1 establishes:**
- `statusStore` as `atom<ConnectionStatus>('connecting')` where `ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'stale' | 'fallback'`
- The `'reconnecting'` status value already exists in the type — no type changes needed

**Story 1.1 establishes:**
- Vitest v4.1.1 with `vi.useFakeTimers()`, `vi.advanceTimersByTime()` support
- TypeScript strict mode — all variables must be typed
- Test files co-located: `src/lib/services/connection-manager.test.ts`

**Story 2.3 establishes:**
- PriceCard subscribes to `statusStore` for stale badge visibility
- PriceCard subscribes to `priceStore` for price display — will keep showing last price during reconnection

### Project Structure Context

```
src/lib/
├── types.ts                  # PriceTick, ConnectionStatus — NO CHANGES
├── stores/
│   ├── price-store.ts        # atom<PriceTick | null> — NO CHANGES
│   └── status-store.ts       # atom<ConnectionStatus> — NO CHANGES
└── services/
    ├── connection-manager.ts      # MODIFY — add reconnection
    └── connection-manager.test.ts # MODIFY — add reconnection tests
```

### References

- [Source: architecture.md#API & Communication Patterns] — exponential backoff 1s to 30s cap, singleton WebSocket manager
- [Source: architecture.md#Gap Analysis Results] — NFR17 memory leak prevention: listener cleanup, timer reference management
- [Source: architecture.md#Process Patterns] — error handling: WebSocket errors -> silent reconnection, no thrown exceptions
- [Source: architecture.md#Implementation Patterns] — naming conventions (UPPER_SNAKE_CASE constants, camelCase methods)
- [Source: epics.md#Story 4.1] — acceptance criteria, scope
- [Source: epics.md#Epic 4] — Connection Resilience & Reliability epic objectives
- [Source: prd.md#NFR10] — exponential backoff 1s start, 30s cap
- [Source: prd.md#NFR13] — Binance 24h connection expiry handled transparently
- [Source: prd.md#NFR15] — dashboard remains functional with last known data
- [Source: prd.md#NFR16] — no JS errors or white screens on disconnection
- [Source: prd.md#NFR17] — no memory leaks over 24h+ sessions
- [Source: prd.md#FR13] — system automatically reconnects on drop
- [Source: prd.md#FR14] — visual indicator when reconnecting (statusStore drives this)
- [Source: 2-2-websocket-connection-manager-binance.md] — existing ConnectionManager structure, cleanup pattern, test patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initial test for backoff delays failed because inner loop double-fired onclose events (each creating a new WS that also triggered onclose). Fixed by simplifying: only trigger onclose once per iteration, don't trigger onopen, let attempt counter naturally increment.
- Cleanup test failed because `vi.mocked(WebSocket).mock.instances` doesn't work with `vi.stubGlobal`. Fixed by tracking mockWsInstance reference identity instead.

### Completion Notes List

- Added 3 constants: `INITIAL_BACKOFF_MS = 1000`, `MAX_BACKOFF_MS = 30000`, `BACKOFF_MULTIPLIER = 2`
- Added 2 private instance variables: `reconnectAttempt`, `reconnectTimerId`
- Added 4 private methods: `getBackoffDelay()`, `scheduleReconnect()`, `attemptReconnect()`, `connectBinance()`
- Extracted Binance connection logic from `connect()` to private `connectBinance()`
- `connect()` now resets `reconnectAttempt` and delegates to `connectBinance()`
- `onopen` handler: sets 'live', resets attempt counter, clears timer
- `onclose` handler: calls `scheduleReconnect()` instead of just logging
- `onerror` handler: unchanged (log only, per WebSocket spec onclose follows onerror)
- `cleanup()` extended: clears reconnect timer before WebSocket cleanup
- `disconnect()` extended: resets attempt counter, sets statusStore to 'connecting'
- priceStore is never cleared on disconnect — last known price preserved
- 10 new reconnection tests added using `vi.useFakeTimers()` — all pass
- All 85 tests pass (29 connection-manager, 56 others), build succeeds

### File List

- `src/lib/services/connection-manager.ts` — MODIFIED (added reconnection with exponential backoff)
- `src/lib/services/connection-manager.test.ts` — MODIFIED (added 10 reconnection tests)

### Review Findings

- [x] [Review][Dismiss] `connectBinance()` sets statusStore to `'connecting'` during reconnection attempts — brief `reconnecting -> connecting -> live` transition is spec-compliant (spec's own `connectBinance()` code does this). Status transitions happen within the same event loop tick for failed attempts, so the intermediate state is invisible to UI.
- [x] [Review][Dismiss] `attemptReconnect()` calls `cleanup()` then `connectBinance()` which also calls `cleanup()` — redundant but safe, no side effects from double cleanup.
- [x] [Review][Dismiss] No jitter in backoff — spec explicitly says "Do NOT add jitter to backoff — keep it simple for v1".

**Reviewer verdict: PASS** — All 8 acceptance criteria met. Backoff sequence verified by tests. Timer lifecycle correct. Memory leak prevention proper. No blocking issues. 0 decision-needed, 0 patch, 0 defer, 3 dismissed.

### Change Log

- 2026-03-25: Implemented Story 4.1 — WebSocket reconnection with exponential backoff (1s-30s cap), timer cleanup, statusStore transitions
