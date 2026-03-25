# Story 1.1: Project Initialization & Tooling Setup

Status: done

## Story

As a developer,
I want a fully scaffolded Astro project with TypeScript, Tailwind, and code quality tooling,
so that I can start building components with a consistent, well-configured dev environment from the first commit.

## Acceptance Criteria

1. **Astro 6.x with TypeScript strict mode** — Project scaffolded using `npm create astro@latest -- --template minimal --typescript strict`. Astro 6.x installed (requires Node 22+).
2. **Tailwind CSS v4 via Vite plugin** — Tailwind configured via `@tailwindcss/vite` plugin in `astro.config.mjs`. CSS-first `@theme` configuration in `src/styles/global.css` (no `tailwind.config.js`).
3. **Dependencies installed** — `lightweight-charts`, `@fontsource/jetbrains-mono`, `@fontsource/inter`, and `nanostores` installed as production dependencies.
4. **Code quality tooling** — ESLint with `eslint-plugin-astro`, Prettier with `prettier-plugin-astro`, and Vitest configured as dev dependencies.
5. **Project structure matches architecture spec** — Directories created: `src/pages/`, `src/layouts/`, `src/components/`, `src/lib/stores/`, `src/lib/services/`, `src/lib/utils/`, `src/styles/`.
6. **TypeScript interfaces defined** — `src/lib/types.ts` exports `PriceTick`, `MarketData`, `ChartPoint`, and `ConnectionStatus` interfaces.
7. **Dev server works** — `npm run dev` starts the Astro dev server successfully on `localhost:4321`.
8. **Build works** — `npm run build` produces a static output in `dist/`.

## Tasks / Subtasks

- [x] Task 1: Scaffold Astro project (AC: #1)
  - [x] Run `npm create astro@latest -- --template minimal --typescript strict`
  - [x] Verify Node 22+ is available
  - [x] Verify Astro 6.x installed in package.json
- [x] Task 2: Configure Tailwind CSS v4 (AC: #2)
  - [x] Run `npx astro add tailwind`
  - [x] Verify `@tailwindcss/vite` plugin in `astro.config.mjs`
  - [x] Create `src/styles/global.css` with `@import "tailwindcss"`
  - [x] Verify no `tailwind.config.js` exists (CSS-first config only)
- [x] Task 3: Install production dependencies (AC: #3)
  - [x] Run `npm install lightweight-charts @fontsource/jetbrains-mono @fontsource/inter nanostores`
- [x] Task 4: Configure code quality tooling (AC: #4)
  - [x] Run `npm install -D eslint prettier eslint-plugin-astro prettier-plugin-astro vitest`
  - [x] Create `eslint.config.js` with ESLint flat config and `eslint-plugin-astro`
  - [x] Create `.prettierrc` with `prettier-plugin-astro`
  - [x] Create `vitest.config.ts`
  - [x] Add lint/format/test scripts to `package.json`
- [x] Task 5: Create project directory structure (AC: #5)
  - [x] Create `src/pages/` (exists from scaffold)
  - [x] Create `src/layouts/`
  - [x] Create `src/components/`
  - [x] Create `src/lib/stores/`
  - [x] Create `src/lib/services/`
  - [x] Create `src/lib/utils/`
  - [x] Create `src/styles/` (if not already created)
- [x] Task 6: Define TypeScript interfaces (AC: #6)
  - [x] Create `src/lib/types.ts` with all four interfaces
- [x] Task 7: Create minimal entry files (AC: #7, #8)
  - [x] Create `src/pages/index.astro` (imports Layout)
  - [x] Create `src/layouts/Layout.astro` (basic HTML shell)
  - [x] Verify `npm run dev` starts successfully
  - [x] Verify `npm run build` produces `dist/`

## Dev Notes

### Initialization Commands (Exact Sequence)

```bash
npm create astro@latest -- --template minimal --typescript strict
npx astro add tailwind
npm install lightweight-charts @fontsource/jetbrains-mono @fontsource/inter nanostores
npm install -D eslint prettier eslint-plugin-astro prettier-plugin-astro vitest
```

**Package manager:** npm (explicit choice — no pnpm/yarn).

### TypeScript Interfaces (Exact Definitions)

```typescript
// src/lib/types.ts
export interface PriceTick {
  price: number;
  timestamp: number;
  direction: 'up' | 'down' | 'neutral';
}

export interface MarketData {
  marketCap: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
}

export interface ChartPoint {
  time: number;
  value: number;
}

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'stale' | 'fallback';
```

### Astro Config Requirements

`astro.config.mjs` must have:
- `@tailwindcss/vite` plugin
- `output: 'static'` (default, but be explicit)

```javascript
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

### ESLint Config (Flat Config Format)

Use ESLint flat config in `eslint.config.js` with `eslint-plugin-astro`. Do NOT use legacy `.eslintrc` format.

### Project Structure (Complete)

```
src/
├── pages/
│   └── index.astro
├── layouts/
│   └── Layout.astro
├── components/           # Empty — populated in later stories
├── lib/
│   ├── types.ts          # Shared TypeScript interfaces
│   ├── stores/           # Empty — populated in Story 2.1
│   ├── services/         # Empty — populated in Story 2.2
│   └── utils/            # Empty — populated in Story 2.1
└── styles/
    └── global.css        # Tailwind @import only for now
```

### Anti-Patterns (DO NOT)

- Do NOT create a `tailwind.config.js` — Tailwind v4 uses CSS-first `@theme` directives
- Do NOT create barrel files (`utils/index.ts`) — import directly from specific modules
- Do NOT add any UI framework (React, Vue, Svelte) — all islands use vanilla TypeScript
- Do NOT add Playwright yet — it's for e2e testing in later stories
- Do NOT pre-create store files, service files, or component files beyond `index.astro` and `Layout.astro` — those belong to later stories
- Do NOT add `theme-constants.ts` yet — that's Story 1.2
- Do NOT add content to `global.css` beyond Tailwind import — design tokens are Story 1.2

### Minimal Layout.astro

The layout should be a minimal HTML shell for now. Story 1.2 adds design tokens, Story 1.3 adds the responsive grid layout.

```astro
---
// src/layouts/Layout.astro
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Metrics</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

### Minimal index.astro

```astro
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
---
<Layout>
  <main>
    <h1>Metrics</h1>
  </main>
</Layout>
```

### package.json Scripts

Ensure these scripts exist:
- `"dev": "astro dev"`
- `"build": "astro build"`
- `"preview": "astro preview"`
- `"test": "vitest run"`
- `"test:watch": "vitest"`
- `"lint": "eslint src/"`
- `"format": "prettier --write src/"`

### Project Structure Notes

- This is a greenfield project — no existing code to conflict with
- All paths follow the architecture spec exactly: [Source: architecture.md#Structure Patterns]
- TypeScript interfaces defined exactly per architecture data interfaces: [Source: architecture.md#Data Architecture]
- Tailwind v4 CSS-first config per architecture decision: [Source: architecture.md#Selected Starter]

### References

- [Source: architecture.md#Selected Starter: Astro Minimal + CLI Integrations] — initialization commands, package manager choice, starter rationale
- [Source: architecture.md#Structure Patterns] — complete project directory structure and file naming rules
- [Source: architecture.md#Data Architecture] — PriceTick, MarketData, ChartPoint, ConnectionStatus interface definitions
- [Source: architecture.md#Implementation Patterns & Consistency Rules] — naming conventions, anti-patterns
- [Source: prd.md#Technical Architecture] — Astro Islands Architecture, static output, TypeScript strict mode
- [Source: epics.md#Story 1.1] — acceptance criteria source

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- `npm create astro@latest` with `--typescript strict` flag was misinterpreted as directory name; resolved by scaffolding without the flag (tsconfig already extends `astro/tsconfigs/strict`)
- Scaffolder created subdirectory when project root wasn't empty; moved contents to root

### Completion Notes List

- Scaffolded Astro 6.0.8 with TypeScript strict mode (Node v25.8.1)
- Configured Tailwind CSS v4 via `@tailwindcss/vite` plugin, CSS-first config with `@import "tailwindcss"`
- Installed production deps: lightweight-charts, @fontsource/jetbrains-mono, @fontsource/inter, nanostores
- Installed dev deps: eslint, prettier, eslint-plugin-astro, prettier-plugin-astro, vitest
- Created ESLint flat config, Prettier config, Vitest config
- Added all required npm scripts (dev, build, preview, test, test:watch, lint, format)
- Created full directory structure: pages, layouts, components, lib/stores, lib/services, lib/utils, styles
- Defined TypeScript interfaces: PriceTick, MarketData, ChartPoint, ConnectionStatus
- Created minimal Layout.astro and index.astro entry files
- Dev server verified on localhost:4321, build produces static dist/
- All 4 unit tests pass, ESLint clean

### File List

- package.json (new)
- tsconfig.json (new)
- astro.config.mjs (new)
- eslint.config.js (new)
- .prettierrc (new)
- vitest.config.ts (new)
- src/pages/index.astro (new)
- src/layouts/Layout.astro (new)
- src/styles/global.css (new)
- src/lib/types.ts (new)
- src/lib/types.test.ts (new)
- src/components/.gitkeep (new)
- src/lib/stores/.gitkeep (new)
- src/lib/services/.gitkeep (new)
- src/lib/utils/.gitkeep (new)
- public/favicon.svg (new, from scaffold)

### Review Findings

- [x] [Review][Decision] `ConnectionStatus` exported as `type` alias, not `interface` — dismissed, spec intent is met
- [x] [Review][Decision] `@tailwindcss/vite`, `tailwindcss`, and `astro` are in `dependencies` — dismissed, follows Astro scaffolder convention
- [x] [Review][Patch] Layout.astro missing `global.css` import — fixed, added `import '../styles/global.css'`
- [x] [Review][Patch] `astro.config.mjs` missing explicit `output: 'static'` — fixed
- [x] [Review][Patch] `.gitignore` missing `.env.local` and `.env.*.local` variants — fixed
- [x] [Review][Patch] README.md is default Astro template — fixed, replaced with project-specific content
- [x] [Review][Defer] `ChartPoint.time` ms vs seconds ambiguity with `lightweight-charts` [src/lib/types.ts:16] — deferred, future story 3.x concern
- [x] [Review][Defer] `PriceTick.timestamp` no unit documented [src/lib/types.ts:3] — deferred, future story 2.x concern
- [x] [Review][Defer] `MarketData.change24h` unit ambiguous [src/lib/types.ts:9] — deferred, future story 3.x concern
- [x] [Review][Defer] `ConnectionStatus` has no `disconnected`/`error` terminal state [src/lib/types.ts:20] — deferred, architecture decision for story 4.x
- [x] [Review][Defer] `PriceTick.price` allows non-positive/non-finite values [src/lib/types.ts:2] — deferred, runtime validation in story 2.x
- [x] [Review][Defer] `PriceTick.direction` no runtime validation [src/lib/types.ts:4] — deferred, story 2.x
- [x] [Review][Defer] `MarketData` `high24h >= low24h` not validated [src/lib/types.ts:11-12] — deferred, story 3.x
- [x] [Review][Defer] `MarketData` `change24h`/`changePercent24h` sign consistency [src/lib/types.ts:9-10] — deferred, story 3.x
- [x] [Review][Defer] ESLint config has no `@typescript-eslint` rules [eslint.config.js] — deferred, not in story scope

### Change Log

- 2026-03-25: Story 1.1 implemented — full project scaffolding with Astro 6.x, Tailwind v4, TypeScript strict, code quality tooling, and directory structure
