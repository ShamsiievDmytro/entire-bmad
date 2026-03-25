---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-25'
inputDocuments:
  - prd.md
  - product-brief-metrics.md
  - product-brief-metrics-distillate.md
  - ux-design-specification.md
workflowType: 'architecture'
project_name: 'metrics'
user_name: 'Dmytro'
date: '2026-03-25'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
23 FRs across 6 categories. The dominant category is Connection Resilience (FR11–FR16) — 6 requirements governing WebSocket lifecycle, multi-source fallback, and stale data handling. This is the most architecturally significant area despite the project's low overall complexity. The remaining FRs cover straightforward data display (price, change, market cap, chart) and visual presentation (dark theme, animations, responsive layout).

**Non-Functional Requirements:**
17 NFRs with specific quantified targets. Performance NFRs (1–8) define a tight bundle budget (<100KB JS, <50KB chart lib) and strict rendering metrics (CLS = 0, LCP <1.5s, 60 FPS). Integration NFRs (9–14) specify WebSocket connection behavior (500ms connect, exponential backoff 1s–30s, 60s REST polling). Reliability NFRs (15–17) require graceful degradation and no memory leaks over 24h+ sessions.

**Scale & Complexity:**

- Primary domain: Frontend web — real-time data visualization
- Complexity level: Low
- Estimated architectural components: 5 UI components + 1 WebSocket service layer + 1 REST polling service + 1 shared theme constants module

### Technical Constraints & Dependencies

- **Framework locked:** Astro JS with Islands Architecture — non-negotiable
- **Styling locked:** Tailwind CSS with custom semantic tokens
- **Chart library:** lightweight-charts (TradingView) — chosen for finance-native API, ~40KB gzipped
- **External API dependencies (no auth required):**
  - Binance WebSocket (primary real-time) — 24h connection expiry, potential geo-restrictions
  - CoinCap WebSocket (fallback real-time) — simpler, universal access
  - CoinGecko REST (supplementary data) — 30 req/min free tier, 60s polling interval
- **No backend, no SSR, no routing, no SEO, no user data storage**
- **Browser targets:** Chrome, Firefox, Safari, Edge (latest 2 versions) — backdrop-filter supported across all

### Cross-Cutting Concerns Identified

1. **WebSocket connection state** — Shared across Price Card, Status Indicator, and fallback logic. Needs a unified connection manager that multiple islands can observe.
2. **Design token consistency** — Tailwind config tokens must stay in sync with lightweight-charts JS API colors. Solved via shared `theme-constants.ts` file.
3. **Stale data handling** — Affects Price Card (badge display), Status Indicator (state text), and tab title (should it show stale price?). Needs a consistent staleness threshold (>30s).
4. **Animation/motion standards** — Consistent timing (300ms/400ms/500ms), easing curves, and `prefers-reduced-motion` support across all components.
5. **Number formatting** — USD formatting with comma separators, abbreviated market cap, consistent decimal places across all data displays.

## Starter Template Evaluation

### Primary Technology Domain

Frontend web — single-page real-time dashboard built on Astro Islands Architecture.

### Starter Options Considered

| Option | Template | Fit | Verdict |
|---|---|---|---|
| A | `create astro -- --template minimal` | Perfect — clean slate, zero cruft | **Selected** |
| B | Astroplate / AstroWind / Astroship | Poor — blog/content-site scaffolding to remove | Rejected |
| C | Manual setup | No advantage over CLI wizard | Rejected |

### Selected Starter: Astro Minimal + CLI Integrations

**Rationale:** The project has exactly 1 page, 5 components, and no content management. Any opinionated starter adds complexity to remove. The minimal template + `astro add` commands give us the exact stack specified in the PRD with zero waste.

**Initialization Commands:**

```bash
npm create astro@latest -- --template minimal --typescript strict
npx astro add tailwind
npm install lightweight-charts @fontsource/jetbrains-mono @fontsource/inter
npm install -D eslint prettier eslint-plugin-astro prettier-plugin-astro
npm install -D vitest
```

**Package manager:** npm (explicit choice — simplest for solo developer, no pnpm/yarn complexity needed).

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- Astro 6.x (current stable 6.0.8) — requires Node 22+
- TypeScript in strict mode — catches type errors early, appropriate for intermediate developer
- Astro's built-in TypeScript support (no separate tsconfig needed beyond Astro defaults)
- Note: Astro 6 is a recent stable release. Headline features (redesigned dev server, CSP APIs, live content collections) aren't needed for this project — we're on Astro 6 because `create astro@latest` gives us Astro 6. Acceptable early-adopter risk for a personal project with no user data.

**Styling Solution:**
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- CSS-first configuration: `@theme` directives in `src/styles/global.css` replace `tailwind.config.js` for token definition
- Design tokens (`accent-primary`, `bg-base`, `text-muted`, etc.) defined as CSS custom properties via `@theme`
- **Tailwind v4 ↔ lightweight-charts token strategy:** Colors needed by the lightweight-charts JS API cannot be read from CSS `@theme` at import time. For v1, duplicate color values in a `theme-constants.ts` file — acceptable sync risk for a solo developer with 5 color values. Refactor to runtime `getComputedStyle()` reads if a theme switcher is ever added.

**Build Tooling:**
- Vite (bundled with Astro) — HMR, tree-shaking, optimized production builds
- Astro's static output mode (`output: 'static'`) — generates pure HTML/CSS/JS files
- Automatic CSS purging via Tailwind v4

**Code Quality:**
- ESLint with `eslint-plugin-astro` for Astro-aware linting
- Prettier with `prettier-plugin-astro` for consistent formatting
- Configured from first commit — important if project becomes open-source in Phase 3

**Testing Framework:**
- Vitest included in dev dependencies from project init
- Recommended test strategy for v1: unit tests for WebSocket manager and number formatting utilities, single Playwright smoke test for "page loads, price appears"
- Note: if chart config uses runtime `getComputedStyle()` in future, CSS values won't be available in Node.js test environment — the duplicated `theme-constants.ts` approach keeps test imports trivial

**Code Organization:**
- `src/pages/` — single `index.astro` page
- `src/components/` — Astro components (islands)
- `src/layouts/` — page layout wrapper
- `src/styles/` — global CSS with Tailwind `@import` and `@theme` tokens
- `src/lib/` — shared utilities (`theme-constants.ts`, formatting helpers, WebSocket manager)

**Development Experience:**
- Astro dev server with HMR
- TypeScript type checking
- Tailwind CSS IntelliSense (VS Code extension)

**Note:** Project initialization using these commands should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Inter-island state management — Nano Stores
2. Island UI framework — Vanilla TypeScript (no framework)
3. WebSocket manager architecture — single manager, multiple consumers via stores

**Important Decisions (Shape Architecture):**
4. Message normalization — common `PriceTick` interface across data sources
5. Stale data threshold — 30 seconds

**Deferred Decisions (Post-MVP):**
- Hosting provider selection (Phase 2)
- CI/CD pipeline (Phase 2)
- PWA configuration (Phase 2)
- Component library extraction (Phase 3)

### Data Architecture

No database. No persistent storage. All data is ephemeral — sourced from external APIs and held in memory via Nano Stores.

**Data flow:**
```
Binance WebSocket ──→ ConnectionManager ──→ Nano Store (priceStore) ──→ Price Card island
CoinCap WebSocket ─┘  (fallback)           Nano Store (statusStore) ──→ Status Indicator island
                                            Nano Store (priceStore) ──→ Tab title updater

CoinGecko REST ────→ MarketDataService ──→ Nano Store (marketStore) ──→ Market Cap Card island
                     (60s polling)         Nano Store (chartStore)  ──→ Chart Card island
```

**Data interfaces:**
- `PriceTick`: `{ price: number, timestamp: number, direction: 'up' | 'down' | 'neutral' }` — normalized from both Binance and CoinCap formats
- `MarketData`: `{ marketCap: number, change24h: number, changePercent24h: number, high24h: number, low24h: number }` — from CoinGecko REST
- `ChartPoint`: `{ time: number, value: number }` — hourly price points for lightweight-charts
- `ConnectionStatus`: `'connecting' | 'live' | 'reconnecting' | 'stale' | 'fallback'`

### Authentication & Security

Not applicable. No user accounts, no API keys, no sensitive data. All external APIs are public and keyless.

**Client-side security considerations:**
- No user input to sanitize (read-only dashboard)
- WebSocket connections use `wss://` (TLS encrypted)
- No localStorage/sessionStorage usage — no data persistence to protect
- Content Security Policy: consider adding CSP headers when deploying (Phase 2) to restrict WebSocket origins

### API & Communication Patterns

**WebSocket Manager (`src/lib/connection-manager.ts`):**
- Singleton pattern — one instance manages the entire WebSocket lifecycle
- Fallback chain: Binance `wss://stream.binance.com:9443/ws/btcusdt@trade` → CoinCap `wss://ws.coincap.io/prices?assets=bitcoin`
- Reconnection: exponential backoff starting at 1s, doubling to max 30s cap
- 24h expiry: Binance hard-expires connections at 24 hours — handled as a standard reconnect cycle
- Stale threshold: 30 seconds without a price update → `ConnectionStatus` transitions to `'stale'`
- Publishes normalized `PriceTick` to `priceStore` (Nano Store)
- Publishes `ConnectionStatus` to `statusStore` (Nano Store)

**REST Polling Service (`src/lib/market-data-service.ts`):**
- Polls CoinGecko REST API every 60 seconds (within 30 req/min free tier)
- Fetches: market cap, 24h change, 24h high/low, hourly historical data for chart
- On API failure: retains last known data, does not clear stores
- Publishes to `marketStore` and `chartStore` (Nano Stores)

**Error Handling Standards:**
- WebSocket errors → silent reconnection via backoff, status indicator updates
- REST errors → retain stale data, log to console, no user-facing error UI
- No thrown exceptions reaching the UI — all error states expressed via store values
- Console logging for debugging only — no external error reporting service in v1

### Frontend Architecture

**State Management: Nano Stores**
- Decision: Nano Stores (~1KB) as the reactive state layer shared across Astro islands
- Rationale: Astro's officially recommended approach for inter-island communication. Reactive, tiny, framework-agnostic.
- Stores:
  - `priceStore` — current `PriceTick` (written by ConnectionManager)
  - `statusStore` — current `ConnectionStatus` (written by ConnectionManager)
  - `marketStore` — current `MarketData` (written by MarketDataService)
  - `chartStore` — array of `ChartPoint` (written by MarketDataService)

**Island UI Framework: Vanilla TypeScript**
- Decision: No UI framework. Islands use Astro `<script>` tags with `client:load` for direct DOM updates.
- Rationale: Islands perform simple operations (update text, toggle classes, call lightweight-charts API). Framework overhead adds bundle weight without proportional value. Keeps total JS well within <100KB budget.

**Component Architecture:**
- 5 Astro components as defined in UX spec: Page Shell (static), Price Card (island), Market Cap Card (island), Chart Card (island), Status Indicator (island)
- Each island subscribes to relevant Nano Stores and updates DOM directly
- No component nesting beyond page → island — flat hierarchy

**Bundle Optimization:**
- Astro static output — only island JS ships to client
- Nano Stores: ~1KB gzipped
- lightweight-charts: ~40KB gzipped
- @fontsource fonts: self-hosted, subset to Latin characters
- Estimated total hydrated JS: ~50-60KB gzipped (well within 100KB budget)

### Infrastructure & Deployment

**v1: Local Development Only**
- `npm run dev` — Astro dev server with HMR
- No deployment pipeline, no hosting configuration
- Environment configuration: API endpoints as hardcoded constants in `src/lib/` (all public, no secrets)

**Phase 2 Deployment Path (documented, not implemented):**
- Target: Vercel or Netlify (static hosting)
- Build: `npm run build` → `dist/` directory with static HTML/CSS/JS
- No server-side requirements — pure static deployment
- Consider moving API endpoints to `.env` if multiple environments needed

### Decision Impact Analysis

**Implementation Sequence:**
1. Project initialization (starter commands)
2. Tailwind `@theme` token configuration + `theme-constants.ts`
3. Nano Stores setup (4 stores with TypeScript interfaces)
4. ConnectionManager (WebSocket lifecycle + fallback chain)
5. MarketDataService (REST polling)
6. Page Shell (static layout grid)
7. Price Card island (subscribes to priceStore + statusStore)
8. Status Indicator island (subscribes to statusStore)
9. Market Cap Card island (subscribes to marketStore)
10. Chart Card island (subscribes to chartStore, configures lightweight-charts)

**Cross-Component Dependencies:**
- ConnectionManager → priceStore, statusStore (writes)
- MarketDataService → marketStore, chartStore (writes)
- Price Card → priceStore, statusStore (reads)
- Market Cap Card → marketStore (reads)
- Chart Card → chartStore (reads)
- Status Indicator → statusStore (reads)
- theme-constants.ts → Chart Card (color configuration)

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

12 areas where AI agents could make different choices, organized into 5 categories. All patterns below are mandatory for implementation consistency.

### Naming Patterns

**File Naming:**
- Astro components: PascalCase — `PriceCard.astro`, `ChartCard.astro`, `StatusIndicator.astro`, `PageShell.astro`
- TypeScript modules: kebab-case — `connection-manager.ts`, `market-data-service.ts`, `theme-constants.ts`
- Store files: kebab-case — `price-store.ts`, `status-store.ts`, `market-store.ts`, `chart-store.ts`
- Test files: co-located with source, `.test.ts` suffix — `connection-manager.test.ts`, `format-utils.test.ts`
- CSS: single global file — `src/styles/global.css`

**Code Naming:**
- Variables and functions: camelCase — `priceStore`, `formatCurrency()`, `handlePriceTick()`
- Types and interfaces: PascalCase — `PriceTick`, `MarketData`, `ConnectionStatus`
- Constants: UPPER_SNAKE_CASE — `STALE_THRESHOLD_MS`, `WS_BINANCE_URL`, `REST_POLL_INTERVAL_MS`
- Store names: camelCase with `Store` suffix — `priceStore`, `statusStore`, `marketStore`, `chartStore`
- Event handlers: `handle` + noun + verb pattern — `handlePriceUpdate()`, `handleConnectionDrop()`

**CSS/Tailwind Naming:**
- Semantic token names in `@theme`: kebab-case with category prefix — `--color-accent-primary`, `--color-bg-base`, `--color-text-muted`
- `@apply` compositions (max 3): `.card-glass`, `.price-text`, `.status-badge`
- Astro scoped style keyframe names: kebab-case — `@keyframes price-flash`, `@keyframes fade-in`

### Structure Patterns

**Project Organization:**
```
src/
├── pages/
│   └── index.astro              # Single page entry
├── layouts/
│   └── Layout.astro             # Page shell wrapper
├── components/
│   ├── PriceCard.astro          # Hydrated island
│   ├── MarketCapCard.astro      # Hydrated island
│   ├── ChartCard.astro          # Hydrated island
│   └── StatusIndicator.astro    # Hydrated island
├── lib/
│   ├── stores/
│   │   ├── price-store.ts
│   │   ├── status-store.ts
│   │   ├── market-store.ts
│   │   └── chart-store.ts
│   ├── services/
│   │   ├── connection-manager.ts
│   │   └── market-data-service.ts
│   ├── utils/
│   │   └── format-utils.ts      # Number formatting helpers
│   └── theme-constants.ts       # Shared color values for lightweight-charts
└── styles/
    └── global.css               # Tailwind @import, @theme tokens, @apply compositions
```

**Rules:**
- Components in `src/components/` — flat, no subdirectories (only 4 components)
- Business logic in `src/lib/services/` — never in components
- Stores in `src/lib/stores/` — one file per store
- Utility functions in `src/lib/utils/` — pure functions only, no side effects
- Tests co-located: `src/lib/services/connection-manager.test.ts` next to source file

### Store Patterns

**Nano Store conventions:**

```typescript
// Store definition pattern (every store file follows this)
import { atom } from 'nanostores';
import type { PriceTick } from '../types';

export const priceStore = atom<PriceTick | null>(null);
```

**Rules:**
- All stores initialize to `null` (not undefined, not default objects)
- Only services write to stores — never components
- Components subscribe in `<script>` blocks using `store.subscribe()`
- One store per concern — never combine unrelated data in a single store
- Type every store with explicit generic: `atom<PriceTick | null>`

### Format Patterns

**Number Formatting (all handled by `format-utils.ts`):**
- Price: `$68,432.17` — USD, comma separators, always 2 decimal places
- Percentage: `+2.3%` or `-1.8%` — sign always shown, 1 decimal place
- Absolute change: `+$1,534.22` or `-$892.40` — sign + USD, 2 decimal places
- Market cap: `$1.34T` or `$892.45B` — abbreviated with 2 decimal places
- 24h range: `$66.9k — $68.9k` — abbreviated with 1 decimal place
- Chart tooltip: `$68,432.17 at 14:30` — full price + 24h time (no date, no seconds)

**Rules:**
- All formatting goes through `format-utils.ts` helper functions — never inline formatting in components
- Use `Intl.NumberFormat` as the base — no manual string building
- Direction indicators always pair symbol with color: `↑` green, `↓` red, `→` white (neutral)
- Never use color alone to communicate direction

### Communication Patterns

**Store update flow (unidirectional):**
```
External API → Service → Store → Component → DOM
```

**Rules:**
- Services are the only writers to stores
- Components are read-only subscribers — never call `store.set()` from a component
- No component-to-component communication — always go through stores
- No direct DOM manipulation outside of store subscription callbacks in island `<script>` blocks

**WebSocket message handling:**
- Raw messages are parsed and normalized in `connection-manager.ts` — components never see raw WebSocket data
- Normalization happens before store write — stores only contain clean `PriceTick` objects
- Binance format: `{ p: "68432.17", ... }` → `{ price: 68432.17, timestamp: Date.now(), direction: 'up' }`
- CoinCap format: `{ bitcoin: "68432.17" }` → same normalized `PriceTick`

### Process Patterns

**Error Handling:**
- WebSocket errors: catch silently, update `statusStore` to `'reconnecting'`, trigger backoff — no console.error for expected disconnects
- REST errors: catch silently, retain last store values, `console.warn()` with endpoint and status code
- Parsing errors (malformed API response): `console.error()` with raw payload, skip the update, do not crash the island
- Never throw from a store subscription callback — wrap in try/catch
- Never show error UI to the user — the UX spec explicitly avoids error states. Use stale indicators instead.

**Initialization sequence:**
- Services initialize in `Layout.astro` via a single `<script>` block that imports and starts `ConnectionManager` and `MarketDataService`
- Islands hydrate via `client:load` and immediately subscribe to relevant stores
- Order doesn't matter — stores start as `null`, components render empty state, data appears when stores update

**Animation implementation:**
- All durations as constants in a shared location (CSS custom properties or `theme-constants.ts`)
- Price flash: CSS transition on `color` property, triggered by toggling a data attribute (`data-flash="up"`)
- Entry fade-in: CSS transition on `opacity`, triggered by removing a `data-loading` attribute
- Chart draw: lightweight-charts built-in animation API
- Always check `prefers-reduced-motion` — if enabled, set all durations to 0ms

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow the file naming and project structure patterns exactly — no alternative organizations
2. Use `format-utils.ts` for all number display — no inline `toFixed()` or manual formatting
3. Write to stores only from services, read from stores only in components — no exceptions
4. Normalize all external API data before writing to stores — components never parse raw responses
5. Co-locate test files with source files using `.test.ts` suffix

**Anti-Patterns (never do these):**
- Creating a `utils/index.ts` barrel file — import directly from specific modules
- Adding a UI framework "just for one component" — all islands use vanilla TS
- Storing derived data in stores — compute in components (e.g., don't store formatted strings)
- Using `setInterval` for REST polling — use recursive `setTimeout` to prevent drift on slow responses
- Adding loading spinners or skeleton screens — the empty card with labels IS the loading state

## Project Structure & Boundaries

### Complete Project Directory Structure

```
metrics/
├── .gitignore
├── .prettierrc
├── astro.config.mjs
├── eslint.config.js
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── public/
│   └── favicon.svg
├── src/
│   ├── pages/
│   │   └── index.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── components/
│   │   ├── PriceCard.astro
│   │   ├── MarketCapCard.astro
│   │   ├── ChartCard.astro
│   │   └── StatusIndicator.astro
│   ├── lib/
│   │   ├── types.ts
│   │   ├── theme-constants.ts
│   │   ├── stores/
│   │   │   ├── price-store.ts
│   │   │   ├── status-store.ts
│   │   │   ├── market-store.ts
│   │   │   └── chart-store.ts
│   │   ├── services/
│   │   │   ├── connection-manager.ts
│   │   │   ├── connection-manager.test.ts
│   │   │   ├── market-data-service.ts
│   │   │   └── market-data-service.test.ts
│   │   └── utils/
│   │       ├── format-utils.ts
│   │       └── format-utils.test.ts
│   └── styles/
│       └── global.css
├── tests/
│   └── e2e/
│       └── smoke.test.ts
└── playwright.config.ts
```

### File Purposes

**Root Configuration:**
- `astro.config.mjs` — Astro config with `@tailwindcss/vite` plugin, `output: 'static'`
- `tsconfig.json` — extends Astro's base TypeScript config, strict mode
- `eslint.config.js` — ESLint flat config with `eslint-plugin-astro`
- `.prettierrc` — Prettier config with `prettier-plugin-astro`
- `vitest.config.ts` — Vitest config for unit tests
- `playwright.config.ts` — Playwright config for e2e smoke test

**Source Entry Points:**
- `src/pages/index.astro` — single page, imports Layout
- `src/layouts/Layout.astro` — page shell (sets `<html>` bg color, loads fonts, initializes services via `<script>`, defines CSS grid)

**Types:**
- `src/lib/types.ts` — all shared TypeScript interfaces: `PriceTick`, `MarketData`, `ChartPoint`, `ConnectionStatus`

### Architectural Boundaries

**External API Boundaries:**

| Boundary | Service | Protocol | Direction |
|---|---|---|---|
| Binance | `connection-manager.ts` | WebSocket (`wss://`) | Inbound stream |
| CoinCap | `connection-manager.ts` | WebSocket (`wss://`) | Inbound stream (fallback) |
| CoinGecko | `market-data-service.ts` | REST (`https://`) | Outbound polling (60s) |

All external communication is isolated in `src/lib/services/`. No component ever makes a network request directly.

**Component Boundaries:**

```
Layout.astro (static shell)
├── PriceCard.astro (island, client:load)
│   └── reads: priceStore, statusStore
├── MarketCapCard.astro (island, client:load)
│   └── reads: marketStore
├── ChartCard.astro (island, client:load)
│   └── reads: chartStore
│   └── imports: theme-constants.ts, lightweight-charts
└── StatusIndicator.astro (island, client:load)
    └── reads: statusStore
```

**Data Boundary:**
- No persistent storage — all data is in-memory Nano Stores
- Stores are the single source of truth between services and components
- Services write, components read — never the reverse

### Requirements to Structure Mapping

**FR Category → Files:**

| FR Category | Primary Files | Supporting Files |
|---|---|---|
| Real-Time Price Display (FR1–FR3) | `PriceCard.astro` | `connection-manager.ts`, `price-store.ts`, `format-utils.ts` |
| Market Data (FR4–FR7) | `PriceCard.astro`, `MarketCapCard.astro` | `market-data-service.ts`, `market-store.ts`, `format-utils.ts` |
| Price Chart (FR8–FR10) | `ChartCard.astro` | `market-data-service.ts`, `chart-store.ts`, `theme-constants.ts` |
| Connection Resilience (FR11–FR16) | `StatusIndicator.astro` | `connection-manager.ts`, `status-store.ts` |
| Visual Presentation (FR17–FR20) | `Layout.astro`, `global.css` | `theme-constants.ts`, all components |
| Responsive Experience (FR21–FR23) | `Layout.astro`, `global.css` | all components |

**Cross-Cutting Concerns → Files:**

| Concern | Files |
|---|---|
| WebSocket state | `connection-manager.ts` → `price-store.ts`, `status-store.ts` → all islands |
| Design tokens | `global.css` (@theme) + `theme-constants.ts` (JS mirror) |
| Number formatting | `format-utils.ts` → `PriceCard`, `MarketCapCard`, `ChartCard` |
| Animation standards | `global.css` (keyframes, transitions, prefers-reduced-motion) |

### Integration Points

**Internal Communication:**
All inter-component communication flows through Nano Stores. No direct imports between components. No DOM events for data passing. The store is the only integration point.

**External Integrations:**

| Integration | Endpoint | Rate | Error Strategy |
|---|---|---|---|
| Binance WS | `wss://stream.binance.com:9443/ws/btcusdt@trade` | Continuous | Fallback to CoinCap |
| CoinCap WS | `wss://ws.coincap.io/prices?assets=bitcoin` | Continuous | Fallback to REST polling |
| CoinGecko REST | `https://api.coingecko.com/api/v3/...` | Every 60s | Retain last known data |

**Data Flow:**
```
[Binance WS] ──→ connection-manager.ts ──→ normalize ──→ priceStore ──→ PriceCard (DOM update)
                                                                      ──→ Layout (tab title)
                                        ──→ statusStore ──→ StatusIndicator (DOM update)
                                                         ──→ PriceCard (stale badge)

[CoinGecko REST] ──→ market-data-service.ts ──→ marketStore ──→ MarketCapCard (DOM update)
                                             ──→ chartStore  ──→ ChartCard (chart update)
```

### Development Workflow

**Dev Server:** `npm run dev` — Astro dev server on `localhost:4321`, HMR for all files
**Unit Tests:** `npm run test` — Vitest, runs co-located `.test.ts` files
**E2E Test:** `npx playwright test` — single smoke test: page loads, price element appears
**Build:** `npm run build` — outputs static files to `dist/`
**Preview:** `npm run preview` — serves `dist/` locally to verify production build

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible and version-verified:
- Astro 6.x + Tailwind CSS v4 (`@tailwindcss/vite`) — officially supported since Astro 5.2+
- Nano Stores + Astro vanilla TS islands — Astro's recommended inter-island communication
- lightweight-charts + vanilla TS — framework-agnostic imperative API, no wrapper needed
- Vitest + Astro — recommended by Astro docs
- TypeScript strict mode — no conflicts with any dependency

No contradictory decisions found.

**Pattern Consistency:**
- Naming conventions align with Astro ecosystem norms (PascalCase components, kebab-case modules)
- Unidirectional data flow (Service → Store → Component → DOM) consistently enforced across all patterns
- Error handling approach (silent recovery, stale indicators) consistent with UX spec's "never show error UI" principle
- Store patterns (null init, typed generics, service-only writes) applied uniformly

**Structure Alignment:**
- Every architectural decision maps to a specific file in the project tree
- Boundaries are clean: services, stores, components, and utils each have dedicated directories
- No orphan files or ambiguous ownership

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
All 23 FRs (FR1–FR23) are fully covered by architectural decisions. Each FR maps to specific files and services as documented in the Requirements to Structure Mapping.

**Non-Functional Requirements Coverage:**
16 of 17 NFRs fully covered. NFR17 (no memory leaks over 24h+) required additional specification — addressed below in Gap Analysis.

### Implementation Readiness Validation ✅

**Decision Completeness:**
- All critical and important decisions documented with specific versions
- Technology stack fully specified with initialization commands
- No ambiguous "TBD" decisions remaining for v1

**Structure Completeness:**
- Complete project tree with every file named and purposed
- All integration points explicitly mapped
- Component boundaries defined with store read/write permissions

**Pattern Completeness:**
- 12 conflict points identified and resolved with mandatory patterns
- Concrete code examples provided for store definitions and data flow
- Anti-patterns explicitly listed to prevent common mistakes

### Gap Analysis Results

**Gap Found: NFR17 — Memory Leak Prevention (24h+ Sessions)**

Priority: Important — addressed below.

The architecture did not explicitly specify memory management for long-running sessions. Three leak vectors identified and resolved:

**1. WebSocket listener accumulation:**
- Risk: Each reconnect cycle could add new `onmessage`/`onerror` listeners without removing old ones
- Rule: ConnectionManager MUST call `ws.close()` and null the reference before creating a new WebSocket instance. Never add listeners to a WebSocket that's being replaced.

**2. Chart data array growth:**
- Risk: `chartStore` array grows unbounded as new hourly data points arrive
- Rule: Cap `chartStore` at 24 entries (24 hours of hourly data). When appending a new point, shift the oldest. Never let the array exceed the 24h window.

**3. Timer reference leaks:**
- Risk: `setTimeout` references from REST polling or reconnection backoff could accumulate if not properly cleared
- Rule: Store all timer IDs. Clear previous timer before scheduling a new one. Use a single `AbortController` per service for coordinated cleanup if the page is ever torn down.

**No other gaps found.** All critical, important, and nice-to-have areas are covered.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (low)
- [x] Technical constraints identified (Astro, Tailwind, no backend)
- [x] Cross-cutting concerns mapped (5 concerns)

**✅ Starter Template**
- [x] Technology domain identified (frontend web)
- [x] Starter options evaluated with rationale
- [x] Initialization commands documented with current versions
- [x] Tailwind v4 token strategy decided

**✅ Architectural Decisions**
- [x] Critical decisions documented (Nano Stores, vanilla TS, WebSocket manager)
- [x] Technology stack fully specified with versions
- [x] Data interfaces defined (PriceTick, MarketData, ChartPoint, ConnectionStatus)
- [x] Data flow architecture mapped
- [x] Error handling strategy defined
- [x] Memory management rules specified

**✅ Implementation Patterns**
- [x] Naming conventions established (files, code, CSS)
- [x] Structure patterns defined with project tree
- [x] Store patterns specified with code examples
- [x] Communication patterns documented (unidirectional flow)
- [x] Process patterns complete (error handling, init sequence, animations)
- [x] Anti-patterns explicitly listed

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established with store permissions
- [x] Integration points mapped (3 external APIs)
- [x] Requirements to structure mapping complete (all 23 FRs)
- [x] Development workflow documented

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — low-complexity project with fully specified stack, complete patterns, and all requirements mapped.

**Key Strengths:**
- Tight scope — 1 page, 5 components, 4 stores, 2 services. Every file is named and purposed.
- Clear boundaries — services write stores, components read stores. No ambiguity.
- Specific and quantified — bundle budgets, timing thresholds, API endpoints, reconnection parameters all documented with exact values.
- Anti-patterns documented — AI agents know what NOT to do, not just what to do.

**Areas for Future Enhancement (Post-MVP):**
- Deployment configuration (Phase 2 — Vercel/Netlify)
- CI/CD pipeline with Lighthouse checks (Phase 2)
- Component library extraction for reuse (Phase 3)
- PWA service worker for offline support (Phase 2)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries — no alternative file organizations
- Refer to this document for all architectural questions
- When in doubt, check the anti-patterns list before proceeding

**First Implementation Priority:**
```bash
npm create astro@latest -- --template minimal --typescript strict
npx astro add tailwind
npm install lightweight-charts @fontsource/jetbrains-mono @fontsource/inter nanostores
npm install -D eslint prettier eslint-plugin-astro prettier-plugin-astro vitest
```
