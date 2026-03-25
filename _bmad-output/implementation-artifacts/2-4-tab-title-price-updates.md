# Story 2.4: Tab Title Price Updates

Status: ready-for-dev

## Story

As a user,
I want the browser tab title to show the current BTC price,
So that I can see the price without switching to the Metrics tab.

## Acceptance Criteria

1. **Given** the dashboard is live and priceStore is receiving updates, **When** a new PriceTick arrives, **Then** the browser tab title updates to show the formatted price, e.g. `$68,432.17 — Metrics` (FR2).
2. The tab title uses the same `formatPrice()` function from `format-utils.ts` for consistency.
3. The tab title updates on every price tick (not throttled separately from the display).
4. If priceStore is `null` (no data yet), the tab title shows `Metrics` without a price.

## Tasks / Subtasks

- [ ] Task 1: Create tab title updater module (AC: #1, #2, #3, #4)
  - [ ] Create `src/lib/services/tab-title-updater.ts`
  - [ ] Import `priceStore` from `../stores/price-store`
  - [ ] Import `formatPrice` from `../utils/format-utils`
  - [ ] Define `DEFAULT_TITLE` constant as `'Metrics'`
  - [ ] Define `TITLE_SEPARATOR` constant as `' — '` (em dash with spaces)
  - [ ] Implement `initTabTitleUpdater(): void` function that subscribes to `priceStore`
  - [ ] In the subscription callback: if tick is `null`, set `document.title = DEFAULT_TITLE`; otherwise set `document.title = formatPrice(tick.price) + TITLE_SEPARATOR + DEFAULT_TITLE`
  - [ ] Export `initTabTitleUpdater` as named export

- [ ] Task 2: Wire up initialization in Layout.astro (AC: #1, #3)
  - [ ] Add import and call `initTabTitleUpdater()` in the service initialization `<script>` block in `src/layouts/Layout.astro`
  - [ ] Ensure the call is placed alongside other service initializations (ConnectionManager, etc.)

- [ ] Task 3: Create unit test (AC: #1, #2, #4)
  - [ ] Create `src/lib/services/tab-title-updater.test.ts`
  - [ ] Test: when priceStore is null, document.title is `'Metrics'`
  - [ ] Test: when priceStore has a PriceTick, document.title is `'$68,432.17 — Metrics'`
  - [ ] Test: uses `formatPrice()` output (verify formatted string appears in title)
  - [ ] Test: title updates on each priceStore change
  - [ ] Run `npm run test` to verify all pass

- [ ] Task 4: Verify integration
  - [ ] Verify tab title shows `Metrics` on initial page load (before WebSocket connects)
  - [ ] Verify tab title updates to `$XX,XXX.XX — Metrics` when price data arrives
  - [ ] Verify tab title continues to update on each subsequent price tick
  - [ ] `npm run build` succeeds
  - [ ] `npm run lint` passes

## Dev Notes

### File: `src/lib/services/tab-title-updater.ts`

This is a lightweight service module that subscribes to `priceStore` and updates `document.title`. It follows the same unidirectional data flow pattern as all other consumers:

```
External API → ConnectionManager → priceStore → tab-title-updater → document.title
```

### Exact Implementation

```typescript
import { priceStore } from '../stores/price-store';
import { formatPrice } from '../utils/format-utils';

const DEFAULT_TITLE = 'Metrics';
const TITLE_SEPARATOR = ' — ';

export function initTabTitleUpdater(): void {
  priceStore.subscribe((tick) => {
    if (tick === null) {
      document.title = DEFAULT_TITLE;
      return;
    }
    document.title = formatPrice(tick.price) + TITLE_SEPARATOR + DEFAULT_TITLE;
  });
}
```

Key implementation notes:
- Uses `priceStore.subscribe()` which fires immediately with the current value (initially `null`), so `document.title` is set to `'Metrics'` right away.
- No throttling — the tab title updates on every price tick per AC #3. The browser handles rapid `document.title` assignments efficiently.
- `formatPrice()` from `format-utils.ts` ensures the same formatting as the Price Card display (AC #2).
- The `' — '` separator uses an em dash, matching the UX convention used in `formatRange()`.
- This function is called once during initialization and the subscription persists for the lifetime of the page. No cleanup needed since the page is a single-page app that never unmounts.

### Layout.astro Integration

The `<script>` block in `Layout.astro` is the service initialization point (established in architecture). Add the tab title updater alongside other service initialization calls:

```astro
<script>
  // Existing service imports (from Story 2.2+)
  import { ConnectionManager } from '../lib/services/connection-manager';

  // Tab title updater (Story 2.4)
  import { initTabTitleUpdater } from '../lib/services/tab-title-updater';

  // Initialize services
  ConnectionManager.getInstance().connect();
  initTabTitleUpdater();
</script>
```

**Important:** If the `<script>` block does not yet exist in `Layout.astro`, create it. If it already exists from a previous story, add the import and call to the existing block. Do NOT create a separate `<script>` block — all service initialization goes in one block.

The current `Layout.astro` (from Story 1.1) has:
```astro
---
import '../styles/global.css';
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Metrics</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

The `<title>Metrics</title>` in the `<head>` sets the initial SSR title. The `<script>` block overrides it at runtime via `document.title` once the island hydrates. This is correct — the static HTML title is the fallback before JS runs.

### Test Strategy

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { priceStore } from '../stores/price-store';
import { initTabTitleUpdater } from './tab-title-updater';

describe('initTabTitleUpdater', () => {
  beforeEach(() => {
    // Reset store to null before each test
    priceStore.set(null);
    // Reset document.title
    document.title = '';
  });

  it('sets title to "Metrics" when priceStore is null', () => {
    initTabTitleUpdater();
    expect(document.title).toBe('Metrics');
  });

  it('sets title with formatted price when priceStore has data', () => {
    initTabTitleUpdater();
    priceStore.set({ price: 68432.17, timestamp: Date.now(), direction: 'up' });
    expect(document.title).toBe('$68,432.17 — Metrics');
  });

  it('updates title on each price change', () => {
    initTabTitleUpdater();
    priceStore.set({ price: 68432.17, timestamp: Date.now(), direction: 'up' });
    expect(document.title).toBe('$68,432.17 — Metrics');

    priceStore.set({ price: 69000.00, timestamp: Date.now(), direction: 'up' });
    expect(document.title).toBe('$69,000.00 — Metrics');
  });

  it('reverts to "Metrics" when priceStore becomes null', () => {
    initTabTitleUpdater();
    priceStore.set({ price: 68432.17, timestamp: Date.now(), direction: 'up' });
    priceStore.set(null);
    expect(document.title).toBe('Metrics');
  });
});
```

**Test notes:**
- Vitest provides a JSDOM environment by default, so `document.title` is available.
- If vitest.config.ts uses `environment: 'node'`, you may need to add `// @vitest-environment jsdom` at the top of the test file, or set `environment: 'jsdom'` in the vitest config.
- Tests directly call `priceStore.set()` — this is acceptable in tests (services write to stores; tests simulate service behavior).
- Each test calls `initTabTitleUpdater()` — this creates a new subscription. For test isolation, ensure `beforeEach` resets the store.

### Nano Stores Subscribe Behavior

`priceStore.subscribe(cb)` fires the callback immediately with the current value. This is why:
- On initialization (store is `null`), the title is immediately set to `'Metrics'`.
- There is no need for a separate "set initial title" step.

The subscribe method signature: `subscribe(cb: (value: T, oldValue: T | undefined) => void): () => void`
- First argument: current value
- Second argument: previous value (undefined on first call)
- Returns: unsubscribe function (not needed here since the page never unmounts)

### Import Paths

```typescript
// In tab-title-updater.ts (located at src/lib/services/)
import { priceStore } from '../stores/price-store';
import { formatPrice } from '../utils/format-utils';
```

### Title Format

The title format is: `{formattedPrice} — Metrics`

Examples:
- No data: `Metrics`
- With price: `$68,432.17 — Metrics`
- Price update: `$69,105.30 — Metrics`

The em dash `—` (U+2014) is used as the separator, not a hyphen `-` or en dash `–`.

### Anti-Patterns (DO NOT)

- **Never** throttle tab title updates separately from the price display. The title updates on every price tick per the AC.
- **Never** call `priceStore.set()` from this module. It only reads via `.subscribe()`.
- **Never** format the price manually (no `toFixed()`, no template literal number formatting). Always use `formatPrice()`.
- **Never** create a barrel file. Import directly from `tab-title-updater.ts`.
- **Never** use `window.title` — use `document.title`.
- **Never** add UI framework dependencies. This is vanilla TypeScript.

### Scope Boundary

This story ONLY handles the tab title update. It does NOT:
- Add any visual UI changes
- Modify the Price Card component
- Add reconnection logic
- Handle stale data in the tab title (if the price is stale, the tab title still shows the last known price — this is acceptable per the architecture's "display last known data" principle)

### Previous Story Intelligence

**Story 2.1 establishes:**
- `src/lib/stores/price-store.ts`: `export const priceStore = atom<PriceTick | null>(null);`
- `src/lib/utils/format-utils.ts`: `formatPrice()` returns `$68,432.17` format
- Import paths from services: `'../stores/price-store'`, `'../utils/format-utils'`
- nanostores v1.2.0 installed

**Story 2.2 establishes:**
- `src/lib/services/connection-manager.ts`: singleton that writes to `priceStore` on WebSocket messages
- Services are initialized in `Layout.astro` `<script>` block
- ConnectionManager writes normalized `PriceTick` to `priceStore`

**Story 2.3 establishes:**
- PriceCard.astro subscribes to `priceStore` for live price display
- The PriceCard uses the same `formatPrice()` function — tab title will be consistent
- PriceCard also subscribes to `marketStore` for 24h change data (not relevant to this story)

**Story 1.1 establishes:**
- Vitest v4.1.1 configured, `npm run test` runs `src/**/*.test.ts`
- TypeScript strict mode
- Co-located test files with `.test.ts` suffix

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/services/tab-title-updater.ts` | CREATE | Tab title update service |
| `src/lib/services/tab-title-updater.test.ts` | CREATE | Unit tests |
| `src/layouts/Layout.astro` | MODIFY | Add initTabTitleUpdater() to service initialization script |

### Project Structure Notes

- `tab-title-updater.ts` goes in `src/lib/services/` because it subscribes to a store and performs a side effect (updating `document.title`) — this is a service, not a utility.
- The file follows kebab-case naming per architecture conventions.
- Test file is co-located: `src/lib/services/tab-title-updater.test.ts`.

### References

- [Source: epics.md#Story 2.4] — Acceptance criteria
- [Source: architecture.md#Communication Patterns] — Unidirectional flow: Service → Store → Consumer → Side Effect
- [Source: architecture.md#Process Patterns] — Service initialization in Layout.astro `<script>` block
- [Source: architecture.md#Naming Patterns] — kebab-case for TypeScript modules, camelCase for functions, UPPER_SNAKE_CASE for constants
- [Source: architecture.md#Store Patterns] — subscribe() pattern, components/services read via subscribe
- [Source: architecture.md#Structure Patterns] — services in `src/lib/services/`, co-located tests
- [Source: prd.md#FR2] — Price in browser tab title
- [Source: ux-design-specification.md#Platform Strategy] — Tab title as zero-focus information channel
- [Source: 2-3-live-price-card-with-direction-indicator.md] — PriceCard uses formatPrice() for consistency
- [Source: 2-2-websocket-connection-manager-binance.md] — ConnectionManager singleton, Layout.astro initialization
- [MDN: Document.title](https://developer.mozilla.org/en-US/docs/Web/API/Document/title) — `document.title` property reference

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Review Findings

### Change Log
