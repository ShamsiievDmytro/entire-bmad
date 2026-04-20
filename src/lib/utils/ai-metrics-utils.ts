import type { CheckpointMeta, CheckpointsCache, TurnMeta } from '../../../scripts/types';

export type { CheckpointMeta, CheckpointsCache, TurnMeta };


export function computeRollingAverage(values: number[], window: number): number[] {
  const w = Math.max(1, window);
  return values.map((_, i) => {
    const start = Math.max(0, i - w + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function isRenderableCheckpoint(checkpoint: CheckpointMeta): boolean {
  return (
    new Date(checkpoint.commit_date).getFullYear() > 2000 &&
    (checkpoint.agent_lines > 0 || checkpoint.human_added > 0 || checkpoint.turns.length > 0)
  );
}

export function filterRenderableCheckpoints(checkpoints: CheckpointMeta[]): CheckpointMeta[] {
  return checkpoints.filter(isRenderableCheckpoint).map(normalizeCheckpoint);
}

/** Backfill fields that may be missing in older cached data. */
function normalizeCheckpoint(cp: CheckpointMeta): CheckpointMeta {
  return {
    ...cp,
    tool_usage: cp.tool_usage ?? {},
    skill_usage: cp.skill_usage ?? {},
    subagent_count: cp.subagent_count ?? 0,
    author: cp.author ?? 'unknown',
  };
}

export function formatGeneratedAt(generatedAt?: string): string {
  if (!generatedAt) return 'Not loaded yet';
  const date = new Date(generatedAt);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

export function formatCheckpointOptionLabel(checkpoint: CheckpointMeta): string {
  const date = new Date(checkpoint.commit_date);
  return `${checkpoint.checkpoint_id.slice(0, 8)} — ${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function classifyPromptType(promptTxt: string): 'Slash Command' | 'Free-form' | 'Continuation' {
  const trimmed = (promptTxt ?? '').trim();
  if (trimmed === '') return 'Continuation';
  if (trimmed.startsWith('/')) return 'Slash Command';
  return 'Free-form';
}

export function classifyFileLayer(
  filePath: string,
): 'components' | 'services' | 'stores' | 'utils' | 'docs' | 'other' {
  if (filePath.includes('docs/') || filePath.endsWith('.md')) return 'docs';
  if (filePath.includes('components/')) return 'components';
  if (filePath.includes('services/')) return 'services';
  if (filePath.includes('stores/')) return 'stores';
  if (filePath.includes('utils/')) return 'utils';
  return 'other';
}

export function computeCheckpointCadenceMinutes(checkpoints: CheckpointMeta[]): number[] {
  const sorted = [...checkpoints].sort(
    (a, b) => new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime(),
  );
  return sorted.map((_, i) => {
    if (i === 0) return 0;
    const prev = new Date(sorted[i - 1].commit_date).getTime();
    const curr = new Date(sorted[i].commit_date).getTime();
    return Math.round((curr - prev) / 60_000);
  });
}

export function aggregateBmadCommands(
  checkpoints: CheckpointMeta[],
): Array<{ command: string; count: number }> {
  const map = new Map<string, number>();
  for (const cp of checkpoints) {
    for (const [cmd, count] of Object.entries(cp.bmad_commands)) {
      map.set(cmd, (map.get(cmd) ?? 0) + count);
    }
  }
  return [...map.entries()]
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count);
}

export function uniqueSessionCount(checkpoint: CheckpointMeta): number {
  return new Set(checkpoint.turns.map((t) => t.session_id)).size;
}

export const aggregateSlashCommands = aggregateBmadCommands;

export function aggregateBmadOnlyCommands(
  checkpoints: CheckpointMeta[],
): Array<{ command: string; count: number }> {
  return aggregateBmadCommands(checkpoints).filter((e) => e.command.startsWith('/bmad'));
}

export function isFirstTimeRight(checkpoint: CheckpointMeta): boolean {
  return checkpoint.agent_lines > 0 && checkpoint.human_added === 0 && checkpoint.human_modified === 0 && checkpoint.human_removed === 0;
}

export function computeFirstTimeRightRate(checkpoints: CheckpointMeta[]): { rate: number; count: number; total: number } {
  const eligible = checkpoints.filter((c) => c.agent_lines > 0);
  const ftr = eligible.filter(isFirstTimeRight);
  return {
    rate: eligible.length > 0 ? Math.round((ftr.length / eligible.length) * 1000) / 10 : 0,
    count: ftr.length,
    total: eligible.length,
  };
}

export function aggregateToolUsage(
  checkpoints: CheckpointMeta[],
): Array<{ tool: string; count: number }> {
  const map = new Map<string, number>();
  for (const cp of checkpoints) {
    for (const [tool, count] of Object.entries(cp.tool_usage ?? {})) {
      map.set(tool, (map.get(tool) ?? 0) + count);
    }
  }
  return [...map.entries()]
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count);
}

export function aggregateSkillUsage(
  checkpoints: CheckpointMeta[],
): Array<{ skill: string; count: number }> {
  const map = new Map<string, number>();
  for (const cp of checkpoints) {
    for (const [skill, count] of Object.entries(cp.skill_usage ?? {})) {
      map.set(skill, (map.get(skill) ?? 0) + count);
    }
  }
  return [...map.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count);
}
