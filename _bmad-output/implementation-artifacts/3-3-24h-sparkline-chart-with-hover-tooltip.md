# Story 3.3: 24h Sparkline Chart with Hover Tooltip

Status: ready-for-dev

## Story

As a user,
I want to see a 24-hour price trend chart that I can hover for details,
so that I can quickly read the trend shape and check specific price points.

## Acceptance Criteria

1. **Given** the Chart Card island is hydrated and chartStore has hourly data, **When** chartStore populates with ChartPoint array, **Then** a lightweight-charts area series renders with line color `accent-primary` (#00f5ff) (FR8).
2. Area fill uses gradient: rgba(0,245,255,0.1) top to transparent bottom.
3. Chart grid lines are rgba(255,255,255,0.03), crosshair rgba(255,255,255,0.3).
4. Chart background is transparent (card provides the background).
5. All chart colors are sourced from `theme-constants.ts` — no hardcoded values in component.
6. Chart displays hourly data points for the 24-hour period (FR10).
7. On hover, a crosshair appears with a tooltip showing price and time formatted as `$68,432.17 at 14:30` using `formatChartTooltip()` (FR9).
8. On initial data load, the chart draws left-to-right with a 500ms ease-out animation (UX-DR6).
9. The chart auto-resizes via lightweight-charts built-in resize handling on viewport change.
10. The chart card spans full grid width (`grid-column: 1 / -1`) on desktop.
11. Chart canvas has `aria-hidden="true"` — price data is accessible via Price Card.
12. Animation respects `prefers-reduced-motion` (instant draw when enabled).
13. When chartStore updates with new data, the chart appends points without full redraw or flicker.

## Tasks / Subtasks

- [ ] Task 1: Update `ChartCard.astro` — Add hydrated island HTML structure (AC: #4, #10, #11)
  - [ ] Modify `src/components/ChartCard.astro` (created as static placeholder in Story 1.4)
  - [ ] Keep existing `<section aria-label="24 hour price chart">` wrapper and `.card-glass` container
  - [ ] Keep `sm:[grid-column:1/-1]` for full-width desktop spanning
  - [ ] Keep "24h Chart" label with correct typography classes
  - [ ] Add a chart container `div` with an `id` (e.g. `id="chart-container"`) inside the reserved-height area (`min-h-[200px]`), with `aria-hidden="true"`
  - [ ] Add a tooltip `div` (absolutely positioned, hidden by default) for the hover tooltip
  - [ ] Add `data-loading` attribute to a wrapper for fade-in animation

- [ ] Task 2: Implement scoped CSS for fade-in and tooltip styling (AC: #7, #8, #12)
  - [ ] Add fade-in transition (opacity 0 → 1, 300ms ease-out) on `data-loading` removal
  - [ ] Style the tooltip element: `font-price`, 13px, `text-primary` color, positioned absolutely above chart
  - [ ] Add `@media (prefers-reduced-motion: reduce)` to set transition duration to 0ms and fade-in to instant

- [ ] Task 3: Implement `<script>` block — chart initialization and store subscription (AC: #1, #2, #3, #4, #5, #6, #8, #9, #12, #13)
  - [ ] Import `createChart` and `AreaSeries` from `lightweight-charts`
  - [ ] Import `chartStore` from `../lib/stores/chart-store`
  - [ ] Import chart color constants from `../lib/theme-constants`
  - [ ] Import `formatChartTooltip` from `../lib/utils/format-utils`
  - [ ] Query DOM elements: chart container, tooltip element, data wrapper
  - [ ] Create chart instance via `createChart()` with transparent background, grid, crosshair, and layout options
  - [ ] Add area series via `chart.addSeries(AreaSeries, { ... })` with colors from theme-constants
  - [ ] Subscribe to `chartStore` — on non-empty array, set data on the series and fit content
  - [ ] On first data, remove `data-loading` attribute to trigger fade-in
  - [ ] On subsequent data, call `series.update()` for appending new points (no full redraw)
  - [ ] Subscribe to `chart.subscribeCrosshairMove()` for tooltip positioning and content
  - [ ] Handle `prefers-reduced-motion`: if enabled, disable chart animation

- [ ] Task 4: Implement tooltip behavior (AC: #7)
  - [ ] On crosshair move with valid data point, show tooltip with `formatChartTooltip(price, time)`
  - [ ] Position tooltip near the crosshair position
  - [ ] Hide tooltip when crosshair leaves the chart area

- [ ] Task 5: Verify integration and build (AC: all)
  - [ ] Ensure `ChartCard` is imported and rendered in `index.astro` (from Story 1.4)
  - [ ] Verify chart card spans full width on desktop
  - [ ] `npm run build` succeeds
  - [ ] `npm run lint` passes
  - [ ] Visual check: chart renders, hover tooltip works, fade-in animation works

## Dev Notes

### File: `src/components/ChartCard.astro`

**Action:** MODIFY (replace static placeholder from Story 1.4 with hydrated island)

This component transforms the empty Chart Card placeholder into a live lightweight-charts area series island. The static HTML structure from Story 1.4 is preserved (ARIA, labels, grid-span, reserved height), with a chart container and tooltip element added inside.

### CRITICAL: lightweight-charts v5 API

The project uses `lightweight-charts` (currently v5.x — installed in Story 1.1). The v5 API has a breaking change from v4:

**v4 (OLD — DO NOT USE):**
```typescript
const series = chart.addAreaSeries({ lineColor: '...' });
```

**v5 (CORRECT — USE THIS):**
```typescript
import { createChart, AreaSeries } from 'lightweight-charts';
const series = chart.addSeries(AreaSeries, { lineColor: '...' });
```

You MUST import `AreaSeries` separately and pass it as the first argument to `chart.addSeries()`.

### Exact HTML Structure

```astro
---
// src/components/ChartCard.astro
// Hydrated island — subscribes to chartStore, renders lightweight-charts area series
---
<section aria-label="24 hour price chart" class="card-glass p-4 sm:p-6 sm:[grid-column:1/-1]">
  <span class="font-label text-text-secondary text-[12px] font-normal leading-[1.4]">
    24h Chart
  </span>
  <div class="chart-wrapper" data-loading>
    <div class="mt-2 min-h-[200px] relative">
      <div id="chart-container" class="w-full h-full absolute inset-0" aria-hidden="true"></div>
      <div
        class="chart-tooltip hidden absolute z-10 pointer-events-none font-price text-text-primary text-[13px] font-normal leading-[1.1] whitespace-nowrap px-2 py-1 rounded bg-bg-card"
      >
        <!-- e.g. "$68,432.17 at 14:30" populated by script -->
      </div>
    </div>
  </div>
</section>
```

**Key structural decisions:**
- The chart container uses `absolute inset-0` inside the `min-h-[200px] relative` parent so lightweight-charts fills the reserved space exactly.
- The tooltip is absolutely positioned within the same relative parent, with `pointer-events-none` so it doesn't interfere with chart hover events.
- `aria-hidden="true"` on the chart container because price data is accessible via the Price Card. The chart is decorative for screen readers.

### Exact CSS (Scoped `<style>` Block)

```astro
<style>
  /* Fade-in on initial data load */
  .chart-wrapper[data-loading] {
    opacity: 0;
  }

  .chart-wrapper {
    opacity: 1;
    transition: opacity 300ms ease-out;
  }

  /* prefers-reduced-motion: disable animation */
  @media (prefers-reduced-motion: reduce) {
    .chart-wrapper,
    .chart-wrapper[data-loading] {
      transition-duration: 0ms !important;
    }

    .chart-wrapper[data-loading] {
      opacity: 1;
    }
  }
</style>
```

### Exact `<script>` Block (Island Hydration)

```astro
<script>
  import { createChart, AreaSeries } from 'lightweight-charts';
  import { chartStore } from '../lib/stores/chart-store';
  import { formatChartTooltip } from '../lib/utils/format-utils';
  import { CHART_COLORS } from '../lib/theme-constants';

  // DOM references
  const chartContainer = document.getElementById('chart-container') as HTMLElement;
  const chartWrapper = document.querySelector('.chart-wrapper') as HTMLElement;
  const tooltipEl = document.querySelector('.chart-tooltip') as HTMLElement;

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Create chart instance
  const chart = createChart(chartContainer, {
    layout: {
      background: { type: 'solid' as const, color: 'transparent' },
      textColor: CHART_COLORS.textColor,
    },
    grid: {
      vertLines: { color: CHART_COLORS.gridColor },
      horzLines: { color: CHART_COLORS.gridColor },
    },
    crosshair: {
      vertLine: { color: CHART_COLORS.crosshairColor, width: 1, style: 0, labelVisible: false },
      horzLine: { color: CHART_COLORS.crosshairColor, width: 1, style: 0, labelVisible: false },
    },
    rightPriceScale: {
      borderVisible: false,
    },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
    },
    handleScroll: false,
    handleScale: false,
    autoSize: true,
  });

  // Add area series with theme colors
  const areaSeries = chart.addSeries(AreaSeries, {
    lineColor: CHART_COLORS.lineColor,
    topColor: CHART_COLORS.areaTopColor,
    bottomColor: CHART_COLORS.areaBottomColor,
    lineWidth: 2,
  });

  let hasReceivedData = false;
  let previousDataLength = 0;

  // Subscribe to chartStore
  chartStore.subscribe((points) => {
    if (points.length === 0) return;

    if (!hasReceivedData) {
      // First data load — set all data and trigger fade-in
      hasReceivedData = true;
      areaSeries.setData(
        points.map((p) => ({ time: p.time as any, value: p.value }))
      );
      chart.timeScale().fitContent();
      chartWrapper.removeAttribute('data-loading');
    } else if (points.length > previousDataLength) {
      // New point appended — update last point only (no full redraw)
      const lastPoint = points[points.length - 1];
      areaSeries.update({ time: lastPoint.time as any, value: lastPoint.value });
      chart.timeScale().fitContent();
    } else {
      // Data replaced (e.g. full refresh) — set all data
      areaSeries.setData(
        points.map((p) => ({ time: p.time as any, value: p.value }))
      );
      chart.timeScale().fitContent();
    }

    previousDataLength = points.length;
  });

  // Tooltip via crosshairMove subscription
  chart.subscribeCrosshairMove((param) => {
    if (
      !param.time ||
      !param.point ||
      param.point.x < 0 ||
      param.point.y < 0
    ) {
      tooltipEl.classList.add('hidden');
      return;
    }

    const seriesData = param.seriesData.get(areaSeries);
    if (!seriesData || !('value' in seriesData)) {
      tooltipEl.classList.add('hidden');
      return;
    }

    const price = (seriesData as { value: number }).value;
    const time = param.time as number;

    tooltipEl.textContent = formatChartTooltip(price, time);
    tooltipEl.classList.remove('hidden');

    // Position tooltip near crosshair
    const chartRect = chartContainer.getBoundingClientRect();
    const tooltipWidth = tooltipEl.offsetWidth;
    let left = param.point.x - tooltipWidth / 2;
    // Keep within chart bounds
    left = Math.max(0, Math.min(left, chartRect.width - tooltipWidth));
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = '0px';
  });
</script>
```

### `theme-constants.ts` — Required CHART_COLORS Export

Story 1.2 creates `src/lib/theme-constants.ts`. It must export a `CHART_COLORS` object (or similar structure) that this component imports. The required color values:

```typescript
// In src/lib/theme-constants.ts
export const CHART_COLORS = {
  lineColor: '#00f5ff',           // accent-primary
  areaTopColor: 'rgba(0, 245, 255, 0.1)',
  areaBottomColor: 'transparent',
  gridColor: 'rgba(255, 255, 255, 0.03)',
  crosshairColor: 'rgba(255, 255, 255, 0.3)',
  textColor: '#a0a0b0',          // text-secondary
};
```

If Story 1.2 names this export differently (e.g. individual constants or a different object name), adapt the import accordingly. The key rule: **no hardcoded hex/rgba values in ChartCard.astro** — all colors come from `theme-constants.ts`.

### `formatChartTooltip()` Signature

From `src/lib/utils/format-utils.ts` (established in Story 2.1):

- `formatChartTooltip(price: number, timestamp: number): string` — returns `$68,432.17 at 14:30`
- Uses `Intl.NumberFormat` for price and `Intl.DateTimeFormat` for time (24h format, no seconds, no date).

### lightweight-charts Key API Details

**`createChart(container, options)`:** Creates a chart instance attached to an HTML element. Returns `IChartApi`.

**`chart.addSeries(AreaSeries, options)`:** v5 unified API. Returns `ISeriesApi<'Area'>`. Options include `lineColor`, `topColor`, `bottomColor`, `lineWidth`.

**`series.setData(data)`:** Sets the complete data array. Each point: `{ time: UTCTimestamp | number, value: number }`. Use for initial load or full data replacement.

**`series.update(point)`:** Appends or updates a single point. Use for incremental updates to avoid full redraw.

**`chart.subscribeCrosshairMove(handler)`:** Callback fires on mouse move. `param` includes `time`, `point` (x/y coordinates), and `seriesData` (Map of series to data).

**`chart.timeScale().fitContent()`:** Adjusts the visible range to show all data points.

**`autoSize: true`:** The chart automatically resizes when its container changes size. No manual `ResizeObserver` needed.

**`handleScroll: false, handleScale: false`:** Disables user zoom/scroll on the chart since this is a read-only sparkline.

### ChartPoint to lightweight-charts Data Format

The `chartStore` contains `ChartPoint[]` where `ChartPoint = { time: number, value: number }`.

lightweight-charts expects `{ time: UTCTimestamp, value: number }` for area series. Since `ChartPoint.time` is a Unix timestamp (seconds from CoinGecko), it maps directly. The `as any` cast handles the `UTCTimestamp` branded type.

**Important:** CoinGecko returns timestamps in milliseconds. Story 3.1 (MarketDataService) should divide by 1000 to convert to seconds before writing to `chartStore`. If this conversion is not done in Story 3.1, this component must handle it: `p.time / 1000`. Check the MarketDataService implementation.

### Dependencies (Must Be Completed Before This Story)

| Story | What It Provides |
|-------|-----------------|
| 1.1 | Project structure, `lightweight-charts` npm package installed, `src/lib/types.ts` with `ChartPoint` interface |
| 1.2 | `global.css` with `@theme` tokens, `src/lib/theme-constants.ts` with chart color exports |
| 1.3 | `Layout.astro` with CSS Grid, 640px breakpoint |
| 1.4 | Static `ChartCard.astro` placeholder with label, ARIA, `sm:[grid-column:1/-1]`, reserved height |
| 2.1 | `chart-store.ts` (`atom<ChartPoint[]>([])`), `format-utils.ts` with `formatChartTooltip()` |
| 3.1 | `market-data-service.ts` that polls CoinGecko and writes hourly data to `chartStore` |

### Responsive Behavior

- **Desktop (>=640px):** Chart card spans both grid columns via `sm:[grid-column:1/-1]`. Full width of the 720px max-width container. Padding `sm:p-6` (24px). Chart height `min-h-[200px]`.
- **Mobile (<640px):** Full-width stacked card (single column). Padding `p-4` (16px). Same chart height.
- **Auto-resize:** With `autoSize: true`, lightweight-charts handles viewport changes automatically. No manual `ResizeObserver` needed.

### Animation Behavior

- **Initial draw:** Chart appears with fade-in (opacity 0 → 1, 300ms ease-out) triggered by removing `data-loading` on first data. The chart line itself draws as lightweight-charts' default behavior when data is set.
- **prefers-reduced-motion:** When enabled, the fade-in transition duration is set to 0ms via CSS, making the chart appear instantly.
- **No draw animation API in lightweight-charts:** lightweight-charts does not have a built-in "draw left-to-right" animation API. The 500ms draw effect from UX-DR6 is best approximated by the fade-in transition. If a true left-to-right draw is required, it would need a custom implementation (progressively setting data points with setTimeout) — but for v1, the fade-in is the practical approach.

### Data Update Strategy

- **First load:** `areaSeries.setData(allPoints)` + `chart.timeScale().fitContent()` — sets all 24 hourly points at once.
- **Subsequent updates (every 60s):** When `chartStore` gets a new point appended:
  - If the array grew (new point added), use `areaSeries.update(lastPoint)` for efficient append without full redraw.
  - If the array was fully replaced, use `areaSeries.setData(allPoints)`.
- **No flicker:** Using `update()` for appends prevents the full redraw that would cause visual flicker.
- **`chartStore` is capped at 24 entries** by MarketDataService (Story 3.1) — oldest shifted when new point added.

### Anti-Patterns (DO NOT)

- **Never** use `chart.addAreaSeries()` — this is the v4 API. Use `chart.addSeries(AreaSeries, opts)` (v5).
- **Never** hardcode color values in ChartCard.astro — import all colors from `theme-constants.ts`.
- **Never** call `chartStore.set()` from this component. Only MarketDataService writes to stores.
- **Never** import `market-data-service.ts` directly. All data comes through `chartStore`.
- **Never** use inline number formatting. Use `formatChartTooltip()` from format-utils.
- **Never** add a UI framework. This island uses vanilla TypeScript DOM manipulation.
- **Never** create a barrel file. Import directly from specific modules.
- **Never** show a loading spinner. The empty card with label IS the loading state.
- **Never** add manual `ResizeObserver` — use `autoSize: true` on the chart.
- **Never** use `setInterval` for any timing. Recursive `setTimeout` if needed.
- **Never** use raw color hex values in the component file.

### Previous Story Intelligence

**Story 1.4 establishes:**
- Static `ChartCard.astro` with `<section aria-label="24 hour price chart">`, `.card-glass p-4 sm:p-6 sm:[grid-column:1/-1]`, "24h Chart" label, and `min-h-[200px]` reserved chart area.
- This story MODIFIES that placeholder by adding the chart container, tooltip element, `<script>` block for hydration, and `<style>` block for fade-in.

**Story 2.3 establishes the hydration pattern:**
- Uses `data-loading` attribute + CSS opacity transition for fade-in on first data.
- DOM elements queried once at top of `<script>`, reused in subscription callbacks.
- `hasReceivedData` boolean tracks first data arrival.
- This story follows the exact same pattern.

**Story 3.2 (Market Cap Card) establishes:**
- Same fade-in pattern for REST-backed data.
- Silent updates with no flash animation.

### Project Structure Notes

- File path: `src/components/ChartCard.astro` — MODIFY existing file
- No new files created in this story
- `theme-constants.ts` MUST already export chart colors (Story 1.2 responsibility)

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ChartCard.astro` | MODIFY | Add lightweight-charts island: chart init, area series, tooltip, store subscription |

### References

- [Source: epics.md#Story 3.3] — Acceptance criteria (AC 1-13)
- [Source: epics.md#UX-DR6] — Chart Card: line color accent-primary, area gradient, grid lines, crosshair, transparent background, hover tooltip, draw animation 500ms, full width spanning
- [Source: epics.md#UX-DR9] — Animation system: chart draw 500ms ease-out, prefers-reduced-motion
- [Source: epics.md#UX-DR12] — Accessibility: `<section aria-label="24 hour price chart">`, `aria-hidden="true"` on chart canvas
- [Source: architecture.md#Frontend Architecture] — ChartCard as hydrated island (`client:load`), reads chartStore, imports theme-constants.ts and lightweight-charts
- [Source: architecture.md#Communication Patterns] — Unidirectional flow: MarketDataService → chartStore → ChartCard → DOM
- [Source: architecture.md#Store Patterns] — Components subscribe, never set. chartStore is `atom<ChartPoint[]>([])`
- [Source: architecture.md#Format Patterns] — Chart tooltip: `$68,432.17 at 14:30`, via formatChartTooltip()
- [Source: architecture.md#Process Patterns] — Chart draw animation via lightweight-charts built-in API
- [Source: architecture.md#Anti-Patterns] — No barrel files, no UI frameworks, no loading spinners
- [Source: architecture.md#Naming Patterns] — PascalCase components, camelCase variables, UPPER_SNAKE_CASE constants
- [Source: ux-design-specification.md#Chart Card] — Anatomy, states, lightweight-charts configuration (colors, crosshair, tooltip)
- [Source: ux-design-specification.md#Animation Patterns] — Chart draw 500ms ease-out, prefers-reduced-motion
- [Source: ux-design-specification.md#Loading Patterns] — Chart Card: on historical data load, draws with animation
- [Source: 1-4-empty-dashboard-cards.md] — ChartCard HTML structure, grid-column span, reserved height
- [Source: 2-3-live-price-card-with-direction-indicator.md] — Hydration pattern: data-loading, DOM queries, hasReceivedData
- [Source: lightweight-charts v5 migration docs] — `chart.addSeries(AreaSeries, opts)` replaces `chart.addAreaSeries(opts)`
- [Source: lightweight-charts docs — crosshair] — `subscribeCrosshairMove()` for tooltip implementation
- [Source: lightweight-charts docs — getting started] — `createChart()` options, `autoSize`, `handleScroll`, `handleScale`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Review Findings

### Change Log
