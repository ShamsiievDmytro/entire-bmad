# Story 2.3: Live Price Card with Direction Indicator

Status: review

## Story

As a user,
I want to see the current BTC price updating live with visual direction feedback,
So that I can glance at the dashboard and instantly know the price and whether it's moving up or down.

## Acceptance Criteria

1. **Given** the Price Card island is hydrated and priceStore has data, **When** a new PriceTick arrives in priceStore, **Then** the price displays in `font-price` at 48px desktop / 36px mobile, weight 600, `text-primary` color (FR1).
2. A direction arrow is shown: `↑` in `price-up` green for up, `↓` in `price-down` red for down (FR3, FR5).
3. The price text flashes cyan (`price-flash-up`) on price increase or red (`price-flash-down`) on decrease, fading to white over 400ms ease-out (UX-DR9).
4. Flash frequency is throttled to max 1 per 200ms to prevent rapid flashing.
5. 24h change displays as percentage (`+2.3%`) and absolute value (`+$1,534.22`) using format-utils (FR4).
6. 24h change values use `price-up` green for positive and `price-down` red for negative (FR5).
7. All number formatting goes through `format-utils.ts` — no inline formatting.
8. On initial data load, the price fades in with a 300ms ease-out animation (FR19).
9. All animations respect `prefers-reduced-motion` (instant transitions when enabled).
10. The `<output aria-live="polite">` element updates so screen readers announce price changes.

## Tasks / Subtasks

- [x] Task 1: Create PriceCard.astro static HTML template (AC: #1, #2, #5, #6, #10)
  - [x] Create `src/components/PriceCard.astro` with the full HTML structure inside `.card-glass` container
  - [x] Add `<section aria-label="Bitcoin price">` wrapper with all ARIA attributes
  - [x] Add `<output aria-live="polite">` for the live price value
  - [x] Add label "Bitcoin BTC/USD" in `font-label text-text-secondary` at 12px
  - [x] Add price display element with `.price-text` class and `data-loading` attribute
  - [x] Add direction arrow element (`data-direction`)
  - [x] Add change row with percent and absolute change elements
  - [x] Add stale badge element (hidden by default)
  - [x] Verify static HTML renders correctly before hydration

- [x] Task 2: Implement CSS animations and transitions (AC: #3, #4, #8, #9)
  - [x] Add scoped `<style>` block with price flash transition (`color` property, 400ms ease-out)
  - [x] Add `data-flash="up"` and `data-flash="down"` attribute selectors for flash colors
  - [x] Add fade-in animation (opacity 0 to 1, 300ms ease-out) triggered by `data-loading` removal
  - [x] Add `@media (prefers-reduced-motion: reduce)` to set all durations to 0ms
  - [x] Add stale badge show/hide transition (300ms ease-out)

- [x] Task 3: Implement store subscriptions and DOM updates in `<script>` block (AC: #1, #2, #3, #4, #5, #6, #7, #10)
  - [x] Import `priceStore` from `../lib/stores/price-store`
  - [x] Import `statusStore` from `../lib/stores/status-store`
  - [x] Import `formatPrice`, `formatPercent`, `formatAbsoluteChange` from `../lib/utils/format-utils`
  - [x] Subscribe to `priceStore` — update price text, direction arrow, change values, trigger flash
  - [x] Implement flash throttle (200ms minimum between flashes)
  - [x] Subscribe to `statusStore` — toggle stale badge visibility
  - [x] Remove `data-loading` on first non-null priceStore value (triggers fade-in)

- [x] Task 4: Responsive styling (AC: #1)
  - [x] Price at 48px on desktop (`.price-text` class provides this)
  - [x] Price at 36px on mobile via `max-sm:` override or responsive class
  - [x] Change row text at appropriate size (16px)
  - [x] Verify no layout shift on data load (reserved space via fixed height)

- [x] Task 5: Integration with index.astro (AC: all)
  - [x] Import and render `<PriceCard />` in `src/pages/index.astro` (or existing layout)
  - [x] Verify PriceCard renders in the correct grid position (left column, larger)
  - [x] NOTE: `client:load` is not needed — Astro `<script>` blocks are bundled and run client-side by default (this is not a framework island)

- [x] Task 6: Manual testing and verification
  - [x] Verify price updates live when priceStore changes
  - [x] Verify direction arrows display correctly for up/down/neutral
  - [x] Verify flash animation fires and throttles correctly
  - [x] Verify fade-in animation on initial data load
  - [x] Verify stale badge appears when statusStore is 'stale'
  - [x] Verify `prefers-reduced-motion` disables all animations
  - [x] Verify screen reader announces price changes via VoiceOver
  - [x] Verify responsive behavior at 640px breakpoint
  - [x] `npm run build` succeeds
  - [x] `npm run lint` passes

## Dev Notes

### File: `src/components/PriceCard.astro`

This component is a hydrated Astro island that replaces the empty Price Card placeholder from Story 1.4 (if it exists) or creates the Price Card from scratch. It uses the island architecture pattern: static HTML in the Astro template + a `<script>` block for client-side hydration.

### Exact HTML Structure

```astro
---
// No frontmatter imports needed — all hydration happens in <script>
---

<section aria-label="Bitcoin price" class="card-glass p-6">
  <span class="font-label text-text-secondary text-xs font-normal leading-[1.4]">
    Bitcoin BTC/USD
  </span>

  <div class="price-container mt-3" data-loading>
    <output
      aria-live="polite"
      class="price-value price-text sm:text-[48px] text-[36px]"
      data-flash=""
    >
      <!--  price text inserted by script, e.g. "$68,432.17" -->
    </output>

    <span
      class="direction-arrow font-price text-xl font-medium leading-none ml-2"
      data-direction="neutral"
      aria-hidden="true"
    >
      <!-- ↑ or ↓ inserted by script -->
    </span>
  </div>

  <div class="change-row mt-2 flex items-center gap-2 font-price text-base font-medium leading-[1.1]">
    <span class="change-percent">
      <!-- e.g. "+2.3%" -->
    </span>
    <span class="change-absolute">
      <!-- e.g. "+$1,534.22" -->
    </span>
  </div>

  <div
    class="stale-badge mt-2 text-status-stale font-label text-[11px] font-normal leading-[1.3] hidden"
    role="status"
  >
    Stale
  </div>
</section>
```

### Exact CSS (Scoped `<style>` Block)

```astro
<style>
  /* Fade-in on initial data load */
  .price-container[data-loading] {
    opacity: 0;
  }

  .price-container {
    opacity: 1;
    transition: opacity 300ms ease-out;
  }

  /* Price flash animation via data-flash attribute */
  .price-value {
    transition: color 400ms ease-out;
  }

  .price-value[data-flash="up"] {
    color: var(--color-price-flash-up);
    transition: color 0ms; /* instant snap to flash color */
  }

  .price-value[data-flash="down"] {
    color: var(--color-price-flash-down);
    transition: color 0ms; /* instant snap to flash color */
  }

  /* Direction arrow colors */
  .direction-arrow[data-direction="up"] {
    color: var(--color-price-up);
  }

  .direction-arrow[data-direction="down"] {
    color: var(--color-price-down);
  }

  .direction-arrow[data-direction="neutral"] {
    color: var(--color-text-primary);
  }

  /* Change row direction colors */
  .change-row[data-change-direction="up"] {
    color: var(--color-price-up);
  }

  .change-row[data-change-direction="down"] {
    color: var(--color-price-down);
  }

  /* Stale badge transition */
  .stale-badge {
    transition: opacity 300ms ease-out;
  }

  .stale-badge.hidden {
    opacity: 0;
    display: none;
  }

  /* prefers-reduced-motion: disable ALL animations */
  @media (prefers-reduced-motion: reduce) {
    .price-container,
    .price-value,
    .price-value[data-flash="up"],
    .price-value[data-flash="down"],
    .stale-badge {
      transition-duration: 0ms !important;
    }

    .price-container[data-loading] {
      opacity: 1; /* no fade-in, show immediately */
    }
  }
</style>
```

### Exact `<script>` Block (Island Hydration)

```astro
<script>
  import { priceStore } from '../lib/stores/price-store';
  import { statusStore } from '../lib/stores/status-store';
  import { formatPrice, formatPercent, formatAbsoluteChange } from '../lib/utils/format-utils';

  // DOM references — queried once, reused in every subscription callback
  const priceContainer = document.querySelector('.price-container') as HTMLElement;
  const priceValue = document.querySelector('.price-value') as HTMLOutputElement;
  const directionArrow = document.querySelector('.direction-arrow') as HTMLSpanElement;
  const changePercent = document.querySelector('.change-percent') as HTMLSpanElement;
  const changeAbsolute = document.querySelector('.change-absolute') as HTMLSpanElement;
  const changeRow = document.querySelector('.change-row') as HTMLDivElement;
  const staleBadge = document.querySelector('.stale-badge') as HTMLDivElement;

  // Flash throttle state
  let lastFlashTime = 0;
  const FLASH_THROTTLE_MS = 200;
  let flashTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Track whether we've received the first data
  let hasReceivedData = false;

  /**
   * Trigger the price flash animation.
   * Sets data-flash to "up" or "down" (which instantly snaps color via CSS),
   * then removes the attribute after a frame so the 400ms ease-out transition
   * fades color back to text-primary.
   */
  function triggerFlash(direction: 'up' | 'down'): void {
    const now = Date.now();
    if (now - lastFlashTime < FLASH_THROTTLE_MS) return;
    lastFlashTime = now;

    // Clear any pending flash reset
    if (flashTimeoutId !== null) {
      clearTimeout(flashTimeoutId);
    }

    // Snap to flash color
    priceValue.setAttribute('data-flash', direction);

    // After one frame, remove the attribute so CSS transition fades back to white
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        priceValue.setAttribute('data-flash', '');
        flashTimeoutId = null;
      });
    });
  }

  // Subscribe to priceStore
  priceStore.subscribe((tick) => {
    if (tick === null) return;

    // First data: remove loading state to trigger fade-in
    if (!hasReceivedData) {
      hasReceivedData = true;
      priceContainer.removeAttribute('data-loading');
    }

    // Update price text
    priceValue.textContent = formatPrice(tick.price);

    // Update direction arrow
    const arrowMap = { up: '\u2191', down: '\u2193', neutral: '' } as const;
    directionArrow.textContent = arrowMap[tick.direction];
    directionArrow.setAttribute('data-direction', tick.direction);

    // Trigger flash for non-neutral direction
    if (tick.direction === 'up' || tick.direction === 'down') {
      triggerFlash(tick.direction);
    }

    // Update 24h change (these values come from the PriceTick)
    // Note: PriceTick does not carry 24h change data directly.
    // 24h change comes from marketStore (populated by MarketDataService).
    // See the marketStore subscription below.
  });

  // Subscribe to statusStore for stale badge
  statusStore.subscribe((status) => {
    if (status === 'stale') {
      staleBadge.classList.remove('hidden');
    } else {
      staleBadge.classList.add('hidden');
    }
  });

  // Import marketStore for 24h change data (change24h, changePercent24h)
  import { marketStore } from '../lib/stores/market-store';

  marketStore.subscribe((market) => {
    if (market === null) return;

    const direction = market.changePercent24h >= 0 ? 'up' : 'down';
    changeRow.setAttribute('data-change-direction', direction);
    changePercent.textContent = formatPercent(market.changePercent24h);
    changeAbsolute.textContent = formatAbsoluteChange(market.change24h);
  });
</script>
```

### Price Flash Animation Mechanic (Step-by-Step)

1. New `PriceTick` arrives via `priceStore.subscribe()`.
2. Check throttle: if less than 200ms since last flash, skip.
3. Set `data-flash="up"` (or `"down"`) on `.price-value` element.
4. CSS rule `[data-flash="up"] { color: var(--color-price-flash-up); transition: color 0ms; }` instantly snaps the text color to cyan (or red for down).
5. On the next animation frame, remove the `data-flash` attribute.
6. CSS rule `.price-value { transition: color 400ms ease-out; }` kicks in, fading color back to `text-primary` (white) over 400ms.
7. Result: instant snap to flash color, smooth 400ms fade back to white.

### Fade-In Animation Mechanic

1. On initial render, `.price-container` has `data-loading` attribute.
2. CSS rule `[data-loading] { opacity: 0; }` hides the content.
3. On first non-null priceStore value, the `<script>` removes `data-loading`.
4. CSS rule `.price-container { opacity: 1; transition: opacity 300ms ease-out; }` fades content in.
5. With `prefers-reduced-motion`, `transition-duration: 0ms` makes it instant.

### Store Subscription Pattern

This component follows the mandatory unidirectional data flow:

```
External API -> Service -> Store -> Component -> DOM
```

- **priceStore** (written by ConnectionManager): provides `PriceTick` with `{ price, timestamp, direction }`.
- **statusStore** (written by ConnectionManager): provides `ConnectionStatus` — used for stale badge visibility.
- **marketStore** (written by MarketDataService): provides `MarketData` with `{ change24h, changePercent24h }` — used for the 24h change row.

The component **never** calls `store.set()`. It only reads via `.subscribe()`.

### Import Paths (Exact)

```typescript
import { priceStore } from '../lib/stores/price-store';
import { statusStore } from '../lib/stores/status-store';
import { marketStore } from '../lib/stores/market-store';
import { formatPrice, formatPercent, formatAbsoluteChange } from '../lib/utils/format-utils';
```

### Responsive Behavior

- **Desktop (>=640px):** Price at 48px (`sm:text-[48px]`), full card width in left grid column (1.5fr).
- **Mobile (<640px):** Price at 36px (`text-[36px]`), full-width stacked card.
- The `.price-text` `@apply` composition from Story 1.2 sets 48px as the base. Override for mobile: the HTML uses `sm:text-[48px] text-[36px]` to handle the responsive switch. The `.price-text` class from global.css sets font-family, weight, color, and line-height; the font-size is overridden inline via Tailwind responsive utilities.
- No layout shift: the `.price-container` reserves height via the card's padding and the fixed line-height.

### Stale Badge Behavior

- When `statusStore` value is `'stale'`, the `.stale-badge` element removes its `hidden` class.
- The badge says "Stale" in `status-stale` red color (11px, font-label).
- The badge does NOT replace or hide the price value. It is an additive indicator below the change row.
- When connection restores (statusStore transitions away from `'stale'`), the badge gets `hidden` class back and fades out.

### Accessibility

- `<section aria-label="Bitcoin price">` wraps the entire card.
- `<output aria-live="polite">` wraps the price value. Screen readers will announce new values when the text content changes. The `polite` setting means announcements wait for the screen reader to finish its current speech.
- Direction arrows (`↑`/`↓`) are marked `aria-hidden="true"` because the direction is also communicated via the change values (positive/negative signs) and color is supplemented by the arrow symbol.
- The stale badge uses `role="status"` so screen readers announce when data becomes stale.

### Anti-Patterns (DO NOT)

- **Never** call `priceStore.set()`, `statusStore.set()`, or `marketStore.set()` from this component. Only services write to stores.
- **Never** import raw WebSocket data or `connection-manager.ts` directly. All data comes through stores.
- **Never** use inline number formatting (`toFixed()`, manual string concatenation). Always use `formatPrice()`, `formatPercent()`, `formatAbsoluteChange()` from `format-utils.ts`.
- **Never** use `setInterval` for flash throttling. Use timestamp comparison.
- **Never** add a UI framework. This island uses vanilla TypeScript DOM manipulation.
- **Never** create a barrel file (`index.ts`). Import directly from specific modules.
- **Never** show a loading spinner or skeleton screen. The empty card with labels IS the loading state.

### Previous Story Intelligence

**Stories 1.1 and 1.2 establish:**
- `src/styles/global.css` with `@theme` tokens including all color tokens (`--color-price-up`, `--color-price-down`, `--color-price-flash-up`, `--color-price-flash-down`, `--color-text-primary`, `--color-text-secondary`, `--color-status-stale`), font families (`--font-price`, `--font-label`), and `:root` animation variables (`--price-flash-up`, `--price-flash-down`, `--animation-price-flash: 400ms`).
- `.card-glass` composition: `bg-bg-card` + `backdrop-blur(12px)` + 1px border + 16px border-radius + purple glow.
- `.price-text` composition: `font-price` + `text-text-primary` + `font-semibold` + `leading-none` + 48px + line-height 1.1.
- `src/lib/theme-constants.ts` with `PRICE_COLORS` export (`up`, `down`, `flashUp`, `flashDown`, `neutral`).

**Story 1.3 establishes:**
- `Layout.astro` with CSS Grid (`grid-template-columns: 1.5fr 1fr`), 640px breakpoint via Tailwind `sm:`.
- Font imports (`@fontsource/jetbrains-mono`, `@fontsource/inter`).
- Service initialization `<script>` block in Layout.astro.

**Story 1.4 establishes (if completed):**
- Empty PriceCard placeholder with reserved space, `<section aria-label="Bitcoin price">`, `<output aria-live="polite">` — this story REPLACES that placeholder with the live version.

**Story 2.1 establishes:**
- `src/lib/stores/price-store.ts`: `export const priceStore = atom<PriceTick | null>(null);`
- `src/lib/stores/status-store.ts`: `export const statusStore = atom<ConnectionStatus>('connecting');`
- `src/lib/stores/market-store.ts`: `export const marketStore = atom<MarketData | null>(null);`
- `src/lib/utils/format-utils.ts`: `formatPrice()` -> `$68,432.17`, `formatPercent()` -> `+2.3%`, `formatAbsoluteChange()` -> `+$1,534.22`.

**Story 2.2 establishes:**
- `src/lib/services/connection-manager.ts`: singleton ConnectionManager that connects to Binance WebSocket, normalizes messages to `PriceTick`, writes to `priceStore` and `statusStore`.
- Services initialize via a `<script>` block in `Layout.astro` — PriceCard does NOT need to start the connection.

### 24h Change Data Source

The 24h change values (percentage and absolute) come from `marketStore`, NOT from `priceStore`. The `PriceTick` interface only has `{ price, timestamp, direction }`. The `MarketData` interface has `{ change24h, changePercent24h }`. This means:

- The change row may populate independently from the price (when the CoinGecko REST response arrives).
- If `marketStore` is null (REST hasn't responded yet), the change row stays empty.
- The change row updates silently every 60s when MarketDataService refreshes.

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/PriceCard.astro` | CREATE (or REPLACE if 1.4 placeholder exists) | Live price card island component |
| `src/pages/index.astro` | MODIFY | Add `<PriceCard />` import and render |

### References

- [Source: epics.md#Story 2.3] -- Acceptance criteria
- [Source: epics.md#UX-DR4] -- Price Card visual spec (label, price, change row, states)
- [Source: epics.md#UX-DR9] -- Animation system (flash 400ms, fade-in 300ms, throttle 200ms, prefers-reduced-motion)
- [Source: epics.md#UX-DR12] -- Accessibility (section aria-label, output aria-live)
- [Source: architecture.md#Frontend Architecture] -- Island pattern, vanilla TS, store subscriptions
- [Source: architecture.md#Communication Patterns] -- Unidirectional flow, components read-only
- [Source: architecture.md#Process Patterns] -- Animation via data attributes, price flash mechanic
- [Source: architecture.md#Naming Patterns] -- PascalCase components, camelCase variables
- [Source: architecture.md#Store Patterns] -- subscribe() in script blocks, never set() from components
- [Source: ux-design-specification.md#Price Card] -- Anatomy, states, accessibility
- [Source: ux-design-specification.md#Animation Patterns] -- Price tick flash mechanic (5 steps), timing table
- [Source: ux-design-specification.md#Responsive Strategy] -- 640px breakpoint, 48px/36px price sizes
- [Source: ux-design-specification.md#Accessibility Strategy] -- output aria-live, section aria-label

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

All 6 tasks completed. Replaced the Story 1.4 placeholder PriceCard with the full live version. Integrated with Story 4.3's stale badge pattern (visibility-based transitions). Added ConnectionManager initialization to Layout.astro. Build succeeds, all 71 tests pass.

AC coverage:
- AC#1: Price displays in font-price at 48px desktop / 36px mobile, weight 600, text-primary
- AC#2: Direction arrows (up/down) with correct color coding
- AC#3: Price flash animation via data-flash attribute (cyan up, red down, 400ms fade)
- AC#4: Flash throttled to max 1 per 200ms via timestamp comparison
- AC#5: 24h change from marketStore using formatPercent/formatAbsoluteChange
- AC#6: Change values color-coded via data-change-direction attribute
- AC#7: All formatting via format-utils.ts (formatPrice, formatPercent, formatAbsoluteChange)
- AC#8: Fade-in via data-loading removal (300ms ease-out opacity transition)
- AC#9: prefers-reduced-motion media query sets all transition durations to 0ms
- AC#10: output aria-live="polite" updates on each priceStore change

### File List

- `src/components/PriceCard.astro` (modified) — Full live price card with store subscriptions, flash animations, stale badge
- `src/layouts/Layout.astro` (modified) — Added ConnectionManager initialization

### Review Findings

### Change Log

- 2026-03-25: Implemented Story 2.3 — Live Price Card with direction indicator, flash animations, 24h change display, stale badge, and ConnectionManager initialization in Layout
