import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CheckpointMeta, CheckpointsCache, TurnMeta } from './types.js';

const REPO = 'ShamsiievDmytro/entire-bmad';
const BRANCH = 'entire/checkpoints/v1';
const BRANCH_ENCODED = encodeURIComponent(BRANCH);
const BASE_URL = 'https://api.github.com';
const RETRY_DELAY_MS = 2000;
const PROMPT_TXT_MAX_LEN = 200;

let apiCallCount = 0;

export function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'metrics-fetch-script',
    Accept: 'application/vnd.github+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface TranscriptExtraction {
  bmad_commands: Record<string, number>;
  models: Record<string, number>;
  first_prompt: string;
}

export function extractTranscriptData(jsonlContent: string): TranscriptExtraction {
  const bmad_commands: Record<string, number> = {};
  const models: Record<string, number> = {};
  let first_prompt = '';

  const commandRegex = /^\/[a-z][a-z0-9-]*/;
  const commandTagRegex = /<command-name>(\/[a-z][a-z0-9-]*)<\/command-name>/;

  for (const line of jsonlContent.split('\n')) {
    if (!line.trim()) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isRecord(parsed)) continue;

    const messageRaw = isRecord(parsed['message']) ? parsed['message'] : null;

    // Extract model from assistant messages (at message.model)
    if (parsed['type'] === 'assistant' && messageRaw) {
      const model = getString(messageRaw, 'model');
      if (model) {
        models[model] = (models[model] ?? 0) + 1;
      }
    }

    // Extract BMAD commands and first prompt from user messages
    if (parsed['type'] === 'user') {
      if (parsed['isMeta'] === true) continue;

      const content =
        (messageRaw ? getString(messageRaw, 'content') : null) ??
        getString(parsed, 'content') ??
        getString(parsed, 'prompt') ??
        '';

      // Capture first non-empty user prompt
      if (!first_prompt && content.trim()) {
        const tagMatch = /<command-name>(\/[^\s<]+)<\/command-name>/.exec(content);
        first_prompt = tagMatch
          ? tagMatch[1]
          : content.trim().split('\n')[0]?.slice(0, PROMPT_TXT_MAX_LEN) ?? '';
      }

      // BMAD command extraction
      const tagMatch = commandTagRegex.exec(content);
      const cmd = tagMatch
        ? tagMatch[1]
        : commandRegex.exec(content.trimStart())?.[0];

      if (cmd) {
        bmad_commands[cmd] = (bmad_commands[cmd] ?? 0) + 1;
      }
    }
  }
  return { bmad_commands, models, first_prompt };
}

// Backward-compatible wrapper
export function extractBmadCommands(jsonlContent: string): Record<string, number> {
  return extractTranscriptData(jsonlContent).bmad_commands;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  delayFn: (ms: number) => Promise<void> = sleep
): Promise<unknown> {
  apiCallCount++;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await delayFn(RETRY_DELAY_MS);
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

async function fetchContent(
  path: string,
  headers: Record<string, string>
): Promise<string> {
  const url = `${BASE_URL}/repos/${REPO}/contents/${path}?ref=${BRANCH_ENCODED}`;
  const data = await fetchWithRetry(url, headers);
  if (!isRecord(data) || typeof data['content'] !== 'string') {
    throw new Error(`Unexpected contents response for ${path}`);
  }
  return Buffer.from(data['content'].replace(/[\r\n]/g, ''), 'base64').toString('utf-8');
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function getNumber(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  return typeof v === 'number' ? v : 0;
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}

function getArray(obj: Record<string, unknown>, key: string): unknown[] {
  const v = obj[key];
  return Array.isArray(v) ? v : [];
}

function countOrLength(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  if (typeof v === 'number') return v;
  if (Array.isArray(v)) return v.length;
  return 0;
}

function parseTurn(raw: Record<string, unknown>): TurnMeta {
  const promptRaw = getString(raw, 'prompt_txt') ?? getString(raw, 'prompt') ?? '';
  const prompt_txt = promptRaw.split('\n')[0]?.slice(0, PROMPT_TXT_MAX_LEN) ?? '';
  return {
    turn_id: getString(raw, 'turn_id') ?? getString(raw, 'id') ?? '',
    session_id: getString(raw, 'session_id') ?? '',
    model: getString(raw, 'model') ?? '',
    prompt_txt,
    turn_count: getNumber(raw, 'turn_count'),
    agent_percentage: getNumber(raw, 'agent_percentage'),
  };
}

export function parseMetadata(
  raw: unknown,
  checkpointId: string,
  commitDate: string
): Omit<CheckpointMeta, 'bmad_commands' | 'fetch_failed'> {
  if (!isRecord(raw)) {
    return {
      checkpoint_id: checkpointId,
      commit_date: commitDate,
      agent_percentage: 0,
      agent_lines: 0,
      human_added: 0,
      human_modified: 0,
      human_removed: 0,
      tokens: { input: 0, cache_creation: 0, cache_read: 0, output: 0 },
      summary: { friction: [], open_items: [] },
      learnings: { repo: 0, code: 0, workflow: 0 },
      files_touched: [],
      turns: [],
    };
  }

  const hasNestedTokens = isRecord(raw['tokens']);
  const tokensRaw = hasNestedTokens ? raw['tokens'] : {};
  const tokens = {
    input: hasNestedTokens ? getNumber(tokensRaw, 'input') : getNumber(raw, 'input_tokens'),
    cache_creation: hasNestedTokens ? getNumber(tokensRaw, 'cache_creation') : getNumber(raw, 'cache_creation_tokens'),
    cache_read: hasNestedTokens ? getNumber(tokensRaw, 'cache_read') : getNumber(raw, 'cache_read_tokens'),
    output: hasNestedTokens ? getNumber(tokensRaw, 'output') : getNumber(raw, 'output_tokens'),
  };

  const summaryRaw = isRecord(raw['summary']) ? raw['summary'] : {};
  const frictionRaw = getArray(summaryRaw, 'friction');
  const openItemsRaw = getArray(summaryRaw, 'open_items');
  const summary = {
    friction: frictionRaw.filter((x): x is string => typeof x === 'string'),
    open_items: openItemsRaw.filter((x): x is string => typeof x === 'string'),
  };

  const learningsRaw = isRecord(raw['learnings']) ? raw['learnings'] : {};
  const learnings = {
    repo: countOrLength(learningsRaw, 'repo'),
    code: countOrLength(learningsRaw, 'code'),
    workflow: countOrLength(learningsRaw, 'workflow'),
  };

  const filesTouchedRaw = getArray(raw, 'files_touched');
  const files_touched = filesTouchedRaw.filter((x): x is string => typeof x === 'string');

  const turnsRaw = getArray(raw, 'turns');
  const turns = turnsRaw.filter((t): t is Record<string, unknown> => isRecord(t)).map(parseTurn);

  return {
    checkpoint_id: getString(raw, 'checkpoint_id') ?? checkpointId,
    commit_date: commitDate,
    agent_percentage: getNumber(raw, 'agent_percentage'),
    agent_lines: getNumber(raw, 'agent_lines'),
    human_added: getNumber(raw, 'human_added'),
    human_modified: getNumber(raw, 'human_modified'),
    human_removed: getNumber(raw, 'human_removed'),
    tokens,
    summary,
    learnings,
    files_touched,
    turns,
  };
}

// Actual on-disk structure:
//   <2-char>/<checkpoint-id>/metadata.json          — top-level: files_touched, sessions[]
//   <2-char>/<checkpoint-id>/<n>/metadata.json      — per-session: token_usage, initial_attribution
//   <2-char>/<checkpoint-id>/<n>/full.jsonl         — per-session transcript (for BMAD commands)

function parseSessionMeta(raw: unknown): {
  session_id: string;
  turn_id: string;
  created_at: string;
  turn_count: number;
  agent_percentage: number;
  agent_lines: number;
  human_added: number;
  human_modified: number;
  human_removed: number;
  tokens: { input: number; cache_creation: number; cache_read: number; output: number };
} {
  const defaults = {
    session_id: '', turn_id: '', created_at: '', turn_count: 0,
    agent_percentage: 0, agent_lines: 0, human_added: 0, human_modified: 0, human_removed: 0,
    tokens: { input: 0, cache_creation: 0, cache_read: 0, output: 0 },
  };
  if (!isRecord(raw)) return defaults;

  const tokenRaw = isRecord(raw['token_usage']) ? raw['token_usage'] : {};
  const attrRaw = isRecord(raw['initial_attribution']) ? raw['initial_attribution'] : {};
  const metricsRaw = isRecord(raw['session_metrics']) ? raw['session_metrics'] : {};

  return {
    session_id: getString(raw, 'session_id') ?? '',
    turn_id: getString(raw, 'turn_id') ?? '',
    created_at: getString(raw, 'created_at') ?? '',
    turn_count: getNumber(metricsRaw, 'turn_count'),
    agent_percentage: getNumber(attrRaw, 'agent_percentage'),
    agent_lines: getNumber(attrRaw, 'agent_lines'),
    human_added: getNumber(attrRaw, 'human_added'),
    human_modified: getNumber(attrRaw, 'human_modified'),
    human_removed: getNumber(attrRaw, 'human_removed'),
    tokens: {
      input: getNumber(tokenRaw, 'input_tokens'),
      cache_creation: getNumber(tokenRaw, 'cache_creation_tokens'),
      cache_read: getNumber(tokenRaw, 'cache_read_tokens'),
      output: getNumber(tokenRaw, 'output_tokens'),
    },
  };
}

async function run(): Promise<void> {
  apiCallCount = 0;
  const startTime = Date.now();
  const token = process.env['GITHUB_TOKEN'];
  const headers = buildHeaders(token);

  if (!token) {
    console.warn('WARN: No GITHUB_TOKEN set — unauthenticated requests (60 req/hour limit)');
  }

  // Step 1: Discover checkpoints via tree API
  // Actual path pattern: <2-char>/<checkpoint-id>/metadata.json
  console.log('Step 1: Discovering checkpoints...');
  const treeUrl = `${BASE_URL}/repos/${REPO}/git/trees/${BRANCH_ENCODED}?recursive=1`;
  const treeData = await fetchWithRetry(treeUrl, headers);
  if (!isRecord(treeData) || !Array.isArray(treeData['tree'])) {
    throw new Error('Unexpected tree API response');
  }
  if (treeData['truncated'] === true) {
    console.warn('WARN: GitHub tree response is truncated — some checkpoints may be missing');
  }

  // Top-level metadata: exactly 2 path segments, second segment is the checkpoint id
  const metadataPaths: Array<{ id: string; path: string }> = [];
  for (const item of treeData['tree']) {
    if (!isRecord(item) || typeof item['path'] !== 'string') continue;
    const match = /^[0-9a-f]{2}\/([0-9a-f]+)\/metadata\.json$/.exec(item['path']);
    if (match) {
      metadataPaths.push({ id: match[1], path: item['path'] });
    }
  }
  console.log(`  Found ${metadataPaths.length} checkpoints`);

  // Build a map of all per-session paths keyed by checkpoint id prefix (<2-char>/<id>)
  const sessionMetaPaths = new Map<string, string[]>();   // prefix → session metadata paths
  const sessionJsonlPaths = new Map<string, string[]>();  // prefix → session full.jsonl paths
  for (const item of treeData['tree']) {
    if (!isRecord(item) || typeof item['path'] !== 'string') continue;
    const metaMatch = /^([0-9a-f]{2}\/[0-9a-f]+)\/\d+\/metadata\.json$/.exec(item['path']);
    if (metaMatch) {
      const key = metaMatch[1];
      const arr = sessionMetaPaths.get(key) ?? [];
      arr.push(item['path']);
      sessionMetaPaths.set(key, arr);
    }
    const jsonlMatch = /^([0-9a-f]{2}\/[0-9a-f]+)\/\d+\/full\.jsonl$/.exec(item['path']);
    if (jsonlMatch) {
      const key = jsonlMatch[1];
      const arr = sessionJsonlPaths.get(key) ?? [];
      arr.push(item['path']);
      sessionJsonlPaths.set(key, arr);
    }
  }

  // Step 2: Fetch each checkpoint's data
  console.log('Step 2: Fetching checkpoint data...');
  const checkpoints: CheckpointMeta[] = [];

  for (const { id, path } of metadataPaths) {
    let checkpoint: CheckpointMeta;
    // Derive the path prefix used as key (e.g. "01/60328b41c7")
    const prefix = path.replace(/\/metadata\.json$/, '');

    try {
      // Read top-level metadata for files_touched and sessions list
      const topMetaText = await fetchContent(path, headers);
      const topMeta = JSON.parse(topMetaText) as unknown;
      const checkpointId = isRecord(topMeta) ? (getString(topMeta, 'checkpoint_id') ?? id) : id;
      const filesTouchedRaw = isRecord(topMeta) ? getArray(topMeta, 'files_touched') : [];
      const files_touched = filesTouchedRaw.filter((x): x is string => typeof x === 'string');

      // Read all per-session metadata files and aggregate
      const sessionPaths = sessionMetaPaths.get(prefix) ?? [];
      const sessions: ReturnType<typeof parseSessionMeta>[] = [];
      for (const sp of sessionPaths) {
        try {
          const text = await fetchContent(sp, headers);
          sessions.push(parseSessionMeta(JSON.parse(text) as unknown));
        } catch {
          // skip failed sessions
        }
      }

      // commit_date: earliest created_at across sessions
      const dates = sessions.map((s) => s.created_at).filter(Boolean).sort();
      const commit_date = dates[0] ?? new Date(0).toISOString();

      // Attribution: use session with highest agent_percentage (peak agent contribution).
      // initial_attribution is a cumulative repo snapshot — later sessions may reflect
      // human reclassification of agent code, so the peak best represents what the agent produced.
      const bestSession = sessions.reduce((best, s) =>
        s.agent_percentage > (best?.agent_percentage ?? -1) ? s : best, sessions[0]);
      const total_lines = (bestSession?.agent_lines ?? 0) + (bestSession?.human_added ?? 0);
      const agent_percentage = bestSession?.agent_percentage ?? 0;
      const agent_lines = bestSession?.agent_lines ?? 0;
      const human_added = bestSession?.human_added ?? 0;
      const human_modified = bestSession?.human_modified ?? 0;
      const human_removed = bestSession?.human_removed ?? 0;

      // Tokens: sum across all sessions
      const tokens = sessions.reduce(
        (acc, s) => ({
          input: acc.input + s.tokens.input,
          cache_creation: acc.cache_creation + s.tokens.cache_creation,
          cache_read: acc.cache_read + s.tokens.cache_read,
          output: acc.output + s.tokens.output,
        }),
        { input: 0, cache_creation: 0, cache_read: 0, output: 0 },
      );

      // Extract transcript data (BMAD commands, model, prompt) from each session's full.jsonl
      // Build a map from session index → extraction, keyed by jsonl path order
      const jsonlPaths = (sessionJsonlPaths.get(prefix) ?? []).sort();
      const sessionExtractions: TranscriptExtraction[] = [];
      let bmad_commands: Record<string, number> = {};
      for (const jp of jsonlPaths) {
        try {
          const jsonlText = await fetchContent(jp, headers);
          const extraction = extractTranscriptData(jsonlText);
          sessionExtractions.push(extraction);
          for (const [cmd, count] of Object.entries(extraction.bmad_commands)) {
            bmad_commands[cmd] = (bmad_commands[cmd] ?? 0) + count;
          }
        } catch {
          sessionExtractions.push({ bmad_commands: {}, models: {}, first_prompt: '' });
        }
      }

      // Turns: one entry per session, enriched with model/prompt from transcript
      const turns: TurnMeta[] = sessions.map((s, i) => {
        const ext = sessionExtractions[i];
        // Pick the most-used model in this session's transcript
        const topModel = ext
          ? Object.entries(ext.models).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
          : '';
        return {
          turn_id: s.turn_id,
          session_id: s.session_id,
          model: topModel,
          prompt_txt: ext?.first_prompt ?? '',
          turn_count: s.turn_count,
          agent_percentage: s.agent_percentage,
        };
      });

      checkpoint = {
        checkpoint_id: checkpointId,
        commit_date,
        agent_percentage,
        agent_lines,
        human_added,
        human_modified,
        human_removed,
        tokens,
        summary: { friction: [], open_items: [] },
        learnings: { repo: 0, code: 0, workflow: 0 },
        files_touched,
        turns,
        bmad_commands,
        fetch_failed: false,
      };
    } catch {
      checkpoint = {
        checkpoint_id: id,
        commit_date: new Date(0).toISOString(),
        agent_percentage: 0,
        agent_lines: 0,
        human_added: 0,
        human_modified: 0,
        human_removed: 0,
        tokens: { input: 0, cache_creation: 0, cache_read: 0, output: 0 },
        summary: { friction: [], open_items: [] },
        learnings: { repo: 0, code: 0, workflow: 0 },
        files_touched: [],
        turns: [],
        bmad_commands: {},
        fetch_failed: true,
      };
    }

    checkpoints.push(checkpoint);
    process.stdout.write(`  [${checkpoints.length}/${metadataPaths.length}] ${checkpoint.checkpoint_id}\n`);
  }

  const cache: CheckpointsCache = {
    meta: {
      repo: REPO,
      branch: BRANCH,
      generatedAt: new Date().toISOString(),
      checkpointCount: checkpoints.length,
    },
    checkpoints,
  };

  const outputPath = resolve('./src/data/checkpoints-cache.json');
  writeFileSync(outputPath, JSON.stringify(cache, null, 2), 'utf-8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\nDone. Checkpoints: ${checkpoints.length}, API calls: ${apiCallCount}, Time: ${elapsed}s`
  );
  console.log(`Output: ${outputPath}`);
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
