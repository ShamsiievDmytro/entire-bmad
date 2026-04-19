import { useMemo } from 'react';
import type { CheckpointMeta } from '../../lib/utils/ai-metrics-utils';
import { aggregateBmadCommands, classifyPromptType, classifyFileLayer, uniqueSessionCount } from '../../lib/utils/ai-metrics-utils';
import { LIGHT_CHART_OPTIONS, DATASET_COLORS } from '../../lib/light-chart-options';
import MetricCard from './MetricCard';
import ChartJsWrapper from './ChartJsWrapper';
import SectionHeading from './SectionHeading';

interface Props {
  checkpoints: CheckpointMeta[];
}

function fmtLabel(c: CheckpointMeta): string {
  const d = new Date(c.commit_date);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const FILE_LAYERS = ['components', 'services', 'stores', 'utils', 'docs', 'other'] as const;
const FILE_LAYER_COLORS: Record<string, string> = {
  components: DATASET_COLORS.purple,
  services: DATASET_COLORS.cyan,
  stores: DATASET_COLORS.green,
  utils: DATASET_COLORS.amber,
  docs: DATASET_COLORS.gray,
  other: '#d1d5db',
};

export default function BehavioralSection({ checkpoints }: Props) {
  const sorted = useMemo(
    () => [...checkpoints].sort((a, b) => new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime()),
    [checkpoints],
  );

  // Metric 14: BMAD Command Frequency (horizontal bar)
  const bmadAgg = useMemo(() => aggregateBmadCommands(checkpoints), [checkpoints]);
  const m14Data = useMemo(() => ({
    labels: bmadAgg.map((e) => e.command),
    datasets: [{ data: bmadAgg.map((e) => e.count), backgroundColor: DATASET_COLORS.purple, borderRadius: 3 }],
  }), [bmadAgg]);
  const m14Options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: LIGHT_CHART_OPTIONS.plugins,
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: '#666', font: { family: 'Inter', size: 11 } }, border: { display: false } },
      y: { ticks: { color: '#666', font: { family: 'Inter', size: 10 } }, grid: { display: false }, border: { display: false } },
    },
  }), []);

  // Metric 15: Prompt Type Distribution (doughnut)
  const promptCounts = useMemo(() => {
    const counts = { 'Slash Command': 0, 'Free-form': 0, Continuation: 0 };
    for (const cp of checkpoints) {
      for (const t of cp.turns) {
        counts[classifyPromptType(t.prompt_txt)]++;
      }
    }
    return counts;
  }, [checkpoints]);
  const m15Values = Object.values(promptCounts);
  const m15Total = m15Values.reduce((a, b) => a + b, 0);
  const m15HasReal = m15Values[0] > 0 || m15Values[1] > 0;
  const m15Data = useMemo(() => ({
    labels: Object.keys(promptCounts),
    datasets: [{ data: m15Values, backgroundColor: [DATASET_COLORS.cyan, DATASET_COLORS.purple, DATASET_COLORS.gray], borderWidth: 0 }],
  }), [promptCounts]);
  const m15Options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { color: '#555', font: { family: 'Inter', size: 10 }, boxWidth: 12, padding: 8 } },
      tooltip: LIGHT_CHART_OPTIONS.plugins.tooltip,
    },
  }), []);

  // Metric 16: Files Touched by Layer (stacked bar)
  const m16Data = useMemo(() => ({
    labels: sorted.map(fmtLabel),
    datasets: FILE_LAYERS.map((layer) => ({
      label: layer.charAt(0).toUpperCase() + layer.slice(1),
      data: sorted.map((c) => c.files_touched.filter((f) => classifyFileLayer(f) === layer).length),
      backgroundColor: FILE_LAYER_COLORS[layer],
      borderRadius: 2,
    })),
  }), [sorted]);
  const m16Options = useMemo(() => ({
    ...LIGHT_CHART_OPTIONS,
    plugins: {
      ...LIGHT_CHART_OPTIONS.plugins,
      legend: { display: true, labels: { color: '#555', font: { family: 'Inter', size: 10 }, boxWidth: 10, padding: 6 } },
    },
    scales: {
      ...LIGHT_CHART_OPTIONS.scales,
      x: { ...LIGHT_CHART_OPTIONS.scales.x, stacked: true },
      y: { ...LIGHT_CHART_OPTIONS.scales.y, stacked: true },
    },
  }), []);

  // Metric 17: Unique Sessions per Commit
  const m17Data = useMemo(() => ({
    labels: sorted.map(fmtLabel),
    datasets: [{ data: sorted.map((c) => uniqueSessionCount(c)), backgroundColor: DATASET_COLORS.cyan, borderRadius: 3 }],
  }), [sorted]);

  return (
    <>
      <SectionHeading title="Behavioral / SDLC" />

      <MetricCard
        title="BMAD Command Frequency"
        description="Aggregated usage count of each BMAD slash command across all commits, sorted by frequency."
        source="bmad_commands"
        wide
      >
        {bmadAgg.length > 0 ? (
          <ChartJsWrapper id="metric-14" type="bar" data={m14Data} options={m14Options} height={220} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Prompt Type Distribution"
        description="Classification of all turn prompts: slash commands, free-form text, or empty continuations."
        source="turns[].prompt_txt"
      >
        {m15Total > 0 && m15HasReal ? (
          <ChartJsWrapper id="metric-15" type="doughnut" data={m15Data} options={m15Options} height={200} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Files Touched by Layer"
        description="Stacked count of files changed per commit, grouped by architectural layer."
        source="files_touched"
        wide
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-16" type="bar" data={m16Data} options={m16Options} height={220} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Unique Sessions per Commit"
        description="Number of distinct work sessions that contributed to each commit."
        source="turns[].session_id"
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-17" type="bar" data={m17Data} options={LIGHT_CHART_OPTIONS} height={180} />
        ) : (
          <NoData />
        )}
      </MetricCard>
    </>
  );
}

function NoData() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#999', fontSize: 14 }}>
      No data available
    </div>
  );
}
