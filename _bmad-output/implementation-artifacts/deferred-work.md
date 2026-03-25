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
