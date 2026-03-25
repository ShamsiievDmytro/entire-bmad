# Story 4.3: Status Indicator & Stale Data Badge

Status: ready-for-dev

## Story

As a user,
I want to see a subtle connection status indicator and know when displayed data may be outdated,
so that I can trust the data when it's live and be aware when it's stale.

## Acceptance Criteria

1. **Status Indicator position and styling** — The indicator displays at the bottom center of the viewport as a 6px colored dot + text at 11px `text-muted` (UX-DR7).
2. **Live state** — Green dot (`status-live` #22c55e) + "Live" text. Barely visible, quiet good state.
3. **Reconnecting state** — Amber dot (`status-reconnecting` #f59e0b) + "Reconnecting..." text. Dot pulses with animation (1.5s ease-in-out cycle, opacity 0.4-1.0) (FR14).
4. **Stale state** — Red dot (`status-stale` #ef4444) + "Connection lost" text. Static, no animation.
5. **Fallback state** — Green dot (`status-live`) + "Live — CoinCap" text.
6. **State transitions** — All state changes fade over 300ms ease-in-out. No abrupt switches.
7. **Stale badge on PriceCard** — When `statusStore` is `'stale'`, a "Stale" badge appears on the Price Card in `status-stale` color (FR15). The badge does NOT hide or replace the price value — it is additive.
8. **Stale badge removal** — When connection restores and a new price tick arrives, the stale badge fades out over 300ms.
9. **prefers-reduced-motion** — Instant transitions (0ms), no pulsing animation. All durations set to 0.
10. **Accessibility** — `<div role="status" aria-live="polite">` so screen readers announce state changes (UX-DR12).

## Tasks / Subtasks

- [ ] Task 1: Implement StatusIndicator.astro as a hydrated island (AC: #1, #2, #3, #4, #5, #6, #9, #10)
  - [ ] Replace the static placeholder from Story 1.4 with the reactive version
  - [ ] Add `<div role="status" aria-live="polite">` wrapper (existing from 1.4)
  - [ ] Add the dot element with dynamic color class
  - [ ] Add the text element with dynamic state label
  - [ ] Add scoped `<style>` block with all CSS (pulse keyframes, transitions, reduced-motion)
  - [ ] Add `<script>` block subscribing to `statusStore`
  - [ ] Update dot color, text content, and animation class on each status change
- [ ] Task 2: Implement the stale badge behavior on PriceCard.astro (AC: #7, #8)
  - [ ] Verify PriceCard.astro already has a stale badge element from Story 2.3
  - [ ] Ensure the stale badge shows/hides based on `statusStore` value (already wired in Story 2.3 script)
  - [ ] Ensure the stale badge fades out over 300ms when status leaves `'stale'`
  - [ ] Verify that the stale badge does not replace or hide the price
- [ ] Task 3: Manual testing and verification
  - [ ] Verify all 5 connection states display correctly (connecting, live, reconnecting, stale, fallback)
  - [ ] Verify pulse animation on reconnecting state
  - [ ] Verify state transitions fade smoothly (300ms)
  - [ ] Verify stale badge appears on PriceCard when stale
  - [ ] Verify stale badge fades out when connection restores
  - [ ] Verify prefers-reduced-motion disables all animations
  - [ ] Verify screen reader announces state changes
  - [ ] `npm run build` succeeds
  - [ ] `npm run lint` passes

## Dev Notes

### SCOPE BOUNDARY

This story implements the **visual Status Indicator component** and the **stale badge on PriceCard**. It is the FINAL story in the project.

- The `statusStore` is already created (Story 2.1)
- The `ConnectionManager` already writes to `statusStore` with values: `'connecting'`, `'live'`, `'reconnecting'`, `'stale'`, `'fallback'` (Stories 2.2, 4.1, 4.2)
- Story 2.3 already added a stale badge element and `statusStore` subscription to PriceCard — verify it works correctly and enhance if needed
- This story focuses on making `StatusIndicator.astro` reactive and visually polished

### TWO Components Modified

This story touches two files:

| File | Action | Purpose |
|------|--------|---------|
| `src/components/StatusIndicator.astro` | REPLACE static placeholder | Hydrated island with statusStore subscription |
| `src/components/PriceCard.astro` | VERIFY/ENHANCE | Ensure stale badge behavior is correct |

### StatusIndicator.astro — Complete Implementation

This replaces the static placeholder from Story 1.4. The file at `src/components/StatusIndicator.astro` currently contains a static "Live" indicator. Replace it entirely with the hydrated version below.

#### Exact HTML Structure

```astro
---
// src/components/StatusIndicator.astro
// Hydrated island — reacts to statusStore connection state changes
---

<div
  role="status"
  aria-live="polite"
  class="status-indicator fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2"
>
  <span class="status-dot w-1.5 h-1.5 rounded-full bg-status-live"></span>
  <span class="status-text font-label text-text-muted text-[11px] font-normal leading-[1.3]">
    Live
  </span>
</div>
```

#### Exact CSS (Scoped `<style>` Block)

```astro
<style>
  /* Base transition for state changes — 300ms fade on all properties */
  .status-indicator {
    transition: opacity 300ms ease-in-out;
  }

  .status-dot {
    transition: background-color 300ms ease-in-out, opacity 300ms ease-in-out;
  }

  .status-text {
    transition: opacity 300ms ease-in-out;
  }

  /* Pulse animation for reconnecting state */
  @keyframes status-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  .status-dot.pulsing {
    animation: status-pulse 1.5s ease-in-out infinite;
  }

  /* Connecting state: same as reconnecting visually */
  .status-dot.connecting {
    animation: status-pulse 1.5s ease-in-out infinite;
  }

  /* prefers-reduced-motion: disable ALL animations and transitions */
  @media (prefers-reduced-motion: reduce) {
    .status-indicator,
    .status-dot,
    .status-text {
      transition-duration: 0ms !important;
    }

    .status-dot.pulsing,
    .status-dot.connecting {
      animation: none !important;
    }
  }
</style>
```

#### Exact `<script>` Block (Island Hydration)

```astro
<script>
  import { statusStore } from '../lib/stores/status-store';
  import type { ConnectionStatus } from '../lib/types';

  // DOM references — queried once
  const statusDot = document.querySelector('.status-dot') as HTMLSpanElement;
  const statusText = document.querySelector('.status-text') as HTMLSpanElement;

  // Map each connection status to its visual configuration
  const STATUS_CONFIG: Record<
    ConnectionStatus,
    { dotClass: string; text: string; pulse: boolean }
  > = {
    connecting: {
      dotClass: 'bg-status-reconnecting',
      text: 'Connecting...',
      pulse: true,
    },
    live: {
      dotClass: 'bg-status-live',
      text: 'Live',
      pulse: false,
    },
    reconnecting: {
      dotClass: 'bg-status-reconnecting',
      text: 'Reconnecting...',
      pulse: true,
    },
    stale: {
      dotClass: 'bg-status-stale',
      text: 'Connection lost',
      pulse: false,
    },
    fallback: {
      dotClass: 'bg-status-live',
      text: 'Live \u2014 CoinCap',
      pulse: false,
    },
  };

  // All possible dot color classes — used for cleanup
  const DOT_COLOR_CLASSES = [
    'bg-status-live',
    'bg-status-reconnecting',
    'bg-status-stale',
  ];

  // Subscribe to statusStore
  statusStore.subscribe((status: ConnectionStatus) => {
    const config = STATUS_CONFIG[status];

    // Update dot: remove all color classes, add the correct one
    statusDot.classList.remove(...DOT_COLOR_CLASSES, 'pulsing', 'connecting');
    statusDot.classList.add(config.dotClass);

    // Add pulse animation class if needed
    if (config.pulse) {
      statusDot.classList.add(status === 'connecting' ? 'connecting' : 'pulsing');
    }

    // Update text
    statusText.textContent = config.text;
  });
</script>
```

### PriceCard.astro — Stale Badge Verification

Story 2.3 already added a stale badge element and `statusStore` subscription to PriceCard. The relevant parts are:

**HTML (already in PriceCard from Story 2.3):**
```html
<div
  class="stale-badge mt-2 text-status-stale font-label text-[11px] font-normal leading-[1.3] hidden"
  role="status"
>
  Stale
</div>
```

**CSS (already in PriceCard from Story 2.3):**
```css
.stale-badge {
  transition: opacity 300ms ease-out;
}

.stale-badge.hidden {
  opacity: 0;
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .stale-badge {
    transition-duration: 0ms !important;
  }
}
```

**Script (already in PriceCard from Story 2.3):**
```typescript
statusStore.subscribe((status) => {
  if (status === 'stale') {
    staleBadge.classList.remove('hidden');
  } else {
    staleBadge.classList.add('hidden');
  }
});
```

**IMPORTANT:** Verify this is working correctly. The stale badge:
- Appears when `statusStore` transitions to `'stale'`
- Shows "Stale" text in `status-stale` red (#ef4444) below the change row
- Does NOT replace or hide the price value — it is purely additive
- Fades out over 300ms when `statusStore` transitions away from `'stale'`
- Is disabled instantly with `prefers-reduced-motion`

If the stale badge behavior already works correctly from Story 2.3, no changes to PriceCard are needed. If there are issues (e.g., `display: none` preventing the fade transition), fix them.

**Known CSS issue to check:** The `hidden` class uses both `opacity: 0` and `display: none`. The `display: none` prevents the opacity transition from being visible. If the fade-out is not working, use this improved pattern:

```css
/* Improved stale badge transition (replace if needed) */
.stale-badge {
  opacity: 0;
  visibility: hidden;
  transition: opacity 300ms ease-out, visibility 0ms 300ms;
}

.stale-badge.visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 300ms ease-out, visibility 0ms 0ms;
}
```

And update the script to toggle a `visible` class instead of `hidden`:
```typescript
statusStore.subscribe((status) => {
  if (status === 'stale') {
    staleBadge.classList.add('visible');
  } else {
    staleBadge.classList.remove('visible');
  }
});
```

### ConnectionStatus Type (from `src/lib/types.ts`)

```typescript
export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'stale' | 'fallback';
```

Five states. The StatusIndicator must handle all five. The `connecting` state is the initial state set by `statusStore` (default value from Story 2.1).

### State Mapping Table

| ConnectionStatus | Dot Color | Dot Class | Dot Animation | Text | Stale Badge |
|-----------------|-----------|-----------|---------------|------|-------------|
| `'connecting'` | Amber | `bg-status-reconnecting` | Pulse 1.5s | "Connecting..." | Hidden |
| `'live'` | Green | `bg-status-live` | None | "Live" | Hidden |
| `'reconnecting'` | Amber | `bg-status-reconnecting` | Pulse 1.5s | "Reconnecting..." | Hidden |
| `'stale'` | Red | `bg-status-stale` | None (static) | "Connection lost" | Visible |
| `'fallback'` | Green | `bg-status-live` | None | "Live — CoinCap" | Hidden |

### Pulse Animation Specification

The reconnecting dot uses a CSS keyframe animation:
- Duration: 1.5s (1500ms)
- Easing: ease-in-out
- Iteration: infinite (loops while reconnecting)
- Opacity range: 0.4 to 1.0 (never fully invisible, always subtly present)
- Stops when state changes away from `'reconnecting'` (class removal kills animation)

### State Transition Behavior

All visual changes use CSS transitions for smooth state changes:
- Dot color change: `background-color 300ms ease-in-out`
- Text content change: instant (text swap is not animatable)
- Pulse start/stop: immediate (CSS animation class add/remove)
- Overall opacity: `300ms ease-in-out`

The 300ms ease-in-out timing matches UX-DR9 state transition specification.

### Import Paths (Exact)

```typescript
// In StatusIndicator.astro <script>
import { statusStore } from '../lib/stores/status-store';
import type { ConnectionStatus } from '../lib/types';
```

### Positioning

The StatusIndicator uses `fixed` positioning, NOT part of the CSS Grid:
```
fixed bottom-4 left-1/2 -translate-x-1/2
```
- `fixed` — stays at viewport bottom regardless of scroll
- `bottom-4` — 16px from bottom edge
- `left-1/2 -translate-x-1/2` — horizontally centered

This is unchanged from the Story 1.4 placeholder. The component sits outside `<main>` grid.

### Anti-Patterns (DO NOT)

- **Never** call `statusStore.set()` from this component. Only services write to stores.
- **Never** import `connection-manager.ts` directly. All data comes through `statusStore`.
- **Never** use JavaScript-based animations for the pulse. Use CSS `@keyframes` only.
- **Never** use `setInterval` for animation. CSS handles the infinite loop.
- **Never** add loading spinners or skeleton screens. The static "Live" state IS the default.
- **Never** create barrel files. Import directly from each module.
- **Never** use raw color values. Always use semantic tokens (`bg-status-live`, `text-text-muted`).
- **Never** use `addEventListener` for WebSocket events in this component — that belongs in `connection-manager.ts`.
- **Never** add a UI framework. This island uses vanilla TypeScript DOM manipulation.

### Previous Story Intelligence

**Story 1.2 establishes:**
- `global.css` with all `--color-status-*` tokens: `status-live` (#22c55e), `status-reconnecting` (#f59e0b), `status-stale` (#ef4444)
- `.status-badge` `@apply` composition: `font-label` + 11px + weight 400 + `text-muted`
- `:root` animation variables: `--animation-state-transition: 300ms`, `--animation-reconnect-pulse: 1.5s`
- `theme-constants.ts` with `STATUS_COLORS` export

**Story 1.4 establishes:**
- Static `StatusIndicator.astro` placeholder with `<div role="status" aria-live="polite">`, 6px green dot, "Live" text, `fixed bottom-4 left-1/2 -translate-x-1/2` positioning
- This story REPLACES that static placeholder with the reactive version

**Story 2.1 establishes:**
- `statusStore` as `atom<ConnectionStatus>('connecting')` in `src/lib/stores/status-store.ts`
- The store initializes to `'connecting'` — the StatusIndicator should show "Connecting..." with pulsing dot initially

**Story 2.2 establishes:**
- `ConnectionManager` singleton writes `'connecting'` and `'live'` to `statusStore`
- The `onopen` handler sets `statusStore` to `'live'`

**Story 2.3 establishes:**
- PriceCard stale badge element and `statusStore` subscription — already handles show/hide based on `'stale'` status
- The stale badge behavior should already work. This story verifies and enhances if needed.

**Story 4.1 establishes (expected):**
- Exponential backoff reconnection logic
- `statusStore` transitions: `'live'` -> `'reconnecting'` on disconnect, `'reconnecting'` -> `'live'` on reconnect success

**Story 4.2 establishes (expected):**
- CoinCap fallback: `statusStore` set to `'fallback'` when using CoinCap
- REST polling fallback: `statusStore` set to `'stale'` when only REST is available with no updates for >30s

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/StatusIndicator.astro` | REPLACE | Hydrated island with statusStore subscription, CSS animations, all 5 states |
| `src/components/PriceCard.astro` | VERIFY (modify only if stale badge transition is broken) | Ensure stale badge show/hide with 300ms fade works |

### Project Structure After This Story

```
src/
├── components/
│   ├── PriceCard.astro          ← VERIFIED (stale badge behavior)
│   ├── MarketCapCard.astro      ← unchanged
│   ├── ChartCard.astro          ← unchanged
│   └── StatusIndicator.astro    ← REPLACED (hydrated island)
├── lib/
│   ├── types.ts                 ← unchanged (ConnectionStatus type)
│   ├── stores/
│   │   └── status-store.ts      ← unchanged (read by this component)
│   ├── services/
│   │   └── connection-manager.ts ← unchanged (writes to statusStore)
│   └── utils/
│       └── format-utils.ts      ← unchanged
└── styles/
    └── global.css               ← unchanged (.status-badge, status color tokens)
```

### References

- [Source: epics.md#Story 4.3] — Acceptance criteria (AC 1-10)
- [Source: epics.md#UX-DR7] — Status Indicator: 6px dot + state text at 11px, centered bottom, 5 states, transitions fade 300ms
- [Source: epics.md#UX-DR9] — Animation system: state transitions 300ms ease-in-out, reconnecting pulse 1.5s ease-in-out, prefers-reduced-motion
- [Source: epics.md#UX-DR12] — Accessibility: role="status" aria-live="polite"
- [Source: epics.md#FR14] — Visual indicator when data connection is lost or reconnecting
- [Source: epics.md#FR15] — Stale data indicator when displayed price may be outdated
- [Source: architecture.md#Frontend Architecture] — Island pattern, vanilla TS, store subscriptions
- [Source: architecture.md#Component Boundaries] — StatusIndicator reads statusStore
- [Source: architecture.md#Communication Patterns] — Unidirectional flow, components read-only
- [Source: architecture.md#Process Patterns] — Animation via CSS, prefers-reduced-motion
- [Source: architecture.md#Naming Patterns] — PascalCase components, kebab-case keyframes
- [Source: architecture.md#Data Architecture] — ConnectionStatus type: 'connecting' | 'live' | 'reconnecting' | 'stale' | 'fallback'
- [Source: ux-design-specification.md#Status Indicator] — Anatomy, 5 states, transitions, pulse animation spec
- [Source: ux-design-specification.md#Animation Patterns] — Timing table, reconnecting pulse 1500ms, state transition 300ms
- [Source: ux-design-specification.md#Connection States] — Escalating visibility pattern, stale badge on PriceCard
- [Source: ux-design-specification.md#Accessibility Strategy] — role="status" aria-live="polite" for StatusIndicator
- [Source: 1-2-design-token-system-and-typography.md] — Status color tokens, .status-badge composition, animation CSS vars
- [Source: 1-4-empty-dashboard-cards.md] — StatusIndicator static placeholder (being replaced)
- [Source: 2-1-nano-stores-and-number-formatting-utilities.md] — statusStore definition, ConnectionStatus initial value 'connecting'
- [Source: 2-2-websocket-connection-manager-binance.md] — ConnectionManager writes to statusStore
- [Source: 2-3-live-price-card-with-direction-indicator.md] — PriceCard stale badge element and statusStore subscription

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Review Findings

### Change Log
