---
title: "Product Brief Distillate: Metrics"
type: llm-distillate
source: "product-brief-metrics.md"
created: "2026-03-25"
purpose: "Token-efficient context for downstream PRD creation"
---

# Product Brief Distillate: Metrics

## Scope Signals

- **MVP:** Single page — live BTC price (WebSocket), 24h change, market cap, 24h sparkline chart
- **USD only** in v1 — fiat currency selector explicitly deferred
- **Local dev only** in v1 — deployment to Vercel/Netlify is a future option, not v1
- **Single asset only** — multi-crypto tracking is out of scope
- **No backend** — entirely client-side with public APIs
- **No accounts, alerts, or personalization** in v1

## Technical Context & Decisions

- **Framework:** Astro JS — chosen by user, non-negotiable
- **Islands Architecture:** WebSocket ticker and chart are hydrated client islands; page shell is static HTML
- **Primary data source:** Binance WebSocket `wss://stream.binance.com:9443/ws/btcusdt@trade` — free, no auth, tick-by-tick
- **Fallback data source:** CoinCap WebSocket `wss://ws.coincap.io/prices?assets=bitcoin` — free, no auth, simpler but less reliable
- **Supplementary REST:** CoinGecko free tier for market cap, 24h change, historical hourly data — poll every 60s max (30 req/min limit)
- **Chart library constraint:** Must be <50KB gzipped, compatible with Astro client islands. Candidates: lightweight-charts, Chart.js
- **Chart spec:** 24h sparkline, hourly data points, hover tooltips showing price/time, read-only (no zoom/pan)
- **Reconnection strategy:** Exponential backoff on WebSocket disconnect; fallback to REST polling if reconnection fails
- **Stale data handling:** Visual indicator when WebSocket is disconnected so user knows price may be outdated
- **Binance 24h expiry:** Connections hard-expire at 24 hours — reconnection logic must handle this
- **Styling:** Tailwind CSS — user preference
- **Target browsers:** Modern evergreen only (Chrome, Firefox, Safari, Edge)

## Design Decisions

- **Aesthetic:** Dark/crypto — user explicitly chose this over minimal/clean
- **Color palette:** Near-black backgrounds (#0a0a0f), neon accents (cyan #00f5ff, electric purple #8b5cf6, lime green #39ff14)
- **Glassmorphism:** Cards with backdrop-filter blur for data panels
- **Typography:** JetBrains Mono for price figures, Inter for labels
- **Price change colors:** Green/red coding for positive/negative changes
- **Layout:** Desktop-first, responsive stacking on mobile
- **Philosophy:** "The data speaks for itself" — minimal chrome, maximum information density

## Performance Requirements

- Page load: <2 seconds, Lighthouse ≥ 90
- Price update latency: <1 second from WebSocket message to DOM update
- Animations: 60 FPS, no layout shift
- Zero configuration — open browser, see price

## API Research Findings

- **Binance WebSocket:** Best free option for real-time BTC. No auth needed. Tick-by-tick trades. Caveat: 24h connection expiry, possible geo-restrictions (US users)
- **CoinCap WebSocket:** Simpler alternative, universal access, less reliable uptime, no OHLCV data
- **CoinGecko REST:** Best for supplementary data (market cap, 24h stats, historical). Free tier: 30 req/min, 10K req/month. Data cached 1-5 min server-side — not suitable as primary real-time source
- **FreeCryptoAPI:** Exists but smaller provider, longevity unclear — not recommended as primary

## Competitive Intelligence

- **CoinGecko/CoinMarketCap web UIs:** Full-featured but bloated with ads, dozens of coins, trading tools — exactly what this project avoids
- **Krypton (Astro template):** Static crypto landing page template — no live data, purely marketing. Shows Astro is used in crypto space but no real-time precedent
- **Google "bitcoin price":** Stale, no context (no 24h chart, no market cap), not pinnable as a dashboard

## Open Questions

- Binance geo-restrictions: may need CoinCap as primary if Binance is blocked in user's region
- Chart interaction: currently spec'd as read-only sparkline — could expand later
- Dark theme reusability: the Tailwind config could become a shareable template for future dashboards (not v1)

## User Profile

- **User:** Dmytro, intermediate developer
- **Use case:** Personal — daily BTC price checking
- **Motivation:** Wants a fast, beautiful, distraction-free alternative to bloated exchange UIs
- **Tech preference:** Astro JS (specified), Tailwind CSS
- **Design preference:** Dark/crypto aesthetic (specified)
