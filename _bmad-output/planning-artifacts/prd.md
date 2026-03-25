---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain-skipped, step-06-innovation-skipped, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments:
  - product-brief-metrics.md
  - product-brief-metrics-distillate.md
documentCounts:
  briefs: 2
  research: 0
  brainstorming: 0
  projectDocs: 0
workflowType: 'prd'
classification:
  projectType: web_app
  domain: fintech
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - Metrics

**Author:** Dmytro
**Date:** 2026-03-25

## Executive Summary

Metrics is a single-page Bitcoin dashboard built on Astro JS that delivers real-time BTC price data through a polished, dark crypto interface. It solves a specific problem: checking the Bitcoin price today means navigating bloated exchange platforms or news aggregators packed with irrelevant coins, ads, and trading interfaces. Metrics provides the answer in one glance — live price via WebSocket, 24-hour change, market cap, and a sparkline chart — with zero accounts, zero configuration, and zero noise.

The target user is a developer (initially Dmytro) who wants a fast, beautiful, always-open BTC tab. The product is designed around three pillars: **speed** (sub-2s page load, sub-1s price updates), **aesthetics** (dark crypto visual identity with glassmorphism, neon accents, and monospaced typography), and **focus** (one asset, one page, one purpose).

Deliberate constraint is the feature. Where CoinGecko, CoinMarketCap, and exchange UIs compete on breadth, Metrics competes on depth of simplicity. The core insight: the best dashboard is the one you don't have to think about. It's built for someone who wants to *know* the price, not *trade* it. Astro's Islands Architecture hydrates only the interactive components (price ticker, chart) while the shell stays static HTML — a page that loads like a static site but updates like a live app.

## Project Classification

- **Project Type:** Web application (SPA-like with Astro Islands Architecture)
- **Domain:** Fintech (cryptocurrency data visualization)
- **Complexity:** Low — read-only public API consumption, no user data, no transactions, no regulatory requirements
- **Project Context:** Greenfield — new product, no existing codebase

## Success Criteria

### User Success

- **Instant awareness:** User opens a tab and knows the current BTC price within 1 second — no scanning, no clicking, no waiting
- **Pinned tab worthy:** The dashboard is reliable and beautiful enough to earn a permanent spot in the browser tab bar
- **Zero learning curve:** No onboarding, no configuration, no accounts — it just works on first visit

### Business Success

- **Personal utility:** Dmytro uses Metrics daily as his primary BTC price check, replacing CoinGecko/Google
- **Craft quality:** The project demonstrates polished frontend engineering — suitable for sharing as open-source or a portfolio piece
- **Deployable:** Can be moved from local dev to public hosting (Vercel/Netlify) with minimal effort when ready

### Technical Success

Specific targets defined in Non-Functional Requirements (NFR1–NFR17). Key benchmarks:

- Lighthouse performance ≥ 90, accessibility ≥ 80
- WebSocket connection uptime > 99% during active browser sessions
- Total JS bundle (hydrated islands only) < 100KB gzipped
- Chart library < 50KB gzipped

## User Journeys

### Journey 1: The Morning Price Check (Happy Path)

**Dmytro, developer, morning coffee ritual.**

It's 8:15 AM. Dmytro grabs his coffee and opens his laptop. Among his pinned browser tabs, Metrics is already there. He glances at it — **$68,432.17**, green arrow, **+2.3% in 24h**. The sparkline shows a gentle upward trend since yesterday afternoon. Market cap sits at $1.34T. He knows everything he needs to know in under 2 seconds. He moves on to his work. No clicks, no scrolling, no cognitive load. The tab title even shows the price, so sometimes he doesn't even need to switch to it.

**Capabilities revealed:** Real-time price display, 24h change indicator, sparkline chart, market cap, tab title with price, instant page load from pinned tab state.

### Journey 2: The Volatile Day (Edge Case — Reconnection & Stale Data)

**Dmytro, mid-afternoon, market is moving fast.**

Bitcoin just dropped 8% in an hour. Dmytro switches to his Metrics tab to watch it move. The price is ticking down live — **$62,100... $61,980... $61,850**. Then his WiFi blips. A subtle indicator appears: **"Reconnecting..."** in muted text. Within seconds, the WebSocket reconnects via exponential backoff and the live feed resumes. He didn't have to refresh. If the connection had stayed down longer, the price would have shown a stale-data badge so he'd know not to trust it, and the app would have fallen back to REST polling for updates every 60 seconds.

**Capabilities revealed:** WebSocket reconnection with exponential backoff, stale data visual indicator, REST polling fallback, high-frequency price update rendering without layout shift.

### Journey 3: The Fresh Visit (First-Time Load)

**Dmytro opens Metrics for the first time on a new machine.**

He types the local dev URL into his browser. The page loads in under 1.5 seconds — dark background fills the screen first (no flash of white), then the static shell renders immediately: labels, card outlines, layout. Within 500ms, the WebSocket connects and the price appears with a smooth fade-in. The sparkline draws itself with a quick animation. No loading spinners, no skeleton screens — just a fast, elegant entrance. He bookmarks it, pins the tab, and it becomes part of his daily setup.

**Capabilities revealed:** Fast initial page load (static-first Astro), WebSocket connection initialization, graceful data hydration without layout shift, dark theme renders immediately (no FOUC), smooth entry animations.

### Journey 4: The Mobile Glance (Responsive Edge Case)

**Dmytro, on his phone, quick check while out.**

He opens Metrics on his phone browser. The layout stacks vertically — price prominently on top, 24h change below, then the sparkline chart fills the width, market cap at the bottom. Everything is readable, touch-friendly, and the dark theme looks sharp on OLED. The WebSocket connects and the price starts updating live. Same experience, smaller screen.

**Capabilities revealed:** Responsive design (desktop-first with mobile stacking), touch-friendly layout, OLED-friendly dark theme, full functionality on mobile browsers.

### Journey Requirements Summary

| Capability | J1 | J2 | J3 | J4 |
|---|---|---|---|---|
| Live BTC price via WebSocket | ✓ | ✓ | ✓ | ✓ |
| 24h change (% and absolute) | ✓ | ✓ | ✓ | ✓ |
| Market cap display | ✓ | ✓ | ✓ | ✓ |
| 24h sparkline chart | ✓ | ✓ | ✓ | ✓ |
| Tab title with price | ✓ | | | |
| WebSocket reconnection | | ✓ | | |
| Stale data indicator | | ✓ | | |
| REST polling fallback | | ✓ | | |
| Fast initial load (< 2s) | | | ✓ | |
| Graceful data hydration | | | ✓ | |
| No FOUC (dark theme first) | | | ✓ | |
| Entry animations | | | ✓ | |
| Responsive mobile layout | | | | ✓ |

## Technical Architecture

### Astro Islands Architecture

Single-page Astro JS application. The page shell is static HTML (MPA pattern) with two hydrated client islands: the WebSocket price ticker and the sparkline chart. This gives the performance benefits of a static site with the interactivity of a live dashboard.

- **Rendering model:** Astro static-first with `client:load` directives for interactive islands (price ticker, chart component)
- **Real-time data:** WebSocket connections managed within hydrated islands only — no SSR or server-side WebSocket handling
- **State management:** Minimal — component-local state within each island. No global state store needed. Price data flows: WebSocket → island component → DOM
- **Asset strategy:** Tailwind CSS compiled at build time; JetBrains Mono and Inter loaded via `@fontsource` packages or self-hosted for performance

### Browser Support

- Chrome, Firefox, Safari, Edge (latest 2 versions each)
- No IE11 or legacy browser support
- `backdrop-filter` (glassmorphism) supported across all targets — no fallback needed

### Accessibility

- Semantic HTML structure (headings, landmarks, ARIA labels where meaningful)
- Sufficient color contrast for price text against dark backgrounds
- No formal WCAG compliance target — best-effort with sensible defaults

### Implementation Constraints

- **No SEO requirements** — personal dashboard, not indexed
- **No SSR needed** — fully static build with client-side hydration
- **No routing** — single page, no client-side router
- **No backend** — all data sourced from public WebSocket and REST APIs client-side
- **Dev server:** Astro dev server for local development; production build outputs static files

## Project Scoping & Phased Development

### MVP Strategy

**MVP Approach:** Experience MVP — the minimum feature set that delivers the full "open tab, know the price" experience with visual polish. No feature stubs or placeholder UI. Everything shipped in v1 works completely and looks finished.

**Resource Requirements:** Solo developer (Dmytro). Astro JS, Tailwind CSS, and TypeScript skills. No backend or DevOps needed for v1.

**Core User Journeys Supported:** All four (J1–J4) — full support.

### MVP Feature Set (Phase 1)

- Live BTC/USD price via Binance WebSocket with CoinCap fallback
- 24h price change (percentage and absolute) via CoinGecko REST
- Market cap display via CoinGecko REST (polled every 60s)
- 24h sparkline chart using lightweight-charts (TradingView), hourly data, hover tooltips
- Dark crypto aesthetic: near-black backgrounds, neon accents, glassmorphism cards, JetBrains Mono / Inter typography
- Tab title showing current price
- WebSocket reconnection with exponential backoff
- Stale data indicator on disconnect
- REST polling fallback when WebSocket is unavailable
- Responsive layout (desktop-first, mobile stacking)
- No FOUC — dark theme renders immediately
- Smooth entry animations for data hydration
- Local development setup with Astro dev server

### Key Technical Decisions

- **Chart library:** lightweight-charts (TradingView) — finance-native, ~40KB gzipped, fits bundle constraint
- **WebSocket fallback strategy:** Try Binance first, fall back to CoinCap on failure. No auto-detection or geo-check — simple sequential fallback acceptable for v1
- **Binance 24h expiry:** Reconnection logic handles this as a normal disconnect/reconnect cycle

### Phase 2 (Growth)

- Static hosting deployment (Vercel/Netlify) with production build
- Extended chart timeframes (7d, 30d)
- Additional fiat currency options (EUR, GBP)
- PWA support for mobile home screen install

### Phase 3 (Expansion)

- Multi-asset support (ETH, SOL, etc.)
- Personal portfolio tracking
- Reusable dark-theme Astro component library
- Public open-source release

### Risk Mitigation

- *Binance WebSocket geo-blocked:* CoinCap fallback provides equivalent functionality. Acceptable latency trade-off for v1.
- *CoinGecko rate limiting:* 60s polling interval stays well within 30 req/min free tier. If hit, degrade gracefully by showing last known data with timestamp.
- *lightweight-charts Astro compatibility:* Library is framework-agnostic vanilla JS — low integration risk with Astro client islands.
- *Resource:* Solo developer project. Tight scope minimizes risk. No external dependencies requiring agreements.

## Functional Requirements

### Real-Time Price Display

- FR1: User can view the current BTC/USD price, updated in real-time
- FR2: User can see price updates reflected in the browser tab title
- FR3: User can see a visual indication of price direction (up/down) on each update

### Market Data

- FR4: User can view the 24-hour price change as both a percentage and absolute value
- FR5: User can distinguish positive and negative price changes via color coding
- FR6: User can view the current BTC market capitalization
- FR7: System refreshes supplementary market data (24h change, market cap) periodically without user action

### Price Chart

- FR8: User can view a sparkline chart showing BTC price over the last 24 hours
- FR9: User can hover over the chart to see the price and time at a specific data point
- FR10: Chart displays hourly data points for the 24-hour period

### Connection Resilience

- FR11: System connects to the primary WebSocket data source (Binance) on page load
- FR12: System falls back to a secondary WebSocket source (CoinCap) if the primary fails
- FR13: System automatically reconnects when a WebSocket connection drops
- FR14: User can see a visual indicator when the data connection is lost or reconnecting
- FR15: User can see a stale data indicator when displayed price may be outdated
- FR16: System falls back to REST API polling when WebSocket is unavailable

### Visual Presentation

- FR17: User sees a dark-themed interface with crypto-aesthetic styling on page load
- FR18: User experiences no flash of unstyled or light-themed content on initial load
- FR19: User sees smooth entry animations when data first loads
- FR20: User sees no layout shift as dynamic content populates

### Responsive Experience

- FR21: User can view all dashboard data on desktop screens with a horizontal layout
- FR22: User can view all dashboard data on mobile screens with a vertically stacked layout
- FR23: Dashboard is usable and readable across all supported modern browsers

## Non-Functional Requirements

### Performance

- NFR1: Page load (DOMContentLoaded) completes in < 2 seconds on a 4G connection
- NFR2: Largest Contentful Paint (LCP) occurs in < 1.5 seconds
- NFR3: Cumulative Layout Shift (CLS) = 0 — no visible layout shift during data hydration
- NFR4: Price updates render to DOM within 1 second of WebSocket message receipt
- NFR5: All animations run at 60 FPS with no dropped frames
- NFR6: Lighthouse performance score ≥ 90
- NFR7: Total hydrated JavaScript bundle < 100KB gzipped
- NFR8: Chart library (lightweight-charts) < 50KB gzipped

### Integration

- NFR9: Binance WebSocket connection establishes within 500ms of island hydration under normal network conditions
- NFR10: WebSocket reconnection uses exponential backoff starting at 1 second, capping at 30 seconds
- NFR11: CoinGecko REST API polling interval ≥ 60 seconds to stay within free tier rate limits (30 req/min)
- NFR12: System tolerates CoinGecko API unavailability by displaying last known data with a timestamp
- NFR13: Binance 24-hour connection expiry handled transparently as a standard reconnect cycle
- NFR14: Fallback from Binance to CoinCap completes without user intervention

### Reliability

- NFR15: Dashboard remains functional (displays last known data) when all external APIs are unreachable
- NFR16: No JavaScript errors or white screens on WebSocket disconnection
- NFR17: Browser tab remains stable during extended sessions (no memory leaks over 24+ hours)
