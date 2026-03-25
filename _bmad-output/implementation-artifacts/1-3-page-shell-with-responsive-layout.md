# Story 1.3: Page Shell with Responsive Layout

Status: ready-for-dev

## Story

As a user,
I want the dashboard to load instantly with a dark background and a responsive card grid layout,
so that I never see a flash of white and the page looks polished on both desktop and mobile.

## Acceptance Criteria

1. **FOUC prevention** — `<html>` has `lang="en"` and `bg-base` (#0a0a0f) set directly via inline style or class to prevent any flash of white/unstyled content (FR18, UX-DR10).
2. **Full-viewport dark background** — `Layout.astro` renders a full-viewport `bg-base` background with a centered content container (max-width 720px).
3. **CSS Grid desktop layout** — On desktop (>=640px), the layout uses CSS Grid with `grid-template-columns: 1.5fr 1fr` and 24px gaps (FR21, UX-DR8).
4. **Mobile single-column** — On mobile (<640px), the layout collapses to a single-column stack with 16px horizontal padding (FR22, UX-DR8, UX-DR11).
5. **Vertical centering** — Container is vertically centered on desktop and top-aligned on mobile.
6. **No `vh` units on mobile** — Uses `dvh` or `min-h-screen` instead of `vh` to avoid mobile browser chrome issues (UX-DR11).
7. **CSS-only responsive** — Responsive behavior is CSS-only with no JavaScript, using Tailwind `sm:` breakpoint at 640px (UX-DR11).
8. **Cross-browser** — Page renders correctly on Chrome, Firefox, Safari, and Edge latest 2 versions (FR23).
9. **Single page entry** — `index.astro` imports `Layout.astro` and serves as the single page entry with `<slot>` for content.

## Tasks / Subtasks

- [ ] Task 1: Update `Layout.astro` with FOUC prevention and full-viewport dark background (AC: #1, #2)
  - [ ] Set `bg-base` (#0a0a0f) directly on `<html>` element via `style="background-color: #0a0a0f"` (inline for FOUC prevention — CSS loads after HTML parse)
  - [ ] Ensure `lang="en"` is on `<html>` (already present from Story 1.1)
  - [ ] Set `<body>` to full viewport height with `min-h-screen` or `min-h-dvh`
- [ ] Task 2: Create centered content container with CSS Grid (AC: #2, #3, #4, #5)
  - [ ] Add a `<main>` container with `max-w-[720px]` centered via `mx-auto`
  - [ ] Apply CSS Grid: `grid grid-cols-1 sm:grid-cols-[1.5fr_1fr]` with `gap-6` (24px)
  - [ ] Desktop: 32px page padding (`px-8 sm:px-8`), mobile: 16px (`px-4`)
  - [ ] Desktop: vertically centered via flexbox on body (`flex items-center justify-center min-h-dvh`)
  - [ ] Mobile: top-aligned (`items-start` on small screens, `sm:items-center`)
- [ ] Task 3: Update `index.astro` to use Layout with grid container (AC: #9)
  - [ ] Remove the existing `<main><h1>Metrics</h1></main>` placeholder
  - [ ] Ensure `index.astro` passes content through `<Layout>` slot
- [ ] Task 4: Verify responsive behavior (AC: #6, #7, #8)
  - [ ] No `vh` units used — confirm `dvh` or Tailwind `min-h-screen` only
  - [ ] No JavaScript used for responsive logic
  - [ ] `npm run build` succeeds
  - [ ] `npm run lint` passes

## Dev Notes

### Layout Architecture (UX-DR8)

The page shell is a **static** Astro component — no JavaScript, no hydration. It provides the dark background and CSS Grid container that card components (Story 1.4) will slot into.

**Desktop layout (>=640px):**
```
┌─────────────────────┬───────────────┐
│  Price Card (1.5fr)  │  Market Cap   │
│                      │  (1fr)        │
├──────────────────────┴───────────────┤
│  Chart Card (full width)             │
└───────────────────────────────────────┘
                  ● Status
```

**Mobile layout (<640px):**
```
┌─────────────────────┐
│  Price Card          │
├─────────────────────┤
│  Market Cap          │
├─────────────────────┤
│  Chart Card          │
└─────────────────────┘
         ● Status
```

### FOUC Prevention Strategy (UX-DR10, FR18)

The `bg-base` color MUST be set via an **inline style** on `<html>` — not just a Tailwind class. Reason: Tailwind CSS loads asynchronously via `<link>` or Vite injection. Before CSS loads, the page would flash white if the background is only set via a class. The inline style ensures the dark background is the very first paint.

```html
<html lang="en" style="background-color: #0a0a0f">
```

Additionally apply the Tailwind class `bg-bg-base` for consistency, but the inline style is the FOUC prevention mechanism.

### Exact Layout.astro Implementation

```astro
---
import '../styles/global.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/inter/400.css';
---
<html lang="en" style="background-color: #0a0a0f" class="bg-bg-base">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Metrics</title>
  </head>
  <body class="min-h-dvh flex items-start sm:items-center justify-center px-4 sm:px-8 py-6 sm:py-0">
    <main class="w-full max-w-[720px] grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] gap-6">
      <slot />
    </main>
  </body>
</html>
```

**Key decisions:**
- `min-h-dvh` — uses dynamic viewport height, avoids `vh` issues on mobile Safari (UX-DR11)
- `items-start sm:items-center` — top-aligned mobile, vertically centered desktop
- `px-4 sm:px-8` — 16px mobile padding, 32px desktop padding (UX-DR8)
- `gap-6` — 24px gaps (Tailwind's `gap-6` = 1.5rem = 24px at default 16px root)
- `grid-cols-[1.5fr_1fr]` — Tailwind arbitrary value for the exact 1.5fr/1fr split
- `py-6 sm:py-0` — vertical padding on mobile to avoid content touching edges; desktop uses centering

### Exact index.astro Implementation

```astro
---
import Layout from '../layouts/Layout.astro';
---
<Layout>
  <!-- Card components will be added in Story 1.4 -->
</Layout>
```

Story 1.4 will add the actual card placeholder components here. For now, the grid container is empty but structurally complete.

### Tailwind `sm:` Breakpoint

Tailwind v4 uses `sm:` prefix for `>=640px` by default. This is the single breakpoint for the entire project (UX-DR11). Desktop-first means the base styles are mobile, and `sm:` adds desktop overrides.

**CORRECTION:** The UX spec says "desktop-first with single 640px breakpoint" but Tailwind is mobile-first by default. The implementation uses mobile-first Tailwind classes with `sm:` for desktop overrides — this achieves the same visual result as specified. Do NOT fight Tailwind's mobile-first paradigm.

### `dvh` Browser Support

`dvh` (dynamic viewport height) is supported in all target browsers (Chrome 108+, Firefox 101+, Safari 15.4+, Edge 108+). Since we target latest 2 versions, this is safe. Tailwind v4 includes `min-h-dvh` as a built-in utility.

### Anti-Patterns (DO NOT)

- Do NOT use `vh` units — use `dvh` or Tailwind `min-h-screen`/`min-h-dvh` (UX-DR11)
- Do NOT add JavaScript for responsive logic — CSS-only with Tailwind breakpoints
- Do NOT add card components — those are Story 1.4
- Do NOT add any `<script>` blocks — the page shell is purely static
- Do NOT use `tailwind.config.js` for breakpoint customization — 640px is the Tailwind v4 default `sm:` breakpoint
- Do NOT add loading spinners, skeleton screens, or any loading UI — empty cards with labels are the loading state (UX-DR10)
- Do NOT set `bg-base` only via Tailwind class — must also use inline style for FOUC prevention
- Do NOT use `100vh` anywhere — it causes issues with mobile browser chrome

### Previous Story Intelligence

**Story 1.1 established:**
- `Layout.astro` exists with `<html lang="en">`, `import '../styles/global.css'`
- `index.astro` exists with `<Layout><main><h1>Metrics</h1></main></Layout>`
- The `<h1>Metrics</h1>` placeholder should be removed — replaced by the grid layout

**Story 1.2 will have established (dependency):**
- `global.css` has `@theme` tokens including `--color-bg-base: #0a0a0f` → generates `bg-bg-base` utility
- Font imports (`@fontsource`) in `Layout.astro` frontmatter
- `.card-glass` composition available for Story 1.4

**IMPORTANT:** This story depends on Story 1.2 being complete. The `bg-bg-base` Tailwind class requires the `@theme` token from Story 1.2. The inline `style="background-color: #0a0a0f"` is the fallback that works regardless.

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/layouts/Layout.astro` | MODIFY | Add FOUC prevention inline style, full-viewport body, CSS Grid container |
| `src/pages/index.astro` | MODIFY | Remove placeholder content, use Layout slot |

### Project Structure Notes

- No new files created — only modifying existing `Layout.astro` and `index.astro`
- `Layout.astro` remains at `src/layouts/Layout.astro` per architecture spec
- `index.astro` remains the single page entry at `src/pages/index.astro`
- The `<main>` grid container lives in `Layout.astro`, not in `index.astro` — the layout owns the grid structure

### References

- [Source: architecture.md#Structure Patterns] — Layout.astro as page shell wrapper, index.astro as single page entry
- [Source: architecture.md#Frontend Architecture] — Page Shell is static (no hydration), 5 Astro components
- [Source: architecture.md#Naming Patterns] — File naming conventions
- [Source: ux-design-specification.md#Design Direction Decision] — Direction B: Card Grid, CSS Grid 1.5fr 1fr, max-width 720px, 24px gaps
- [Source: ux-design-specification.md#Spacing & Layout Foundation] — Spacing scale, desktop/mobile layout specs, vertical centering
- [Source: epics.md#Story 1.3] — Acceptance criteria
- [Source: epics.md#UX-DR8] — Page Shell: full-viewport bg-base, CSS Grid, 640px breakpoint, max-width 720px, spacing
- [Source: epics.md#UX-DR10] — FOUC prevention: bg-base on `<html>` directly
- [Source: epics.md#UX-DR11] — Responsive design: 640px breakpoint, no vh, CSS-only
- [Source: epics.md#FR18] — No FOUC
- [Source: epics.md#FR21] — Desktop horizontal layout
- [Source: epics.md#FR22] — Mobile stacked layout
- [Source: epics.md#FR23] — Cross-browser support

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Review Findings

### Change Log
