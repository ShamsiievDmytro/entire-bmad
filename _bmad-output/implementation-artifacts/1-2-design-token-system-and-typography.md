# Story 1.2: Design Token System & Typography

Status: done

## Story

As a developer,
I want a complete design token system with semantic colors, typography, and shared theme constants,
so that all components use a consistent dark crypto visual identity and the chart library stays in sync.

## Acceptance Criteria

1. **Semantic color tokens via `@theme`** — `src/styles/global.css` defines all semantic color tokens using Tailwind v4 `@theme` directives: `bg-base` (#0a0a0f), `bg-card` (#12121a), `bg-card-hover` (#1a1a2e), `accent-primary` (#00f5ff), `accent-secondary` (#8b5cf6), `accent-glow` (rgba(0,245,255,0.15)), `price-up` (#22c55e), `price-down` (#ef4444), `price-flash-up` (#00f5ff), `price-flash-down` (#ef4444), `text-primary` (#f0f0f0), `text-secondary` (#a0a0b0), `text-muted` (#606070), `status-live` (#22c55e), `status-reconnecting` (#f59e0b), `status-stale` (#ef4444).
2. **Font families configured** — JetBrains Mono as `font-price` and Inter as `font-label` via `@fontsource` imports in `Layout.astro` and `@theme` `--font-*` variables.
3. **Type scale defined** — Price: 48px weight 600, values: 20-24px weight 500, labels: 12px weight 400, status: 11px weight 400, chart tooltip: 13px weight 400.
4. **Theme constants file** — `src/lib/theme-constants.ts` exports duplicated color values for lightweight-charts JS API configuration.
5. **`@apply` compositions** — `.card-glass`, `.price-text`, and `.status-badge` compositions defined in `global.css` (max 3).
6. **CSS custom properties for animations** — `:root` defines `--price-flash-up`, `--price-flash-down` runtime animation values.
7. **Tokens usable via Tailwind utilities** — All tokens work as Tailwind utility classes (e.g., `bg-bg-base`, `text-text-primary`, `font-price`).

## Tasks / Subtasks

- [x] Task 1: Configure `@theme` color tokens in `global.css` (AC: #1, #7)
  - [x] Add `@theme` block with all `--color-*` semantic tokens after `@import "tailwindcss"`
  - [x] Verify tokens generate correct utility classes (e.g., `bg-bg-base`, `text-accent-primary`)
- [x] Task 2: Configure font families (AC: #2)
  - [x] Add `@fontsource/jetbrains-mono` and `@fontsource/inter` imports in `Layout.astro` frontmatter
  - [x] Add `--font-price` and `--font-label` in `@theme` block
- [x] Task 3: Define `@apply` compositions (AC: #5)
  - [x] Add `.card-glass` — `bg-card` + backdrop-blur(12px) + 1px border rgba(255,255,255,0.08) + 16px border-radius + optional glow
  - [x] Add `.price-text` — font-price + 48px + weight 600 + text-primary + line-height 1.1
  - [x] Add `.status-badge` — font-label + 11px + weight 400 + text-muted + line-height 1.3
- [x] Task 4: Define CSS custom properties for animations (AC: #6)
  - [x] Add `:root` block with `--price-flash-up`, `--price-flash-down`, animation duration variables
- [x] Task 5: Create `theme-constants.ts` (AC: #4)
  - [x] Export all color values needed by lightweight-charts JS API
  - [x] Include chart-specific colors: line color, area gradient, grid lines, crosshair, background
- [x] Task 6: Write unit tests for theme-constants (AC: #4)
  - [x] Create `src/lib/theme-constants.test.ts` verifying all exports exist and have correct values
- [x] Task 7: Verify integration (AC: #7)
  - [x] `npm run build` succeeds with new tokens
  - [x] `npm run test` passes
  - [x] `npm run lint` passes

## Dev Notes

### Tailwind CSS v4 `@theme` Syntax (CRITICAL)

Tailwind v4 uses CSS-first configuration. Tokens are defined via `@theme` directive in `global.css`, NOT in a `tailwind.config.js` file. The `@theme` block defines CSS custom properties that generate utility classes.

**Color namespace:** `--color-<name>` generates utilities like `bg-<name>`, `text-<name>`, `border-<name>`.
**Font namespace:** `--font-<name>` generates the `font-<name>` utility class.

```css
@import "tailwindcss";

@theme {
  --color-bg-base: #0a0a0f;
  --color-bg-card: #12121a;
  --font-price: "JetBrains Mono", monospace;
  --font-label: "Inter", sans-serif;
}
```

This generates: `bg-bg-base`, `text-bg-card`, `font-price`, `font-label` etc.

**IMPORTANT:** Do NOT use `@theme inline` — we want tokens as actual CSS custom properties for runtime access. The standard `@theme` directive already creates CSS variables.

### Complete `global.css` Structure

```css
@import "tailwindcss";

@theme {
  /* Background colors */
  --color-bg-base: #0a0a0f;
  --color-bg-card: #12121a;
  --color-bg-card-hover: #1a1a2e;

  /* Accent colors */
  --color-accent-primary: #00f5ff;
  --color-accent-secondary: #8b5cf6;
  --color-accent-glow: rgba(0, 245, 255, 0.15);

  /* Price direction colors */
  --color-price-up: #22c55e;
  --color-price-down: #ef4444;
  --color-price-flash-up: #00f5ff;
  --color-price-flash-down: #ef4444;

  /* Text colors */
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #a0a0b0;
  --color-text-muted: #606070;

  /* Status colors */
  --color-status-live: #22c55e;
  --color-status-reconnecting: #f59e0b;
  --color-status-stale: #ef4444;

  /* Font families */
  --font-price: "JetBrains Mono", monospace;
  --font-label: "Inter", sans-serif;
}

/* Runtime animation values — accessible via JS getComputedStyle */
:root {
  --price-flash-up: #00f5ff;
  --price-flash-down: #ef4444;
  --animation-fade-in: 300ms;
  --animation-price-flash: 400ms;
  --animation-chart-draw: 500ms;
  --animation-state-transition: 300ms;
  --animation-reconnect-pulse: 1.5s;
}

/* Utility compositions (MAX 3 — architecture mandate) */
.card-glass {
  @apply bg-bg-card rounded-2xl;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.1);
}

.price-text {
  @apply font-price text-text-primary font-semibold leading-none;
  font-size: 48px;
  line-height: 1.1;
}

.status-badge {
  @apply font-label text-text-muted font-normal;
  font-size: 11px;
  line-height: 1.3;
}
```

### Font Loading in Layout.astro

Add these imports in the `Layout.astro` frontmatter:

```astro
---
import '../styles/global.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/inter/400.css';
---
```

Only import the weights actually used:
- JetBrains Mono: 400 (chart tooltip), 500 (values), 600 (price)
- Inter: 400 (labels, status)

### theme-constants.ts Structure

```typescript
// src/lib/theme-constants.ts
// Duplicated color values for lightweight-charts JS API.
// These MUST stay in sync with @theme tokens in global.css.
// Acceptable duplication for v1 (5 chart-specific values).

export const CHART_COLORS = {
  lineColor: '#00f5ff',          // accent-primary
  areaTopColor: 'rgba(0, 245, 255, 0.1)',
  areaBottomColor: 'transparent',
  gridLinesColor: 'rgba(255, 255, 255, 0.03)',
  crosshairColor: 'rgba(255, 255, 255, 0.3)',
  backgroundColor: 'transparent', // card provides background
  textColor: '#f0f0f0',          // text-primary
} as const;

export const PRICE_COLORS = {
  up: '#22c55e',       // price-up
  down: '#ef4444',     // price-down
  flashUp: '#00f5ff',  // price-flash-up (cyan)
  flashDown: '#ef4444', // price-flash-down
  neutral: '#f0f0f0',  // text-primary
} as const;

export const STATUS_COLORS = {
  live: '#22c55e',
  reconnecting: '#f59e0b',
  stale: '#ef4444',
} as const;
```

### Type Scale Reference (from UX Spec)

| Element | Font | Size | Weight | Color Token | Line Height |
|---------|------|------|--------|-------------|-------------|
| Live price (desktop) | font-price | 48px | 600 | text-primary | 1.1 |
| Live price (mobile) | font-price | 36px | 600 | text-primary | 1.1 |
| 24h change value | font-price | 20px | 500 | price-up/price-down | 1.1 |
| Market cap value | font-price | 20px-24px | 500 | text-primary | 1.1 |
| Card labels | font-label | 12px | 400 | text-secondary | 1.4 |
| Status text | font-label | 11px | 400 | text-muted | 1.3 |
| Chart tooltip | font-price | 13px | 400 | text-primary | 1.1 |

### Anti-Patterns (DO NOT)

- Do NOT create a `tailwind.config.js` — Tailwind v4 uses CSS-first `@theme` directives only
- Do NOT use `@theme inline` — we need tokens as CSS custom properties for runtime access
- Do NOT add more than 3 `@apply` compositions — architecture mandates `.card-glass`, `.price-text`, `.status-badge` only
- Do NOT use raw color names like `cyan-400` — always use semantic tokens (`accent-primary`, `text-muted`)
- Do NOT create barrel files (`index.ts`) — import directly from `theme-constants.ts`
- Do NOT add components, stores, services, or any UI — this story is tokens and constants only
- Do NOT modify `src/lib/types.ts` — interfaces are already defined from Story 1.1
- Do NOT use `theme.extend` pattern — that's Tailwind v3. Use `@theme` block in CSS.

### Previous Story Intelligence (Story 1.1)

**What was established:**
- `global.css` exists with only `@import "tailwindcss"` — extend it, don't replace the import
- `Layout.astro` exists with `import '../styles/global.css'` — add font imports below it
- `@fontsource/jetbrains-mono` and `@fontsource/inter` are already installed as production dependencies
- `lightweight-charts` is installed (v5.1.0) — `theme-constants.ts` values will be consumed by Story 3.3
- Vitest is configured with `include: ['src/**/*.test.ts']`
- ESLint flat config with `eslint-plugin-astro`
- No `tailwind.config.js` exists (confirmed in Story 1.1 review)

**Review feedback from 1.1:**
- Layout.astro was patched to import `global.css` — already in place
- `astro.config.mjs` was patched to add explicit `output: 'static'` — already in place

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/styles/global.css` | MODIFY | Add `@theme` tokens, `:root` animation vars, `@apply` compositions |
| `src/layouts/Layout.astro` | MODIFY | Add `@fontsource` weight imports |
| `src/lib/theme-constants.ts` | CREATE | Lightweight-charts color constants |
| `src/lib/theme-constants.test.ts` | CREATE | Unit tests for exported constants |

### Project Structure Notes

- All files follow architecture spec paths exactly [Source: architecture.md#Structure Patterns]
- `theme-constants.ts` lives at `src/lib/theme-constants.ts` (not in `utils/`) per architecture spec
- Test file co-located: `src/lib/theme-constants.test.ts`
- No new directories needed — all target directories exist from Story 1.1

### References

- [Source: architecture.md#Selected Starter] — Tailwind v4 CSS-first config, `@theme` directives, `theme-constants.ts` strategy
- [Source: architecture.md#Naming Patterns] — CSS/Tailwind naming: `--color-accent-primary`, `--color-bg-base`, kebab-case
- [Source: architecture.md#Naming Patterns] — `@apply` compositions: `.card-glass`, `.price-text`, `.status-badge` (max 3)
- [Source: architecture.md#Structure Patterns] — `theme-constants.ts` at `src/lib/`, tests co-located
- [Source: ux-design-specification.md#Color System] — Complete color palette with hex values and contrast ratios
- [Source: ux-design-specification.md#Typography System] — Font families, type scale, weights, line heights
- [Source: ux-design-specification.md#Spacing & Layout Foundation] — Card glassmorphism pattern
- [Source: epics.md#Story 1.2] — Acceptance criteria, BDD scenarios
- [Source: epics.md#UX-DR1] — Full semantic color token list
- [Source: epics.md#UX-DR2] — Typography system specification
- [Source: epics.md#UX-DR3] — Glassmorphism card pattern (`.card-glass`)
- [Source: epics.md#UX-DR9] — Animation timing values
- [Source: tailwindcss.com/docs/theme] — Tailwind v4 `@theme` directive syntax

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered. All tasks completed cleanly on first pass.

### Completion Notes List

- Task 1: Added complete `@theme` block in `global.css` with all 16 semantic color tokens (`--color-bg-base`, `--color-bg-card`, `--color-bg-card-hover`, `--color-accent-primary`, `--color-accent-secondary`, `--color-accent-glow`, `--color-price-up`, `--color-price-down`, `--color-price-flash-up`, `--color-price-flash-down`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-status-live`, `--color-status-reconnecting`, `--color-status-stale`). Build confirms utility class generation works.
- Task 2: Added `@fontsource` imports for JetBrains Mono (400/500/600) and Inter (400) in `Layout.astro`. Added `--font-price` and `--font-label` in `@theme` block.
- Task 3: Defined 3 `@apply` compositions: `.card-glass` (glassmorphism card), `.price-text` (48px mono price display), `.status-badge` (11px label text).
- Task 4: Added `:root` block with `--price-flash-up`, `--price-flash-down`, and 5 animation timing variables.
- Task 5: Created `theme-constants.ts` with `CHART_COLORS`, `PRICE_COLORS`, and `STATUS_COLORS` const objects for lightweight-charts JS API.
- Task 6: Created comprehensive unit tests (6 test cases) verifying all exports exist and match expected color values.
- Task 7: All validation passed — `npm run build` (628ms), `npm run test` (10/10 pass), `npm run lint` (clean).

### File List

- `src/styles/global.css` — MODIFIED — Added `@theme` tokens, `:root` animation vars, 3 `@apply` compositions
- `src/layouts/Layout.astro` — MODIFIED — Added `@fontsource` weight imports
- `src/lib/theme-constants.ts` — CREATED — Chart, price, and status color constants for JS API
- `src/lib/theme-constants.test.ts` — CREATED — Unit tests for theme-constants exports

### Review Findings

- [x] [Review][Patch] Redundant `leading-none` in `.price-text` is overridden by explicit `line-height: 1.1` [src/styles/global.css:55]
- [x] [Review][Patch] Missing responsive mobile font-size for `.price-text` — spec type scale requires 36px on mobile but composition only sets 48px [src/styles/global.css:56]
- [x] [Review][Decision] `rgba()` value for `--color-accent-glow` in `@theme` may not work with Tailwind v4 opacity modifier syntax (`bg-accent-glow/50`) — resolved: replaced with `#00f5ff`; use `bg-accent-glow/15` at call sites

### Change Log

- 2026-03-25: Story 1.2 implementation complete — design token system, typography, theme constants, and unit tests
