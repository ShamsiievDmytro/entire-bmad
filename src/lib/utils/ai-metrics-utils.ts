import type { CheckpointMeta, CheckpointsCache, TurnMeta } from '../../../scripts/types';

export type { CheckpointMeta, CheckpointsCache, TurnMeta };

export const DARK_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false, labels: { color: '#a0a0b0', font: { family: 'Inter' } } },
    tooltip: {
      backgroundColor: '#12121a',
      titleColor: '#f0f0f0',
      bodyColor: '#a0a0b0',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.03)' },
      ticks: { color: '#a0a0b0', font: { family: 'Inter', size: 11 } },
      border: { display: false },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.03)' },
      ticks: { color: '#a0a0b0', font: { family: 'Inter', size: 11 } },
      border: { display: false },
    },
  },
};

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
  return checkpoints.filter(isRenderableCheckpoint);
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
