# Charts Inventory

## Page 1: Bitcoin Price Dashboard (`/src/pages/index.astro`)

| # | Chart Name | Type | Library | Input Data | What it shows / why it matters |
|---|-----------|------|---------|------------|-------------------------------|
| 1 | **24-Hour Price Chart** | Area | lightweight-charts | `ChartPoint[]` `{time, value}` from live WebSocket | BTC/USD price over 24h with cyan gradient fill and crosshair tooltip. |
| 2 | **Live Price Card** | Stat card | — | `PriceTick` `{price, timestamp, direction}` | Current BTC price with directional arrow, 24h change %, and flash animation. |
| 3 | **Market Data Card** | Stat card | — | `MarketData` `{marketCap, change24h, high24h, low24h}` | Market cap and 24h price range in compact notation. |

## Page 2: AI Metrics Dashboard (`/src/pages/ai-metrics.astro`)

Charts are rated for informational value — ⭐⭐⭐ high signal, ⭐⭐ useful support, ⭐ limited standalone value — and marked as `NEW` when they have not yet been implemented.

### Attribution Section

| # | Chart Name | Type | Library | Rating | Input Data | What it shows / why it matters |
|---|-----------|------|---------|:------:|------------|-------------------------------|
| 4 | **Agent % Over Time** | Line | lightweight-charts | ⭐⭐⭐ | `agent_percentage` per checkpoint | How much of each commit is AI-authored, tracked over time. Shows whether the team is shifting work onto AI and at what rate. The core attribution signal every downstream metric depends on. |
| 5 | **Pure-AI Commit Rate** | Stat card | — | ⭐⭐⭐ | % of checkpoints with `agent_percentage=100` | Share of commits where AI wrote 100% of the code. High-signal headline metric because it distinguishes "AI helped a bit" from "AI did the work end-to-end." Trending upward means AI is handling complete units of work, not just suggestions. |
| 6 | **Human Edit Rate** | Bar | Chart.js | ⭐⭐ | `100 - agent_percentage` per checkpoint | How much of AI output gets rewritten before commit. Rising values signal quality issues with the AI output or a growing mismatch between AI suggestions and team standards. Amber bars showing human contribution per checkpoint. |
| 7 | **Attribution Breakdown** | Stacked bar | Chart.js | ⭐⭐ | `agent_percentage` + human% per checkpoint | Visual split of AI-authored vs human-modified vs human-removed lines per commit. Makes the human/AI balance instantly readable for exec audiences in a way a trend line cannot. |
| 8 | **Avg Agent Attribution** | Stat card | — | ⭐⭐ | Mean of all `agent_percentage` | Single headline number: average AI contribution across the whole project. Belongs at the top of the dashboard as the one-second summary of "how AI-native is this team." |
| 24 | **First-Time-Right Rate** `NEW` | Stat card + trend line | lightweight-charts | ⭐⭐⭐ | Share of checkpoints with `agent_lines > 0 AND human_modified == 0 AND human_removed == 0` | The strongest code-quality signal we have: AI output that shipped without any human edits. Rising trend means agent outputs are getting better and more trusted. Pairs with #6 to show both the "average rewrite" and "pristine output" sides of attribution. |

### Token Economics Section

| # | Chart Name | Type | Library | Rating | Input Data | What it shows / why it matters |
|---|-----------|------|---------|:------:|------------|-------------------------------|
| 9 | **Token Breakdown** | Stacked bar | Chart.js | ⭐⭐⭐ | `tokens.{input, cache_creation, cache_read, output}` | Stacked view of input / output / cache-creation / cache-read tokens per commit. Reveals where token spend is actually going — most teams discover cache-creation cost is underreported in their mental model. |
| 10 | **Cache Leverage Score** | Line | lightweight-charts | ⭐⭐⭐ | `cache_read / total_tokens * 100` | Percentage of total tokens served from cache, trended over time. Rising values mean prompt discipline is improving and cost-per-commit is falling. A direct lever for cost optimization. |
| 11 | **API Call Count** | Bar | Chart.js | ⭐⭐ | Sum of `turn_count` per checkpoint | Raw volume of agent turns per checkpoint. Useful alongside token charts to spot checkpoints that are call-heavy but token-light (chatty sessions) vs call-light but token-heavy (deep-reasoning sessions). |
| 12 | **Model Distribution** | Doughnut | Chart.js | ⭐⭐⭐ | Count of each `turn.model` | Which LLMs the team actually uses (Sonnet vs Opus vs Haiku vs GPT-5 vs Gemini). Exposes whether premium-model usage is justified by the work type, and which models to standardize on for cost control. |

### Quality Section

| # | Chart Name | Type | Library | Rating | Input Data | What it shows / why it matters |
|---|-----------|------|---------|:------:|------------|-------------------------------|
| 13 | **Session Depth vs Agent %** | Scatter | Chart.js | ⭐⭐ | X: total turns, Y: `agent_percentage` | Correlation: do longer sessions produce more AI-authored code, or do they degrade as context fills up? Interesting diagnostic once we have enough commits to see the pattern clearly. |

### Behavioral / SDLC Section

| # | Chart Name | Type | Library | Rating | Input Data | What it shows / why it matters |
|---|-----------|------|---------|:------:|------------|-------------------------------|
| 14 | **Slash Command Frequency** | Horizontal bar | Chart.js | ⭐⭐⭐ | Aggregated slash-command counts extracted from `turns[].prompt_txt` | Most-invoked slash commands across all sessions. Shows which parts of the team's structured workflow are actually being used vs which exist only on paper. Essential signal for workflow-catalog decisions. |
| 15 | **Prompt Type Distribution** | Doughnut | Chart.js | ⭐⭐ | Slash Command / Free-form / Continuation counts | Share of prompts that are structured slash commands vs free-form natural language vs continuations. Higher slash-command share indicates a mature, disciplined workflow; high free-form share suggests developers are still figuring out prompts. |
| 16 | **Files Touched by Layer** | Stacked bar | Chart.js | ⭐⭐ | Files classified into 6 layers (components, services, stores, utils, docs, other) | Architectural distribution of AI edits — components vs services vs stores vs docs. Reveals which parts of the codebase AI is trusted with and which it's avoided in. |
| 17 | **Unique Sessions per Checkpoint** | Bar | Chart.js | ⭐ | Count of unique `session_id` per checkpoint | How many distinct agent sessions feed each commit. Low standalone value — most checkpoints are single-session and the distribution is noisy. **Candidate for merge into cadence view or removal.** |
| 21 | **Tool Usage Mix** `NEW` | Stacked bar or doughnut | Chart.js | ⭐⭐⭐ | Count of `tool_use` blocks grouped by name (Read / Edit / Bash / Grep / Glob / Write / Skill / Task / WebSearch) per checkpoint | Answers "what kind of work happened in this checkpoint?" — reading-heavy (exploration), editing-heavy (implementation), or automating (Bash / WebSearch). Reveals workflow patterns that don't show up anywhere else. |
| 22 | **Top-N Skills Invoked** `NEW` | Horizontal bar | Chart.js | ⭐⭐⭐ | Aggregated `Skill` tool_use frequency per skill_id across all checkpoints | Which Skills in the catalog are actually used, and which sit unused. Directly informs catalog investment decisions — stop maintaining Skills no one calls, invest in the ones that get heavy use. |
| 23 | **Subagent Usage Timeline** `NEW` | Bar over time | Chart.js | ⭐⭐⭐ | Count of `Task` tool_use events per checkpoint, sorted by `commit_date` | Shows whether the team is adopting agentic workflows (delegating subtasks to Task-spawned subagents) over time. Captures the transition from "AI assists me" to "I orchestrate AI agents" — a leading indicator of mature AI-native workflows. |

### Temporal Section

| # | Chart Name | Type | Library | Rating | Input Data | What it shows / why it matters |
|---|-----------|------|---------|:------:|------------|-------------------------------|
| 18 | **Commit Activity Timeline** | Scatter (time) | Chart.js | ⭐⭐⭐ | X: commit timestamp, Y: `agent_percentage`, color-coded by quality | Color-coded scatter of AI-quality over time — green ≥70%, amber 40–69%, red <40%. Turns weeks of data into an at-a-glance story of "is AI adoption trending up and holding up." The strongest exec-level chart in the dashboard. |
| 19 | **Checkpoint Cadence** | Bar | Chart.js | ⭐⭐ | Minutes between consecutive commits | Time gaps between consecutive checkpoints. Exposes work rhythm — whether the team ships in tight bursts, steady drips, or long gaps. Useful for spotting stalled work or unsustainable intensity. |
| 20 | **Attribution Trend (Rolling Avg)** | Line | lightweight-charts | ⭐⭐ | 3-checkpoint rolling average of `agent_percentage` | Smoothed 3-commit rolling average of AI attribution. Filters out day-to-day noise in #4 and makes the real long-term trend readable. |

---

## Implementation status summary

| Status | Count | Chart IDs |
|---|:-:|---|
| Implemented | 17 | 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 |
| Proposed — not yet implemented | 4 | 21, 22, 23, 24 |
| Candidate for merge or removal | 1 | 17 |

### Rating rollup

| Rating | Count | Chart IDs |
|---|:-:|---|
| ⭐⭐⭐ high signal | 11 | 4, 5, 9, 10, 12, 14, 18, 21, 22, 23, 24 |
| ⭐⭐ useful support | 9 | 6, 7, 8, 11, 13, 15, 16, 19, 20 |
| ⭐ limited standalone value | 1 | 17 |

### Notes on chart #14

Previously titled "BMAD Command Frequency" and wired specifically to a `bmad_commands` aggregation. Renamed to **Slash Command Frequency** and generalized to aggregate all slash commands (BMAD prefix, custom team prefixes, or any future workflow commands) extracted from `turns[].prompt_txt`. The underlying query should pattern-match prompts starting with `/` rather than filtering on a BMAD-specific prefix.

### Notes on the four new charts

Charts 21, 22, 23, 24 are the ones that most clearly demonstrate the power of the underlying Entire IO capture layer — they rely on structured `tool_use` events (Skill, Task, and the full tool-name distribution) plus attribution-field combinations that only become possible when agent hooks record every tool call, not just code-writing tool calls. All four use data Entire IO already writes; no additional developer action is required.
