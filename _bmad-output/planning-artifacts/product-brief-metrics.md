---
title: "Product Brief: Metrics"
status: "complete"
created: "2026-03-25"
updated: "2026-03-25"
inputs: [user-conversation, web-research-bitcoin-apis, web-research-crypto-ui-trends]
---

# Product Brief: Metrics

## Executive Summary

Metrics is a personal, single-page Bitcoin dashboard that delivers real-time price data with a polished, dark crypto aesthetic. Built on Astro JS, it combines a live WebSocket price ticker with supplementary market data (24h change, market cap) and a mini price chart — all in one glanceable view.

The goal is simple: open a tab, see the current state of Bitcoin, and move on. No accounts, no clutter, no ads. Just clean, real-time information presented beautifully. The anti-bloat alternative to trading platforms and news aggregators — radical simplicity as a feature.

## The Problem

Checking the current Bitcoin price means navigating to bloated crypto exchanges or news aggregators packed with dozens of coins, ads, alerts, and trading interfaces. For someone who just wants to track BTC, these tools are noisy overkill. The alternative — Googling "bitcoin price" — gives stale data and no context like 24h movement or a trend line.

There's a gap between "open CoinGecko and wade through everything" and "a single, beautiful page that tells me exactly what I need."

## The Solution

A single-page Astro JS application with four core elements:

- **Live BTC price** — WebSocket-driven, updating in real-time via Binance or CoinCap public streams (no API key required)
- **24-hour change** — Percentage and absolute change at a glance
- **Market cap** — Current BTC market capitalization via REST API (CoinGecko)
- **Mini price chart** — Sparkline showing last 24 hours of hourly price data, rendered as a compact line chart with hover tooltips

The page loads fast (Astro's static-first architecture), the price widget hydrates as an interactive island, and the rest stays lightweight HTML/CSS.

## Technical Approach

- **Framework:** Astro JS with Islands Architecture — the price ticker and chart run as hydrated client components while the page shell remains static HTML
- **Real-time data:** Binance WebSocket (`wss://stream.binance.com:9443/ws/btcusdt@trade`) as primary source, with CoinCap WebSocket as fallback. Reconnection with exponential backoff on disconnect.
- **Supplementary data:** CoinGecko free REST API for market cap, 24h stats, and historical chart data (polled every 60 seconds to stay within rate limits)
- **Chart:** Lightweight charting library (e.g., lightweight-charts or Chart.js) — must be under 50KB gzipped and compatible with Astro client islands
- **Styling:** Tailwind CSS with custom dark theme — near-black backgrounds, neon accent colors (cyan/purple), glassmorphism card effects, monospaced font for price figures
- **Deployment:** Local development initially, with easy path to static hosting (Vercel/Netlify) later
- **Error handling:** Stale data indicator when WebSocket disconnects; graceful fallback to REST polling if WebSocket is unavailable

## Design Direction

The visual identity follows current crypto dashboard conventions:

- Deep dark backgrounds (#0a0a0f range) with subtle gradients
- Neon accent palette — cyan (#00f5ff), electric purple (#8b5cf6), or lime green (#39ff14)
- Glassmorphism cards with backdrop-filter blur for data panels
- Monospaced typography for price figures (JetBrains Mono), geometric sans-serif for labels (Inter)
- Green/red color coding for positive/negative price changes
- Clean, minimal layout — the data speaks for itself
- Responsive design: desktop-first, gracefully stacking on mobile

## Who This Serves

**Primary user:** Dmytro — a developer who wants a personal, always-open BTC dashboard that's fast, beautiful, and distraction-free.

**Secondary potential:** Anyone who wants a clean Bitcoin price page without the noise of full exchange platforms. The app could be shared publicly as an open-source project or deployed as a simple public utility.

## Success Criteria

- Page loads in under 2 seconds (Lighthouse performance score ≥ 90)
- Price updates visible within 1 second of WebSocket message receipt
- Visual polish: consistent spacing, smooth animations at 60 FPS, no layout shift
- Zero configuration required — open and it works

## Scope

**In (v1):**
- Single page with live BTC price, 24h change, market cap, 24h sparkline chart
- Dark crypto aesthetic with responsive design
- WebSocket real-time updates with reconnection and stale-data indicators
- Local development setup

**Out (v1):**
- Multiple cryptocurrencies
- Price alerts or notifications
- Historical data beyond 24h chart
- User accounts or personalization
- Backend/server infrastructure
- Fiat currency selector (USD only)

## Assumptions & Constraints

- Binance and CoinCap public WebSocket endpoints remain free and available without authentication
- CoinGecko free tier (30 req/min) is sufficient when polling at 60-second intervals
- Target browsers: modern evergreen only (Chrome, Firefox, Safari, Edge)
- Glassmorphism (backdrop-filter) has broad enough support for target browsers; no fallback needed for legacy

## Vision

If v1 proves useful, Metrics could evolve into a personal financial dashboard — adding more assets, fiat currency options, portfolio tracking, or a reusable dark-theme component library. But the core principle stays: beautiful, fast, zero-friction information at a glance.
