# git-ai Reference

> Tested against git-ai **v1.3.1** on 2026-04-17 in repo `/Users/dmytroshamsiiev/Projects/metrics` (branch: `main`).
> All command outputs are from live testing during a Claude Code session with hooks active.

---

## Installation & Configuration

### Binary

| Item | Value |
|------|-------|
| Binary | `~/.git-ai/bin/git-ai` (symlinked into `~/.local/bin/git-ai`) |
| Version | 1.3.1 |
| Platform | macOS aarch64 (Apple M4 Pro) |
| Git | 2.53.0 via `/opt/homebrew/bin/git` |

### Hooks (Claude Code)

Configured in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.git-ai/bin/git-ai checkpoint claude --hook-input stdin"
      }]
    }],
    "PostToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "~/.git-ai/bin/git-ai checkpoint claude --hook-input stdin"
      }]
    }]
  }
}
```

Both `PreToolUse` and `PostToolUse` fire `git-ai checkpoint claude` on **every tool call**. The checkpoint command receives the tool call payload via stdin and uses it to track which lines were written/modified by AI.

### Configuration File

Location: `~/.git-ai/config.json`

```json
{
  "git_path": "/opt/homebrew/bin/git",
  "prompt_storage": "default",
  "feature_flags": {
    "rewrite_stash": true,
    "inter_commit_move": false,
    "async_mode": true,
    "git_hooks_enabled": false
  },
  "telemetry_oss_disabled": false,
  "quiet": false
}
```

### Background Daemon

git-ai runs a background daemon that listens on Unix sockets for trace2 events from git:

| File | Purpose |
|------|---------|
| `~/.git-ai/internal/daemon/control.sock` | Control socket |
| `~/.git-ai/internal/daemon/trace2.sock` | Git trace2 event stream |
| `~/.git-ai/internal/daemon/daemon.pid.json` | PID file |
| `~/.git-ai/internal/daemon/daemon.lock` | Lock file |
| `~/.git-ai/internal/daemon/logs/` | Daemon logs |

The daemon is started automatically. Git is configured globally to send trace2 events to it:
```
trace2.eventtarget=af_unix:stream:~/.git-ai/internal/daemon/trace2.sock
```

---

## Data Storage Architecture

git-ai stores data in three locations:

### 1. Git Notes (`refs/notes/ai`)

**Primary per-commit storage.** Each annotated commit gets a note under `refs/notes/ai` containing line-level attribution data.

#### Raw note structure (example from commit `3e2941c`):

```
src/lib/types.ts
  c4c09426203e4095 21-23
---
{
  "schema_version": "authorship/3.0.0",
  "git_ai_version": "1.3.1",
  "base_commit_sha": "3e2941c2cae894333975cda570bcc592a5a317ce",
  "prompts": {
    "<prompt_id>": {
      "agent_id": {
        "tool": "claude",
        "id": "bb5159a3-9718-4f7f-a947-a09483de3284",
        "model": "claude-opus-4-6"
      },
      "human_author": "Dmytro Shamsiiev",
      "messages": [],
      "total_additions": 3,
      "total_deletions": 0,
      "accepted_lines": 3,
      "overriden_lines": 0
    }
  }
}
```

**Format:** The note has two sections separated by `---`:
1. **Header:** File-level line mapping -- `<file_path>\n  <prompt_id> <start_line>-<end_line>`
2. **Body:** JSON blob with schema version, prompt metadata, and per-prompt statistics

**Reading raw notes:**
```bash
git notes --ref=ai list                    # List all annotated commits
git notes --ref=ai show <commit-sha>       # Show raw note for a commit
```

### 2. Internal SQLite Database (`~/.git-ai/internal/db`)

**Persistent local storage** for prompt records, sync queue, and caching.

#### Tables

##### `prompts`
```sql
CREATE TABLE prompts (
    id TEXT PRIMARY KEY NOT NULL,
    workdir TEXT,
    tool TEXT NOT NULL,
    model TEXT NOT NULL,
    external_thread_id TEXT NOT NULL,
    messages TEXT NOT NULL,
    commit_sha TEXT,
    agent_metadata TEXT,
    human_author TEXT,
    total_additions INTEGER,
    total_deletions INTEGER,
    accepted_lines INTEGER,
    overridden_lines INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Prompt session ID (e.g., `c4c09426203e4095`) |
| `workdir` | TEXT | Absolute path to the repository |
| `tool` | TEXT | AI tool name (`claude`, `cursor`, etc.) |
| `model` | TEXT | Model identifier (`claude-opus-4-6`, etc.) |
| `external_thread_id` | TEXT | Session/conversation UUID |
| `messages` | TEXT | JSON array of conversation messages |
| `commit_sha` | TEXT | Associated commit (set after commit) |
| `agent_metadata` | TEXT | Additional agent-specific metadata |
| `human_author` | TEXT | Git author name |
| `total_additions` | INTEGER | Lines added by AI |
| `total_deletions` | INTEGER | Lines deleted by AI |
| `accepted_lines` | INTEGER | AI lines accepted as-is |
| `overridden_lines` | INTEGER | AI lines modified by human |
| `created_at` | INTEGER | Unix timestamp |
| `updated_at` | INTEGER | Unix timestamp |

##### `cas_sync_queue`
```sql
CREATE TABLE cas_sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'processing')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_sync_error TEXT,
    last_sync_at INTEGER,
    next_retry_at INTEGER NOT NULL,
    processing_started_at INTEGER,
    created_at INTEGER NOT NULL
);
```

Content-addressable storage sync queue for uploading prompt data to the remote service.

##### `cas_cache`
```sql
CREATE TABLE cas_cache (
    hash TEXT PRIMARY KEY NOT NULL,
    messages TEXT NOT NULL,
    cached_at INTEGER NOT NULL
);
```

Local cache for fetched prompt messages (by content hash).

##### `schema_metadata`
```sql
CREATE TABLE schema_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);
```

Currently stores: `version = 3`.

### 3. Metrics Database (`~/.git-ai/internal/metrics-db`)

Telemetry/usage tracking database.

#### Tables

##### `metrics`
```sql
CREATE TABLE metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_json TEXT NOT NULL
);
```

##### `agent_usage_throttle`
```sql
CREATE TABLE agent_usage_throttle (
    prompt_id TEXT PRIMARY KEY,
    last_sent_ts INTEGER NOT NULL
);
```

### 4. Prompts Database (`prompts.db` -- generated on demand)

Created in the repo root by `git-ai prompts --since <N>`. This is a **local analysis database** that pulls data from git notes into a queryable SQLite file.

#### Tables

##### `prompts`
```sql
CREATE TABLE prompts (
    seq_id INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    tool TEXT NOT NULL,
    model TEXT NOT NULL,
    external_thread_id TEXT,
    human_author TEXT,
    commit_sha TEXT,
    workdir TEXT,
    total_additions INTEGER,
    total_deletions INTEGER,
    accepted_lines INTEGER,
    overridden_lines INTEGER,
    accepted_rate REAL,
    messages TEXT,
    start_time INTEGER,
    last_time INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

Note: This table includes `accepted_rate` (REAL) and `start_time`/`last_time` fields not present in the internal DB.

##### `pointers`
```sql
CREATE TABLE pointers (
    name TEXT PRIMARY KEY DEFAULT 'default',
    current_seq_id INTEGER NOT NULL DEFAULT 0
);
```

Used for the iterator pattern (`git-ai prompts next` / `git-ai prompts reset`).

---

## Command Reference

### `git-ai stats [commit] --json`

**Purpose:** Show AI authorship statistics for the working tree or a specific commit.

**JSON Schema:**
```typescript
interface StatsOutput {
  human_additions: number;      // Lines added by humans
  unknown_additions: number;    // Lines with unknown authorship (pre-install commits)
  mixed_additions: number;      // Lines with both human and AI edits
  ai_additions: number;         // Lines added purely by AI
  ai_accepted: number;          // AI lines accepted without modification
  total_ai_additions: number;   // Total AI-authored additions
  total_ai_deletions: number;   // Total AI-authored deletions
  time_waiting_for_ai: number;  // Milliseconds spent waiting for AI responses
  git_diff_deleted_lines: number; // Total lines deleted in diff
  git_diff_added_lines: number;   // Total lines added in diff
  tool_model_breakdown: {
    [key: string]: {            // Key format: "<tool>::<model>" e.g. "claude::claude-opus-4-6"
      ai_additions: number;
      mixed_additions: number;
      ai_accepted: number;
      total_ai_additions: number;
      total_ai_deletions: number;
      time_waiting_for_ai: number;
    };
  };
}
```

**Example output:**
```json
{
  "human_additions": 0,
  "unknown_additions": 0,
  "mixed_additions": 0,
  "ai_additions": 3,
  "ai_accepted": 3,
  "total_ai_additions": 3,
  "total_ai_deletions": 0,
  "time_waiting_for_ai": 0,
  "git_diff_deleted_lines": 0,
  "git_diff_added_lines": 3,
  "tool_model_breakdown": {
    "claude::claude-opus-4-6": {
      "ai_additions": 3,
      "mixed_additions": 0,
      "ai_accepted": 3,
      "total_ai_additions": 3,
      "total_ai_deletions": 0,
      "time_waiting_for_ai": 0
    }
  }
}
```

### `git-ai status --json`

**Purpose:** Show uncommitted AI authorship status (what's currently being tracked before next commit).

**JSON Schema:**
```typescript
interface StatusOutput {
  stats: StatsOutput;       // Same schema as stats command
  checkpoints: Array<any>;  // Active checkpoint sessions
}
```

### `git-ai log [-N]`

**Purpose:** Show commit log with AI authorship notes. Proxies `git log --notes=ai`.

Accepts all standard `git log` options. Displays the raw git note content inline with each commit.

### `git-ai show <rev>`

**Purpose:** Display raw authorship note for a commit. Output is the same format as the raw git note (header + JSON body).

### `git-ai diff <commit> --json --include-stats --all-prompts`

**Purpose:** Show diff with AI authorship annotations.

**JSON Schema:**
```typescript
interface DiffOutput {
  files: {
    [file_path: string]: {
      annotations: {
        [prompt_id: string]: Array<[start_line, end_line]>;
      };
      diff: string;           // Standard unified diff
      base_content: string;   // Full file content before change
    };
  };
  prompts: {
    [prompt_id: string]: {
      agent_id: {
        tool: string;         // "claude", "cursor", etc.
        id: string;           // Session UUID
        model: string;        // "claude-opus-4-6", etc.
      };
      human_author: string;
      messages: Array<Message>;
      total_additions: number;
      total_deletions: number;
      accepted_lines: number;
      overriden_lines: number;
    };
  };
  hunks: Array<{
    commit_sha: string;
    content_hash: string;
    hunk_kind: "addition" | "deletion" | "modification";
    start_line: number;
    end_line: number;
    file_path: string;
    prompt_id: string;
  }>;
  commits: {
    [sha: string]: {
      authored_time: string;   // ISO 8601
      msg: string;             // First line of commit message
      full_msg: string;        // Full commit message
      author: string;          // "Name <email>"
      authorship_note: string; // Raw git note content
    };
  };
  commit_stats: {              // Only with --include-stats
    ai_lines_added: number;
    ai_lines_generated: number;
    ai_deletions_generated: number;
    human_lines_added: number;
    unknown_lines_added: number;
    git_lines_added: number;
    git_lines_deleted: number;
    tool_model_breakdown: {
      [key: string]: {
        ai_lines_added: number;
        ai_lines_generated: number;
        ai_deletions_generated: number;
      };
    };
  };
}
```

### `git-ai blame <file>`

**Purpose:** Git blame with AI authorship overlay. Lines written by AI show `claude` (or the tool name) as the author instead of the human git author.

**Example output:**
```
2d85d5a3 (Dmytro Shamsiiev 2026-03-25 15:20:25 +0100  1) export interface PriceTick {
...
3e2941c2 (claude           2026-04-17 16:13:47 +0200 22) // git-ai test comment
3e2941c2 (claude           2026-04-17 16:13:47 +0200 23) export const GIT_AI_TEST_MARKER = ...
```

Lines from commits without git-ai notes show the original git author. Lines attributed to AI show the tool name (`claude`, `cursor`, etc.).

### `git-ai search`

**Purpose:** Search AI prompt history by commit, file, pattern, or prompt ID.

**Search modes** (at least one required):
- `--commit <rev>` -- Search by commit SHA, branch, tag, or symbolic ref
- `--file <path>` -- Search by file path
- `--pattern <text>` -- Full-text search in prompt messages
- `--prompt-id <id>` -- Look up specific prompt

**Filters:**
- `--tool <name>` -- Filter by AI tool
- `--author <name>` -- Filter by human author
- `--since <time>` -- After this time (relative: `7d`, `2h`, `1w`; absolute: `YYYY-MM-DD`)
- `--until <time>` -- Before this time
- `--lines <start-end>` -- Line range (requires `--file`)

**Output formats** (mutually exclusive):
- *(default)* -- Human-readable summary
- `--json` -- Full JSON with transcripts
- `--verbose` -- Human-readable with full transcripts
- `--porcelain` -- Stable machine-parseable format
- `--count` -- Just result count

**JSON output schema:**
```typescript
interface SearchOutput {
  prompts: {
    [prompt_id: string]: {
      agent_id: {
        id: string;
        model: string;
        tool: string;
      };
      commits: string[];         // Associated commit SHAs
      human_author: string;
      locations: Array<{
        file: string;
        lines: string[];         // e.g., ["[21, 23]"]
      }>;
      messages: Array<{
        text: string;
        timestamp: string;       // ISO 8601
        type: "user" | "assistant";
      }>;
      total_additions: number;
      total_deletions: number;
    };
  };
  query: {
    file?: string;
    commit?: string;
    pattern?: string;
    line_ranges: Array<any>;
    mode: "file" | "commit" | "pattern";
  };
  result_count: number;
}
```

**Note:** `--since` filtering is **not yet implemented** for `--pattern` searches (warning: `--since filtering is not yet implemented and will be ignored`).

### `git-ai prompts`

**Purpose:** Create a local SQLite database (`prompts.db`) for prompt analysis.

**Usage:**
```bash
git-ai prompts --since <N>        # Fetch last N days of prompts into prompts.db
git-ai prompts exec "<SQL>"       # Execute arbitrary SQL on prompts.db
git-ai prompts list               # List prompts as TSV
git-ai prompts next               # Get next prompt as JSON (iterator)
git-ai prompts reset              # Reset iteration pointer
```

**Note:** `--since` takes a plain integer (number of days), not duration notation like `1d`.

### `git-ai checkpoint <preset>`

**Purpose:** Checkpoint working changes and attribute authorship.

**Presets:** `claude`, `codex`, `continue-cli`, `cursor`, `gemini`, `github-copilot`, `amp`, `windsurf`, `opencode`, `pi`, `ai_tab`, `firebender`, `mock_ai`, `mock_known_human`, `known_human`

### Other Commands

| Command | Purpose |
|---------|---------|
| `git-ai continue` | Restore AI session context and launch agent (uses prompt history) |
| `git-ai share <id>` | Share a prompt by creating a bundle |
| `git-ai sync-prompts` | Update prompts in database to latest versions |
| `git-ai fetch-notes [remote]` | Synchronously fetch AI authorship notes from remote |
| `git-ai squash-authorship` | Generate authorship log for squashed commits |
| `git-ai ci github` | GitHub CI helpers |
| `git-ai install-hooks` / `uninstall-hooks` | Manage git hooks |
| `git-ai login` / `logout` / `whoami` | Authentication |

---

## Field-by-Field Mapping to Current CheckpointMeta

| CheckpointMeta Field | git-ai Equivalent | Coverage | How to Retrieve |
|---|---|---|---|
| `checkpoint_id` | prompt `id` | Yes | `git-ai search --commit <sha> --json` -> `prompts.<id>` |
| `commit_date` | `commits.<sha>.authored_time` | Yes | `git-ai diff <sha> --json` -> `commits.<sha>.authored_time` |
| `agent_percentage` | Computable from `ai_additions / git_diff_added_lines` | Yes | `git-ai stats <sha> --json` -> `ai_additions` / `git_diff_added_lines` |
| `agent_lines` | `ai_additions` | Yes | `git-ai stats <sha> --json` -> `ai_additions` |
| `human_added` | `human_additions` | Yes | `git-ai stats <sha> --json` -> `human_additions` |
| `human_modified` | `overriden_lines` (per-prompt) | Partial | `git-ai diff <sha> --json --all-prompts` -> `prompts.<id>.overriden_lines`. Note: this counts AI lines the human modified, not pure human edits. |
| `human_removed` | No direct equivalent | No | git-ai tracks AI deletions (`total_ai_deletions`) but not human-initiated deletions as a separate metric. |
| `tokens.input` | Not tracked | No | git-ai does not have access to API token usage. Tokens come from Claude API response metadata. |
| `tokens.cache_creation` | Not tracked | No | Same -- API-level metric not available to git-ai. |
| `tokens.cache_read` | Not tracked | No | Same. |
| `tokens.output` | Not tracked | No | Same. |
| `summary.friction` | Not tracked | No | Custom BMAD field. git-ai has no equivalent. |
| `summary.open_items` | Not tracked | No | Custom BMAD field. |
| `learnings.repo` | Not tracked | No | Custom BMAD field. |
| `learnings.code` | Not tracked | No | Custom BMAD field. |
| `learnings.workflow` | Not tracked | No | Custom BMAD field. |
| `files_touched` | Derivable from diff annotations | Yes | `git-ai diff <sha> --json` -> `Object.keys(files)` |
| `turns[].turn_id` | prompt `id` | Partial | git-ai treats the entire session as one prompt, not individual turns. |
| `turns[].session_id` | `agent_id.id` (external_thread_id) | Yes | `git-ai search --commit <sha> --json` -> `prompts.<id>.agent_id.id` |
| `turns[].model` | `agent_id.model` | Yes | `git-ai search --commit <sha> --json` -> `prompts.<id>.agent_id.model` |
| `turns[].prompt_txt` | `messages[0].text` (first user message) | Yes | `git-ai search --commit <sha> --json` -> `prompts.<id>.messages` (filter type=user) |
| `turns[].turn_count` | Not tracked per-turn | No | git-ai stores a flat message array, not structured turns with counts. |
| `turns[].agent_percentage` | Not tracked per-turn | No | Agent percentage is only available at the commit level, not per-turn. |
| `bmad_commands` | Not tracked | No | BMAD-specific slash command tracking is not part of git-ai. |
| `fetch_failed` | N/A | N/A | Fetch status flag for the checkpoint system, not applicable to git-ai. |

### Coverage Summary

| Category | Coverage |
|----------|----------|
| **Fully covered** | `checkpoint_id`, `commit_date`, `agent_percentage`, `agent_lines`, `human_added`, `files_touched`, `turns[].session_id`, `turns[].model`, `turns[].prompt_txt` |
| **Partially covered** | `human_modified` (different semantics), `turns[].turn_id` (session-level not turn-level) |
| **Not covered** | All `tokens.*`, all `summary.*`, all `learnings.*`, `human_removed`, `turns[].turn_count`, `turns[].agent_percentage`, `bmad_commands` |

---

## What git-ai Cannot Replace

### 1. Token Usage Tracking
git-ai has **no access to API token counts** (input, output, cache_creation, cache_read). These metrics come from the Claude API response metadata, which is only visible to the application making the API call (Claude Code / the BMAD checkpoint system). git-ai operates at the git layer, not the API layer.

### 2. BMAD-Specific Metadata
- **`summary.friction` / `summary.open_items`** -- Session summaries generated by BMAD's custom logic
- **`learnings.repo` / `learnings.code` / `learnings.workflow`** -- Learning metrics specific to the BMAD framework
- **`bmad_commands`** -- Slash command usage counts (e.g., `{ "/bmad-dev-story": 3 }`)

These are all domain-specific to the BMAD checkpoint system and have no git-ai equivalent.

### 3. Per-Turn Granularity
git-ai tracks at the **session level** (one prompt ID = one AI coding session). The current checkpoint system tracks individual turns within a session (`turn_id`, `turn_count`, per-turn `agent_percentage`). git-ai's message array contains the raw conversation but doesn't structure it into discrete turns with individual statistics.

### 4. Human-Initiated Deletions
`human_removed` tracks lines the human deleted. git-ai tracks `total_ai_deletions` (lines AI deleted) and `git_diff_deleted_lines` (total lines deleted in a diff), but doesn't specifically attribute deletions to human vs AI in the same way.

---

## What git-ai Adds (Beyond Current System)

### 1. Per-Line AI Attribution (`git-ai blame`)
The current checkpoint system tracks `agent_percentage` and `agent_lines` at the commit level. git-ai provides **line-level attribution** -- you can see exactly which lines in a file were written by AI vs human, and which AI tool wrote them.

```bash
git-ai blame src/lib/types.ts
# Lines 1-20: Dmytro Shamsiiev (human)
# Lines 21-23: claude (AI)
```

### 2. Tool and Model Breakdown
git-ai breaks down AI contributions by `tool::model` combination:

```json
"tool_model_breakdown": {
  "claude::claude-opus-4-6": { "ai_additions": 3 },
  "cursor::gpt-4": { "ai_additions": 10 }
}
```

The current system only tracks `model` per turn. git-ai can show contributions from multiple AI tools in the same commit.

### 3. Time Waiting for AI
`time_waiting_for_ai` (milliseconds) -- measures how long the developer waited for AI responses. Not currently tracked by the checkpoint system.

### 4. Full Prompt Transcript Retrieval
git-ai stores the **complete conversation** (all user and assistant messages) and makes it searchable:

```bash
git-ai search --pattern "error handling" --json    # Full-text search
git-ai search --file src/lib/types.ts --json       # File-scoped search
git-ai search --commit abc1234 --json              # Commit-scoped search
```

The current system only stores `prompt_txt` (first line of the user prompt).

### 5. Accepted vs Overridden Lines
git-ai distinguishes between:
- `accepted_lines` -- AI-generated lines the human kept as-is
- `overriden_lines` -- AI-generated lines the human modified
- `mixed_additions` -- Lines with both human and AI contribution

This gives more nuanced insight into how much AI output was actually used verbatim.

### 6. Multi-Tool Attribution
git-ai supports 15+ AI tool presets (`claude`, `cursor`, `copilot`, `gemini`, `codex`, `windsurf`, `amp`, etc.). If developers switch tools mid-session, attribution is tracked per-tool.

### 7. Hunk-Level Metadata
The diff output includes `hunks` with content hashes, enabling deduplication and tracking of code movement across files.

### 8. Portable Data (Git Notes)
Attribution data is stored in `refs/notes/ai` -- standard git refs that can be pushed, pulled, and shared across clones:

```bash
git push origin refs/notes/ai           # Share attribution with team
git-ai fetch-notes                      # Pull attribution from remote
```

The current checkpoint system stores data on a separate branch (`entire/checkpoints/v1`).

---

## Recommended Integration Strategy

### Keep from Current Checkpoint System
These fields have **no git-ai equivalent** and must continue to be sourced from the BMAD checkpoint system:

1. **Token usage** (`tokens.input`, `tokens.cache_creation`, `tokens.cache_read`, `tokens.output`) -- Must be captured from the Claude API response. git-ai operates below the API layer.
2. **BMAD learnings** (`learnings.repo`, `learnings.code`, `learnings.workflow`) -- Domain-specific metrics.
3. **Session summaries** (`summary.friction`, `summary.open_items`) -- Generated by BMAD logic.
4. **BMAD command tracking** (`bmad_commands`) -- Slash command usage counts.

### Migrate to git-ai
These fields can be **replaced** by git-ai queries, with richer data:

1. **`agent_percentage`** -> `git-ai stats <sha> --json` (computable: `ai_additions / git_diff_added_lines`)
2. **`agent_lines`** -> `git-ai stats <sha> --json` -> `ai_additions`
3. **`human_added`** -> `git-ai stats <sha> --json` -> `human_additions`
4. **`files_touched`** -> `git-ai diff <sha> --json` -> `Object.keys(files)`
5. **`turns[].model`** -> `git-ai search --commit <sha> --json` -> `prompts.<id>.agent_id.model`
6. **`turns[].session_id`** -> `git-ai search --commit <sha> --json` -> `prompts.<id>.agent_id.id`
7. **`turns[].prompt_txt`** -> Full transcript available via `git-ai search`

### Add from git-ai (New Capabilities)
These are **net-new metrics** the dashboard could display:

1. **Line-level attribution** -- Show which specific lines in each file were AI-written
2. **Tool/model breakdown** -- Pie chart of AI contributions by tool and model
3. **Accepted vs overridden** -- What percentage of AI output was used verbatim
4. **Time waiting for AI** -- Track developer idle time waiting for AI
5. **Full prompt search** -- Let users search their prompt history by keyword

### Dashboard Integration Approach

To safely integrate git-ai data, use `execFileSync` (or the project's `execFileNoThrow` utility) instead of `exec` to avoid shell injection:

```typescript
import { execFileSync } from 'child_process';

// Query git-ai stats for a commit
const statsRaw = execFileSync('git-ai', ['stats', commitSha, '--json']).toString();
const stats = JSON.parse(statsRaw);

// Query git-ai diff for file-level attribution
const diffRaw = execFileSync('git-ai', ['diff', commitSha, '--json', '--include-stats', '--all-prompts']).toString();
const diff = JSON.parse(diffRaw);

// Build the hybrid CheckpointMeta
const checkpoint: Partial<CheckpointMeta> = {
  // FROM git-ai
  agent_percentage: stats.git_diff_added_lines > 0
    ? (stats.ai_additions / stats.git_diff_added_lines) * 100
    : 0,
  agent_lines: stats.ai_additions,
  human_added: stats.human_additions,
  files_touched: Object.keys(diff.files),
  turns: Object.entries(diff.prompts).map(([id, p]: [string, any]) => ({
    turn_id: id,
    session_id: p.agent_id.id,
    model: p.agent_id.model,
    prompt_txt: '(full transcript available via git-ai search)',
    turn_count: 0,
    agent_percentage: 0,
  })),

  // FROM existing checkpoint system (keep these)
  tokens: existingCheckpoint.tokens,
  summary: existingCheckpoint.summary,
  learnings: existingCheckpoint.learnings,
  bmad_commands: existingCheckpoint.bmad_commands,
};
```

### Migration Path

| Phase | Action |
|-------|--------|
| **Phase 1** | Run both systems in parallel. Add git-ai fields to the dashboard alongside existing checkpoint data. |
| **Phase 2** | For `agent_percentage`, `agent_lines`, `human_added`, `files_touched` -- switch the dashboard to read from git-ai. These are strictly more accurate (line-level vs commit-level). |
| **Phase 3** | Add new git-ai-only panels: blame view, tool breakdown chart, accepted/overridden ratio. |
| **Phase 4** | Evaluate whether token tracking can be added to git-ai (would require a Claude Code hook that captures API response metadata). If not, keep the checkpoint system for tokens only. |

---

## Appendix: Quick Reference

```bash
# Installation check
git-ai version
git-ai debug

# Per-commit stats
git-ai stats <sha> --json

# Working tree stats
git-ai stats --json

# Uncommitted status
git-ai status --json

# Commit log with AI notes
git-ai log -5

# Raw authorship note
git-ai show <sha>

# Diff with full attribution
git-ai diff <sha> --json --include-stats --all-prompts

# Line-level blame
git-ai blame <file>

# Search prompts
git-ai search --commit <sha> --json
git-ai search --file <path> --json
git-ai search --pattern "keyword" --json

# Build local analysis DB
git-ai prompts --since 30
git-ai prompts exec "SELECT * FROM prompts WHERE model = 'claude-opus-4-6'"

# Raw git notes
git notes --ref=ai list
git notes --ref=ai show <sha>
```
