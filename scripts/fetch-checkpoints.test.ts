import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildHeaders,
  extractBmadCommands,
  extractTranscriptData,
  fetchWithRetry,
  parseMetadata,
} from './fetch-checkpoints.js';

// ─── buildHeaders ────────────────────────────────────────────────────────────

describe('buildHeaders', () => {
  it('always includes User-Agent and Accept', () => {
    const h = buildHeaders();
    expect(h['User-Agent']).toBe('metrics-fetch-script');
    expect(h['Accept']).toBe('application/vnd.github+json');
  });

  it('does not include Authorization when token is undefined', () => {
    const h = buildHeaders(undefined);
    expect(h['Authorization']).toBeUndefined();
  });

  it('includes Authorization Bearer when token is provided', () => {
    const h = buildHeaders('ghp_test123');
    expect(h['Authorization']).toBe('Bearer ghp_test123');
  });
});

// ─── extractBmadCommands ─────────────────────────────────────────────────────

describe('extractBmadCommands', () => {
  // Real Claude Code JSONL format: command in <command-name> tag inside message.content
  it('extracts commands from <command-name> tag in message.content (real format)', () => {
    const jsonl = [
      JSON.stringify({ type: 'user', message: { role: 'user', content: '<command-message>bmad-dev-story</command-message>\n<command-name>/bmad-dev-story</command-name>\n<command-args>story.md</command-args>' } }),
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: 'response' } }),
      JSON.stringify({ type: 'user', message: { role: 'user', content: '<command-name>/bmad-dev-story</command-name>' } }),
      JSON.stringify({ type: 'user', message: { role: 'user', content: '<command-name>/bmad-code-review</command-name>' } }),
    ].join('\n');

    const result = extractBmadCommands(jsonl);
    expect(result['/bmad-dev-story']).toBe(2);
    expect(result['/bmad-code-review']).toBe(1);
  });

  it('ignores <command-name> tags in assistant messages', () => {
    const jsonl = [
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: '<command-name>/bmad-dev-story</command-name>' } }),
    ].join('\n');

    const result = extractBmadCommands(jsonl);
    expect(Object.keys(result)).toHaveLength(0);
  });

  // Legacy / flat format fallback
  it('counts slash commands from flat content field (legacy format)', () => {
    const jsonl = [
      JSON.stringify({ type: 'user', content: '/bmad-dev-story implement epic 2' }),
      JSON.stringify({ type: 'assistant', content: '/bmad-dev-story should be ignored' }),
      JSON.stringify({ type: 'user', content: '/bmad-dev-story again' }),
      JSON.stringify({ type: 'user', content: '/bmad-code-review' }),
    ].join('\n');

    const result = extractBmadCommands(jsonl);
    expect(result['/bmad-dev-story']).toBe(2);
    expect(result['/bmad-code-review']).toBe(1);
  });

  it('ignores non-command user lines', () => {
    const jsonl = [
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'just a regular message' } }),
      JSON.stringify({ type: 'user', content: 'another message without slash' }),
    ].join('\n');

    const result = extractBmadCommands(jsonl);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('handles prompt field as fallback', () => {
    const jsonl = JSON.stringify({ type: 'user', prompt: '/bmad-create-story' });
    const result = extractBmadCommands(jsonl);
    expect(result['/bmad-create-story']).toBe(1);
  });

  it('skips malformed JSON lines silently', () => {
    const jsonl = ['not-json', JSON.stringify({ type: 'user', content: '/foo' })].join('\n');
    const result = extractBmadCommands(jsonl);
    expect(result['/foo']).toBe(1);
  });

  it('returns empty object for empty input', () => {
    expect(extractBmadCommands('')).toEqual({});
  });
});

// ─── extractTranscriptData ───────────────────────────────────────────────────

describe('extractTranscriptData', () => {
  it('extracts model from assistant messages at message.model', () => {
    const jsonl = [
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', model: 'claude-sonnet-4-6', content: 'hi' } }),
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', model: 'claude-sonnet-4-6', content: 'ok' } }),
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', model: 'claude-opus-4-6', content: 'done' } }),
    ].join('\n');

    const result = extractTranscriptData(jsonl);
    expect(result.models['claude-sonnet-4-6']).toBe(2);
    expect(result.models['claude-opus-4-6']).toBe(1);
  });

  it('extracts first non-meta user prompt from command-name tag', () => {
    const jsonl = [
      JSON.stringify({ type: 'user', isMeta: true, message: { role: 'user', content: 'system stuff' } }),
      JSON.stringify({ type: 'user', message: { role: 'user', content: '<command-name>/bmad-dev-story</command-name>\n<command-args>file.md</command-args>' } }),
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'second prompt' } }),
    ].join('\n');

    const result = extractTranscriptData(jsonl);
    expect(result.first_prompt).toBe('/bmad-dev-story');
  });

  it('extracts first non-meta user prompt from plain text', () => {
    const jsonl = [
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'Fix the login bug\nmore details here' } }),
    ].join('\n');

    const result = extractTranscriptData(jsonl);
    expect(result.first_prompt).toBe('Fix the login bug');
  });

  it('returns bmad_commands, models, and first_prompt together', () => {
    const jsonl = [
      JSON.stringify({ type: 'user', message: { role: 'user', content: '<command-name>/bmad-code-review</command-name>' } }),
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', model: 'claude-opus-4-6', content: 'reviewing' } }),
    ].join('\n');

    const result = extractTranscriptData(jsonl);
    expect(result.bmad_commands['/bmad-code-review']).toBe(1);
    expect(result.models['claude-opus-4-6']).toBe(1);
    expect(result.first_prompt).toBe('/bmad-code-review');
  });

  it('skips isMeta user messages for first_prompt', () => {
    const jsonl = [
      JSON.stringify({ type: 'user', isMeta: true, message: { role: 'user', content: 'meta content' } }),
    ].join('\n');

    const result = extractTranscriptData(jsonl);
    expect(result.first_prompt).toBe('');
  });
});

// ─── parseMetadata ────────────────────────────────────────────────────────────

describe('parseMetadata', () => {
  it('maps all fields from a well-formed metadata object', () => {
    const raw = {
      checkpoint_id: 'cp001',
      agent_percentage: 85,
      agent_lines: 200,
      human_added: 10,
      human_modified: 5,
      human_removed: 2,
      tokens: { input: 5000, cache_creation: 1000, cache_read: 2000, output: 500 },
      summary: { friction: ['item1'], open_items: ['todo1', 'todo2'] },
      learnings: { repo: ['r1', 'r2'], code: ['c1'], workflow: [] },
      files_touched: ['src/foo.ts', 'src/bar.ts'],
      turns: [
        {
          turn_id: 't1',
          session_id: 's1',
          model: 'claude-opus-4',
          prompt_txt: 'fix the bug',
          turn_count: 3,
          agent_percentage: 90,
        },
      ],
    };

    const result = parseMetadata(raw, 'cp001', '2026-01-01T00:00:00Z');

    expect(result.checkpoint_id).toBe('cp001');
    expect(result.commit_date).toBe('2026-01-01T00:00:00Z');
    expect(result.agent_percentage).toBe(85);
    expect(result.agent_lines).toBe(200);
    expect(result.human_added).toBe(10);
    expect(result.human_modified).toBe(5);
    expect(result.human_removed).toBe(2);
    expect(result.tokens).toEqual({ input: 5000, cache_creation: 1000, cache_read: 2000, output: 500 });
    expect(result.summary.friction).toEqual(['item1']);
    expect(result.summary.open_items).toEqual(['todo1', 'todo2']);
    expect(result.learnings.repo).toBe(2); // array length
    expect(result.learnings.code).toBe(1);
    expect(result.learnings.workflow).toBe(0);
    expect(result.files_touched).toEqual(['src/foo.ts', 'src/bar.ts']);
    expect(result.turns).toHaveLength(1);
    expect(result.turns[0]!.turn_id).toBe('t1');
  });

  it('handles flat token fields (input_tokens, etc.)', () => {
    const raw = {
      checkpoint_id: 'cp002',
      input_tokens: 1000,
      cache_creation_tokens: 200,
      cache_read_tokens: 300,
      output_tokens: 400,
    };

    const result = parseMetadata(raw, 'cp002', '2026-01-02T00:00:00Z');
    expect(result.tokens.input).toBe(1000);
    expect(result.tokens.cache_creation).toBe(200);
    expect(result.tokens.cache_read).toBe(300);
    expect(result.tokens.output).toBe(400);
  });

  it('returns safe defaults for null/non-object input', () => {
    const result = parseMetadata(null, 'cp-fallback', '2026-01-01T00:00:00Z');
    expect(result.checkpoint_id).toBe('cp-fallback');
    expect(result.agent_percentage).toBe(0);
    expect(result.tokens).toEqual({ input: 0, cache_creation: 0, cache_read: 0, output: 0 });
    expect(result.summary).toEqual({ friction: [], open_items: [] });
    expect(result.turns).toEqual([]);
  });

  it('truncates prompt_txt to 200 chars and uses first line only', () => {
    const longPrompt = 'A'.repeat(300);
    const raw = {
      turns: [{ turn_id: 't1', session_id: 's1', model: 'm', prompt_txt: `${longPrompt}\nsecond line`, turn_count: 1, agent_percentage: 0 }],
    };
    const result = parseMetadata(raw, 'cp003', '2026-01-01T00:00:00Z');
    expect(result.turns[0]!.prompt_txt).toHaveLength(200);
    expect(result.turns[0]!.prompt_txt).not.toContain('second line');
  });
});

// ─── fetchWithRetry ───────────────────────────────────────────────────────────

const noDelay = () => Promise.resolve();

describe('fetchWithRetry', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns parsed JSON on first success', async () => {
    const mockData = { tree: [] };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as unknown as Response);

    const result = await fetchWithRetry('https://api.github.com/test', {}, noDelay);
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries once on failure and succeeds on second attempt', async () => {
    const mockData = { ok: true };
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('network error')))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as unknown as Response);

    const result = await fetchWithRetry('https://api.github.com/test', {}, noDelay);
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws after two failures so caller can set fetch_failed: true', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('fail 1')))
      .mockImplementationOnce(() => Promise.reject(new Error('fail 2')));

    await expect(fetchWithRetry('https://api.github.com/test', {}, noDelay)).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws on non-ok HTTP response after two attempts', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: false, status: 403 } as unknown as Response)
    );

    await expect(fetchWithRetry('https://api.github.com/test', {}, noDelay)).rejects.toThrow('HTTP 403');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
