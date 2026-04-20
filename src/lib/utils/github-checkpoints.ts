import type { CheckpointMeta, CheckpointsCache, TurnMeta } from '../../../scripts/types';

const REPO = 'ShamsiievDmytro/entire-bmad';
const BRANCH = 'entire/checkpoints/v1';
const BRANCH_ENCODED = encodeURIComponent(BRANCH);
const BASE_URL = 'https://api.github.com';
const RETRY_DELAY_MS = 2000;
const PROMPT_TXT_MAX_LEN = 200;

let apiCallCount = 0;

type Logger = {
  log?: (message: string) => void;
  warn?: (message: string) => void;
};

export interface TranscriptExtraction {
  bmad_commands: Record<string, number>;
  models: Record<string, number>;
  first_prompt: string;
  tool_usage: Record<string, number>;
  skill_usage: Record<string, number>;
  subagent_count: number;
}

export interface FetchCheckpointsCacheOptions {
  token?: string;
  logger?: Logger;
}

export interface FetchCheckpointsCacheResult {
  cache: CheckpointsCache;
  apiCallCount: number;
  elapsedMs: number;
}

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

export function getCheckpointSource(): { repo: string; branch: string } {
  return { repo: REPO, branch: BRANCH };
}

function decodeBase64Utf8(content: string): string {
  const normalized = content.replace(/[\r\n]/g, '');

  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  const bufferCtor = (globalThis as {
    Buffer?: {
      from(input: string, encoding: string): { toString(encoding: string): string };
    };
  }).Buffer;

  if (bufferCtor) {
    return bufferCtor.from(normalized, 'base64').toString('utf-8');
  }

  throw new Error('No base64 decoder available in this runtime');
}

export function extractTranscriptData(jsonlContent: string): TranscriptExtraction {
  const bmad_commands: Record<string, number> = {};
  const models: Record<string, number> = {};
  const tool_usage: Record<string, number> = {};
  const skill_usage: Record<string, number> = {};
  let subagent_count = 0;
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

    if (parsed['type'] === 'assistant' && messageRaw) {
      const model = getString(messageRaw, 'model');
      if (model) {
        models[model] = (models[model] ?? 0) + 1;
      }

      const contentArr = Array.isArray(messageRaw['content']) ? messageRaw['content'] : [];
      for (const block of contentArr) {
        if (!isRecord(block) || block['type'] !== 'tool_use') continue;
        const toolName = getString(block, 'name') ?? 'unknown';
        tool_usage[toolName] = (tool_usage[toolName] ?? 0) + 1;

        const blockInput = isRecord(block['input']) ? block['input'] : null;
        if (toolName === 'Skill' && blockInput) {
          const skillId = getString(blockInput, 'skill') ?? getString(blockInput, 'name') ?? 'unknown';
          skill_usage[skillId] = (skill_usage[skillId] ?? 0) + 1;
        }

        if (toolName === 'Task' || toolName === 'Agent') {
          subagent_count++;
        }
      }
    }

    if (parsed['type'] === 'user') {
      if (parsed['isMeta'] === true) continue;

      const content =
        (messageRaw ? getString(messageRaw, 'content') : null) ??
        getString(parsed, 'content') ??
        getString(parsed, 'prompt') ??
        '';

      if (!first_prompt && content.trim()) {
        const tagMatch = /<command-name>(\/[^\s<]+)<\/command-name>/.exec(content);
        first_prompt = tagMatch
          ? tagMatch[1]
          : content.trim().split('\n')[0]?.slice(0, PROMPT_TXT_MAX_LEN) ?? '';
      }

      const tagMatch = commandTagRegex.exec(content);
      const command = tagMatch
        ? tagMatch[1]
        : commandRegex.exec(content.trimStart())?.[0];

      if (command) {
        bmad_commands[command] = (bmad_commands[command] ?? 0) + 1;
      }
    }
  }

  return { bmad_commands, models, first_prompt, tool_usage, skill_usage, subagent_count };
}

export function extractBmadCommands(jsonlContent: string): Record<string, number> {
  return extractTranscriptData(jsonlContent).bmad_commands;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  delayFn: (ms: number) => Promise<void> = sleep,
): Promise<unknown> {
  apiCallCount++;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await delayFn(RETRY_DELAY_MS);
    }

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

async function fetchContent(path: string, headers: Record<string, string>): Promise<string> {
  const url = `${BASE_URL}/repos/${REPO}/contents/${path}?ref=${BRANCH_ENCODED}`;
  const data = await fetchWithRetry(url, headers);

  if (!isRecord(data) || typeof data['content'] !== 'string') {
    throw new Error(`Unexpected contents response for ${path}`);
  }

  return decodeBase64Utf8(data['content']);
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function getNumber(obj: Record<string, unknown>, key: string): number {
  const value = obj[key];
  return typeof value === 'number' ? value : 0;
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

function getArray(obj: Record<string, unknown>, key: string): unknown[] {
  const value = obj[key];
  return Array.isArray(value) ? value : [];
}

function countOrLength(obj: Record<string, unknown>, key: string): number {
  const value = obj[key];
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) return value.length;
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
  commitDate: string,
): Omit<CheckpointMeta, 'bmad_commands' | 'tool_usage' | 'skill_usage' | 'subagent_count' | 'author' | 'fetch_failed'> {
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
    cache_creation: hasNestedTokens
      ? getNumber(tokensRaw, 'cache_creation')
      : getNumber(raw, 'cache_creation_tokens'),
    cache_read: hasNestedTokens
      ? getNumber(tokensRaw, 'cache_read')
      : getNumber(raw, 'cache_read_tokens'),
    output: hasNestedTokens ? getNumber(tokensRaw, 'output') : getNumber(raw, 'output_tokens'),
  };

  const summaryRaw = isRecord(raw['summary']) ? raw['summary'] : {};
  const frictionRaw = getArray(summaryRaw, 'friction');
  const openItemsRaw = getArray(summaryRaw, 'open_items');
  const summary = {
    friction: frictionRaw.filter((item): item is string => typeof item === 'string'),
    open_items: openItemsRaw.filter((item): item is string => typeof item === 'string'),
  };

  const learningsRaw = isRecord(raw['learnings']) ? raw['learnings'] : {};
  const learnings = {
    repo: countOrLength(learningsRaw, 'repo'),
    code: countOrLength(learningsRaw, 'code'),
    workflow: countOrLength(learningsRaw, 'workflow'),
  };

  const filesTouchedRaw = getArray(raw, 'files_touched');
  const files_touched = filesTouchedRaw.filter((item): item is string => typeof item === 'string');

  const turnsRaw = getArray(raw, 'turns');
  const turns = turnsRaw.filter((item): item is Record<string, unknown> => isRecord(item)).map(parseTurn);

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
  summary: { friction: string[]; open_items: string[] };
} {
  const defaults = {
    session_id: '',
    turn_id: '',
    created_at: '',
    turn_count: 0,
    agent_percentage: 0,
    agent_lines: 0,
    human_added: 0,
    human_modified: 0,
    human_removed: 0,
    tokens: { input: 0, cache_creation: 0, cache_read: 0, output: 0 },
    summary: { friction: [] as string[], open_items: [] as string[] },
  };

  if (!isRecord(raw)) {
    return defaults;
  }

  const tokenRaw = isRecord(raw['token_usage']) ? raw['token_usage'] : {};
  const attrRaw = isRecord(raw['initial_attribution']) ? raw['initial_attribution'] : {};
  const metricsRaw = isRecord(raw['session_metrics']) ? raw['session_metrics'] : {};
  const summaryRaw = isRecord(raw['summary']) ? raw['summary'] : {};

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
    summary: {
      friction: getArray(summaryRaw, 'friction').filter((item): item is string => typeof item === 'string'),
      open_items: getArray(summaryRaw, 'open_items').filter((item): item is string => typeof item === 'string'),
    },
  };
}

function logInfo(logger: Logger | undefined, message: string): void {
  logger?.log?.(message);
}

function logWarn(logger: Logger | undefined, message: string): void {
  logger?.warn?.(message);
}

export async function fetchCheckpointsCache(
  options: FetchCheckpointsCacheOptions = {},
): Promise<FetchCheckpointsCacheResult> {
  apiCallCount = 0;
  const startTime = Date.now();
  const headers = buildHeaders(options.token);

  if (!options.token) {
    logWarn(
      options.logger,
      'WARN: No GITHUB_TOKEN set — unauthenticated requests (60 req/hour limit)',
    );
  }

  logInfo(options.logger, 'Step 1: Discovering checkpoints...');
  const treeUrl = `${BASE_URL}/repos/${REPO}/git/trees/${BRANCH_ENCODED}?recursive=1`;
  const treeData = await fetchWithRetry(treeUrl, headers);

  if (!isRecord(treeData) || !Array.isArray(treeData['tree'])) {
    throw new Error('Unexpected tree API response');
  }

  if (treeData['truncated'] === true) {
    logWarn(options.logger, 'WARN: GitHub tree response is truncated — some checkpoints may be missing');
  }

  const metadataPaths: Array<{ id: string; path: string }> = [];
  for (const item of treeData['tree']) {
    if (!isRecord(item) || typeof item['path'] !== 'string') continue;

    const match = /^[0-9a-f]{2}\/([0-9a-f]+)\/metadata\.json$/.exec(item['path']);
    if (match) {
      metadataPaths.push({ id: match[1], path: item['path'] });
    }
  }
  metadataPaths.sort((left, right) => left.path.localeCompare(right.path));
  logInfo(options.logger, `  Found ${metadataPaths.length} checkpoints`);

  const sessionMetaPaths = new Map<string, string[]>();
  const sessionJsonlPaths = new Map<string, string[]>();
  for (const item of treeData['tree']) {
    if (!isRecord(item) || typeof item['path'] !== 'string') continue;

    const metaMatch = /^([0-9a-f]{2}\/[0-9a-f]+)\/\d+\/metadata\.json$/.exec(item['path']);
    if (metaMatch) {
      const key = metaMatch[1];
      const paths = sessionMetaPaths.get(key) ?? [];
      paths.push(item['path']);
      sessionMetaPaths.set(key, paths);
    }

    const jsonlMatch = /^([0-9a-f]{2}\/[0-9a-f]+)\/\d+\/full\.jsonl$/.exec(item['path']);
    if (jsonlMatch) {
      const key = jsonlMatch[1];
      const paths = sessionJsonlPaths.get(key) ?? [];
      paths.push(item['path']);
      sessionJsonlPaths.set(key, paths);
    }
  }

  logInfo(options.logger, 'Step 2: Fetching commit authors...');
  const authorMap = new Map<string, string>();
  try {
    const commitsUrl = `${BASE_URL}/repos/${REPO}/commits?sha=${BRANCH_ENCODED}&per_page=100`;
    const commitsData = await fetchWithRetry(commitsUrl, headers);
    if (Array.isArray(commitsData)) {
      for (const commit of commitsData) {
        if (!isRecord(commit)) continue;
        const commitObj = isRecord(commit['commit']) ? commit['commit'] : null;
        const message = commitObj ? getString(commitObj, 'message') : undefined;
        const authorObj = commitObj && isRecord(commitObj['author']) ? commitObj['author'] : null;
        const authorName = authorObj ? getString(authorObj, 'name') : undefined;
        if (message && authorName) {
          const match = /Checkpoint:\s*([0-9a-f]+)/.exec(message);
          if (match) {
            authorMap.set(match[1], authorName);
          }
        }
      }
    }
    logInfo(options.logger, `  Mapped ${authorMap.size} checkpoint authors`);
  } catch {
    logWarn(options.logger, 'WARN: Could not fetch commit authors — author field will be empty');
  }

  logInfo(options.logger, 'Step 3: Fetching checkpoint data...');
  const checkpoints: CheckpointMeta[] = [];

  for (const { id, path } of metadataPaths) {
    let checkpoint: CheckpointMeta;
    const prefix = path.replace(/\/metadata\.json$/, '');

    try {
      const topMetaText = await fetchContent(path, headers);
      const topMeta = JSON.parse(topMetaText) as unknown;
      const checkpointId = isRecord(topMeta) ? (getString(topMeta, 'checkpoint_id') ?? id) : id;
      const filesTouchedRaw = isRecord(topMeta) ? getArray(topMeta, 'files_touched') : [];
      const files_touched = filesTouchedRaw.filter((item): item is string => typeof item === 'string');

      const sessionPaths = [...(sessionMetaPaths.get(prefix) ?? [])].sort();
      const sessions: ReturnType<typeof parseSessionMeta>[] = [];
      for (const sessionPath of sessionPaths) {
        try {
          const text = await fetchContent(sessionPath, headers);
          sessions.push(parseSessionMeta(JSON.parse(text) as unknown));
        } catch {
          // Skip failed session metadata and continue building the checkpoint.
        }
      }

      const dates = sessions.map((session) => session.created_at).filter(Boolean).sort();
      const commit_date = dates[0] ?? new Date(0).toISOString();

      const bestSession = sessions.reduce<ReturnType<typeof parseSessionMeta> | undefined>(
        (best, session) =>
          session.agent_percentage > (best?.agent_percentage ?? -1) ? session : best,
        sessions[0],
      );

      const tokens = sessions.reduce(
        (accumulator, session) => ({
          input: accumulator.input + session.tokens.input,
          cache_creation: accumulator.cache_creation + session.tokens.cache_creation,
          cache_read: accumulator.cache_read + session.tokens.cache_read,
          output: accumulator.output + session.tokens.output,
        }),
        { input: 0, cache_creation: 0, cache_read: 0, output: 0 },
      );

      const summary = sessions.reduce(
        (acc, session) => ({
          friction: [...acc.friction, ...session.summary.friction],
          open_items: [...acc.open_items, ...session.summary.open_items],
        }),
        { friction: [] as string[], open_items: [] as string[] },
      );

      const jsonlPaths = [...(sessionJsonlPaths.get(prefix) ?? [])].sort();
      const sessionExtractions: TranscriptExtraction[] = [];
      const bmad_commands: Record<string, number> = {};
      const tool_usage: Record<string, number> = {};
      const skill_usage: Record<string, number> = {};
      let subagent_count = 0;

      for (const jsonlPath of jsonlPaths) {
        try {
          const jsonlText = await fetchContent(jsonlPath, headers);
          const extraction = extractTranscriptData(jsonlText);
          sessionExtractions.push(extraction);
          for (const [command, count] of Object.entries(extraction.bmad_commands)) {
            bmad_commands[command] = (bmad_commands[command] ?? 0) + count;
          }
          for (const [tool, count] of Object.entries(extraction.tool_usage)) {
            tool_usage[tool] = (tool_usage[tool] ?? 0) + count;
          }
          for (const [skill, count] of Object.entries(extraction.skill_usage)) {
            skill_usage[skill] = (skill_usage[skill] ?? 0) + count;
          }
          subagent_count += extraction.subagent_count;
        } catch {
          sessionExtractions.push({ bmad_commands: {}, models: {}, first_prompt: '', tool_usage: {}, skill_usage: {}, subagent_count: 0 });
        }
      }

      const turns: TurnMeta[] = sessions.map((session, index) => {
        const extraction = sessionExtractions[index];
        const topModel = extraction
          ? Object.entries(extraction.models).sort((left, right) => right[1] - left[1])[0]?.[0] ?? ''
          : '';

        return {
          turn_id: session.turn_id,
          session_id: session.session_id,
          model: topModel,
          prompt_txt: extraction?.first_prompt ?? '',
          turn_count: session.turn_count,
          agent_percentage: session.agent_percentage,
        };
      });

      checkpoint = {
        checkpoint_id: checkpointId,
        commit_date,
        agent_percentage: bestSession?.agent_percentage ?? 0,
        agent_lines: bestSession?.agent_lines ?? 0,
        human_added: bestSession?.human_added ?? 0,
        human_modified: bestSession?.human_modified ?? 0,
        human_removed: bestSession?.human_removed ?? 0,
        tokens,
        summary,
        learnings: { repo: 0, code: 0, workflow: 0 },
        files_touched,
        turns,
        bmad_commands,
        tool_usage,
        skill_usage,
        subagent_count,
        author: authorMap.get(checkpointId) ?? 'unknown',
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
        tool_usage: {},
        skill_usage: {},
        subagent_count: 0,
        author: authorMap.get(id) ?? 'unknown',
        fetch_failed: true,
      };
    }

    checkpoints.push(checkpoint);
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

  return {
    cache,
    apiCallCount,
    elapsedMs: Date.now() - startTime,
  };
}