import { useMemo } from 'react';
import type { CheckpointMeta } from '../../lib/utils/ai-metrics-utils';
import { LIGHT_CHART_OPTIONS, DATASET_COLORS } from '../../lib/light-chart-options';
import MetricCard from './MetricCard';
import StatCard from './StatCard';
import ChartJsWrapper from './ChartJsWrapper';
import LightweightChartWrapper from './LightweightChartWrapper';
import SectionHeading from './SectionHeading';

interface Props {
  checkpoints: CheckpointMeta[];
}

function fmtLabel(c: CheckpointMeta): string {
  const d = new Date(c.commit_date);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AttributionSection({ checkpoints }: Props) {
  const isMulti = checkpoints.length > 1;

  const sorted = useMemo(
    () => [...checkpoints].sort((a, b) => new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime()),
    [checkpoints],
  );

  // Metric 1: Agent % Over Time (LWC line)
  const m1Series = useMemo(
    () => sorted.map((c) => ({ time: Math.floor(new Date(c.commit_date).getTime() / 1000) as any, value: c.agent_percentage })),
    [sorted],
  );

  // Metric 2: Pure-AI Commit Rate
  const pureAiCount = useMemo(() => checkpoints.filter((c) => c.agent_percentage === 100).length, [checkpoints]);
  const pureAiRate = checkpoints.length > 0 ? Math.round((pureAiCount / checkpoints.length) * 100) : 0;

  // Metric 3: Human Edit Rate
  const m3Data = useMemo(() => ({
    labels: sorted.map(fmtLabel),
    datasets: [{ data: sorted.map((c) => Math.round((100 - c.agent_percentage) * 10) / 10), backgroundColor: DATASET_COLORS.amber, borderRadius: 3 }],
  }), [sorted]);
  const m3Options = useMemo(() => ({
    ...LIGHT_CHART_OPTIONS,
    plugins: { ...LIGHT_CHART_OPTIONS.plugins, tooltip: { ...LIGHT_CHART_OPTIONS.plugins.tooltip, callbacks: { label: (ctx: any) => ` ${ctx.parsed.y.toFixed(1)}%` } } },
  }), []);

  // Metric 4: Attribution Breakdown (stacked)
  const m4Data = useMemo(() => ({
    labels: sorted.map(fmtLabel),
    datasets: [
      { label: 'Agent %', data: sorted.map((c) => Math.round(c.agent_percentage * 10) / 10), backgroundColor: DATASET_COLORS.purple, borderRadius: 2 },
      { label: 'Human %', data: sorted.map((c) => Math.round((100 - c.agent_percentage) * 10) / 10), backgroundColor: DATASET_COLORS.green, borderRadius: 2 },
    ],
  }), [sorted]);
  const m4Options = useMemo(() => ({
    ...LIGHT_CHART_OPTIONS,
    plugins: { ...LIGHT_CHART_OPTIONS.plugins, legend: { display: true, labels: { color: '#555', font: { family: 'Inter' } } } },
    scales: { ...LIGHT_CHART_OPTIONS.scales, x: { ...LIGHT_CHART_OPTIONS.scales.x, stacked: true }, y: { ...LIGHT_CHART_OPTIONS.scales.y, stacked: true, max: 100 } },
  }), []);

  // Metric 5: Avg Agent Attribution
  const avgAgent = checkpoints.length > 0
    ? Math.round((checkpoints.reduce((sum, c) => sum + c.agent_percentage, 0) / checkpoints.length) * 10) / 10
    : 0;

  return (
    <>
      <SectionHeading title="Attribution" />

      {isMulti && (
        <MetricCard
          title="Agent Percentage Over Time"
          description="AI-authored line share per commit, ordered chronologically."
          source="agent_percentage, commit_date"
          wide
        >
          <LightweightChartWrapper id="metric-1" series={m1Series} height={220} />
        </MetricCard>
      )}

      <StatCard
        title="Pure-AI Commit Rate"
        description="Percentage of commits where every line was AI-authored."
        source="agent_percentage"
        value={`${pureAiRate}%`}
        detail={`${pureAiCount} of ${checkpoints.length} commits fully AI-authored`}
        hasData={checkpoints.length > 0}
        valueId="stat-pure-ai-rate"
        detailId="stat-pure-ai-detail"
      />

      <MetricCard
        title="Human Edit Rate"
        description="Human-contributed lines as a share of total committed lines per commit."
        source="human_added, human_modified, human_removed, agent_lines"
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-3" type="bar" data={m3Data} options={m3Options} height={200} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Attribution Breakdown"
        description="Agent vs human share of committed code per commit (stacked to 100%)."
        source="agent_percentage"
        wide
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-4" type="bar" data={m4Data} options={m4Options} height={220} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <StatCard
        title="Avg Agent Attribution"
        description="Average AI-authored percentage across all commits."
        source="agent_percentage"
        value={`${avgAgent}%`}
        detail={`average across ${checkpoints.length} commits`}
        hasData={checkpoints.length > 0}
        valueId="stat-agent-lines"
        detailId="stat-agent-lines-detail"
      />
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
