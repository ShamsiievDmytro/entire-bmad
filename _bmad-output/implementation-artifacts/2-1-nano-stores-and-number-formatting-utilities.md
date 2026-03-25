# Story 2.1: Nano Stores & Number Formatting Utilities

Status: ready-for-dev

## Story

As a developer,
I want reactive stores and consistent number formatting helpers in place,
So that all components share a single source of truth for data and display values identically.

## Acceptance Criteria

1. `src/lib/stores/price-store.ts` exports `priceStore` as `atom<PriceTick | null>(null)`
2. `src/lib/stores/status-store.ts` exports `statusStore` as `atom<ConnectionStatus>('connecting')`
3. `src/lib/stores/market-store.ts` exports `marketStore` as `atom<MarketData | null>(null)`
4. `src/lib/stores/chart-store.ts` exports `chartStore` as `atom<ChartPoint[]>([])`
5. Every store is typed with explicit generics and initializes to `null` or empty (never undefined)
6. `src/lib/utils/format-utils.ts` exports: `formatPrice()` -> `$68,432.17`, `formatPercent()` -> `+2.3%` or `-1.8%`, `formatAbsoluteChange()` -> `+$1,534.22`, `formatMarketCap()` -> `$1.34T`, `formatRange()` -> `$66.9k -- $68.9k`, `formatChartTooltip()` -> `$68,432.17 at 14:30`
7. All formatters use `Intl.NumberFormat` as the base -- no manual string building
8. `format-utils.test.ts` covers all formatters with positive, negative, zero, and edge cases
9. Tests pass via `npm run test`

## Tasks / Subtasks

- [ ] Task 1: Create price store (AC: #1, #5)
  - [ ] Create `src/lib/stores/price-store.ts`
  - [ ] Export `priceStore` as `atom<PriceTick | null>(null)`
  - [ ] Import `atom` from `nanostores` and `PriceTick` type from `../types`

- [ ] Task 2: Create status store (AC: #2, #5)
  - [ ] Create `src/lib/stores/status-store.ts`
  - [ ] Export `statusStore` as `atom<ConnectionStatus>('connecting')`
  - [ ] Import `atom` from `nanostores` and `ConnectionStatus` type from `../types`

- [ ] Task 3: Create market store (AC: #3, #5)
  - [ ] Create `src/lib/stores/market-store.ts`
  - [ ] Export `marketStore` as `atom<MarketData | null>(null)`
  - [ ] Import `atom` from `nanostores` and `MarketData` type from `../types`

- [ ] Task 4: Create chart store (AC: #4, #5)
  - [ ] Create `src/lib/stores/chart-store.ts`
  - [ ] Export `chartStore` as `atom<ChartPoint[]>([])`
  - [ ] Import `atom` from `nanostores` and `ChartPoint` type from `../types`

- [ ] Task 5: Implement formatPrice (AC: #6, #7)
  - [ ] Create `src/lib/utils/format-utils.ts`
  - [ ] Implement `formatPrice(price: number): string` returning `$68,432.17` format
  - [ ] Use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })`

- [ ] Task 6: Implement formatPercent (AC: #6, #7)
  - [ ] Implement `formatPercent(value: number): string` returning `+2.3%` or `-1.8%`
  - [ ] Use `Intl.NumberFormat` with `signDisplay: 'always'`, 1 decimal place

- [ ] Task 7: Implement formatAbsoluteChange (AC: #6, #7)
  - [ ] Implement `formatAbsoluteChange(value: number): string` returning `+$1,534.22` or `-$892.40`
  - [ ] Use `Intl.NumberFormat` with `signDisplay: 'always'`, USD currency, 2 decimal places

- [ ] Task 8: Implement formatMarketCap (AC: #6, #7)
  - [ ] Implement `formatMarketCap(value: number): string` returning `$1.34T` or `$892.45B`
  - [ ] Use `Intl.NumberFormat` with `notation: 'compact'`, USD currency, 2 decimal places

- [ ] Task 9: Implement formatRange (AC: #6, #7)
  - [ ] Implement `formatRange(low: number, high: number): string` returning `$66.9k -- $68.9k`
  - [ ] Use `Intl.NumberFormat` with `notation: 'compact'`, USD currency, 1 decimal place
  - [ ] Join low and high with ` — ` (em dash)

- [ ] Task 10: Implement formatChartTooltip (AC: #6, #7)
  - [ ] Implement `formatChartTooltip(price: number, timestamp: number): string` returning `$68,432.17 at 14:30`
  - [ ] Combine `formatPrice()` output with time formatted via `Intl.DateTimeFormat` (24h, hour+minute only)

- [ ] Task 11: Write unit tests (AC: #8, #9)
  - [ ] Create `src/lib/utils/format-utils.test.ts`
  - [ ] Test `formatPrice` with normal value, zero, large number, small decimal
  - [ ] Test `formatPercent` with positive, negative, zero
  - [ ] Test `formatAbsoluteChange` with positive, negative, zero
  - [ ] Test `formatMarketCap` with trillions, billions, millions
  - [ ] Test `formatRange` with normal range, equal values
  - [ ] Test `formatChartTooltip` with normal timestamp
  - [ ] Test edge cases: NaN, Infinity, negative prices
  - [ ] Run `npm run test` to verify all pass

## Dev Notes

### Store Files -- Exact Code

Each store file follows the identical pattern from architecture.md. Create these four files:

**`src/lib/stores/price-store.ts`**
```typescript
import { atom } from 'nanostores';
import type { PriceTick } from '../types';

export const priceStore = atom<PriceTick | null>(null);
```

**`src/lib/stores/status-store.ts`**
```typescript
import { atom } from 'nanostores';
import type { ConnectionStatus } from '../types';

export const statusStore = atom<ConnectionStatus>('connecting');
```

**`src/lib/stores/market-store.ts`**
```typescript
import { atom } from 'nanostores';
import type { MarketData } from '../types';

export const marketStore = atom<MarketData | null>(null);
```

**`src/lib/stores/chart-store.ts`**
```typescript
import { atom } from 'nanostores';
import type { ChartPoint } from '../types';

export const chartStore = atom<ChartPoint[]>([]);
```

**Key rules:**
- Import `atom` from `'nanostores'` (NOT `@nanostores/core` or any other path)
- Import types using `import type` syntax
- Use relative path `'../types'` (stores are in `src/lib/stores/`, types is at `src/lib/types.ts`)
- Always use explicit generic on `atom<T>()` -- never let TypeScript infer the type
- `null` initial value for stores that have no data yet (price, market); empty array for chart; `'connecting'` as meaningful default for status
- One store per file, one export per file
- No barrel file (`stores/index.ts`) -- consumers import directly from each store file

### Format Utilities -- Exact Code

**File: `src/lib/utils/format-utils.ts`**

```typescript
/**
 * Format a price as USD with 2 decimal places.
 * Example: 68432.17 → "$68,432.17"
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Format a percentage with sign and 1 decimal place.
 * Example: 2.3 → "+2.3%", -1.8 → "-1.8%"
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format(value / 100);
}

/**
 * Format an absolute USD change with sign.
 * Example: 1534.22 → "+$1,534.22", -892.40 → "-$892.40"
 */
export function formatAbsoluteChange(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  }).format(value);
}

/**
 * Format market cap with compact notation.
 * Example: 1340000000000 → "$1.34T", 892450000000 → "$892.45B"
 */
export function formatMarketCap(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a price range with compact notation.
 * Example: (66900, 68900) → "$66.9K — $68.9K"
 *
 * Note: Intl.NumberFormat compact notation capitalizes the suffix (K, M, B, T).
 * The architecture spec shows lowercase "k" but Intl produces uppercase "K".
 * Using Intl output as-is to avoid manual string manipulation (per AC #7).
 */
export function formatRange(low: number, high: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${formatter.format(low)} — ${formatter.format(high)}`;
}

/**
 * Format a chart tooltip with price and time.
 * Example: (68432.17, 1711972200000) → "$68,432.17 at 14:30"
 */
export function formatChartTooltip(price: number, timestamp: number): string {
  const formattedPrice = formatPrice(price);
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
  return `${formattedPrice} at ${formattedTime}`;
}
```

**Implementation notes:**
- `formatPercent` divides by 100 because `Intl.NumberFormat` with `style: 'percent'` multiplies the input by 100. The input `value` is already a percentage (e.g., `2.3` means 2.3%), so divide by 100 to get the correct output.
- `formatRange` uses em dash ` — ` as separator per UX spec.
- `formatChartTooltip` uses 24-hour time format with `hour12: false` per UX spec ("14:30").
- All functions are pure -- no side effects, no store access, no DOM interaction.
- Each function creates a new `Intl.NumberFormat` instance. For v1, this is acceptable. If profiling shows hot paths, instances can be cached at module scope later.

### Test File -- Exact Code

**File: `src/lib/utils/format-utils.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatPercent,
  formatAbsoluteChange,
  formatMarketCap,
  formatRange,
  formatChartTooltip,
} from './format-utils';

describe('formatPrice', () => {
  it('formats a normal price', () => {
    expect(formatPrice(68432.17)).toBe('$68,432.17');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('formats a large price', () => {
    expect(formatPrice(100000)).toBe('$100,000.00');
  });

  it('formats a small decimal', () => {
    expect(formatPrice(0.5)).toBe('$0.50');
  });

  it('handles NaN', () => {
    expect(formatPrice(NaN)).toBe('NaN');
  });
});

describe('formatPercent', () => {
  it('formats a positive percentage', () => {
    expect(formatPercent(2.3)).toBe('+2.3%');
  });

  it('formats a negative percentage', () => {
    expect(formatPercent(-1.8)).toBe('-1.8%');
  });

  it('formats zero', () => {
    // Intl may format zero as "+0.0%" or "0.0%" depending on signDisplay behavior
    const result = formatPercent(0);
    expect(result).toMatch(/0\.0%/);
  });

  it('formats a large percentage', () => {
    expect(formatPercent(15.7)).toBe('+15.7%');
  });
});

describe('formatAbsoluteChange', () => {
  it('formats a positive change', () => {
    expect(formatAbsoluteChange(1534.22)).toBe('+$1,534.22');
  });

  it('formats a negative change', () => {
    expect(formatAbsoluteChange(-892.4)).toBe('-$892.40');
  });

  it('formats zero', () => {
    const result = formatAbsoluteChange(0);
    expect(result).toMatch(/\$0\.00/);
  });
});

describe('formatMarketCap', () => {
  it('formats trillions', () => {
    expect(formatMarketCap(1340000000000)).toBe('$1.34T');
  });

  it('formats billions', () => {
    expect(formatMarketCap(892450000000)).toBe('$892.45B');
  });

  it('formats millions', () => {
    expect(formatMarketCap(5670000)).toBe('$5.67M');
  });

  it('formats zero', () => {
    expect(formatMarketCap(0)).toBe('$0.00');
  });
});

describe('formatRange', () => {
  it('formats a normal range', () => {
    const result = formatRange(66900, 68900);
    // Intl compact notation uses uppercase K
    expect(result).toContain('—');
    expect(result).toMatch(/\$66\.9K?\s*—\s*\$68\.9K?/i);
  });

  it('formats equal values', () => {
    const result = formatRange(68000, 68000);
    expect(result).toContain('—');
  });
});

describe('formatChartTooltip', () => {
  it('formats price and time', () => {
    // Create a known timestamp: 14:30 UTC
    const date = new Date('2024-04-01T14:30:00Z');
    const result = formatChartTooltip(68432.17, date.getTime());
    expect(result).toContain('$68,432.17');
    expect(result).toContain('at');
    // Time will vary by timezone in test environment, so just check format
    expect(result).toMatch(/\$68,432\.17 at \d{2}:\d{2}/);
  });
});
```

**Test notes:**
- The NaN test for `formatPrice` checks that it returns the string `'NaN'` -- this is `Intl.NumberFormat`'s default behavior. The dev agent should verify this in the Node.js version being used and adjust the assertion if needed.
- The zero-with-sign tests use `toMatch` rather than exact equality because `signDisplay: 'always'` behavior for zero can vary between JS engines (may produce `+$0.00` or `$0.00`).
- The `formatRange` test uses a case-insensitive regex because compact notation suffix casing may differ.
- The `formatChartTooltip` time test is timezone-aware: the displayed time depends on the local timezone of the test runner. The regex pattern `\d{2}:\d{2}` validates the format without asserting a specific time.

### Import Patterns

Components and services will import stores and formatters as follows (for reference in future stories):

```typescript
// Store imports (from a component or service)
import { priceStore } from '../lib/stores/price-store';
import { statusStore } from '../lib/stores/status-store';
import { marketStore } from '../lib/stores/market-store';
import { chartStore } from '../lib/stores/chart-store';

// Formatter imports (from a component)
import { formatPrice, formatPercent, formatAbsoluteChange } from '../lib/utils/format-utils';

// Type imports
import type { PriceTick } from '../lib/types';
```

### Anti-Patterns (DO NOT)

- **No barrel files** -- do NOT create `src/lib/stores/index.ts` or `src/lib/utils/index.ts`. Import directly from each module.
- **No setInterval** -- not relevant to this story, but never use it in the project. Use recursive `setTimeout` for polling.
- **No store writes from components** -- stores are written to ONLY by services (Story 2.2+). This story only creates stores; writing happens in later stories.
- **No manual string formatting** -- never use `toFixed()`, string concatenation, or template literals to format numbers for display. Always use `Intl.NumberFormat`.
- **No derived data in stores** -- do not store formatted strings. Stores hold raw numbers; formatting happens at the component level via `format-utils.ts`.
- **No default objects as initial store values** -- use `null` for "no data yet" (not `{ price: 0, timestamp: 0, direction: 'neutral' }`).

### Previous Story Intelligence

From Story 1.1 (done):
- Project uses Astro 6.0.8, Node 25.8.1, TypeScript strict mode
- `nanostores` v1.2.0 is installed as a production dependency (verified in `package.json`)
- Directory structure already exists: `src/lib/stores/`, `src/lib/utils/` (created with `.gitkeep` files)
- `src/lib/types.ts` already defines all four interfaces: `PriceTick`, `MarketData`, `ChartPoint`, `ConnectionStatus`
- Vitest v4.1.1 configured, `npm run test` runs tests matching `src/**/*.test.ts`
- ESLint and Prettier are configured
- `ConnectionStatus` is exported as a `type` alias (not `interface`) -- this is acceptable per Story 1.1 review

Deferred items from Story 1.1 review relevant to this story:
- `PriceTick.timestamp` has no unit documented -- treat as milliseconds (Unix epoch ms from `Date.now()`)
- `PriceTick.price` allows non-positive/non-finite values -- formatters should handle gracefully (NaN, Infinity edge cases)
- `MarketData.change24h` unit is absolute USD value (not percentage) -- `changePercent24h` is the percentage field

### Files to Create

| File | Type | Purpose |
|---|---|---|
| `src/lib/stores/price-store.ts` | New | Reactive store for current price tick |
| `src/lib/stores/status-store.ts` | New | Reactive store for connection status |
| `src/lib/stores/market-store.ts` | New | Reactive store for market data |
| `src/lib/stores/chart-store.ts` | New | Reactive store for chart data points |
| `src/lib/utils/format-utils.ts` | New | Number formatting utility functions |
| `src/lib/utils/format-utils.test.ts` | New | Unit tests for all formatters |

**Files NOT to modify:** No existing files need changes. The `.gitkeep` files in `stores/` and `utils/` can be removed once real files are added.

### References

- [Source: architecture.md#Store Patterns] -- Nano Store conventions, `atom<Type | null>(null)` pattern, explicit generics rule
- [Source: architecture.md#Format Patterns] -- all formatter specifications, `Intl.NumberFormat` rule, direction indicator symbols
- [Source: architecture.md#Naming Patterns] -- kebab-case for TypeScript modules, camelCase for variables/functions, `Store` suffix convention
- [Source: architecture.md#Structure Patterns] -- file locations, one store per file, co-located tests
- [Source: architecture.md#Enforcement Guidelines] -- anti-patterns (no barrel files, no inline formatting, no derived store data)
- [Source: epics.md#Story 2.1] -- acceptance criteria
- [Source: epics.md#Epic 2] -- epic context: Live Bitcoin Price Display
- [Source: ux-design-specification.md#Typography] -- type scale for values (48px price, 20-24px values)
- [Source: prd.md#FR1-FR5] -- price display requirements
- [Source: 1-1-project-initialization-and-tooling-setup.md] -- established project patterns, installed dependencies, deferred review items
