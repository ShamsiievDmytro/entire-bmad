---
stepsCompleted: [1, 2]
inputDocuments: []
session_topic: 'AI usage metrics from Entire platform checkpoints'
session_goals: 'Identify what measurable data points are available from Entire checkpoint files and how to turn them into meaningful developer/team metrics for measuring AI usage during SDLC'
selected_approach: 'ai-recommended'
techniques_used: []
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Dmytro
**Date:** 2026-03-26

## Session Overview

**Topic:** AI usage metrics from Entire platform checkpoints
**Goals:** Identify what measurable data points are available from Entire checkpoint files and how to turn them into meaningful developer/team metrics for measuring AI usage during SDLC

### Context Guidance

Entire is a developer platform that hooks into Git to capture full AI agent sessions as versioned checkpoint data on every commit. Each checkpoint contains: conversation transcripts, token usage, files touched, code attribution (agent vs human lines), tool usage patterns, friction events, learnings, and more.

The checkpoint data model includes 40+ distinct fields across metadata.json and full.jsonl, organized into these domains:
- **Identity:** cli_version, checkpoint_id, session_id, agent, branch, strategy
- **Timing:** created_at, durationMs (per-turn), timestamps (per-event)
- **Scope:** files_touched, turn_count, checkpoints_count
- **Token Economics:** input_tokens, cache_creation_tokens, cache_read_tokens, output_tokens, api_call_count
- **Attribution:** agent_lines, human_added, human_modified, human_removed, total_committed, agent_percentage
- **Narrative:** intent, outcome, learnings (repo/code/workflow), friction, open_items
- **Behavior:** tool_use events, thinking blocks, hook events, stopReason, userModified flags
- **Environment:** model, inference_geo, cwd, gitBranch, slug

### Session Setup

Fresh session initialized to explore what metrics can be derived from this rich data source for developer AI usage measurement during SDLC.

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** AI usage metrics discovery with focus on systematically mapping 40+ data fields to meaningful SDLC metrics

**Recommended Techniques:**
- **Phase 1 — Morphological Analysis** (deep): Map all checkpoint fields × 5 metric dimensions
- **Phase 2 — Cross-Pollination** (creative): Steal from DORA, SPACE, sports analytics, HR metrics
- **Phase 3 — Six Thinking Hats** (structured): Evaluate metric candidates from 6 angles

## Actual Repository Structure (Ground Truth)

### Branch: `entire/checkpoints/v1`

**11 checkpoint groups** (each is one "work session that ended with a git commit):

| Checkpoint ID | Turns | Total transcript size | Notable |
|---|---|---|---|
| `0160328b41c7` | 5 turns | ~2.3MB | 12 checkpoints, stories 1.1–1.4 |
| `03746026e32e` | 1 turn | 269KB | Has rich summary |
| `3bb4287aa9e3` | 1 turn | 2.97MB | Largest single turn |
| `3c412f323cd2` | 2 turns | ~905KB | Story 2.1 |
| `514f85fbb27a` | 4 turns | ~2.4MB | |
| `59ab0efd71ee` | 1 turn | 765KB | Settings, 32 turns, rich summary |
| `7301392a9dff` | 3 turns | ~4.1MB | |
| `8f23bba9da7f` | 3 turns | ~5.2MB | Largest checkpoint group |
| `e3d4ffe741e3` | 2 turns | ~428KB | Has 5434-byte prompt.txt |
| `e461ea5b9722` | 1 turn | 267KB | 327KB metadata (very rich) |
| `f33fd5bc89f9` | 1 turn | 764KB | |

### File Hierarchy per Checkpoint

```
{prefix2}/{checkpoint_id}/
  ├── metadata.json              ← PARENT: aggregated across all turns
  │     fields: cli_version, checkpoint_id, strategy, branch,
  │             checkpoints_count, files_touched[], sessions[],
  │             token_usage{input, cache_creation, cache_read, output, api_call_count}
  │
  └── {turn_index}/              ← one directory per agent turn (0, 1, 2...)
        ├── metadata.json        ← TURN: individual session data
        │     fields: + session_id, created_at, agent, model, turn_id,
        │               session_metrics{turn_count},
        │               summary{intent, outcome, learnings, friction, open_items},
        │               initial_attribution{agent_lines, human_added, human_modified,
        │                                   human_removed, total_committed, agent_percentage}
        ├── full.jsonl           ← raw conversation transcript
        ├── prompt.txt           ← initial user prompt for this turn
        └── content_hash.txt     ← sha256 integrity hash
```

### Commit Log Structure (for datetime + ordering)

Each checkpoint generates commits with this pattern:
```
sha: abc123...   date: 2026-03-25T21:27:04Z   msg: "Checkpoint: 3c412f323cd2\n\nEntire-Session: {uuid}"
sha: def456...   date: 2026-03-25T21:27:08Z   msg: "Finalize transcript for Checkpoint: 3c412f323cd2"
```

**Datetime Strategy:**
- `turn metadata.created_at` — authoritative session start time (ISO 8601, in turn metadata.json)
- `commit.author.date` — commit push time (joinable via `checkpoint_id` in commit message)
- Both are available; `created_at` is preferred for "when did the work happen"; commit date for "when was it pushed"

### Data Fetch Pattern for Metrics Engine

```
1. GET /git/trees/{branch}?recursive=1
   → Discover all {prefix}/{checkpoint_id}/ directories

2. For each checkpoint:
   GET /contents/{prefix}/{checkpoint_id}/metadata.json
   → checkpoint_id, files_touched[], sessions[], token_usage (aggregated)

3. For each turn in sessions[]:
   GET /contents/{prefix}/{checkpoint_id}/{turn}/metadata.json
   → created_at, agent, model, turn_count, attribution, summary

4. GET /commits?sha={branch}&per_page=100
   → sha, author.date, message → extract checkpoint_id from message
   → JOIN with checkpoint data for commit-time ordering
```

## Data Fetching Architecture Decision

**Chosen: Option A — Local JSON cache file**

```
scripts/fetch-checkpoints.ts      ← fetches GitHub API once, writes cache
src/data/checkpoints-cache.json   ← single source of truth for dashboard
src/pages/index.astro             ← reads cache at build time (static)
```

**Fetch sequence:**
1. `GET /git/trees/entire/checkpoints/v1?recursive=1` → discover all paths
2. `GET /contents/{prefix}/{checkpoint_id}/metadata.json` × 11 → parent metadata
3. `GET /contents/{prefix}/{checkpoint_id}/{turn}/metadata.json` × ~30 → turn metadata
4. `GET /commits?sha=entire/checkpoints/v1` → commit dates + checkpoint_id mapping

**Cache schema root fields:** `generated_at`, `source_branch`, `checkpoints[]`, `commits[]`
**Per checkpoint:** `checkpoint_id`, `commit_date`, `files_touched[]`, `token_usage{}`, `turns[]`
**Per turn:** `created_at`, `model`, `turn_count`, `attribution{}`, `friction_count`, `open_items_count`, `learnings_count`, `prompt`, `intent`, `outcome`

**Refresh:** `npm run fetch-data` → `npm run dev`
**Rate limits:** ~44 API calls total — fine even unauthenticated (60/hour limit)

## Technique Execution

