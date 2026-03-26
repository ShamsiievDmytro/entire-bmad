---
stepsCompleted: [merged-phase1-btc, merged-phase2-ai-metrics]
inputDocuments:
  - product-brief-metrics.md
  - product-brief-metrics-distillate.md
  - brainstorming-session-2026-03-26-1400.md
workflowType: 'prd'
classification:
  projectType: web_app
  domain: fintech + internal engineering intelligence
  complexity: medium
  projectContext: greenfield → growing platform
  phase1Status: complete
  phase2Status: planning
---

# Product Requirements Document - Metrics Platform

**Author:** Dmytro
**Last Updated:** 2026-03-26

---

## Executive Summary

Metrics started as a single-page Bitcoin dashboard built on Astro JS — a focused, polished tool for checking the BTC price without noise. That foundation (dark aesthetic, Tailwind v4 design tokens, Astro Islands architecture, nanostores state management) is now the base for a second initiative: an AI observability PoC that reads checkpoint data from a Git-native AI session capture platform and renders a comprehensive metrics view for engineering teams.

The platform has two distinct products sharing one codebase:

**Phase 1 — Bitcoin Dashboard (✅ Complete, Sprint 1)**
Real-time BTC/USD price via WebSocket, 24h change, market cap, sparkline chart, and connection resilience. Fully implemented across four epics.

**Phase 2 — AI Metrics Dashboard (🔄 Planning)**
A proof-of-concept that demonstrates end-to-end AI usage observability built entirely on data that Entire — a Git-native AI session capture platform — already produces on every commit. No new infrastructure required. Covers: code attribution, token economics, quality signals, behavioral patterns, and temporal analytics across 20 metric charts.

---

## Shared Technical Foundation

### Astro Islands Architecture

Single-page Astro JS application. The page shell is static HTML (MPA pattern) with hydrated client islands for interactive components. Gives the performance of a static site with the interactivity of a live app.

- **Rendering:** Astro static-first with `client:load` directives for interactive islands
- **State management:** Shared reactive atoms via `nanostores`
- **Styling:** Tailwind CSS v4 with `@theme` design tokens compiled at build time
- **Typography:** JetBrains Mono + Inter via `@fontsource` packages

### Browser Support

- Chrome, Firefox, Safari, Edge (latest 2 versions each)
- No IE11 or legacy browser support
- Mobile: responsive layout supported, not primary use case for Phase 2

### Development Setup

- Astro dev server for local development
- Production build outputs static files
- No backend — all data sourced client-side or via pre-built cache

---

## Phase 1: Bitcoin Dashboard

**Status: ✅ Complete — Sprint 1 (Epics 1–4)**

### Summary

Checks the Bitcoin price today without navigating bloated exchange platforms. Live price via WebSocket, 24-hour change, market cap, and sparkline chart — with zero accounts, zero configuration, and zero noise.

**Target user:** Developer who wants a fast, beautiful, always-open BTC tab.
**Three pillars:** Speed (sub-2s load, sub-1s updates), aesthetics (glassmorphism, neon accents, monospaced typography), focus (one asset, one page, one purpose).

### Success Criteria

**User Success**
- User opens a tab and knows the current BTC price within 1 second
- Dashboard earns a permanent pinned tab spot
- Zero onboarding, zero configuration, zero accounts

**Business Success**
- Dmytro uses Metrics daily as his primary BTC price check, replacing CoinGecko/Google
- Project demonstrates polished frontend engineering — shareable as open-source or portfolio piece
- Deployable to Vercel/Netlify with minimal effort

**Technical Success**
- Lighthouse performance ≥ 90, accessibility ≥ 80
- WebSocket connection uptime > 99% during active browser sessions
- Total JS bundle (hydrated islands only) < 100KB gzipped
- Chart library < 50KB gzipped

### User Journeys

**Journey 1: The Morning Price Check (Happy Path)**
Dmytro opens his pinned tab. Price visible in under 2 seconds. No clicks, no scrolling. Tab title shows the price.
*Capabilities: real-time price, 24h change, sparkline, market cap, tab title price.*

**Journey 2: The Volatile Day (Reconnection & Stale Data)**
WebSocket blips. "Reconnecting..." indicator appears. Reconnects via exponential backoff. Falls back to REST polling if down longer. Stale data badge shown.
*Capabilities: WebSocket reconnection, stale data indicator, REST polling fallback.*

**Journey 3: The Fresh Visit (First-Time Load)**
Page loads in < 1.5s. Dark background first (no FOUC). Static shell renders, then data hydrates with smooth animations. No loading spinners.
*Capabilities: fast initial load, graceful data hydration, no FOUC, entry animations.*

**Journey 4: The Mobile Glance**
Layout stacks vertically. All data readable, touch-friendly, OLED-friendly dark theme.
*Capabilities: responsive design, full functionality on mobile.*

### Functional Requirements

**Real-Time Price Display**
- FR1: User can view the current BTC/USD price, updated in real-time
- FR2: User can see price updates reflected in the browser tab title
- FR3: User can see a visual indication of price direction (up/down) on each update

**Market Data**
- FR4: User can view the 24-hour price change as both percentage and absolute value
- FR5: User can distinguish positive and negative price changes via color coding
- FR6: User can view the current BTC market capitalization
- FR7: System refreshes supplementary market data periodically without user action

**Price Chart**
- FR8: User can view a sparkline chart showing BTC price over the last 24 hours
- FR9: User can hover over the chart to see price and time at a specific data point
- FR10: Chart displays hourly data points for the 24-hour period

**Connection Resilience**
- FR11: System connects to Binance WebSocket on page load
- FR12: System falls back to CoinCap WebSocket if primary fails
- FR13: System automatically reconnects when a WebSocket connection drops
- FR14: User can see a visual indicator when the data connection is lost or reconnecting
- FR15: User can see a stale data indicator when displayed price may be outdated
- FR16: System falls back to REST API polling when WebSocket is unavailable

**Visual Presentation**
- FR17: User sees a dark-themed interface with crypto-aesthetic styling on page load
- FR18: User experiences no flash of unstyled or light-themed content on initial load
- FR19: User sees smooth entry animations when data first loads
- FR20: User sees no layout shift as dynamic content populates

**Responsive Experience**
- FR21: User can view all dashboard data on desktop screens with a horizontal layout
- FR22: User can view all dashboard data on mobile screens with a vertically stacked layout
- FR23: Dashboard is usable and readable across all supported modern browsers

### Known Technical Debt

Items deferred from Sprint 1 code review. Full detail in `_bmad-output/implementation-artifacts/deferred-work.md`.

- **`ConnectionManager` race condition:** `attemptPromotion()` canary WebSocket not tracked in `this.ws` — low-probability race if `disconnect()` fires during 5s probe window
- **`formatRange` silent failure:** Inverted range input (`low > high`) produces wrong output with no guard
- **`Intl.NumberFormat` instance caching:** Recreated on every formatter call — acceptable for v1
- **Compact notation suffix portability:** `T`/`B`/`M` suffixes consistent on Node.js v8 but not spec-guaranteed
- **`MarketData` sign consistency:** `change24h` and `changePercent24h` signs not validated for consistency
- **ESLint `@typescript-eslint` rules:** Not configured

### Non-Functional Requirements

**Performance**
- NFR1: Page load (DOMContentLoaded) < 2 seconds on 4G
- NFR2: Largest Contentful Paint < 1.5 seconds
- NFR3: Cumulative Layout Shift = 0
- NFR4: Price updates render to DOM within 1 second of WebSocket message receipt
- NFR5: All animations run at 60 FPS
- NFR6: Lighthouse performance score ≥ 90
- NFR7: Total hydrated JavaScript bundle < 100KB gzipped
- NFR8: Chart library (lightweight-charts) < 50KB gzipped

**Integration**
- NFR9: Binance WebSocket connection establishes within 500ms of island hydration
- NFR10: WebSocket reconnection uses exponential backoff starting at 1s, capping at 30s
- NFR11: CoinGecko REST API polling interval ≥ 60 seconds (free tier: 30 req/min)
- NFR12: System tolerates CoinGecko API unavailability by displaying last known data with timestamp
- NFR13: Binance 24-hour connection expiry handled transparently as a standard reconnect cycle
- NFR14: Fallback from Binance to CoinCap completes without user intervention

**Reliability**
- NFR15: Dashboard remains functional (displays last known data) when all external APIs are unreachable
- NFR16: No JavaScript errors or white screens on WebSocket disconnection
- NFR17: Browser tab remains stable during extended sessions (no memory leaks over 24+ hours)

---

## Phase 2: AI Metrics Dashboard

**Status: 🔄 Planning**

### Summary

Engineering teams adopting AI coding assistants face a structural blind spot: they can see the code that ships, but not how AI contributed to it, at what cost, with what friction, or at what quality risk. This dashboard is a proof-of-concept that demonstrates end-to-end AI usage observability, built entirely on data that Entire — a Git-native AI session capture platform — already produces on every commit.

The dashboard reads checkpoint data from `ShamsiievDmytro/entire-bmad`, branch `entire/checkpoints/v1`, processes it through a local JSON cache, and renders 20 metric charts covering: code attribution, token economics, quality signals, behavioral patterns, and temporal analytics.

**Target audience:** Engineering leads and platform teams evaluating AI observability tooling for internal SDLC integration.
**Objective:** Demonstrate — with real data from real work sessions — that Git-native AI metrics are feasible, valuable, and require zero new data collection infrastructure.

### What Makes This Special

Entire captures AI session context as first-class versioned data in Git: transcripts, token usage, files touched, code attribution, friction events, and learnings — on every commit. This dashboard is the first layer that makes that data legible.

Key differentiators:
- **Zero new infrastructure** — reads existing Git branch data via GitHub API
- **Attribution at line level** — `agent_lines` vs `human_modified` vs `human_removed` per commit
- **Quality-correlated signals** — friction, open items, and human override rate tied to individual checkpoints
- **Workflow intelligence** — BMAD command invocations surface *how* AI was directed, not just *that* it was used
- **Temporal filtering** — all metrics sortable by commit datetime for sprint-level trend analysis

### Success Criteria

**User Success**
- An engineering lead can answer these questions within 2 minutes: *How much was written by AI? What did it cost in tokens? Where did friction occur? Which BMAD skills were used most?*
- The demo conveys the concept without verbal explanation
- At least one stakeholder asks "can we apply this to our own repos?"

**Business Success**
- Team accepts Entire + this dashboard as a viable approach for internal SDLC metrics integration
- Demo prompts a concrete next step: pilot proposal, Entire request, or internal spike
- Demonstrates zero new data collection infrastructure needed

**Technical Success**
- `npm run fetch-data` completes in under 60 seconds (~44 API calls + full.jsonl command extraction)
- Dashboard renders from local cache in under 2 seconds
- All 20 charts populate without errors from real `entire/checkpoints/v1` data
- No runtime errors during screen recording

### Product Scope — 20 Metrics

**Data tiers:**
- **Lightweight** (metrics 1–13, 15–20): sourced from `metadata.json` files only (~150KB total)
- **Heavy** (metric 14): targeted parse of `full.jsonl` user messages for command extraction only

**Attribution (5 metrics)**
1. Agent % per commit — trend line over all checkpoints sorted by `commit_date`
2. Pure-AI commit rate — % of checkpoints where `agent_percentage === 100`
3. Human modification rate — `human_modified` lines as % of `agent_lines` per checkpoint
4. Agent vs. human lines — stacked bar per checkpoint (`agent_lines` / `human_added` / `human_modified` / `human_removed`)
5. Zero-human-touch lines total — cumulative `agent_lines` where all human attribution fields = 0

**Token Economics (4 metrics)**
6. Token breakdown per checkpoint — stacked: input / cache_creation / cache_read / output
7. Cache leverage score — `cache_read_tokens / total_tokens` per checkpoint, trended
8. Total API call count — per checkpoint bar chart
9. Model distribution — pie/donut of Claude models (`model` field) across all turns

**Quality Signals (4 metrics)**
10. Friction events per checkpoint — `summary.friction` array length, bar chart
11. Open items debt — `summary.open_items` array length per checkpoint, trend line
12. Learnings generated — sum of `learnings.repo + learnings.code + learnings.workflow` counts per checkpoint
13. Session depth — `session_metrics.turn_count` per turn, scatter against `agent_percentage`

**Behavioral / SDLC (4 metrics)**
14. BMAD command usage frequency — parse `type: "user"` messages in `full.jsonl`, extract all `/bmad-*` and `/*` command patterns, rank by frequency
15. Prompt type distribution — classify `prompt.txt` per turn as: slash command / free-form / continuation (empty), pie chart
16. Files touched per checkpoint — count, coloured by file layer (`components/`, `services/`, `stores/`, `utils/`, docs)
17. Checkpoints per session — group turns by `session_id`, show how many checkpoints each session spans

**Temporal (3 metrics)**
18. Commit activity timeline — all checkpoints on time axis by `commit_date`, coloured by `agent_percentage`
19. Checkpoint cadence — time delta between consecutive commits in minutes, bar chart
20. Attribution trend over project — `agent_percentage` rolling average across all commits chronologically

### User Journeys

**Journey 1: The Presenter — Setting Up and Recording the Demo**
Dmytro runs `npm run fetch-data` — fetches ~44 metadata files, parses `full.jsonl` for BMAD commands, writes `checkpoints-cache.json` in under 60 seconds. Runs `npm run dev`, dashboard populates from cache. Records a 4-minute walkthrough.
*Capabilities: fetch script, local cache, static dashboard, all 20 metric charts, temporal ordering.*

**Journey 2: The Viewer — Engineering Lead Evaluating the Approach**
Watches the recording. Challenges the data. Attribution trend lands. BMAD command chart appears. "This shows exactly how the developer structured their AI workflow — not just that they used AI, but how." Asks "can we run this against our own repos?"
*Capabilities: data credibility indicator, commit date ordering, files-by-layer chart, BMAD command breakdown.*

**Journey 3: The Sceptic — Developer Who Questions the Data**
Concerned metrics could be used to evaluate individual performance. Dashboard shows aggregate patterns — no developer names, no performance ranking. Quality signals show where the *workflow* struggled, not who.
*Capabilities: no PII, aggregate-only view, metrics framed as workflow signals not performance KPIs.*

### Technical Architecture

**Build Pipeline**
```
npm run fetch-data
  → scripts/fetch-checkpoints.ts
  → src/data/checkpoints-cache.json (local, gitignored)

npm run dev / build
  → Astro reads cache at build time
  → client-side chart rendering
```

**Fetch Script Targets**
- `GET /git/trees/{branch}?recursive=1` — discover all checkpoint paths
- `GET /contents/{path}/metadata.json` × ~41 files — parent + turn metadata
- `GET /commits?sha={branch}` — commit dates and checkpoint_id mapping
- Targeted `full.jsonl` parse — scan `type:"user"` messages for `/bmad-*` commands only

**Implementation Decisions**
- Charts: reuse existing `lightweight-charts` for time-series; add lightweight bar/pie library (`Chart.js` or `unovis`) for non-time-series metrics
- Styling: extend existing Tailwind v4 `@theme` tokens — dark aesthetic already established
- All 20 metrics on a single scrollable page — no routing needed
- Cache file gitignored — run `fetch-data` locally before `dev` or `build`
- No SEO requirements — internal demo

**Responsive Layout**
- Desktop (≥1024px): 3–4 column card grid, full chart labels, summary stats
- Tablet (768–1023px): 2 column grid, condensed labels
- Mobile (<768px): single column, charts stack vertically — usable but not primary

### Project Scoping

**MVP (Phase 1 of AI Dashboard) — v1 Demo Dashboard**
- `scripts/fetch-checkpoints.ts` fetch script
- `src/data/checkpoints-cache.json` schema and local cache
- All 20 metric charts across 5 domains
- Temporal ordering by `commit_date`
- Responsive layout (desktop-first)
- Data source credibility indicator

**Out of MVP Scope**
- Configurable repo/branch (hardcoded to `ShamsiievDmytro/entire-bmad`)
- Authentication (public repo, no token required for demo)
- Multiple pages or routing
- Export / share features

**Phase 2 — Growth (Post-Demo)**
- `.env`-configurable repo, owner, branch
- GitLab API support
- Multi-repo aggregation
- Per-developer breakdown
- `full.jsonl` deep analysis: tool call palette, thinking block ratio, stop reason distribution
- CSV/report export

**Phase 3 — Platform Vision**
- Real-time ingestion via webhook on checkpoint branch push
- Team comparison dashboard across developers and repos
- DORA-style AI benchmark against aggregated data
- Integration into internal developer portal

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| Sparse checkpoint data | Demo uses completed project with 11 checkpoints — sufficient density |
| GitHub API rate limits | ~44 calls, within unauthenticated 60/hour limit; optional `GITHUB_TOKEN` env var |
| `full.jsonl` files too large | Stream line-by-line; extract command strings only; skip on error |
| 20 charts feels like too many | Group into labelled domain sections; collapsible panels if needed |
| Team asks for live data during meeting | Recorded walkthrough removes live dependency |
| Team perceives as surveillance | No PII, aggregate-only, framed as workflow signals not performance KPIs |
| GitLab-only teams can't adopt | GitLab migration is Phase 2 priority; noted in architecture |

### Functional Requirements

**Data Pipeline**
- FR1: System fetches all checkpoint metadata from `entire/checkpoints/v1` branch via GitHub REST API without requiring authentication
- FR2: System writes all fetched data to `src/data/checkpoints-cache.json` in a single atomic write operation
- FR3: System completes full fetch in under 60 seconds for the target repo (~44 API calls)
- FR4: System discovers all checkpoint paths via a single `GET /git/trees/{branch}?recursive=1` call
- FR5: System fetches parent `metadata.json` and all turn `metadata.json` files for each checkpoint
- FR6: System fetches commit log via `GET /commits?sha={branch}` and joins `commit_date` to each checkpoint via `checkpoint_id` in the commit message
- FR7: System parses `type:"user"` messages in `full.jsonl` for each turn, extracts all `/bmad-*` and `/*` slash command patterns, and stores extracted command strings with counts in the cache
- FR8: System skips `full.jsonl` parse gracefully if the file is unavailable or malformed, logging a warning without failing the entire fetch

**Attribution Analytics**
- FR9: Dashboard renders a trend line of `agent_percentage` per checkpoint, ordered chronologically by `commit_date`
- FR10: Dashboard renders a stacked bar chart showing `agent_lines`, `human_added`, `human_modified`, and `human_removed` per checkpoint
- FR11: Dashboard displays the pure-AI commit rate — percentage of checkpoints where `agent_percentage === 100`
- FR12: Dashboard renders human modification rate — `human_modified` lines as a percentage of `agent_lines` — per checkpoint
- FR13: Dashboard displays cumulative zero-human-touch lines — total `agent_lines` from checkpoints where all human attribution fields equal zero

**Token Economics**
- FR14: Dashboard renders a stacked bar of token breakdown per checkpoint: `input_tokens`, `cache_creation_tokens`, `cache_read_tokens`, `output_tokens`
- FR15: Dashboard renders cache leverage score as `cache_read_tokens / total_tokens` per checkpoint, as a trend line
- FR16: Dashboard renders total API call count per checkpoint as a bar chart
- FR17: Dashboard renders a pie/donut chart of model distribution across all turns using the `model` field

**Quality and Knowledge**
- FR18: Dashboard renders friction event count per checkpoint (length of `summary.friction` array) as a bar chart
- FR19: Dashboard renders open items debt per checkpoint (length of `summary.open_items` array) as a trend line
- FR20: Dashboard renders learnings generated per checkpoint — sum of `learnings.repo + learnings.code + learnings.workflow` counts
- FR21: Dashboard renders session depth — `turn_count` per turn scattered against `agent_percentage`

**Behavioral and SDLC**
- FR22: Dashboard renders BMAD command usage frequency — all extracted `/bmad-*` and `/*` commands ranked by count, as a bar chart
- FR23: Dashboard renders prompt type distribution — classifies each turn's `prompt.txt` as slash command / free-form / continuation (empty), shown as a pie chart
- FR24: Dashboard renders files touched per checkpoint with colour coding by file layer (`components/`, `services/`, `stores/`, `utils/`, docs)
- FR25: Dashboard renders session count per checkpoint — shows how many unique `session_id` values appear in each checkpoint's turns (reflects that multiple sessions may contribute to a single checkpoint)

**Temporal Analytics**
- FR26: Dashboard renders a commit activity timeline — all checkpoints on a time axis by `commit_date`, colour-coded by `agent_percentage`
- FR27: Dashboard renders checkpoint cadence — time delta between consecutive commits in minutes, as a bar chart
- FR28: Dashboard renders attribution trend over project — rolling average of `agent_percentage` across all commits chronologically

**Dashboard Presentation**
- FR29: All 20 metric charts are displayed on a single scrollable page with no client-side routing
- FR30: Dashboard displays a data source credibility indicator showing repo name, branch name, checkpoint count, and cache generation timestamp
- FR31: Dashboard layout is responsive: 3–4 columns at ≥1024px, 2 columns at 768–1023px, single column at <768px
- FR32: Metric charts are grouped into labelled domain sections: Attribution, Token Economics, Quality Signals, Behavioral/SDLC, Temporal
- FR33: Each chart card includes a title, a brief description of what the metric measures, and the data source field(s) used

### Non-Functional Requirements

**Performance**
- NFR1: `npm run fetch-data` completes in under 60 seconds for ~44 API calls + full.jsonl command scan on a standard broadband connection
- NFR2: Dashboard renders all 20 charts from local cache in under 2 seconds on a modern laptop
- NFR3: First Contentful Paint occurs in under 1.5 seconds on Astro dev server (localhost)
- NFR4: All 20 charts finish rendering within 500ms of data load completing
- NFR5: Total hydrated JavaScript bundle size is under 150KB gzipped
- NFR6: No layout shift occurs as charts render — chart containers are pre-sized in the static shell

**Integration**
- NFR7: Fetch script operates within the GitHub API 60 req/hour unauthenticated rate limit (~44 calls); optional `GITHUB_TOKEN` env var supported for additional headroom
- NFR8: Fetch script processes `full.jsonl` files via line-by-line streaming — no full file load into memory — to handle files up to 5MB without OOM errors
- NFR9: Fetch script retries failed API calls once with a 2-second delay before marking the checkpoint as fetch-failed and continuing
- NFR10: Cache file is valid JSON and parseable by Astro at build time without errors; fetch script validates output schema before writing

**Reliability**
- NFR11: Dashboard displays a meaningful empty state for any chart that has no data rather than erroring or rendering a blank frame
- NFR12: No JavaScript runtime errors occur in the browser console during a complete dashboard walkthrough under normal conditions
- NFR13: If `checkpoints-cache.json` is absent, the dashboard build fails with a clear, actionable error message: "Cache file not found — run `npm run fetch-data` first"
