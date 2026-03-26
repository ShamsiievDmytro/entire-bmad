# Deferred Work

## Deferred from: code review of 1-1-project-initialization-and-tooling-setup (2026-03-25)

- `ChartPoint.time` ms vs seconds ambiguity — `lightweight-charts` expects seconds, current type is raw `number`. Address when building chart components (story 3.x).
- `PriceTick.timestamp` has no documented unit (ms vs s). Clarify when building WebSocket normalization (story 2.x).
- `MarketData.change24h` unit is ambiguous (absolute USD vs percentage). Clarify when building market data service (story 3.x).
- `ConnectionStatus` has no `disconnected`/`error` terminal state for total data source failure. Address in resilience epic (story 4.x).
- `PriceTick.price` allows non-positive/non-finite values at the type level. Add runtime validation in normalization layer (story 2.x).
- `PriceTick.direction` union is compile-time only — no runtime guard. Add validation in normalization layer (story 2.x).
- `MarketData` does not validate `high24h >= low24h`. Add guard in market data service (story 3.x).
- `MarketData` `change24h` and `changePercent24h` signs are not validated for consistency. Add guard in market data service (story 3.x).
- ESLint config has no `@typescript-eslint` rules. Consider adding in a future tooling story.

## Deferred from: code review of 2-1-nano-stores-and-number-formatting-utilities (2026-03-25)

- `formatRange(low, high)` inverted range (low > high) produces wrong output silently — no guard or documentation; consider addressing when building chart/range display components.
- `Intl.NumberFormat` instances recreated on every formatter call — acknowledged as acceptable for v1; cache at module scope if profiling shows hot paths in later stories.
- Compact notation suffix reliability across runtimes (`T`/`B`/`M`) — output is consistent on Node.js v8 in practice but not guaranteed by spec; revisit if targeting non-v8 environments.
- Sub-cent values silently round to `$0.00` in `formatPrice` — inherent to `minimumFractionDigits: 2`; document if the project ever supports sub-cent crypto tokens.
- Epoch (0) and negative timestamps produce domain-incorrect but valid-looking output in `formatChartTooltip` — design question; add guard in WebSocket normalization layer if `timestamp` must be validated upstream (story 2.2).
- Compact notation boundary precision loss (e.g., `$999B` rounds to `$1.00T`) — inherent to `Intl` compact mode; acceptable for display but callers should not rely on exact tier boundaries.
- `Infinity`/`-Infinity` inputs produce `$∞` type strings with no guard — runtime validation should be added in the WebSocket normalization layer (story 2.2) rather than in pure display utilities.

## Deferred from: code review of 5-1-fetch-script-and-checkpoints-cache (2026-03-26)

- GitHub token sent to GitHub API paths sourced from tree response — paths are authenticated-user-controlled and filtered by regex before use; low practical risk.
- `extractBmadCommands` misses array-valued `content` blocks (Anthropic JSONL format) — beyond spec scope for current checkpoint data format; address if data format changes.
- `full.jsonl` fetched entirely into memory, not streamed — GitHub contents API has 1MB limit; acceptable for build-time script on ~20 checkpoints; revisit if checkpoint files grow large.
- `resolve('./')` resolves relative to CWD, not script location — npm scripts always run from project root; low practical risk; address if script needs to be run portably.

## Deferred from: code review of 5-2-ai-metrics-dashboard-page (2026-03-26)

- `DARK_CHART_OPTIONS` `legend.display: false` in base constant is misleading when several charts override it to `true` inline — design choice for v1; consider a factory function if overrides proliferate.
- `AiMetricsLayout.astro` duplicates background-color in both inline `style` and `bg-bg-base` Tailwind class — intentional fallback before CSS loads; divergence risk if design token changes.
- `toLocaleString()` on `cache.meta.generatedAt` uses no locale/timezone — output varies across users; acceptable for internal dashboard; fix if dashboard is ever shared externally.
- `AiMetricsLayout.astro` missing `<meta name="description">` and `<link rel="icon">` — out of scope for internal dashboard; add if page becomes public-facing.
- NaN timestamp propagation from invalid `commit_date` strings in chart data pipeline — git-sourced dates are reliable in practice; add validation layer if fetch script schema drifts.
- `cache.meta.checkpointCount` not validated against `cache.checkpoints.length` — fetch script maintains consistency; if header count ever diverges from chart count, add assertion in page frontmatter.
