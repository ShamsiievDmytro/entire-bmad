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
