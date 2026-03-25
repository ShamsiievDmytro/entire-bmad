---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# Metrics - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Metrics, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: User can view the current BTC/USD price, updated in real-time
- FR2: User can see price updates reflected in the browser tab title
- FR3: User can see a visual indication of price direction (up/down) on each update
- FR4: User can view the 24-hour price change as both a percentage and absolute value
- FR5: User can distinguish positive and negative price changes via color coding
- FR6: User can view the current BTC market capitalization
- FR7: System refreshes supplementary market data (24h change, market cap) periodically without user action
- FR8: User can view a sparkline chart showing BTC price over the last 24 hours
- FR9: User can hover over the chart to see the price and time at a specific data point
- FR10: Chart displays hourly data points for the 24-hour period
- FR11: System connects to the primary WebSocket data source (Binance) on page load
- FR12: System falls back to a secondary WebSocket source (CoinCap) if the primary fails
- FR13: System automatically reconnects when a WebSocket connection drops
- FR14: User can see a visual indicator when the data connection is lost or reconnecting
- FR15: User can see a stale data indicator when displayed price may be outdated
- FR16: System falls back to REST API polling when WebSocket is unavailable
- FR17: User sees a dark-themed interface with crypto-aesthetic styling on page load
- FR18: User experiences no flash of unstyled or light-themed content on initial load
- FR19: User sees smooth entry animations when data first loads
- FR20: User sees no layout shift as dynamic content populates
- FR21: User can view all dashboard data on desktop screens with a horizontal layout
- FR22: User can view all dashboard data on mobile screens with a vertically stacked layout
- FR23: Dashboard is usable and readable across all supported modern browsers

### NonFunctional Requirements

- NFR1: Page load (DOMContentLoaded) completes in < 2 seconds on a 4G connection
- NFR2: Largest Contentful Paint (LCP) occurs in < 1.5 seconds
- NFR3: Cumulative Layout Shift (CLS) = 0 — no visible layout shift during data hydration
- NFR4: Price updates render to DOM within 1 second of WebSocket message receipt
- NFR5: All animations run at 60 FPS with no dropped frames
- NFR6: Lighthouse performance score ≥ 90
- NFR7: Total hydrated JavaScript bundle < 100KB gzipped
- NFR8: Chart library (lightweight-charts) < 50KB gzipped
- NFR9: Binance WebSocket connection establishes within 500ms of island hydration under normal network conditions
- NFR10: WebSocket reconnection uses exponential backoff starting at 1 second, capping at 30 seconds
- NFR11: CoinGecko REST API polling interval ≥ 60 seconds to stay within free tier rate limits (30 req/min)
- NFR12: System tolerates CoinGecko API unavailability by displaying last known data with a timestamp
- NFR13: Binance 24-hour connection expiry handled transparently as a standard reconnect cycle
- NFR14: Fallback from Binance to CoinCap completes without user intervention
- NFR15: Dashboard remains functional (displays last known data) when all external APIs are unreachable
- NFR16: No JavaScript errors or white screens on WebSocket disconnection
- NFR17: Browser tab remains stable during extended sessions (no memory leaks over 24+ hours)

### Additional Requirements

- Starter template: `npm create astro@latest -- --template minimal --typescript strict` — specified in Architecture as Epic 1 Story 1
- Tailwind CSS v4 via `@tailwindcss/vite` plugin with CSS-first `@theme` configuration (no `tailwind.config.js`)
- Nano Stores (~1KB) as the reactive state layer shared across Astro islands (Astro's officially recommended approach)
- Vanilla TypeScript islands — no UI framework; islands use Astro `<script>` tags with `client:load` for direct DOM updates
- WebSocket ConnectionManager as a singleton managing the entire WebSocket lifecycle with fallback chain
- `theme-constants.ts` for lightweight-charts JS API color sync with Tailwind `@theme` tokens (duplicated values, acceptable for v1)
- Shared TypeScript interfaces in `src/lib/types.ts`: `PriceTick`, `MarketData`, `ChartPoint`, `ConnectionStatus`
- Unidirectional data flow: External API → Service → Store → Component → DOM
- Memory leak prevention: listener cleanup on reconnect, chart data capped at 24 entries, timer reference management with `AbortController`
- ESLint (`eslint-plugin-astro`) + Prettier (`prettier-plugin-astro`) + Vitest from first commit
- Playwright for e2e smoke test ("page loads, price appears")
- Package manager: npm (explicit choice)
- Node 22+ required (Astro 6.x)
- Co-located test files with `.test.ts` suffix
- No barrel files (`utils/index.ts`) — import directly from specific modules
- Recursive `setTimeout` for REST polling (not `setInterval`) to prevent drift on slow responses

### UX Design Requirements

- UX-DR1: Implement design token system — semantic color tokens (`bg-base` #0a0a0f, `bg-card` #12121a, `bg-card-hover` #1a1a2e, `accent-primary` #00f5ff cyan, `accent-secondary` #8b5cf6 purple, `accent-glow` rgba(0,245,255,0.15), `price-up` #22c55e, `price-down` #ef4444, `price-flash-up` #00f5ff, `price-flash-down` #ef4444, `text-primary` #f0f0f0, `text-secondary` #a0a0b0, `text-muted` #606070, `status-live` #22c55e, `status-reconnecting` #f59e0b, `status-stale` #ef4444) via Tailwind `@theme` directives in `src/styles/global.css`
- UX-DR2: Implement typography system — JetBrains Mono (`font-price`) for all numerical data, Inter (`font-label`) for labels/status text. Type scale: price 48px/36px weight 600, values 20-24px weight 500, card labels 12px Inter weight 400 `text-secondary`, status 11px Inter weight 400 `text-muted`, chart tooltip 13px JetBrains Mono. Line heights: 1.1 prices, 1.4 labels, 1.3 status
- UX-DR3: Implement glassmorphism card pattern (`.card-glass`) — `bg-card` background + `backdrop-blur(12px)` + 1px border `rgba(255,255,255,0.08)` + 16px border-radius + optional `accent-secondary` glow (`box-shadow: 0 0 20px rgba(139,92,246,0.1)`)
- UX-DR4: Implement Price Card component — label "Bitcoin BTC/USD", live price at 48px desktop/36px mobile, change row with arrow symbol (↑/↓) + percentage (+2.3%) + absolute (+$1,534.22) in `price-up`/`price-down` colors. States: Live (color flash 400ms), Stale (badge), Loading (label visible, data fades in 300ms)
- UX-DR5: Implement Market Cap Card component — label "Market Cap", value abbreviated ($1.34T) at 24px weight 500, secondary "24h Range" label with range value at 14px. Silent 60s refresh, no flash animation
- UX-DR6: Implement Chart Card component — lightweight-charts with line color `accent-primary` (#00f5ff), area gradient (rgba(0,245,255,0.1) top, transparent bottom), grid lines rgba(255,255,255,0.03), crosshair rgba(255,255,255,0.3), transparent background. Hover crosshair with price+time tooltip (13px JetBrains Mono). Draw animation 500ms. Full width spanning both grid columns on desktop
- UX-DR7: Implement Status Indicator component — 6px colored dot + state text at 11px `text-muted`, centered bottom of viewport. States: Live (green dot + "Live"), Reconnecting (amber pulsing dot 1.5s cycle + "Reconnecting..."), Stale (red static dot + "Connection lost"), Fallback (green dot + "Live — CoinCap"). State transitions fade 300ms
- UX-DR8: Implement Page Shell — full-viewport `bg-base` (#0a0a0f) background, CSS Grid `1.5fr 1fr` desktop / single column mobile, 640px breakpoint, max-width 720px container, vertical centering on desktop, top-aligned on mobile. Spacing: 32px page padding desktop, 16px mobile, 24px card gaps
- UX-DR9: Implement animation system — data fade-in 300ms ease-out, chart draw 500ms ease-out, price tick flash 400ms ease-out, state transitions 300ms ease-in-out, reconnecting pulse 1.5s ease-in-out, card hover glow 300ms ease. No animation exceeds 500ms. No bounce/spring/overshoot. All respect `prefers-reduced-motion` (0ms durations). Price flash throttled to max 1 per 200ms
- UX-DR10: Implement FOUC prevention — set `bg-base` (#0a0a0f) on `<html>` element directly, dark theme as first paint. Empty glassmorphism cards with labels as the loading state (no spinners, no skeletons). Reserved space for all dynamic content (CLS = 0)
- UX-DR11: Implement responsive design — desktop-first with single 640px breakpoint (`sm:` Tailwind prefix). Price 48px→36px, grid collapses to single column. No `vh` units on mobile (use `dvh` or `min-h-screen`). Chart auto-resizes via `ResizeObserver`. No features hidden on mobile. CSS-only responsive logic
- UX-DR12: Implement accessibility — `<section aria-label="Bitcoin price">` with `<output aria-live="polite">` for price, `<section aria-label="Market data">` for market cap, `<section aria-label="24 hour price chart">` with `aria-hidden="true"` on chart canvas, `<div role="status" aria-live="polite">` for Status Indicator, `<html lang="en">`. Direction arrows (↑/↓) alongside color coding. All text meets AA contrast minimum

### FR Coverage Map

- FR1: Epic 2 — Live BTC/USD price display
- FR2: Epic 2 — Price in browser tab title
- FR3: Epic 2 — Price direction indicator (up/down)
- FR4: Epic 2 — 24h change (percentage + absolute)
- FR5: Epic 2 — Color-coded positive/negative changes
- FR6: Epic 3 — Market cap display
- FR7: Epic 3 — Periodic market data refresh
- FR8: Epic 3 — 24h sparkline chart
- FR9: Epic 3 — Chart hover tooltip (price + time)
- FR10: Epic 3 — Hourly chart data points
- FR11: Epic 2 — Binance WebSocket connection on load
- FR12: Epic 4 — CoinCap fallback WebSocket
- FR13: Epic 4 — Auto-reconnection on drop
- FR14: Epic 4 — Reconnecting visual indicator
- FR15: Epic 4 — Stale data indicator
- FR16: Epic 4 — REST polling fallback
- FR17: Epic 1 — Dark-themed crypto aesthetic
- FR18: Epic 1 — No FOUC
- FR19: Epic 2 — Entry animations
- FR20: Epic 1 — No layout shift
- FR21: Epic 1 — Desktop horizontal layout
- FR22: Epic 1 — Mobile stacked layout
- FR23: Epic 1 — Cross-browser support

## Epic List

### Epic 1: Project Foundation & Dashboard Shell
The user sees a polished, responsive dark crypto dashboard that loads instantly — the visual identity and layout are complete, ready for live data.
**FRs covered:** FR17, FR18, FR20, FR21, FR22, FR23

### Epic 2: Live Bitcoin Price Display
The user can glance at the dashboard (or tab title) and instantly know the current BTC price, its direction, and 24h change — updated in real-time.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR11, FR19

### Epic 3: Market Context & Price Chart
The user gets the full market picture — market cap, 24h range, and a 24h sparkline chart with hover tooltips — completing the dashboard's information offering.
**FRs covered:** FR6, FR7, FR8, FR9, FR10

### Epic 4: Connection Resilience & Reliability
The dashboard never breaks — WebSocket failures are handled silently with fallback sources, automatic reconnection, and clear stale data indication. The user can trust the data is always there.
**FRs covered:** FR12, FR13, FR14, FR15, FR16

## Epic 1: Project Foundation & Dashboard Shell

The user sees a polished, responsive dark crypto dashboard that loads instantly — the visual identity and layout are complete, ready for live data.

### Story 1.1: Project Initialization & Tooling Setup

As a developer,
I want a fully scaffolded Astro project with TypeScript, Tailwind, and code quality tooling,
So that I can start building components with a consistent, well-configured dev environment from the first commit.

**Acceptance Criteria:**

**Given** a clean project directory
**When** the initialization commands are run
**Then** Astro 6.x is installed with the minimal template and TypeScript strict mode
**And** Tailwind CSS v4 is configured via `@tailwindcss/vite` plugin in `astro.config.mjs`
**And** `lightweight-charts`, `@fontsource/jetbrains-mono`, `@fontsource/inter`, and `nanostores` are installed
**And** ESLint with `eslint-plugin-astro`, Prettier with `prettier-plugin-astro`, and Vitest are configured
**And** the project structure follows Architecture spec: `src/pages/`, `src/layouts/`, `src/components/`, `src/lib/stores/`, `src/lib/services/`, `src/lib/utils/`, `src/styles/`
**And** `src/lib/types.ts` defines `PriceTick`, `MarketData`, `ChartPoint`, and `ConnectionStatus` interfaces
**And** `npm run dev` starts the Astro dev server successfully
**And** `npm run build` produces a static output in `dist/`

### Story 1.2: Design Token System & Typography

As a developer,
I want a complete design token system with semantic colors, typography, and shared theme constants,
So that all components use a consistent dark crypto visual identity and the chart library stays in sync.

**Acceptance Criteria:**

**Given** the Astro project from Story 1.1
**When** `src/styles/global.css` is created with Tailwind `@theme` directives
**Then** all semantic color tokens are defined: `bg-base` (#0a0a0f), `bg-card` (#12121a), `bg-card-hover` (#1a1a2e), `accent-primary` (#00f5ff), `accent-secondary` (#8b5cf6), `accent-glow` (rgba(0,245,255,0.15)), `price-up` (#22c55e), `price-down` (#ef4444), `price-flash-up` (#00f5ff), `price-flash-down` (#ef4444), `text-primary` (#f0f0f0), `text-secondary` (#a0a0b0), `text-muted` (#606070), `status-live` (#22c55e), `status-reconnecting` (#f59e0b), `status-stale` (#ef4444)
**And** JetBrains Mono is configured as `font-price` and Inter as `font-label` via `@fontsource` imports
**And** the type scale is defined: price 48px weight 600, values 20-24px weight 500, labels 12px weight 400, status 11px weight 400
**And** `src/lib/theme-constants.ts` exports duplicated color values for lightweight-charts JS API configuration
**And** `.card-glass`, `.price-text`, and `.status-badge` `@apply` compositions are defined (max 3)
**And** CSS custom properties for runtime animation values (`--price-flash-up`, `--price-flash-down`) are defined in `:root`
**And** tokens are usable via Tailwind utility classes in any component

### Story 1.3: Page Shell with Responsive Layout

As a user,
I want the dashboard to load instantly with a dark background and a responsive card grid layout,
So that I never see a flash of white and the page looks polished on both desktop and mobile.

**Acceptance Criteria:**

**Given** a user navigates to the dashboard URL
**When** the page loads
**Then** `<html>` has `lang="en"` and `bg-base` (#0a0a0f) set directly to prevent FOUC (FR18)
**And** `Layout.astro` renders a full-viewport dark background with a centered content container (max-width 720px)
**And** the layout uses CSS Grid with `grid-template-columns: 1.5fr 1fr` and 24px gaps on desktop (≥640px) (FR21)
**And** the layout collapses to a single-column stack with 16px horizontal padding on mobile (<640px) (FR22)
**And** the container is vertically centered on desktop and top-aligned on mobile
**And** no `vh` units are used on mobile — `dvh` or `min-h-screen` is used instead
**And** responsive behavior is CSS-only with no JavaScript (Tailwind `sm:` breakpoint)
**And** the page renders correctly on Chrome, Firefox, Safari, and Edge latest 2 versions (FR23)
**And** `index.astro` imports `Layout.astro` and serves as the single page entry

### Story 1.4: Empty Dashboard Cards

As a user,
I want to see the dashboard layout with labeled card placeholders immediately on page load,
So that the page feels complete and no layout shift occurs when data arrives later.

**Acceptance Criteria:**

**Given** a user loads the dashboard
**When** the static shell renders (before any data)
**Then** four glassmorphism cards are visible: Price Card, Market Cap Card, Chart Card, Status Indicator area
**And** each card uses the `.card-glass` pattern: `bg-card` + `backdrop-blur(12px)` + 1px border rgba(255,255,255,0.08) + 16px border-radius
**And** Price Card displays label "Bitcoin BTC/USD" in `font-label`, `text-secondary`, 12px
**And** Market Cap Card displays label "Market Cap" in `font-label`, `text-secondary`, 12px
**And** Chart Card displays label "24h Chart" in `font-label`, `text-secondary`, 12px and spans full grid width on desktop
**And** each card has reserved space (fixed height) for its data values so CLS = 0 when data populates (FR20)
**And** Price Card has `<section aria-label="Bitcoin price">` with `<output aria-live="polite">` placeholder
**And** Market Cap Card has `<section aria-label="Market data">`
**And** Chart Card has `<section aria-label="24 hour price chart">`
**And** Status Indicator area has `<div role="status" aria-live="polite">` at the bottom of the viewport
**And** the dark-themed crypto aesthetic is visually complete — near-black background, glassmorphism cards, neon accents visible (FR17)

## Epic 2: Live Bitcoin Price Display

The user can glance at the dashboard (or tab title) and instantly know the current BTC price, its direction, and 24h change — updated in real-time.

### Story 2.1: Nano Stores & Number Formatting Utilities

As a developer,
I want reactive stores and consistent number formatting helpers in place,
So that all components share a single source of truth for data and display values identically.

**Acceptance Criteria:**

**Given** the project structure from Epic 1
**When** the store and utility files are created
**Then** `src/lib/stores/price-store.ts` exports `priceStore` as `atom<PriceTick | null>(null)`
**And** `src/lib/stores/status-store.ts` exports `statusStore` as `atom<ConnectionStatus>('connecting')`
**And** `src/lib/stores/market-store.ts` exports `marketStore` as `atom<MarketData | null>(null)`
**And** `src/lib/stores/chart-store.ts` exports `chartStore` as `atom<ChartPoint[]>([])`
**And** every store is typed with explicit generics and initializes to `null` or empty (never undefined)
**And** `src/lib/utils/format-utils.ts` exports: `formatPrice()` → `$68,432.17`, `formatPercent()` → `+2.3%` or `-1.8%`, `formatAbsoluteChange()` → `+$1,534.22`, `formatMarketCap()` → `$1.34T`, `formatRange()` → `$66.9k — $68.9k`, `formatChartTooltip()` → `$68,432.17 at 14:30`
**And** all formatters use `Intl.NumberFormat` as the base — no manual string building
**And** `format-utils.test.ts` covers all formatters with positive, negative, zero, and edge cases
**And** tests pass via `npm run test`

### Story 2.2: WebSocket Connection Manager (Binance)

As a user,
I want the dashboard to connect to a live Bitcoin data source automatically on page load,
So that I see real-time price updates without any action.

**Acceptance Criteria:**

**Given** the dashboard page loads and islands hydrate
**When** the ConnectionManager initializes
**Then** it connects to Binance WebSocket at `wss://stream.binance.com:9443/ws/btcusdt@trade` (FR11)
**And** raw Binance messages (`{ p: "68432.17", ... }`) are normalized to `PriceTick` format: `{ price: number, timestamp: number, direction: 'up' | 'down' | 'neutral' }`
**And** direction is computed by comparing to the previous price
**And** normalized `PriceTick` is written to `priceStore`
**And** `statusStore` is updated to `'live'` on successful connection
**And** `statusStore` is set to `'connecting'` during initial connection attempt
**And** the ConnectionManager is a singleton — only one WebSocket connection exists at any time
**And** `connection-manager.ts` never exposes raw WebSocket data to consumers
**And** old WebSocket listeners are cleaned up before creating new connections (memory leak prevention)
**And** services initialize via a `<script>` block in `Layout.astro`
**And** `connection-manager.test.ts` covers message normalization and direction computation

### Story 2.3: Live Price Card with Direction Indicator

As a user,
I want to see the current BTC price updating live with visual direction feedback,
So that I can glance at the dashboard and instantly know the price and whether it's moving up or down.

**Acceptance Criteria:**

**Given** the Price Card island is hydrated and priceStore has data
**When** a new PriceTick arrives in priceStore
**Then** the price displays in `font-price` at 48px desktop / 36px mobile, weight 600, `text-primary` color (FR1)
**And** a direction arrow is shown: `↑` in `price-up` green for up, `↓` in `price-down` red for down (FR3, FR5)
**And** the price text flashes cyan (`price-flash-up`) on price increase or red (`price-flash-down`) on decrease, fading to white over 400ms ease-out (UX-DR9)
**And** flash frequency is throttled to max 1 per 200ms to prevent rapid flashing
**And** 24h change displays as percentage (`+2.3%`) and absolute value (`+$1,534.22`) using format-utils (FR4)
**And** 24h change values use `price-up` green for positive and `price-down` red for negative (FR5)
**And** all number formatting goes through `format-utils.ts` — no inline formatting
**And** on initial data load, the price fades in with a 300ms ease-out animation (FR19)
**And** all animations respect `prefers-reduced-motion` (instant transitions when enabled)
**And** the `<output aria-live="polite">` element updates so screen readers announce price changes

### Story 2.4: Tab Title Price Updates

As a user,
I want the browser tab title to show the current BTC price,
So that I can see the price without switching to the Metrics tab.

**Acceptance Criteria:**

**Given** the dashboard is live and priceStore is receiving updates
**When** a new PriceTick arrives
**Then** the browser tab title updates to show the formatted price, e.g. `$68,432.17 — Metrics` (FR2)
**And** the tab title uses the same `formatPrice()` function from format-utils for consistency
**And** the tab title updates on every price tick (not throttled separately from the display)
**And** if priceStore is `null` (no data yet), the tab title shows `Metrics` without a price

## Epic 3: Market Context & Price Chart

The user gets the full market picture — market cap, 24h range, and a 24h sparkline chart with hover tooltips — completing the dashboard's information offering.

### Story 3.1: Market Data Service (CoinGecko REST Polling)

As a user,
I want the dashboard to fetch market data automatically in the background,
So that I see up-to-date market cap, 24h change, and chart data without any action.

**Acceptance Criteria:**

**Given** the dashboard page loads and services initialize
**When** the MarketDataService starts
**Then** it fetches market cap, 24h change (percentage + absolute), 24h high/low, and hourly historical price data from CoinGecko REST API
**And** `marketStore` is populated with a `MarketData` object: `{ marketCap, change24h, changePercent24h, high24h, low24h }`
**And** `chartStore` is populated with an array of `ChartPoint` objects: `{ time: number, value: number }` for hourly data
**And** `chartStore` is capped at 24 entries maximum — oldest point shifted when appending new data
**And** polling uses recursive `setTimeout` (not `setInterval`) with a 60-second interval (NFR11)
**And** on CoinGecko API failure, last known store values are retained — stores are never cleared (NFR12)
**And** API errors are logged via `console.warn()` with endpoint and status code — no user-facing error UI
**And** timer references are stored and cleared before scheduling new timers (memory leak prevention)
**And** `market-data-service.test.ts` covers data mapping, store updates, and error retention behavior

### Story 3.2: Market Cap Card

As a user,
I want to see the current Bitcoin market cap and 24h price range at a glance,
So that I have broader market context alongside the live price.

**Acceptance Criteria:**

**Given** the Market Cap Card island is hydrated and marketStore has data
**When** marketStore updates with new MarketData
**Then** market cap displays as an abbreviated value (e.g. `$1.34T`) in `font-price`, `text-primary`, 24px weight 500 (FR6)
**And** "Market Cap" label is shown in `font-label`, `text-secondary`, 12px
**And** 24h range displays as `$66.9k — $68.9k` in `font-price`, `text-primary`, 14px
**And** "24h Range" secondary label is shown in `font-label`, `text-secondary`, 12px
**And** all values use `formatMarketCap()` and `formatRange()` from format-utils — no inline formatting
**And** values update silently every 60s with no flash animation (FR7)
**And** on initial data load, values fade in with 300ms ease-out animation
**And** when marketStore is `null` (no data yet), labels are visible but value areas are empty (reserved space)

### Story 3.3: 24h Sparkline Chart with Hover Tooltip

As a user,
I want to see a 24-hour price trend chart that I can hover for details,
So that I can quickly read the trend shape and check specific price points.

**Acceptance Criteria:**

**Given** the Chart Card island is hydrated and chartStore has hourly data
**When** chartStore populates with ChartPoint array
**Then** a lightweight-charts area series renders with line color `accent-primary` (#00f5ff) (FR8)
**And** area fill uses gradient: rgba(0,245,255,0.1) top to transparent bottom
**And** chart grid lines are rgba(255,255,255,0.03), crosshair rgba(255,255,255,0.3)
**And** chart background is transparent (card provides the background)
**And** all chart colors are sourced from `theme-constants.ts` — no hardcoded values in component
**And** chart displays hourly data points for the 24-hour period (FR10)
**And** on hover, a crosshair appears with a tooltip showing price and time formatted as `$68,432.17 at 14:30` using `formatChartTooltip()` (FR9)
**And** on initial data load, the chart draws left-to-right with a 500ms ease-out animation (UX-DR6)
**And** the chart auto-resizes via lightweight-charts built-in resize handling on viewport change
**And** the chart card spans full grid width (`grid-column: 1 / -1`) on desktop
**And** chart canvas has `aria-hidden="true"` — price data is accessible via Price Card
**And** animation respects `prefers-reduced-motion` (instant draw when enabled)
**And** when chartStore updates with new data, the chart appends points without full redraw or flicker

## Epic 4: Connection Resilience & Reliability

The dashboard never breaks — WebSocket failures are handled silently with fallback sources, automatic reconnection, and clear stale data indication. The user can trust the data is always there.

### Story 4.1: WebSocket Reconnection with Exponential Backoff

As a user,
I want the dashboard to automatically recover from connection drops without my intervention,
So that the live price feed resumes seamlessly after network interruptions.

**Acceptance Criteria:**

**Given** the ConnectionManager has an active Binance WebSocket connection
**When** the WebSocket connection drops (error, close, or network failure)
**Then** `statusStore` transitions to `'reconnecting'` (FR14)
**And** reconnection attempts begin with exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s cap (NFR10)
**And** on successful reconnection, `statusStore` transitions back to `'live'`
**And** the previous WebSocket instance is fully closed (`ws.close()`) and its reference nulled before creating a new connection (memory leak prevention, NFR17)
**And** no JavaScript errors or white screens occur during disconnection or reconnection (NFR16)
**And** Binance 24-hour connection expiry is handled as a standard disconnect/reconnect cycle — no special logic (NFR13)
**And** the last known price remains displayed in the Price Card during reconnection (NFR15)
**And** `connection-manager.test.ts` covers backoff timing, listener cleanup, and reconnection state transitions

### Story 4.2: CoinCap Fallback & REST Polling Fallback

As a user,
I want the dashboard to try alternative data sources if the primary one fails,
So that I always see price data regardless of which service is available.

**Acceptance Criteria:**

**Given** the ConnectionManager fails to connect or reconnect to Binance
**When** Binance WebSocket is unavailable after reconnection attempts
**Then** the ConnectionManager attempts to connect to CoinCap WebSocket at `wss://ws.coincap.io/prices?assets=bitcoin` (FR12)
**And** CoinCap messages (`{ bitcoin: "68432.17" }`) are normalized to the same `PriceTick` format
**And** on successful CoinCap connection, `statusStore` transitions to `'fallback'`
**And** fallback from Binance to CoinCap completes without user intervention (NFR14)
**And** if both Binance and CoinCap WebSockets fail, the system falls back to REST polling via the MarketDataService for price data (FR16)
**And** during REST-only mode, `statusStore` reflects `'stale'` if no update received within 30 seconds
**And** the dashboard remains functional displaying last known data when all external APIs are unreachable (NFR15)
**And** when a higher-priority source becomes available again, the ConnectionManager reconnects to it
**And** `connection-manager.test.ts` covers the full fallback chain: Binance → CoinCap → REST

### Story 4.3: Status Indicator & Stale Data Badge

As a user,
I want to see a subtle connection status indicator and know when displayed data may be outdated,
So that I can trust the data when it's live and be aware when it's stale.

**Acceptance Criteria:**

**Given** the Status Indicator island is hydrated and subscribes to statusStore
**When** statusStore changes value
**Then** the indicator displays at the bottom center of the viewport as a 6px dot + text at 11px `text-muted` (UX-DR7)
**And** Live state shows: green dot (`status-live`) + "Live" text — barely visible, quiet good state
**And** Reconnecting state shows: amber dot (`status-reconnecting`) + "Reconnecting..." text with dot pulsing animation (1.5s ease-in-out cycle, opacity 0.4–1.0) (FR14)
**And** Stale state shows: red dot (`status-stale`) + "Connection lost" text, static (no animation)
**And** Fallback state shows: green dot (`status-live`) + "Live — CoinCap" text
**And** state transitions fade over 300ms ease-in-out — no abrupt switches
**And** when statusStore is `'stale'` (no price update for >30 seconds), a "Stale" badge appears on the Price Card in `status-stale` color (FR15)
**And** the stale badge does not hide or replace the price value — it's an addition
**And** when connection restores and a new price tick arrives, the stale badge fades out over 300ms
**And** all animations respect `prefers-reduced-motion` (instant transitions, no pulsing)
**And** the Status Indicator uses `<div role="status" aria-live="polite">` so screen readers announce state changes
