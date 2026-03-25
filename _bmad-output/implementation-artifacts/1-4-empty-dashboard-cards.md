# Story 1.4: Empty Dashboard Cards

Status: ready-for-dev

## Story

As a user,
I want to see the dashboard layout with labeled card placeholders immediately on page load,
so that the page feels complete and no layout shift occurs when data arrives later.

## Acceptance Criteria

1. **Four glassmorphism cards visible** — Price Card, Market Cap Card, Chart Card, and Status Indicator area are rendered on the static shell before any data loads.
2. **`.card-glass` pattern on each card** — Each card uses `bg-card` + `backdrop-blur(12px)` + 1px border `rgba(255,255,255,0.08)` + 16px border-radius (the `.card-glass` composition from Story 1.2).
3. **Price Card label** — Displays "Bitcoin BTC/USD" in `font-label`, `text-secondary`, 12px.
4. **Market Cap Card label** — Displays "Market Cap" in `font-label`, `text-secondary`, 12px.
5. **Chart Card label** — Displays "24h Chart" in `font-label`, `text-secondary`, 12px and spans full grid width on desktop (`grid-column: 1 / -1`).
6. **Reserved space for CLS=0** — Each card has a fixed height for its data area so that CLS = 0 when data populates later (FR20, NFR3).
7. **Price Card ARIA** — `<section aria-label="Bitcoin price">` wrapping with `<output aria-live="polite">` placeholder for the price value (UX-DR12).
8. **Market Cap Card ARIA** — `<section aria-label="Market data">` (UX-DR12).
9. **Chart Card ARIA** — `<section aria-label="24 hour price chart">` (UX-DR12).
10. **Status Indicator ARIA** — `<div role="status" aria-live="polite">` positioned at the bottom of the viewport (UX-DR12).
11. **Dark crypto aesthetic complete** — Near-black background, glassmorphism cards, and neon accent glow are visually complete (FR17).

## Tasks / Subtasks

- [ ] Task 1: Create `PriceCard.astro` component (AC: #1, #2, #3, #6, #7)
  - [ ] Create file at `src/components/PriceCard.astro`
  - [ ] Add `<section aria-label="Bitcoin price">` wrapper
  - [ ] Add label "Bitcoin BTC/USD" with correct typography classes
  - [ ] Add `<output aria-live="polite">` placeholder for price value
  - [ ] Add reserved-height empty containers for price and change row
  - [ ] Apply `.card-glass` class and internal padding
- [ ] Task 2: Create `MarketCapCard.astro` component (AC: #1, #2, #4, #6, #8)
  - [ ] Create file at `src/components/MarketCapCard.astro`
  - [ ] Add `<section aria-label="Market data">` wrapper
  - [ ] Add label "Market Cap" with correct typography classes
  - [ ] Add reserved-height empty containers for market cap value and 24h range
  - [ ] Apply `.card-glass` class and internal padding
- [ ] Task 3: Create `ChartCard.astro` component (AC: #1, #2, #5, #6, #9)
  - [ ] Create file at `src/components/ChartCard.astro`
  - [ ] Add `<section aria-label="24 hour price chart">` wrapper
  - [ ] Add label "24h Chart" with correct typography classes
  - [ ] Add `sm:col-span-full` or `sm:[grid-column:1/-1]` to span full grid width on desktop
  - [ ] Add reserved-height empty container for chart canvas area
  - [ ] Apply `.card-glass` class and internal padding
- [ ] Task 4: Create `StatusIndicator.astro` component (AC: #1, #10)
  - [ ] Create file at `src/components/StatusIndicator.astro`
  - [ ] Add `<div role="status" aria-live="polite">` wrapper
  - [ ] Add 6px dot element and text placeholder
  - [ ] Position at bottom center of viewport
- [ ] Task 5: Update `index.astro` to import and render all four components (AC: #1, #11)
  - [ ] Import PriceCard, MarketCapCard, ChartCard, StatusIndicator
  - [ ] Place cards inside `<Layout>` slot in correct grid order
  - [ ] Verify chart card spans full width on desktop
  - [ ] Verify status indicator is outside the grid, at viewport bottom
- [ ] Task 6: Verify build and visual quality (AC: #6, #11)
  - [ ] `npm run build` succeeds
  - [ ] `npm run lint` passes
  - [ ] Visual check: dark background, glassmorphism cards, labels visible, no layout shift

## Dev Notes

### Component File Names and Locations

Per architecture.md naming patterns (PascalCase for Astro components):

| File | Path | Type |
|------|------|------|
| `PriceCard.astro` | `src/components/PriceCard.astro` | CREATE — Static Astro component (no `<script>`, no hydration) |
| `MarketCapCard.astro` | `src/components/MarketCapCard.astro` | CREATE — Static Astro component |
| `ChartCard.astro` | `src/components/ChartCard.astro` | CREATE — Static Astro component |
| `StatusIndicator.astro` | `src/components/StatusIndicator.astro` | CREATE — Static Astro component |
| `index.astro` | `src/pages/index.astro` | MODIFY — Import and render all four components |

**IMPORTANT:** In this story, all components are **purely static HTML/CSS**. They become hydrated islands (with `<script>` blocks and `client:load`) in later stories (Epic 2, 3, 4). Do NOT add any JavaScript or hydration directives in this story.

### PriceCard.astro — Exact HTML Structure

```astro
---
// src/components/PriceCard.astro
// Static empty card — hydrated in Story 2.3
---
<section aria-label="Bitcoin price" class="card-glass p-4 sm:p-6">
  <span class="font-label text-text-secondary text-[12px] font-normal leading-[1.4]">
    Bitcoin BTC/USD
  </span>
  <output aria-live="polite" class="block mt-2 min-h-[53px] sm:min-h-[53px]">
    <!-- Price value populated by Story 2.3 island script -->
  </output>
  <div class="mt-2 min-h-[24px]">
    <!-- Change row (arrow + percentage + absolute) populated by Story 2.3 -->
  </div>
</section>
```

**Reserved heights explained:**
- `min-h-[53px]` on `<output>`: reserves space for the 48px price text (line-height 1.1 = ~53px) so no CLS when price populates
- `min-h-[24px]` on change row div: reserves space for the 20px change values (line-height 1.1 ≈ 22px + margin)

### MarketCapCard.astro — Exact HTML Structure

```astro
---
// src/components/MarketCapCard.astro
// Static empty card — hydrated in Story 3.2
---
<section aria-label="Market data" class="card-glass p-4 sm:p-6">
  <span class="font-label text-text-secondary text-[12px] font-normal leading-[1.4]">
    Market Cap
  </span>
  <div class="mt-2 min-h-[28px]">
    <!-- Market cap value ($1.34T) populated by Story 3.2 -->
  </div>
  <span class="font-label text-text-secondary text-[12px] font-normal leading-[1.4] mt-3 block">
    24h Range
  </span>
  <div class="mt-1 min-h-[20px]">
    <!-- Range value ($66.9k — $68.9k) populated by Story 3.2 -->
  </div>
</section>
```

**Reserved heights explained:**
- `min-h-[28px]` on market cap value: reserves space for 24px value text (line-height 1.1 ≈ 26px + buffer)
- `min-h-[20px]` on range value: reserves space for 14px range text

### ChartCard.astro — Exact HTML Structure

```astro
---
// src/components/ChartCard.astro
// Static empty card — hydrated in Story 3.3
---
<section aria-label="24 hour price chart" class="card-glass p-4 sm:p-6 sm:[grid-column:1/-1]">
  <span class="font-label text-text-secondary text-[12px] font-normal leading-[1.4]">
    24h Chart
  </span>
  <div class="mt-2 min-h-[200px]">
    <!-- Chart canvas (lightweight-charts) populated by Story 3.3 -->
  </div>
</section>
```

**Key detail:** `sm:[grid-column:1/-1]` makes the chart card span both columns on desktop. On mobile (single column), this has no effect — the card naturally takes full width.

**Reserved height:** `min-h-[200px]` reserves space for the chart area. This is a reasonable default for the sparkline — lightweight-charts will fill this container in Story 3.3.

### StatusIndicator.astro — Exact HTML Structure

```astro
---
// src/components/StatusIndicator.astro
// Static empty indicator — hydrated in Story 4.3
---
<div role="status" aria-live="polite" class="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
  <span class="w-1.5 h-1.5 rounded-full bg-status-live"></span>
  <span class="font-label text-text-muted text-[11px] font-normal leading-[1.3]">
    Live
  </span>
</div>
```

**Positioning:** `fixed bottom-4 left-1/2 -translate-x-1/2` centers the indicator at the bottom of the viewport. It sits outside the CSS Grid — it's a viewport-level element, not a grid item.

**Default state:** Shows "Live" with a green dot as the initial static state. Story 4.3 will make this reactive to `statusStore`.

**Dot size:** `w-1.5 h-1.5` = 6px (Tailwind: 1.5 * 4px = 6px), matching UX-DR7 specification.

### index.astro — Updated Structure

```astro
---
import Layout from '../layouts/Layout.astro';
import PriceCard from '../components/PriceCard.astro';
import MarketCapCard from '../components/MarketCapCard.astro';
import ChartCard from '../components/ChartCard.astro';
import StatusIndicator from '../components/StatusIndicator.astro';
---
<Layout>
  <PriceCard />
  <MarketCapCard />
  <ChartCard />
  <StatusIndicator />
</Layout>
```

**Grid placement:** PriceCard and MarketCapCard sit side-by-side in the 1.5fr/1fr grid (from `Layout.astro` Story 1.3). ChartCard uses `sm:[grid-column:1/-1]` to span both columns. StatusIndicator is `fixed` positioned so it doesn't participate in the grid at all.

### How Cards Slot Into the CSS Grid (from Story 1.3)

Story 1.3 established this in `Layout.astro`:
```html
<main class="w-full max-w-[720px] grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] gap-6">
  <slot />
</main>
```

The four components render into this `<slot />`:
- **PriceCard** → occupies grid cell row 1, column 1 (1.5fr on desktop)
- **MarketCapCard** → occupies grid cell row 1, column 2 (1fr on desktop)
- **ChartCard** → `sm:[grid-column:1/-1]` → spans both columns on row 2 (desktop), or just a normal full-width row on mobile
- **StatusIndicator** → `position: fixed` → escapes the grid entirely, pinned to viewport bottom

On mobile (< 640px), grid collapses to single column: all cards stack vertically with 24px (`gap-6`) gaps.

### Typography Classes Reference (from Story 1.2)

All card labels use this exact class combination:
```
font-label text-text-secondary text-[12px] font-normal leading-[1.4]
```

This maps to:
- `font-label` → Inter font family (from `@theme --font-label`)
- `text-text-secondary` → #a0a0b0 color (from `@theme --color-text-secondary`)
- `text-[12px]` → 12px font size (arbitrary value)
- `font-normal` → weight 400
- `leading-[1.4]` → line-height 1.4

Status indicator text uses:
```
font-label text-text-muted text-[11px] font-normal leading-[1.3]
```

### Glassmorphism Card Pattern (`.card-glass` from Story 1.2)

The `.card-glass` class is defined in `src/styles/global.css` and provides:
```css
.card-glass {
  @apply bg-bg-card rounded-2xl;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.1);
}
```

All three visible cards (PriceCard, MarketCapCard, ChartCard) apply `.card-glass`. The StatusIndicator does NOT use `.card-glass` — it's a minimal floating element.

### Card Internal Padding

Cards use `p-4 sm:p-6`:
- Mobile: 16px padding (matching UX spec `md` spacing = 16px)
- Desktop: 24px padding (matching UX spec `lg` spacing = 24px)

This maps to the spacing scale from the UX spec: `md: 16px` for card internal padding on mobile, `lg: 24px` on desktop.

### Anti-Patterns (DO NOT)

- **DO NOT add JavaScript** — no `<script>` blocks, no `client:load` directives. All components are purely static HTML/CSS in this story.
- **DO NOT fetch data** — no API calls, no WebSocket connections. Data loading is Stories 2.2 and 3.1.
- **DO NOT import stores** — no `nanostores` imports. Store subscriptions are added when components become islands in later stories.
- **DO NOT add loading spinners or skeleton screens** — the empty card with labels IS the loading state (UX-DR10, architecture anti-patterns).
- **DO NOT add animation keyframes** — entry animations are Story 2.3 (price fade-in) and Story 3.3 (chart draw). This story is static.
- **DO NOT create barrel files** — import each component directly from its file path.
- **DO NOT nest components** — flat hierarchy, page → component. No component imports another component.
- **DO NOT add `theme-constants.ts` imports** — not needed for static cards.
- **DO NOT use raw color values** — always use semantic tokens (`text-text-secondary`, `bg-status-live`, etc.).
- **DO NOT add hover effects** — card hover states (`bg-card-hover`) are added in later stories when interactivity is introduced.

### Previous Story Intelligence

**Story 1.1 established:**
- Project structure with `src/components/` directory (currently has only `.gitkeep`)
- `src/lib/types.ts` with `PriceTick`, `MarketData`, `ChartPoint`, `ConnectionStatus` interfaces
- Vitest configured: `include: ['src/**/*.test.ts']`
- ESLint flat config, Prettier with Astro plugin

**Story 1.2 establishes (dependency — must be done first):**
- `global.css` with `@theme` tokens: all `--color-*` semantic tokens, `--font-price`, `--font-label`
- `.card-glass` composition class
- `.price-text` and `.status-badge` compositions (not used in this story but available)
- `:root` animation CSS custom properties
- `@fontsource` font imports in `Layout.astro`

**Story 1.3 establishes (dependency — must be done first):**
- `Layout.astro` with FOUC prevention (`style="background-color: #0a0a0f"`)
- `<body>` with `min-h-dvh flex items-start sm:items-center justify-center px-4 sm:px-8 py-6 sm:py-0`
- `<main>` with `w-full max-w-[720px] grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] gap-6`
- `index.astro` with `<Layout>` wrapper and empty slot

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/PriceCard.astro` | CREATE | Empty price card with label, ARIA, reserved space |
| `src/components/MarketCapCard.astro` | CREATE | Empty market cap card with labels, ARIA, reserved space |
| `src/components/ChartCard.astro` | CREATE | Empty chart card with label, ARIA, reserved space, full-width span |
| `src/components/StatusIndicator.astro` | CREATE | Status indicator with green dot + "Live" text, fixed position |
| `src/pages/index.astro` | MODIFY | Import and render all four components |

### Project Structure After This Story

```
src/
├── pages/
│   └── index.astro              ← MODIFIED (imports components)
├── layouts/
│   └── Layout.astro             ← unchanged (from Story 1.3)
├── components/
│   ├── PriceCard.astro          ← NEW
│   ├── MarketCapCard.astro      ← NEW
│   ├── ChartCard.astro          ← NEW
│   └── StatusIndicator.astro    ← NEW
├── lib/
│   ├── types.ts                 ← unchanged
│   ├── stores/                  ← empty (populated in Story 2.1)
│   ├── services/                ← empty (populated in Story 2.2)
│   └── utils/                   ← empty (populated in Story 2.1)
└── styles/
    └── global.css               ← unchanged (from Story 1.2)
```

### References

- [Source: epics.md#Story 1.4] — Acceptance criteria (AC 1-11)
- [Source: epics.md#UX-DR3] — Glassmorphism card pattern (`.card-glass`)
- [Source: epics.md#UX-DR4] — Price Card: label "Bitcoin BTC/USD", structure
- [Source: epics.md#UX-DR5] — Market Cap Card: label "Market Cap", secondary "24h Range"
- [Source: epics.md#UX-DR6] — Chart Card: full width spanning both grid columns
- [Source: epics.md#UX-DR7] — Status Indicator: 6px dot + state text at 11px, bottom of viewport
- [Source: epics.md#UX-DR8] — Page Shell: CSS Grid 1.5fr 1fr, card spacing, container centering
- [Source: epics.md#UX-DR10] — FOUC prevention: empty glassmorphism cards with labels as loading state, reserved space for CLS=0
- [Source: epics.md#UX-DR12] — Accessibility: section aria-labels, output aria-live, role="status"
- [Source: architecture.md#Naming Patterns] — PascalCase component files, flat `src/components/` directory
- [Source: architecture.md#Structure Patterns] — Component file locations, no subdirectories
- [Source: architecture.md#Frontend Architecture] — Page Shell (static) → islands (future), flat hierarchy
- [Source: architecture.md#Anti-Patterns] — No loading spinners, no skeleton screens, empty card IS loading state
- [Source: ux-design-specification.md#Spacing & Layout Foundation] — Card padding (16px mobile, 24px desktop), 24px gaps, glassmorphism styling
- [Source: ux-design-specification.md#Typography System] — Card labels: Inter 12px 400 `text-secondary`, Status: Inter 11px 400 `text-muted`
- [Source: ux-design-specification.md#Design Direction Decision] — Card Grid layout: Price (1.5fr), Market Cap (1fr), Chart (full width), Status (bottom)
- [Source: 1-1-project-initialization-and-tooling-setup.md] — Project structure, tooling, types.ts
- [Source: 1-2-design-token-system-and-typography.md] — `.card-glass` definition, font tokens, color tokens, type scale
- [Source: 1-3-page-shell-with-responsive-layout.md] — Layout.astro grid structure, FOUC prevention, responsive breakpoint

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Review Findings

### Change Log
