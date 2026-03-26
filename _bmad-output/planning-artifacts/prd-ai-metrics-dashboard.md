---
type: delta
masterPRD: prd.md
section: "Phase 2: AI Metrics Dashboard"
status: planning
date: 2026-03-26
---

# Delta PRD — AI Metrics Dashboard

> Sprint reference for Phase 2 implementation. Full context in `prd.md` → "Phase 2: AI Metrics Dashboard".

---

## Scope at a Glance

- **Data source:** `ShamsiievDmytro/entire-bmad`, branch `entire/checkpoints/v1`
- **Output:** 20 metric charts on a single scrollable page
- **Cache:** `src/data/checkpoints-cache.json` (gitignored, built by fetch script)
- **New script:** `scripts/fetch-checkpoints.ts`
- **Extends:** existing Astro + Tailwind v4 + dark theme (no new infra)

---

## 20 Metrics — Quick Reference

| # | Domain | Name | Source Field(s) |
|---|---|---|---|
| 1 | Attribution | Agent % per commit | `agent_percentage`, `commit_date` |
| 2 | Attribution | Pure-AI commit rate | `agent_percentage === 100` |
| 3 | Attribution | Human modification rate | `human_modified / agent_lines` |
| 4 | Attribution | Agent vs. human lines | `agent_lines`, `human_added`, `human_modified`, `human_removed` |
| 5 | Attribution | Zero-human-touch lines | `agent_lines` where all human fields = 0 |
| 6 | Token Economics | Token breakdown | `input_tokens`, `cache_creation_tokens`, `cache_read_tokens`, `output_tokens` |
| 7 | Token Economics | Cache leverage score | `cache_read_tokens / total_tokens` |
| 8 | Token Economics | API call count | `api_calls` or equivalent count per checkpoint |
| 9 | Token Economics | Model distribution | `model` field across all turns |
| 10 | Quality | Friction events | `summary.friction` array length |
| 11 | Quality | Open items debt | `summary.open_items` array length |
| 12 | Quality | Learnings generated | `learnings.repo + learnings.code + learnings.workflow` |
| 13 | Quality | Session depth | `session_metrics.turn_count` vs `agent_percentage` |
| 14 | Behavioral | BMAD command frequency | parse `type:"user"` in `full.jsonl` for `/bmad-*` and `/*` patterns **(heavy tier)** |
| 15 | Behavioral | Prompt type distribution | classify `prompt.txt` as slash command / free-form / continuation |
| 16 | Behavioral | Files touched by layer | file paths bucketed by `components/`, `services/`, `stores/`, `utils/`, docs |
| 17 | Behavioral | Session count per checkpoint | unique `session_id` values in `checkpoint.turns` |
| 18 | Temporal | Commit activity timeline | `commit_date`, colour by `agent_percentage` |
| 19 | Temporal | Checkpoint cadence | delta between consecutive `commit_date` values in minutes |
| 20 | Temporal | Attribution trend | rolling average of `agent_percentage` over all commits |

---

## Fetch Script — API Calls

```
GET /git/trees/{branch}?recursive=1          → discover all checkpoint paths
GET /contents/{path}/metadata.json × ~41    → parent + turn metadata
GET /commits?sha={branch}                    → join commit_date to checkpoint_id
full.jsonl line-by-line scan (type:"user")  → extract /bmad-* and /* commands only
```

**Rate limit:** ~44 calls total, within GitHub's 60 req/hour unauthenticated limit.
**Optional:** `GITHUB_TOKEN` env var for additional headroom.
**Retry:** 1 retry with 2s delay per failed call, then mark fetch-failed and continue.

---

## Cache Schema Contract

```json
{
  "meta": {
    "repo": "ShamsiievDmytro/entire-bmad",
    "branch": "entire/checkpoints/v1",
    "generatedAt": "<ISO timestamp>",
    "checkpointCount": 11
  },
  "checkpoints": [
    {
      "checkpoint_id": "...",
      "commit_date": "...",
      "agent_percentage": 0,
      "agent_lines": 0,
      "human_added": 0,
      "human_modified": 0,
      "human_removed": 0,
      "tokens": {
        "input": 0,
        "cache_creation": 0,
        "cache_read": 0,
        "output": 0
      },
      "summary": {
        "friction": [],
        "open_items": []
      },
      "learnings": { "repo": 0, "code": 0, "workflow": 0 },
      "files_touched": [],
      "turns": [
        {
          "turn_id": "...",
          "session_id": "...",
          "model": "...",
          "prompt_txt": "...",
          "turn_count": 0,
          "agent_percentage": 0
        }
      ],
      "bmad_commands": { "/bmad-dev-story": 0, "/bmad-code-review": 0 },
      "fetch_failed": false
    }
  ]
}
```

---

## Functional Requirements (FR1–FR33)

See `prd.md` → Phase 2 → Functional Requirements.

## Non-Functional Requirements (NFR1–NFR13)

See `prd.md` → Phase 2 → Non-Functional Requirements.

---

## Key Implementation Notes

- Reuse `lightweight-charts` for time-series (metrics 1, 7, 11, 18, 19, 20)
- Add `Chart.js` or `unovis` for bar and pie charts (metrics 4, 6, 8, 9, 10, 12, 14, 22–28)
- Extend existing Tailwind `@theme` tokens — no new design tokens needed for chart containers
- Pre-size all chart containers in static HTML shell to prevent CLS (NFR6)
- `checkpoints-cache.json` is gitignored; build fails with actionable message if absent (NFR13)
- Metric 14 (`full.jsonl` parse) is the only heavy-tier operation — stream line-by-line, skip on error
