# Charts Inventory

## Page 1: Bitcoin Price Dashboard (`/src/pages/index.astro`)

| # | Chart Name | Type | Library | Input Data | Description |
|---|-----------|------|---------|------------|-------------|
| 1 | **24-Hour Price Chart** | Area | lightweight-charts | `ChartPoint[]` `{time, value}` from live WebSocket | BTC/USD price over 24h with cyan gradient fill and crosshair tooltip |
| 2 | **Live Price Card** | Stat card | — | `PriceTick` `{price, timestamp, direction}` | Current BTC price with directional arrow, 24h change %, flash animation |
| 3 | **Market Data Card** | Stat card | — | `MarketData` `{marketCap, change24h, high24h, low24h}` | Market cap and 24h price range in compact notation |

## Page 2: AI Metrics Dashboard (`/src/pages/ai-metrics.astro`)

### Attribution Section

| # | Chart Name | Type | Library | Input Data | Description |
|---|-----------|------|---------|------------|-------------|
| 4 | **Agent % Over Time** | Line | lightweight-charts | `agent_percentage` per checkpoint | Time-series of AI-authored code percentage |
| 5 | **Pure-AI Commit Rate** | Stat card | — | % of checkpoints with `agent_percentage=100` | Count of fully AI-authored commits |
| 6 | **Human Edit Rate** | Bar | Chart.js | `100 - agent_percentage` per checkpoint | Amber bars showing human contribution per checkpoint |
| 7 | **Attribution Breakdown** | Stacked bar | Chart.js | `agent_percentage` + human% per checkpoint | Purple/green stacked bars showing agent vs human split |
| 8 | **Avg Agent Attribution** | Stat card | — | Mean of all `agent_percentage` | Average AI contribution across all checkpoints |

### Token Economics Section

| # | Chart Name | Type | Library | Input Data | Description |
|---|-----------|------|---------|------------|-------------|
| 9 | **Token Breakdown** | Stacked bar | Chart.js | `tokens.{input, cache_creation, cache_read, output}` | 4-color stacked columns showing token type distribution |
| 10 | **Cache Leverage Score** | Line | lightweight-charts | `cache_read / total_tokens * 100` | Trend of prompt caching efficiency over time |
| 11 | **API Call Count** | Bar | Chart.js | Sum of `turn_count` per checkpoint | Amber bars showing API call volume |
| 12 | **Model Distribution** | Doughnut | Chart.js | Count of each `turn.model` | Doughnut showing LLM model usage frequency |

### Quality Section

| # | Chart Name | Type | Library | Input Data | Description |
|---|-----------|------|---------|------------|-------------|
| 13 | **Session Depth vs Agent %** | Scatter | Chart.js | X: total turns, Y: `agent_percentage` | Correlation between session depth and AI code quality |

### Behavioral / SDLC Section

| # | Chart Name | Type | Library | Input Data | Description |
|---|-----------|------|---------|------------|-------------|
| 14 | **BMAD Command Frequency** | Horizontal bar | Chart.js | Aggregated `bmad_commands` counts | Most-used BMAD slash commands, sorted by frequency |
| 15 | **Prompt Type Distribution** | Doughnut | Chart.js | Slash Command / Free-form / Continuation counts | Breakdown of prompt types across all turns |
| 16 | **Files Touched by Layer** | Stacked bar | Chart.js | Files classified into 6 layers (components, services, stores, utils, docs, other) | Architectural layer distribution of file changes |
| 17 | **Unique Sessions per Checkpoint** | Bar | Chart.js | Count of unique `session_id` per checkpoint | How many distinct work sessions per checkpoint |

### Temporal Section

| # | Chart Name | Type | Library | Input Data | Description |
|---|-----------|------|---------|------------|-------------|
| 18 | **Commit Activity Timeline** | Scatter (time) | Chart.js | X: commit timestamp, Y: `agent_percentage`, color-coded by quality | Color-coded scatter showing AI quality trend over time (green ≥70%, amber 40-69%, red <40%) |
| 19 | **Checkpoint Cadence** | Bar | Chart.js | Minutes between consecutive commits | Time gaps between checkpoints |
| 20 | **Attribution Trend (Rolling Avg)** | Line | lightweight-charts | 3-checkpoint rolling average of `agent_percentage` | Smoothed long-term AI attribution trend |
