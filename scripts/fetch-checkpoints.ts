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

export function extractBmadCommands(jsonlContent: string): Record<string, number> {
  const counts: Record<string, number> = {};
  const commandRegex = /^\/[a-z][a-z0-9-]*/;

  for (const line of jsonlContent.split('\n')) {
    if (!line.trim()) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isRecord(parsed) || parsed['type'] !== 'user') continue;

    const content = getString(parsed, 'content') ?? getString(parsed, 'prompt') ?? '';
    const trimmed = content.trimStart();
    const match = commandRegex.exec(trimmed);
    if (match) {
      const cmd = match[0];
      counts[cmd] = (counts[cmd] ?? 0) + 1;
    }
  }
  return counts;
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

async function fetchAllCommits(headers: Record<string, string>): Promise<unknown[]> {
  const all: unknown[] = [];
  let page = 1;
  while (true) {
    const url = `${BASE_URL}/repos/${REPO}/commits?sha=${BRANCH_ENCODED}&per_page=100&page=${page}`;
    const data = await fetchWithRetry(url, headers);
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all;
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
  console.log('Step 1: Discovering checkpoints...');
  const treeUrl = `${BASE_URL}/repos/${REPO}/git/trees/${BRANCH_ENCODED}?recursive=1`;
  const treeData = await fetchWithRetry(treeUrl, headers);
  if (!isRecord(treeData) || !Array.isArray(treeData['tree'])) {
    throw new Error('Unexpected tree API response');
  }
  if (treeData['truncated'] === true) {
    console.warn('WARN: GitHub tree response is truncated — some checkpoints may be missing');
  }

  const metadataPaths: Array<{ id: string; path: string }> = [];
  for (const item of treeData['tree']) {
    if (!isRecord(item) || typeof item['path'] !== 'string') continue;
    const match = /^checkpoints\/([^/]+)\/metadata\.json$/.exec(item['path']);
    if (match) {
      metadataPaths.push({ id: match[1], path: item['path'] });
    }
  }
  console.log(`  Found ${metadataPaths.length} checkpoints`);

  // Step 2: Fetch commit list to map checkpoint → commit_date
  console.log('Step 2: Fetching commit list...');
  const commitsData = await fetchAllCommits(headers);
  const commitDateMap = new Map<string, string>();

  for (const commit of commitsData) {
    if (!isRecord(commit)) continue;
    const message = isRecord(commit['commit']) ? getString(commit['commit'] as Record<string, unknown>, 'message') ?? '' : '';
    const dateStr = isRecord(commit['commit'])
      ? (isRecord((commit['commit'] as Record<string, unknown>)['author'])
          ? getString((commit['commit'] as Record<string, unknown>)['author'] as Record<string, unknown>, 'date')
          : undefined)
      : undefined;
    // Try to extract checkpoint ID from commit message
    const cpMatch = /checkpoint[:\s]+([a-zA-Z0-9_-]+)/i.exec(message);
    if (cpMatch && dateStr) {
      commitDateMap.set(cpMatch[1], dateStr);
    }
  }

  // Step 3 & 4: Fetch each checkpoint's metadata.json and full.jsonl
  console.log('Step 3/4: Fetching checkpoint data...');
  const checkpoints: CheckpointMeta[] = [];

  for (const { id, path } of metadataPaths) {
    let checkpoint: CheckpointMeta;

    try {
      const metadataText = await fetchContent(path, headers);
      const rawMeta = JSON.parse(metadataText) as unknown;
      const commitDate = commitDateMap.get(id) ?? new Date(0).toISOString();
      const base = parseMetadata(rawMeta, id, commitDate);

      // Step 4: heavy tier — fetch full.jsonl for BMAD command extraction
      let bmad_commands: Record<string, number> = {};
      try {
        const jsonlPath = path.replace(/metadata\.json$/, 'full.jsonl');
        const jsonlText = await fetchContent(jsonlPath, headers);
        bmad_commands = extractBmadCommands(jsonlText);
      } catch {
        // Heavy tier failure is silent — bmad_commands stays empty
      }

      checkpoint = { ...base, bmad_commands, fetch_failed: false };
    } catch {
      checkpoint = {
        checkpoint_id: id,
        commit_date: commitDateMap.get(id) ?? new Date(0).toISOString(),
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
    process.stdout.write(`  [${checkpoints.length}/${metadataPaths.length}] ${id}\n`);
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
