import { describe, it, expect } from 'vitest';
import {
  filterRenderableCheckpoints,
  computeRollingAverage,
  classifyPromptType,
  classifyFileLayer,
  computeCheckpointCadenceMinutes,
  aggregateBmadCommands,
  formatCheckpointOptionLabel,
  formatGeneratedAt,
  isRenderableCheckpoint,
  uniqueSessionCount,
} from './ai-metrics-utils';
import type { CheckpointMeta } from './ai-metrics-utils';

// Minimal stub factory for CheckpointMeta
function makeCheckpoint(overrides: Partial<CheckpointMeta>): CheckpointMeta {
  return {
    checkpoint_id: 'abc12345',
    commit_date: new Date().toISOString(),
    agent_percentage: 50,
    agent_lines: 100,
    human_added: 0,
    human_modified: 0,
    human_removed: 0,
    tokens: { input: 0, cache_creation: 0, cache_read: 0, output: 0 },
    summary: { friction: [], open_items: [] },
    learnings: { repo: 0, code: 0, workflow: 0 },
    files_touched: [],
    turns: [],
    bmad_commands: {},
    tool_usage: {},
    skill_usage: {},
    subagent_count: 0,
    author: 'Test Developer',
    fetch_failed: false,
    ...overrides,
  };
}

describe('computeRollingAverage', () => {
  it('returns element itself for window 1', () => {
    expect(computeRollingAverage([10, 20, 30], 1)).toEqual([10, 20, 30]);
  });

  it('computes window=3 on [10, 20, 30, 40]', () => {
    // i=0: [10] → 10; i=1: [10,20] → 15; i=2: [10,20,30] → 20; i=3: [20,30,40] → 30
    expect(computeRollingAverage([10, 20, 30, 40], 3)).toEqual([10, 15, 20, 30]);
  });

  it('returns empty array for empty input', () => {
    expect(computeRollingAverage([], 3)).toEqual([]);
  });

  it('handles window larger than array', () => {
    // window=5 on [10,20]: i=0 → 10; i=1 → 15
    expect(computeRollingAverage([10, 20], 5)).toEqual([10, 15]);
  });
});

describe('checkpoint display helpers', () => {
  it('treats populated checkpoints as renderable', () => {
    const checkpoint = makeCheckpoint({
      commit_date: '2026-01-01T00:00:00Z',
      agent_lines: 10,
    });

    expect(isRenderableCheckpoint(checkpoint)).toBe(true);
  });

  it('filters checkpoints with epoch dates and no session data', () => {
    const visible = makeCheckpoint({ commit_date: '2026-01-01T00:00:00Z', agent_lines: 10 });
    const hidden = makeCheckpoint({ commit_date: '1970-01-01T00:00:00.000Z', agent_lines: 0, turns: [] });

    expect(filterRenderableCheckpoints([visible, hidden])).toEqual([visible]);
  });

  it('formats generated timestamps for display', () => {
    expect(formatGeneratedAt('2026-01-01T00:00:00Z')).not.toBe('Unknown');
    expect(formatGeneratedAt('not-a-date')).toBe('Unknown');
    expect(formatGeneratedAt()).toBe('Not loaded yet');
  });

  it('formats selector labels from checkpoint ids and commit dates', () => {
    const checkpoint = makeCheckpoint({
      checkpoint_id: 'abcdef1234567890',
      commit_date: '2026-01-02T03:04:00Z',
    });

    expect(formatCheckpointOptionLabel(checkpoint)).toContain('abcdef12');
  });
});

describe('classifyPromptType', () => {
  it('classifies slash command', () => {
    expect(classifyPromptType('/foo')).toBe('Slash Command');
  });

  it('classifies slash command with leading space', () => {
    expect(classifyPromptType('  /bar')).toBe('Slash Command');
  });

  it('classifies empty string as continuation', () => {
    expect(classifyPromptType('')).toBe('Continuation');
  });

  it('classifies regular text as free-form', () => {
    expect(classifyPromptType('explain this')).toBe('Free-form');
  });

  it('classifies non-empty non-slash as free-form', () => {
    expect(classifyPromptType('hello world')).toBe('Free-form');
  });
});

describe('classifyFileLayer', () => {
  it('classifies component files', () => {
    expect(classifyFileLayer('src/components/Foo.astro')).toBe('components');
  });

  it('classifies service files', () => {
    expect(classifyFileLayer('src/lib/services/connection.ts')).toBe('services');
  });

  it('classifies store files', () => {
    expect(classifyFileLayer('src/lib/stores/price.ts')).toBe('stores');
  });

  it('classifies utils files', () => {
    expect(classifyFileLayer('src/lib/utils/format.ts')).toBe('utils');
  });

  it('classifies docs folder files', () => {
    expect(classifyFileLayer('docs/readme.md')).toBe('docs');
  });

  it('classifies .md files as docs regardless of path', () => {
    expect(classifyFileLayer('CHANGELOG.md')).toBe('docs');
  });

  it('classifies other files', () => {
    expect(classifyFileLayer('config.json')).toBe('other');
  });

  it('classifies files at root with no known layer', () => {
    expect(classifyFileLayer('astro.config.mjs')).toBe('other');
  });
});

describe('computeCheckpointCadenceMinutes', () => {
  it('returns [0] for single checkpoint', () => {
    const cp = makeCheckpoint({ commit_date: '2026-01-01T00:00:00Z' });
    expect(computeCheckpointCadenceMinutes([cp])).toEqual([0]);
  });

  it('returns [0, 30] for two checkpoints 30 min apart', () => {
    const cp1 = makeCheckpoint({ commit_date: '2026-01-01T10:00:00Z' });
    const cp2 = makeCheckpoint({ commit_date: '2026-01-01T10:30:00Z' });
    expect(computeCheckpointCadenceMinutes([cp1, cp2])).toEqual([0, 30]);
  });

  it('sorts by commit_date before computing deltas', () => {
    // provide out-of-order checkpoints
    const cp1 = makeCheckpoint({ commit_date: '2026-01-01T10:30:00Z' });
    const cp2 = makeCheckpoint({ commit_date: '2026-01-01T10:00:00Z' });
    expect(computeCheckpointCadenceMinutes([cp1, cp2])).toEqual([0, 30]);
  });

  it('returns empty array for empty input', () => {
    expect(computeCheckpointCadenceMinutes([])).toEqual([]);
  });
});

describe('aggregateBmadCommands', () => {
  it('returns empty array when no commands', () => {
    const cp = makeCheckpoint({ bmad_commands: {} });
    expect(aggregateBmadCommands([cp])).toEqual([]);
  });

  it('merges overlapping commands from two checkpoints and sorts descending', () => {
    const cp1 = makeCheckpoint({ bmad_commands: { '/dev-story': 3, '/sprint-status': 1 } });
    const cp2 = makeCheckpoint({ bmad_commands: { '/dev-story': 2, '/create-story': 4 } });
    const result = aggregateBmadCommands([cp1, cp2]);
    expect(result).toEqual([
      { command: '/dev-story', count: 5 },
      { command: '/create-story', count: 4 },
      { command: '/sprint-status', count: 1 },
    ]);
  });

  it('produces sorted descending result', () => {
    const cp = makeCheckpoint({ bmad_commands: { a: 1, b: 5, c: 3 } });
    const result = aggregateBmadCommands([cp]);
    const counts = result.map((r) => r.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });
});

describe('uniqueSessionCount', () => {
  it('returns 0 for checkpoint with no turns', () => {
    const cp = makeCheckpoint({ turns: [] });
    expect(uniqueSessionCount(cp)).toBe(0);
  });

  it('returns 1 for turns all in same session', () => {
    const cp = makeCheckpoint({
      turns: [
        { turn_id: 't1', session_id: 's1', model: 'claude', prompt_txt: '', turn_count: 1, agent_percentage: 100 },
        { turn_id: 't2', session_id: 's1', model: 'claude', prompt_txt: '', turn_count: 2, agent_percentage: 100 },
      ],
    });
    expect(uniqueSessionCount(cp)).toBe(1);
  });

  it('returns 2 for turns with 2 unique session_ids', () => {
    const cp = makeCheckpoint({
      turns: [
        { turn_id: 't1', session_id: 's1', model: 'claude', prompt_txt: '', turn_count: 1, agent_percentage: 100 },
        { turn_id: 't2', session_id: 's2', model: 'claude', prompt_txt: '', turn_count: 2, agent_percentage: 100 },
        { turn_id: 't3', session_id: 's1', model: 'claude', prompt_txt: '', turn_count: 3, agent_percentage: 100 },
      ],
    });
    expect(uniqueSessionCount(cp)).toBe(2);
  });
});
