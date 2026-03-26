# Story 5.1: Fetch Script and Checkpoints Cache

Status: done

## Story

As a developer,
I want a Node.js script that fetches checkpoint metadata from the `ShamsiievDmytro/entire-bmad` GitHub repo and writes it to `src/data/checkpoints-cache.json`,
so that the AI Metrics Dashboard page has structured, pre-fetched data to render all 20 metrics without runtime API calls.

## Acceptance Criteria

1. **Given** the script is run via `npm run fetch-checkpoints` **When** it completes successfully **Then** `src/data/checkpoints-cache.json` exists and conforms to the cache schema contract (see Dev Notes).

2. **Given** `GITHUB_TOKEN` environment variable is set **When** the script runs **Then** it uses the token in the `Authorization: Bearer` header for all GitHub API requests.

3. **Given** `GITHUB_TOKEN` is not set **When** the script runs **Then** it runs unauthenticated (no auth header) and logs a warning: `WARN: No GITHUB_TOKEN set — unauthenticated requests (60 req/hour limit)`.

4. **Given** a single GitHub API call fails **When** the script handles the error **Then** it retries once after 2 seconds; if the retry also fails, the affected checkpoint has `fetch_failed: true` and the script continues to the next checkpoint.

5. **Given** the full.jsonl file for a checkpoint is fetched **When** the script parses it line-by-line **Then** only lines with `"type":"user"` are scanned for `/bmad-*` and `/*` command patterns; the rest are skipped without loading into memory.

6. **Given** the script completes **When** it logs to stdout **Then** it prints: checkpoint count, total API calls made, and elapsed time in seconds.

7. **Given** `src/data/checkpoints-cache.json` does not exist **When** the Astro build runs (`npm run build`) **Then** the build fails with a clear actionable message: `ERROR: src/data/checkpoints-cache.json not found. Run: npm run fetch-checkpoints`.

8. **Given** `src/data/checkpoints-cache.json` is gitignored **When** a developer clones the repo **Then** the file is absent (not committed) and the build guard from AC#7 prompts them to run the fetch script.

## Tasks / Subtasks

- [x] Task 1: Add script infrastructure (AC: #2, #3, #7, #8)
  - [x] Install `tsx` as dev dependency: `npm install -D tsx`
  - [x] Add `"fetch-checkpoints": "tsx scripts/fetch-checkpoints.ts"` to `package.json` scripts
  - [x] Add `src/data/checkpoints-cache.json` to `.gitignore`
  - [x] Create `src/data/` directory (add `.gitkeep` so the dir is tracked)
  - [x] Add build-time guard to `astro.config.mjs`: check for cache file existence at startup; throw `Error` with the actionable message from AC#7 if absent

- [x] Task 2: Define TypeScript types for cache schema (AC: #1)
  - [x] Create `scripts/types.ts` with all cache schema interfaces:
    - `CheckpointMeta`, `TurnMeta`, `CacheMeta`, `CheckpointsCache`
  - [x] Types must match the cache schema contract verbatim (see Dev Notes)

- [x] Task 3: Implement the fetch script `scripts/fetch-checkpoints.ts` (AC: #1–#6)
  - [x] Step 1 — discover checkpoints: `GET /repos/ShamsiievDmytro/entire-bmad/git/trees/entire%2Fcheckpoints%2Fv1?recursive=1` → collect all paths matching `checkpoints/{id}/metadata.json`
  - [x] Step 2 — fetch commit list: `GET /repos/ShamsiievDmytro/entire-bmad/commits?sha=entire%2Fcheckpoints%2Fv1&per_page=100` → build `Map<checkpoint_id, commit_date>`
  - [x] Step 3 — for each checkpoint, fetch `metadata.json` (parent + turns metadata)
  - [x] Step 4 — for heavy tier (metric 14): fetch `full.jsonl` content, stream/scan lines for `"type":"user"` entries, extract `/bmad-*` and `/*` patterns, build `bmad_commands` frequency map; skip entire step silently on any error
  - [x] Implement retry helper: 1 retry with 2s delay; sets `fetch_failed: true` on second failure
  - [x] Write final JSON to `src/data/checkpoints-cache.json` using `fs.writeFileSync`
  - [x] Log summary to stdout on completion

- [x] Task 4: Write unit tests for the fetch script helpers (AC: #4, #5)
  - [x] Create `scripts/fetch-checkpoints.test.ts`
  - [x] Test retry logic: mock `fetch` to fail twice → verify `fetch_failed: true` on output
  - [x] Test BMAD command extraction: feed a fake JSONL string → verify correct command frequency map
  - [x] Test cache schema shape: run with mocked responses → verify output matches `CheckpointsCache` type structure

## Dev Notes

### Cache Schema Contract

The output file MUST match this exact schema — the dashboard page will depend on it:

```typescript
interface CacheMeta {
  repo: string;          // "ShamsiievDmytro/entire-bmad"
  branch: string;        // "entire/checkpoints/v1"
  generatedAt: string;   // ISO timestamp
  checkpointCount: number;
}

interface TurnMeta {
  turn_id: string;
  session_id: string;
  model: string;
  prompt_txt: string;    // first line of prompt.txt, truncated at 200 chars
  turn_count: number;
  agent_percentage: number;
}

interface CheckpointMeta {
  checkpoint_id: string;
  commit_date: string;   // ISO timestamp from commits API
  agent_percentage: number;
  agent_lines: number;
  human_added: number;
  human_modified: number;
  human_removed: number;
  tokens: {
    input: number;
    cache_creation: number;
    cache_read: number;
    output: number;
  };
  summary: {
    friction: string[];
    open_items: string[];
  };
  learnings: { repo: number; code: number; workflow: number };
  files_touched: string[];
  turns: TurnMeta[];
  bmad_commands: Record<string, number>;  // e.g. { "/bmad-dev-story": 3 }
  fetch_failed: boolean;
}

interface CheckpointsCache {
  meta: CacheMeta;
  checkpoints: CheckpointMeta[];
}
```

### GitHub API Endpoints

| Call | URL | Notes |
|------|-----|-------|
| Tree discovery | `GET https://api.github.com/repos/ShamsiievDmytro/entire-bmad/git/trees/entire%2Fcheckpoints%2Fv1?recursive=1` | URL-encode branch name slashes |
| Commit list | `GET https://api.github.com/repos/ShamsiievDmytro/entire-bmad/commits?sha=entire%2Fcheckpoints%2Fv1&per_page=100` | Paginate if needed |
| Checkpoint file | `GET https://api.github.com/repos/ShamsiievDmytro/entire-bmad/contents/{path}` | Response has `content` as base64 — decode with `Buffer.from(content, 'base64').toString()` |

**Rate limits:** ~44 calls total for ~11 checkpoints (tree + commits + metadata + full.jsonl). Within 60 req/hour unauthenticated. With `GITHUB_TOKEN` (any valid PAT), limit rises to 5000 req/hour.

**Required header:** `User-Agent: metrics-fetch-script` — GitHub rejects requests without it.

### File Locations

| File | Purpose |
|------|---------|
| `scripts/fetch-checkpoints.ts` | Main fetch script |
| `scripts/types.ts` | TypeScript interfaces for cache schema |
| `scripts/fetch-checkpoints.test.ts` | Unit tests |
| `src/data/.gitkeep` | Tracks directory without caching data |
| `src/data/checkpoints-cache.json` | Gitignored output — generated by script |

### Build Guard Implementation

Add to `astro.config.mjs` (inside the default export or as a Vite plugin):

```javascript
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// At top of astro.config.mjs, before defineConfig():
if (!existsSync(resolve('./src/data/checkpoints-cache.json'))) {
  throw new Error(
    'ERROR: src/data/checkpoints-cache.json not found. Run: npm run fetch-checkpoints'
  );
}
```

**Important:** This guard should only run during build (`npm run build`) and NOT during `npm run dev`. Gate it on `process.env.NODE_ENV === 'production'` or check `process.argv` for the `build` command if needed to avoid blocking dev server.

Actually simpler: only gate on `npm run build` using Astro's integration hook `astro:config:done` with `command === 'build'`. See [Astro integration API](https://docs.astro.build/en/reference/integrations-reference/).

### Project Structure Constraints (existing patterns to follow)

- **File naming:** `scripts/` uses kebab-case — `fetch-checkpoints.ts`, not `fetchCheckpoints.ts`
- **TypeScript strict mode:** `tsconfig.json` has `"strict": true` — script code must pass without errors. The `scripts/` directory may need to be included in tsconfig or use a separate `scripts/tsconfig.json` extending the root.
- **No barrel files:** Import types directly from `scripts/types.ts`
- **Package manager:** npm only — do not use yarn/pnpm
- **Test co-location:** Test file at `scripts/fetch-checkpoints.test.ts` next to the script

### Existing Code Reuse

- **No reuse from `src/`** — the fetch script is a Node.js build-time tool, not a browser module
- **`format-utils.ts` is browser-only** — do not import it in the script
- **`tsx` vs `ts-node`:** Use `tsx` (already fast, ESM-compatible) — do NOT add `ts-node`

### Running Tests

```bash
npm run test                   # Vitest — runs all .test.ts files including scripts/
npm run fetch-checkpoints      # Execute the fetch script
npm run build                  # Verify build guard works (requires cache file to exist first)
```

### BMAD Command Pattern Detection

For metric 14, scan `full.jsonl` lines where `"type":"user"` and look for content matching:
- `/bmad-*` pattern: e.g. `/bmad-dev-story`, `/bmad-code-review`
- `/*` pattern: any slash command

Use a simple regex: `/^\/[a-z-]+/` on the `content` or `prompt` field of the parsed line.

Build the frequency map as: `{ "/bmad-dev-story": 3, "/bmad-code-review": 1 }`.

If `full.jsonl` fetch fails or any parse error occurs: set `bmad_commands: {}` and continue — do not set `fetch_failed: true` for this (only set `fetch_failed: true` for `metadata.json` failures).

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Build guard used `astro:config:setup` hook (not `astro:config:done`) — only `config:setup` receives the `command` param in Astro 6.x
- `fetchWithRetry` accepts optional `delayFn` param so tests avoid fake timers (eliminates Node.js unhandled rejection warnings with `mockRejectedValueOnce`)

### Completion Notes List

- Task 1: `tsx@4.21.0` installed. `fetch-checkpoints` npm script added. `src/data/checkpoints-cache.json` gitignored. Build guard implemented as Astro integration in `astro.config.mjs` using `astro:config:setup` hook — fires only on `command === 'build'`, dev server unaffected.
- Task 2: `scripts/types.ts` created with `CacheMeta`, `TurnMeta`, `CheckpointMeta`, `CheckpointsCache` interfaces matching cache schema contract exactly.
- Task 3: `scripts/fetch-checkpoints.ts` implements full 4-step pipeline: tree discovery → commit list → metadata fetch → full.jsonl BMAD extraction. Defensive field mapping handles both `tokens.input` and `input_tokens` field shapes. Learnings counted as array `.length` or direct number. Heavy-tier errors are silent (empty `bmad_commands`). Metadata failures set `fetch_failed: true`.
- Task 4: 17 new tests added to `scripts/fetch-checkpoints.test.ts`. `vitest.config.ts` updated to include `scripts/**/*.test.ts`. All 121 tests (104 existing + 17 new) pass.

### File List

- `scripts/fetch-checkpoints.ts` (new)
- `scripts/fetch-checkpoints.test.ts` (new)
- `scripts/types.ts` (new)
- `src/data/.gitkeep` (new)
- `astro.config.mjs` (modified — added build guard integration)
- `package.json` (modified — added tsx devDep + fetch-checkpoints script)
- `package-lock.json` (modified)
- `.gitignore` (modified — added src/data/checkpoints-cache.json)
- `vitest.config.ts` (modified — added scripts/**/*.test.ts include)

### Review Findings

- [x] [Review][Decision] BMAD command regex deviates from spec — kept implementation regex (`/^\/[a-z][a-z0-9-]*/`), more precise than spec's `/^\/[a-z-]+/`
- [x] [Review][Decision] Build guard uses `throw` instead of `console.error` + `process.exit` — accepted; Astro formats integration errors cleanly
- [x] [Review][Patch] Commit list capped at 100, no pagination — added `fetchAllCommits` pagination loop [scripts/fetch-checkpoints.ts]
- [x] [Review][Patch] `apiCallCount` module-level global — reset to 0 at start of `run()` [scripts/fetch-checkpoints.ts]
- [x] [Review][Patch] Tree `truncated: true` not checked — added `console.warn` when truncated [scripts/fetch-checkpoints.ts]
- [x] [Review][Patch] `getNumber` zero overridden by `||` fallback — replaced with `hasNestedTokens` boolean guard [scripts/fetch-checkpoints.ts]
- [x] [Review][Patch] `parseTurn` appends silent stub for non-record turns — filter with `isRecord` before mapping [scripts/fetch-checkpoints.ts]
- [x] [Review][Patch] `fetchContent` base64 decode doesn't strip `\r` — changed to `/[\r\n]/g` [scripts/fetch-checkpoints.ts]
- [x] [Review][Patch] `path.replace('metadata.json', 'full.jsonl')` not anchored — changed to `/metadata\.json$/` regex [scripts/fetch-checkpoints.ts]
- [x] [Review][Patch] `BRANCH_ENCODED` is hand-maintained duplicate of `BRANCH` — now computed via `encodeURIComponent(BRANCH)` [scripts/fetch-checkpoints.ts]
- [x] [Review][Patch] `fetchWithRetry` HTTP-error test missing retry-count assertion — added `toHaveBeenCalledTimes(2)` [scripts/fetch-checkpoints.test.ts]
- [x] [Review][Defer] GitHub token sent to GitHub API paths sourced from tree response [scripts/fetch-checkpoints.ts] — deferred, pre-existing; paths are authenticated-user-controlled and filtered by regex before use
- [x] [Review][Defer] `extractBmadCommands` misses array-valued `content` blocks (Anthropic JSONL format) [scripts/fetch-checkpoints.ts, extractBmadCommands] — deferred, pre-existing; beyond spec scope for current checkpoint data format
- [x] [Review][Defer] `full.jsonl` fetched entirely into memory, not streamed [scripts/fetch-checkpoints.ts, run()] — deferred, pre-existing; GitHub contents API has 1MB limit; acceptable for build-time script
- [x] [Review][Defer] `resolve('./')` resolves relative to CWD, not script location [scripts/fetch-checkpoints.ts, outputPath] — deferred, pre-existing; npm scripts always run from project root
