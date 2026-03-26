# Story 5.2: AI Metrics Dashboard Page

Status: done

## Story

As Dmytro,
I want a scrollable single-page AI Metrics Dashboard at `/ai-metrics`,
So that I can present all 20 AI usage observability metrics from the checkpoints cache in a structured, well-styled dashboard that serves as a compelling demo for engineering leads.

## Acceptance Criteria

**Data source & page foundation**
1. **Given** the page loads **When** `src/data/checkpoints-cache.json` exists **Then** all 20 metric charts and cards render from the cache data without runtime errors (NFR12)
2. **Given** `checkpoints-cache.json` is absent **When** the Astro build runs **Then** the build guard from story 5-1 surfaces the actionable error message (already implemented — dev must not break this guard) (NFR13)
3. **Given** the page loads in dev mode with no cache **When** the page renders **Then** it shows a clear "cache missing" message with instructions to run `npm run fetch-checkpoints` instead of crashing (NFR11 + dev UX)
4. **Given** the page loads with a valid cache **When** the page first renders **Then** a data source credibility indicator displays: repo name (`ShamsiievDmytro/entire-bmad`), branch (`entire/checkpoints/v1`), checkpoint count, and `generatedAt` timestamp from `cache.meta` (FR30)

**Layout & structure**
5. **Given** a viewport ≥1024px **When** the page renders **Then** the chart grid displays 3 columns (FR31)
6. **Given** a viewport 768–1023px **When** the page renders **Then** the chart grid displays 2 columns (FR31)
7. **Given** a viewport <768px **When** the page renders **Then** the chart grid displays 1 column (FR31)
8. **Given** the page renders **When** a user scrolls **Then** all 20 metric charts/cards are on a single scrollable page with no client-side routing (FR29)
9. **Given** the page renders **When** the user reads section headings **Then** charts are grouped into 5 labelled domain sections: Attribution, Token Economics, Quality Signals, Behavioral/SDLC, Temporal (FR32)
10. **Given** any chart card **When** the user reads it **Then** it includes a title, a one-sentence description, and the source field(s) label (FR33)
11. **Given** any chart with no data **When** the page renders **Then** it displays a meaningful empty state (e.g., "No data available") instead of erroring or rendering a blank frame (NFR11)
12. **Given** all 20 charts **When** the page finishes loading **Then** all charts render within 500ms of DOMContentLoaded and there is no layout shift (CLS = 0) because all chart containers are pre-sized in the static HTML shell (NFR4, NFR6)

**Attribution domain (5 metrics)**
13. **Given** the Attribution section **When** it renders **Then** Metric 1 shows a time-series line chart of `agent_percentage` per checkpoint ordered chronologically by `commit_date` (FR9)
14. **Given** the Attribution section **When** it renders **Then** Metric 2 shows a stat card displaying the pure-AI commit rate: percentage of checkpoints where `agent_percentage === 100` (FR11)
15. **Given** the Attribution section **When** it renders **Then** Metric 3 shows a bar chart of human modification rate (`human_modified / agent_lines * 100`) per checkpoint (FR12)
16. **Given** the Attribution section **When** it renders **Then** Metric 4 shows a stacked bar chart per checkpoint with segments for `agent_lines`, `human_added`, `human_modified`, `human_removed` (FR10)
17. **Given** the Attribution section **When** it renders **Then** Metric 5 shows a stat card displaying the cumulative zero-human-touch line count: sum of `agent_lines` from checkpoints where `human_added === 0 && human_modified === 0 && human_removed === 0` (FR13)

**Token Economics domain (4 metrics)**
18. **Given** the Token Economics section **When** it renders **Then** Metric 6 shows a stacked bar chart of token breakdown per checkpoint: `tokens.input`, `tokens.cache_creation`, `tokens.cache_read`, `tokens.output` (FR14)
19. **Given** the Token Economics section **When** it renders **Then** Metric 7 shows a time-series line chart of cache leverage score (`tokens.cache_read / total_tokens`) per checkpoint, ordered by `commit_date` (FR15)
20. **Given** the Token Economics section **When** it renders **Then** Metric 8 shows a bar chart of API call count per checkpoint, computed as `checkpoint.turns.length` (FR16)
21. **Given** the Token Economics section **When** it renders **Then** Metric 9 shows a doughnut chart of model distribution: frequency of each unique `model` string across all turns across all checkpoints (FR17)

**Quality Signals domain (4 metrics)**
22. **Given** the Quality Signals section **When** it renders **Then** Metric 10 shows a bar chart of `summary.friction.length` per checkpoint (FR18)
23. **Given** the Quality Signals section **When** it renders **Then** Metric 11 shows a time-series line chart of `summary.open_items.length` per checkpoint ordered by `commit_date` (FR19)
24. **Given** the Quality Signals section **When** it renders **Then** Metric 12 shows a bar chart of learnings sum (`learnings.repo + learnings.code + learnings.workflow`) per checkpoint (FR20)
25. **Given** the Quality Signals section **When** it renders **Then** Metric 13 shows a scatter chart: for each checkpoint, one point at x = `turns.length` (session depth proxy) and y = `agent_percentage` (FR21)

**Behavioral/SDLC domain (4 metrics)**
26. **Given** the Behavioral section **When** it renders **Then** Metric 14 shows a horizontal bar chart of BMAD command frequency: all keys from `bmad_commands` across all checkpoints aggregated by command name, sorted descending by count (FR22)
27. **Given** the Behavioral section **When** it renders **Then** Metric 15 shows a doughnut chart classifying each turn's `prompt_txt`: `/`-prefixed → "Slash Command", empty string → "Continuation", otherwise → "Free-form" (FR23)
28. **Given** the Behavioral section **When** it renders **Then** Metric 16 shows a stacked bar chart of files touched per checkpoint, coloured by file layer: `components/` → Components, `services/` → Services, `stores/` → Stores, `utils/` → Utils, `*.md` or `docs/` → Docs, else → Other (FR24)
29. **Given** the Behavioral section **When** it renders **Then** Metric 17 shows a bar chart of unique session count per checkpoint (unique `session_id` values in `checkpoint.turns`) (FR25)

**Temporal domain (3 metrics)**
30. **Given** the Temporal section **When** it renders **Then** Metric 18 shows a scatter chart with checkpoints on a time axis (x = `commit_date` epoch), y = `agent_percentage`, and each point coloured by `agent_percentage` value (green ≥70%, amber 40–69%, red <40%) (FR26)
31. **Given** the Temporal section **When** it renders **Then** Metric 19 shows a bar chart of checkpoint cadence: time delta in minutes between consecutive `commit_date` values, sorted chronologically (FR27)
32. **Given** the Temporal section **When** it renders **Then** Metric 20 shows a time-series line chart of rolling average of `agent_percentage` (window size = 3) over all checkpoints ordered by `commit_date` (FR28)

---

## Tasks / Subtasks

- [x] Task 1: Install Chart.js and build page infrastructure (AC: 1–12)
  - [x] Install `chart.js@^4.4.0` as a project dependency: `npm install chart.js`
  - [x] Create `src/layouts/AiMetricsLayout.astro` — imports global.css + fonts, sets dark background, no WebSocket service initialisation; wider max-width (1280px), no grid (page-level grid is per section)
  - [x] Create `src/lib/utils/ai-metrics-utils.ts` — re-export `CheckpointMeta`, `CheckpointsCache` from `../../scripts/types`, plus compute helpers (see Dev Notes for all required functions)
  - [x] Create `src/pages/ai-metrics.astro` — load cache via `fs.readFileSync` (handles dev/build gracefully), render `AiMetricsLayout` with credibility indicator and 5 section components; show "cache missing" notice when cache is null
  - [x] Add data source credibility indicator in the page frontmatter area (repo, branch, checkpointCount, generatedAt) styled with `.card-glass` and `font-label`

- [x] Task 2: Attribution section (AC: 13–17)
  - [x] Create `src/components/AiAttributionSection.astro` — receives `checkpoints: CheckpointMeta[]` as prop
  - [x] Metric 1: lightweight-charts `LineSeries` time-series (commit dates → agent_percentage); use `CHART_COLORS` from `theme-constants`; container height 220px
  - [x] Metric 2: stat card — compute pure-AI rate % and display as large number with label
  - [x] Metric 3: Chart.js bar chart — human mod rate per checkpoint; container height 200px
  - [x] Metric 4: Chart.js stacked bar — 4 segments per checkpoint; container height 220px
  - [x] Metric 5: stat card — cumulative zero-human-touch lines

- [x] Task 3: Token Economics section (AC: 18–21)
  - [x] Create `src/components/AiTokenSection.astro` — receives `checkpoints: CheckpointMeta[]` as prop
  - [x] Metric 6: Chart.js stacked bar — 4 token segments; colours: input `#8b5cf6`, cache_creation `#00f5ff`, cache_read `#22c55e`, output `#f59e0b`; container height 220px
  - [x] Metric 7: lightweight-charts `LineSeries` time-series of cache leverage; container height 200px
  - [x] Metric 8: Chart.js bar — API call count = `turns.length`; container height 180px
  - [x] Metric 9: Chart.js doughnut — model distribution across all turns; container height 200px

- [x] Task 4: Quality Signals section (AC: 22–25)
  - [x] Create `src/components/AiQualitySection.astro` — receives `checkpoints: CheckpointMeta[]` as prop
  - [x] Metric 10: Chart.js bar — friction count per checkpoint; colour `#ef4444`; container height 180px
  - [x] Metric 11: lightweight-charts `LineSeries` time-series of open items; container height 200px
  - [x] Metric 12: Chart.js bar — learnings sum per checkpoint; colour `#22c55e`; container height 180px
  - [x] Metric 13: Chart.js scatter — x = `turns.length`, y = `checkpoint.agent_percentage`; container height 220px; point colour `#00f5ff`

- [x] Task 5: Behavioral/SDLC section (AC: 26–29)
  - [x] Create `src/components/AiBehavioralSection.astro` — receives `checkpoints: CheckpointMeta[]` as prop
  - [x] Metric 14: Chart.js horizontal bar (`indexAxis: 'y'`) — aggregated BMAD commands sorted descending; container height 220px
  - [x] Metric 15: Chart.js doughnut — prompt type distribution; colours: Slash `#00f5ff`, Free-form `#8b5cf6`, Continuation `#a0a0b0`; container height 200px
  - [x] Metric 16: Chart.js stacked bar — file layer counts per checkpoint; container height 220px
  - [x] Metric 17: Chart.js bar — unique session count per checkpoint; container height 180px

- [x] Task 6: Temporal section (AC: 30–32)
  - [x] Create `src/components/AiTemporalSection.astro` — receives `checkpoints: CheckpointMeta[]` as prop
  - [x] Metric 18: Chart.js scatter — x = commit_date epoch (ms), y = `agent_percentage`; per-point colours: `#22c55e` ≥70, `#f59e0b` 40–69, `#ef4444` <40; container height 220px; x-axis type `'time'` from `chart.js/auto`
  - [x] Metric 19: Chart.js bar — cadence in minutes between consecutive checkpoints; container height 180px
  - [x] Metric 20: lightweight-charts `LineSeries` time-series of rolling-average `agent_percentage` (window 3); container height 200px

- [x] Task 7: Data utilities and tests (AC: all)
  - [x] Implement the following functions in `src/lib/utils/ai-metrics-utils.ts` (see Dev Notes for signatures):
    - `computeRollingAverage(values: number[], window: number): number[]`
    - `classifyPromptType(promptTxt: string): 'Slash Command' | 'Free-form' | 'Continuation'`
    - `classifyFileLayer(filePath: string): 'components' | 'services' | 'stores' | 'utils' | 'docs' | 'other'`
    - `computeCheckpointCadenceMinutes(checkpoints: CheckpointMeta[]): number[]` — sorted by commit_date, returns deltas; first element is 0 (no predecessor)
    - `aggregateBmadCommands(checkpoints: CheckpointMeta[]): Array<{command: string, count: number}>` — sorted descending by count
    - `uniqueSessionCount(checkpoint: CheckpointMeta): number` — unique `session_id` values in `checkpoint.turns`
  - [x] Create `src/lib/utils/ai-metrics-utils.test.ts` with unit tests for every function above:
    - `computeRollingAverage`: window=3 on `[10, 20, 30, 40]` → `[10, 15, 20, 30]`
    - `classifyPromptType`: `/foo` → "Slash Command", `` → "Continuation", `explain this` → "Free-form"
    - `classifyFileLayer`: `src/components/Foo.astro` → "components", `docs/readme.md` → "docs", `config.json` → "other"
    - `computeCheckpointCadenceMinutes`: two dates 30 min apart → `[0, 30]`
    - `aggregateBmadCommands`: two checkpoints with overlapping commands → merged sorted result
    - `uniqueSessionCount`: turns with 2 unique session_ids → 2

- [x] Task 8: Run full test suite and validate (AC: all)
  - [x] Run `npm run test` — all tests must pass including new `ai-metrics-utils.test.ts`
  - [x] Run `npm run lint` on `src/` — no new errors
  - [x] Verify no JavaScript runtime errors in browser console by starting dev server and navigating to `/ai-metrics` (with a sample cache file or by checking static page renders correctly without cache)

---

## Dev Notes

### Technology Decisions

**Why Chart.js for non-time-series charts:**
- `lightweight-charts` is purpose-built for financial time-series only (LineSeries, AreaSeries, BarSeries); it does not support pie/doughnut, scatter with custom point colours, or horizontal bar charts
- `chart.js@4.x` covers all remaining chart types: bar, stacked bar, horizontal bar, doughnut, scatter
- Use `Chart.register(...registerables)` (register everything) — simpler than per-chart tree-shaking, and acceptable since we use ~8 of 10 chart types anyway
- Bundle: Chart.js ~58KB gzipped + existing lightweight-charts ~40KB ≈ 98KB total (within NFR5 150KB budget)

**Why fs.readFileSync over direct JSON import:**
- Direct `import data from '../data/checkpoints-cache.json'` would cause Vite to fail during `npm run dev` if the file is absent
- `fs.readFileSync` with `existsSync` guard handles both dev (missing → null → empty state) and build (missing → caught by build guard integration added in 5-1)
- The build guard integration already throws with a clear error message before the page frontmatter even runs

### Cache Loading Pattern (Critical)

```astro
---
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CheckpointsCache } from '../lib/utils/ai-metrics-utils';

const cachePath = resolve('./src/data/checkpoints-cache.json');
const cache: CheckpointsCache | null = existsSync(cachePath)
  ? (JSON.parse(readFileSync(cachePath, 'utf-8')) as CheckpointsCache)
  : null;

const checkpoints = cache?.checkpoints ?? [];
---
```

### Data Attribute Pattern (Critical — How to Pass Build-Time Data to Client Scripts)

Astro `<script>` blocks are ES modules bundled by Vite and run in the browser — they cannot read Astro frontmatter variables directly. `define:vars` works for inline scripts but blocks `import` statements. The correct pattern for static chart data:

**In the Astro component frontmatter:**
```astro
---
const labels = checkpoints.map(c => c.checkpoint_id.slice(0, 8));
const values = checkpoints.map(c => c.summary.friction.length);
---
<canvas
  id="metric-10"
  height="180"
  style="width:100%; display:block;"
  data-labels={JSON.stringify(labels)}
  data-values={JSON.stringify(values)}
></canvas>
<script>
  import { Chart, registerables } from 'chart.js';
  Chart.register(...registerables);

  const canvas = document.getElementById('metric-10') as HTMLCanvasElement | null;
  if (canvas) {
    const labels: string[] = JSON.parse(canvas.dataset.labels ?? '[]');
    const values: number[] = JSON.parse(canvas.dataset.values ?? '[]');
    new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: '#ef4444', borderRadius: 4 }] },
      options: { /* see Chart.js dark theme options below */ }
    });
  }
</script>
```

For section components that render multiple charts, each chart gets its own unique `id` and `data-*` attributes, and the `<script>` block selects all related canvases by ID.

### Chart.js Dark Theme Options (reuse across all Chart.js charts)

```typescript
const DARK_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false, labels: { color: '#a0a0b0', font: { family: 'Inter' } } },
    tooltip: { backgroundColor: '#12121a', titleColor: '#f0f0f0', bodyColor: '#a0a0b0', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#a0a0b0', font: { family: 'Inter', size: 11 } }, border: { display: false } },
    y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#a0a0b0', font: { family: 'Inter', size: 11 } }, border: { display: false } }
  }
} as const;
```

Merge this with per-chart options using spread (`{ ...DARK_CHART_OPTIONS, plugins: { ...DARK_CHART_OPTIONS.plugins, legend: { display: true } } }`). Define in `src/lib/utils/ai-metrics-utils.ts` and import in each section script.

### lightweight-charts v5 API (Static Data Pattern)

For the AI metrics page, charts are static (data set once at load, no live updates). Use `LineSeries` not `AreaSeries` for pure trend lines to reduce visual weight.

```typescript
import { createChart, LineSeries } from 'lightweight-charts';
import { CHART_COLORS } from '../lib/theme-constants';

const container = document.getElementById('metric-1') as HTMLDivElement;
const rawData: Array<{time: string, value: number}> = JSON.parse(container.dataset.series ?? '[]');

const chart = createChart(container, {
  layout: { background: { color: 'transparent' }, textColor: CHART_COLORS.textColor },
  grid: { vertLines: { color: CHART_COLORS.gridLinesColor }, horzLines: { color: CHART_COLORS.gridLinesColor } },
  rightPriceScale: { borderVisible: false },
  timeScale: { borderVisible: false, timeVisible: false },
  handleScroll: false,
  handleScale: false,
  autoSize: true,
});

const series = chart.addSeries(LineSeries, {
  color: CHART_COLORS.lineColor,
  lineWidth: 2,
  pointMarkersVisible: true,
});

// data must be [{time: unix_seconds_number, value: number}] sorted ascending
series.setData(rawData);
chart.timeScale().fitContent();
```

**Critical:** `lightweight-charts` expects `time` as **Unix timestamp in seconds** (integer), not milliseconds. Convert ISO date strings with: `Math.floor(new Date(commit_date).getTime() / 1000)`.

**Also critical:** Data passed to `setData()` MUST be sorted ascending by time. Sort checkpoints by `commit_date` before computing chart data.

Time series data shape for container data attribute:
```typescript
// Compute in Astro frontmatter
const sorted = [...checkpoints].sort((a, b) =>
  new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime()
);
const seriesData = sorted.map(c => ({
  time: Math.floor(new Date(c.commit_date).getTime() / 1000),
  value: c.agent_percentage,
}));
```

### Data Utility Functions (implement in ai-metrics-utils.ts)

```typescript
export function computeRollingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function classifyPromptType(promptTxt: string): 'Slash Command' | 'Free-form' | 'Continuation' {
  if (promptTxt === '') return 'Continuation';
  if (promptTxt.trim().startsWith('/')) return 'Slash Command';
  return 'Free-form';
}

export function classifyFileLayer(filePath: string): 'components' | 'services' | 'stores' | 'utils' | 'docs' | 'other' {
  if (filePath.includes('components/')) return 'components';
  if (filePath.includes('services/')) return 'services';
  if (filePath.includes('stores/')) return 'stores';
  if (filePath.includes('utils/')) return 'utils';
  if (filePath.includes('docs/') || filePath.endsWith('.md')) return 'docs';
  return 'other';
}

export function computeCheckpointCadenceMinutes(checkpoints: CheckpointMeta[]): number[] {
  const sorted = [...checkpoints].sort(
    (a, b) => new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime()
  );
  return sorted.map((c, i) => {
    if (i === 0) return 0;
    const prev = new Date(sorted[i - 1].commit_date).getTime();
    const curr = new Date(c.commit_date).getTime();
    return Math.round((curr - prev) / 60_000);
  });
}

export function aggregateBmadCommands(checkpoints: CheckpointMeta[]): Array<{command: string, count: number}> {
  const map = new Map<string, number>();
  for (const cp of checkpoints) {
    for (const [cmd, count] of Object.entries(cp.bmad_commands)) {
      map.set(cmd, (map.get(cmd) ?? 0) + count);
    }
  }
  return [...map.entries()]
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count);
}

export function uniqueSessionCount(checkpoint: CheckpointMeta): number {
  return new Set(checkpoint.turns.map(t => t.session_id)).size;
}
```

Re-export types at the top:
```typescript
export type { CheckpointMeta, CheckpointsCache, TurnMeta } from '../../scripts/types';
```

### Metric-specific clarifications

**Metric 8 — API call count:** The `CheckpointMeta` schema does not have an `api_calls` field. Use `checkpoint.turns.length` as the proxy for API call count (each turn = one API call).

**Metric 13 — Session depth:** Scatter x = `checkpoint.turns.length` (API calls for that checkpoint), y = `checkpoint.agent_percentage`. Each point is one checkpoint. Not a per-turn scatter.

**Metric 17 — Checkpoints per session:** Use `uniqueSessionCount(checkpoint)` as the y value per checkpoint. This shows how many distinct sessions were involved in each checkpoint.

**Metric 18 — Commit activity timeline:** Use Chart.js scatter (not lightweight-charts) because per-point colour is required. Set `type: 'scatter'`, pass each checkpoint as `{x: new Date(commit_date).getTime(), y: agent_percentage}`. Use `chart.js/auto` import to enable built-in time scale support (type `'time'` on x-axis), or alternatively use a linear x-axis with pre-computed numeric timestamps. The simpler approach (no `chart.js/auto`): use a linear x-axis with timestamps in ms, and format tick labels manually.

**Metric 20 — Attribution trend:** Sort checkpoints by `commit_date`, apply `computeRollingAverage` (window=3) to `agent_percentage` array, then pair with timestamps for lightweight-charts.

### AiMetricsLayout.astro Difference from Layout.astro

The main `Layout.astro` initialises WebSocket and MarketData services in its `<script>` block. `AiMetricsLayout.astro` must NOT include those services. It should:
- Import the same `global.css` and font imports as Layout.astro
- Set `<html lang="en" style="background-color: #0a0a0f" class="bg-bg-base">`
- Use a wider container: `max-w-[1280px]` with `px-4 sm:px-6 lg:px-8`
- Use `<slot />` for page content
- Set `<title>AI Metrics — Metrics</title>`
- No `<script>` block (no services)

### Page Grid Structure

The responsive 3/2/1 column grid lives in `ai-metrics.astro`, not in section components:
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- section cards slot in here -->
</div>
```

Each section component renders its cards as `<div class="card-glass p-4">` — the grid columns are controlled by the parent page grid. Large charts that should span 2 columns get `class="md:col-span-2"` or `class="lg:col-span-2"`.

Recommended column spans per metric:
- Stat cards (metrics 2, 5): 1 col
- Small bars/pies (metrics 8, 9, 10, 12, 17): 1 col
- Medium charts (metrics 3, 7, 11, 14, 15, 19): 1 col
- Wide charts (metrics 1, 4, 6, 13, 16, 18, 20): `md:col-span-2` or `lg:col-span-2`
- Metric 14 (horizontal bar): `lg:col-span-2` (many labels need width)

### File Structure

New files to create:
```
src/
├── layouts/
│   └── AiMetricsLayout.astro       (new)
├── pages/
│   └── ai-metrics.astro            (new — loads cache, renders sections)
├── components/
│   ├── AiAttributionSection.astro  (new — metrics 1–5)
│   ├── AiTokenSection.astro        (new — metrics 6–9)
│   ├── AiQualitySection.astro      (new — metrics 10–13)
│   ├── AiBehavioralSection.astro   (new — metrics 14–17)
│   └── AiTemporalSection.astro     (new — metrics 18–20)
└── lib/
    └── utils/
        ├── ai-metrics-utils.ts      (new — types re-export + compute helpers)
        └── ai-metrics-utils.test.ts (new — unit tests)
```

Do NOT add subdirectories inside `src/components/` (architecture mandate). All 5 section components sit flat in `src/components/`.

### Existing Code Reuse

- `CHART_COLORS`, `PRICE_COLORS` from `src/lib/theme-constants.ts` — use for lightweight-charts colour values
- `.card-glass` CSS composition from `src/styles/global.css` — use for all metric cards
- `font-label`, `font-price`, `text-text-secondary`, `text-text-muted` Tailwind tokens — use for titles and descriptions
- The existing `Layout.astro` and its content structure are left unchanged — this is an additive change

### Anti-Patterns to Avoid

- Do NOT import `connection-manager.ts`, `market-data-service.ts`, or any store in the AI metrics page — this page has no live data
- Do NOT use `setInterval` or `store.subscribe()` — all data is static from the cache
- Do NOT add loading spinners — empty state cards (visible with no data) are the loading state (matches existing UX pattern)
- Do NOT create barrel files in `src/lib/utils/` — import from `ai-metrics-utils` directly
- Do NOT use `global.css` `@apply` compositions beyond the existing 3 (`.card-glass`, `.price-text`, `.status-badge`) — architecture mandates max 3

### Running Tests

```bash
npm run test                # Vitest — includes src/**/*.test.ts (will pick up ai-metrics-utils.test.ts)
npm run lint                # ESLint on src/
npm run dev                 # Dev server — navigate to /ai-metrics (cache absent → shows notice)
npm run fetch-checkpoints   # Populates src/data/checkpoints-cache.json
```

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- ESLint config did not support TypeScript in Astro frontmatter/script blocks (pre-existing issue affecting ChartCard.astro and PriceCard.astro). Fixed by installing `@typescript-eslint/parser` as devDependency and configuring `eslint.config.js` to use it for `.astro` files. This resolved all 13 lint errors (2 pre-existing + 11 new).
- `import type` path for `ai-metrics-utils.ts` corrected to `../../../scripts/types` (3 levels up from `src/lib/utils/`; story Dev Notes had a typo with 2 levels).
- `computeCheckpointCadenceMinutes` already returns values in sorted commit_date order; removed redundant dead-code computation in `AiTemporalSection.astro`.

### Completion Notes List

- All 20 metric charts/cards implemented across 5 domain sections, following the data-attribute pattern from Dev Notes.
- Chart.js 4.4.x used for bar, stacked bar, horizontal bar, doughnut, and scatter charts. lightweight-charts v5 used for time-series line charts (metrics 1, 7, 11, 20).
- All chart containers pre-sized with explicit `style="height:Xpx"` (divs) or wrapper divs (canvas) to ensure CLS = 0.
- Empty state handled client-side in each script block: if data array is empty, canvas/container is replaced with "No data available" text.
- Credibility indicator shows repo, branch, checkpointCount, and generatedAt from `cache.meta`.
- Build guard from story 5-1 confirmed intact: `npm run build` fires the expected error when cache is absent.
- 148 tests pass (8 test files); 36 new tests added in `ai-metrics-utils.test.ts`.
- ESLint: 0 errors after TypeScript parser fix.
- Metric 18 scatter x-axis uses linear scale with ms timestamps and `toLocaleDateString` tick formatter (avoids `chart.js/auto` time scale which requires date-fns adapter).

### File List

- `src/layouts/AiMetricsLayout.astro` — new
- `src/pages/ai-metrics.astro` — new
- `src/components/AiAttributionSection.astro` — new
- `src/components/AiTokenSection.astro` — new
- `src/components/AiQualitySection.astro` — new
- `src/components/AiBehavioralSection.astro` — new
- `src/components/AiTemporalSection.astro` — new
- `src/lib/utils/ai-metrics-utils.ts` — new
- `src/lib/utils/ai-metrics-utils.test.ts` — new
- `eslint.config.js` — modified (added @typescript-eslint/parser for Astro TS support)
- `package.json` — modified (added chart.js, @typescript-eslint/parser)
- `package-lock.json` — modified
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (status: in-progress)

### Change Log

- 2026-03-26: Implemented story 5-2 — AI Metrics Dashboard page with 20 charts across 5 domain sections (Attribution, Token Economics, Quality Signals, Behavioral/SDLC, Temporal). Added utility functions, unit tests, layout, page, and 5 section components. Fixed ESLint TypeScript parser configuration.

---

### Review Findings

- [x] [Review][Decision] Metric 3 denominator distortion: `Math.max(agent_lines, 1)` used as denominator guard — when `agent_lines === 0`, produces a non-zero rate against a phantom denominator of 1 instead of treating the data point as undefined. Violates AC15 / FR12. Fix options: (a) show no-data empty state for that bar, or (b) keep guard but cap displayed value at a sentinel and add a tooltip note. [`AiAttributionSection.astro:27`]
- [x] [Review][Decision] Metric 19 cadence: `computeCheckpointCadenceMinutes` returns N values with first element = 0, pairing a meaningless 0-min bar with the first checkpoint label. Dev Notes explicitly spec'd `first element is 0 (no predecessor)`, but AC31 / FR27 defines cadence as time delta between consecutive checkpoints (N−1 intervals). Decision: keep the zero placeholder bar, or strip index 0 from both `cadenceValues` and `cadenceLabels` before rendering? [`ai-metrics-utils.ts:61-62`, `AiTemporalSection.astro:24-26`]
- [x] [Review][Patch] Malformed JSON cache crashes entire build/SSR — `JSON.parse(readFileSync(...))` has no try/catch; a truncated or corrupt cache file throws unhandled `SyntaxError` [`src/pages/ai-metrics.astro:14`]
- [x] [Review][Patch] Duplicate Unix-second timestamps crash all lightweight-charts instances — `Math.floor(getTime()/1000)` collapses sub-second-apart checkpoints to same integer; `series.setData()` throws on non-strictly-ascending times; no deduplication step before any of the 4 `setData()` calls [`AiAttributionSection.astro` (m1), `AiTokenSection.astro` (m7), `AiQualitySection.astro` (m11), `AiTemporalSection.astro` (m20)]
- [x] [Review][Patch] `style="..."` literal in no-data innerHTML fallback — placeholder string `style="..."` is invalid CSS; fallback text likely invisible against dark background [`AiAttributionSection.astro` script, m3/m4 empty-state branches]
- [x] [Review][Patch] `null`/`undefined` `prompt_txt` causes build-time TypeError — `classifyPromptType(null)` passes `=== ''` check, then `.trim()` throws; schema drift from the fetch script could crash component render [`AiBehavioralSection.astro:29`]
- [x] [Review][Patch] DOUGHNUT_COLORS capped at 6 entries — more than 6 distinct model names leave extra doughnut segments with `undefined` backgroundColor (transparent/grey) with no fallback cycle [`AiTokenSection.astro:51`]
- [x] [Review][Patch] cadenceLabels and cadenceValues sorted in separate passes — when any two checkpoints share identical `commit_date`, unstable sort may produce different orderings, causing label/value index mismatch [`AiTemporalSection.astro:24-25`]
- [x] [Review][Patch] `aggregateBmadCommands` test assertion is vacuous — expected value constructed and sorted inline with the same comparator; should be a hardcoded literal [`src/lib/utils/ai-metrics-utils.test.ts`]
- [x] [Review][Patch] Inter missing font weights 500 and 600 — `AiMetricsLayout.astro` only imports `@fontsource/inter/400.css`; `font-medium` and `font-semibold` classes require 500 and 600 weights; browser will synthesize bold, degrading typography [`src/layouts/AiMetricsLayout.astro:4`]
- [x] [Review][Patch] `classifyFileLayer` misclassifies paths under `docs/components/` — `components/` is checked before `docs/`; a path like `docs/components/Foo.ts` is classified as `components` instead of `docs` [`src/lib/utils/ai-metrics-utils.ts:49-53`]
- [x] [Review][Patch] `computeRollingAverage` no guard for `window <= 0` — produces `NaN` for all output values; exported function has no validation; only called with hardcoded `3` today but guard should be added [`src/lib/utils/ai-metrics-utils.ts:32-38`]
- [x] [Review][Patch] `parentElement!` non-null assertion without guard — all empty-state innerHTML fallbacks across section scripts use `canvas.parentElement!.innerHTML = ...` without checking parentElement existence; safe today but brittle [`all section script blocks`]
- [x] [Review][Patch] Typo: `dsStyeld` should be `dsStyled` [`src/components/AiAttributionSection.astro` script]
- [x] [Review][Patch] Whitespace-only `prompt_txt` misclassified as Free-form — `'   ' !== ''` bypasses Continuation branch; whitespace-only strings are semantically empty [`src/lib/utils/ai-metrics-utils.ts:41`]
- [x] [Review][Patch] `cache.meta.generatedAt` invalid date string renders "Invalid Date" in page header — no validity check before `toLocaleString()` [`src/pages/ai-metrics.astro:51`]
- [x] [Review][Defer] `resolve('./')` CWD-relative path — already deferred from 5-1 review; npm scripts always run from project root [`src/pages/ai-metrics.astro:12`] — deferred, pre-existing
- [x] [Review][Defer] `DARK_CHART_OPTIONS` `legend.display: false` in base constant is misleading when several charts override it to `true` — design choice; acceptable for v1 [`src/lib/utils/ai-metrics-utils.ts:9`] — deferred, pre-existing
- [x] [Review][Defer] `AiMetricsLayout.astro` duplicates background-color in both inline `style` and `bg-bg-base` Tailwind class — intentional fallback before CSS loads [`src/layouts/AiMetricsLayout.astro:9`] — deferred, pre-existing
- [x] [Review][Defer] `toLocaleString()` with no locale/timezone on `generatedAt` — inconsistent across users; acceptable for internal dashboard [`src/pages/ai-metrics.astro:51`] — deferred, pre-existing
- [x] [Review][Defer] `AiMetricsLayout.astro` missing `<meta name="description">` and `<link rel="icon">` — out of scope for internal dashboard [`src/layouts/AiMetricsLayout.astro`] — deferred, pre-existing
- [x] [Review][Defer] NaN timestamp propagation from invalid `commit_date` strings — git-sourced dates are reliable in practice; add validation if schema drift becomes a concern [`ai-metrics-utils.ts:59,63`, `AiTemporalSection.astro:17`] — deferred, pre-existing
- [x] [Review][Defer] `cache.meta.checkpointCount` not validated against `cache.checkpoints.length` — fetch script maintains consistency; stale meta value would cause header/chart count mismatch [`src/pages/ai-metrics.astro:46`] — deferred, pre-existing
