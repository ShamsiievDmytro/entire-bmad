import { useMemo } from 'react';
import type { CheckpointMeta } from '../../lib/utils/ai-metrics-utils';
import { computeRollingAverage } from '../../lib/utils/ai-metrics-utils';
import { LIGHT_CHART_OPTIONS, DATASET_COLORS } from '../../lib/light-chart-options';
import MetricCard from './MetricCard';
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

export default function TemporalSection({ checkpoints }: Props) {
  const isMulti = checkpoints.length > 1;

  const sorted = useMemo(
    () => [...checkpoints].sort((a, b) => new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime()),
    [checkpoints],
  );

  // Metric 18: Commit Activity Timeline (scatter with per-point colors)
  const m18Points = useMemo(
    () => sorted.map((c) => ({
      x: new Date(c.commit_date).getTime(),
      y: c.agent_percentage,
      color: c.agent_percentage >= 70 ? DATASET_COLORS.green : c.agent_percentage >= 40 ? DATASET_COLORS.amber : DATASET_COLORS.red,
    })),
    [sorted],
  );
  const m18Data = useMemo(() => ({
    datasets: [{
      data: m18Points.map((p) => ({ x: p.x, y: p.y })),
      backgroundColor: m18Points.map((p) => p.color),
      pointRadius: 6,
      pointHoverRadius: 8,
    }],
  }), [m18Points]);
  const m18Options = useMemo(() => ({
    ...LIGHT_CHART_OPTIONS,
    plugins: {
      ...LIGHT_CHART_OPTIONS.plugins,
      tooltip: {
        ...LIGHT_CHART_OPTIONS.plugins.tooltip,
        callbacks: { label: (ctx: any) => ` ${new Date(ctx.parsed.x).toLocaleDateString()}: ${ctx.parsed.y.toFixed(1)}%` },
      },
    },
    scales: {
      ...LIGHT_CHART_OPTIONS.scales,
      x: {
        type: 'time' as const,
        time: { unit: 'hour' as const, displayFormats: { hour: 'MMM d HH:mm' } },
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { color: '#666', font: { family: 'Inter', size: 10 }, maxRotation: 45 },
        border: { display: false },
      },
      y: {
        ...LIGHT_CHART_OPTIONS.scales.y,
        title: { display: true, text: 'Agent %', color: '#888', font: { family: 'Inter', size: 10 } },
      },
    },
  }), []);

  // Metric 19: Commit Cadence (bar)
  const cadenceValues = useMemo(
    () => sorted.slice(1).map((c, i) => Math.round((new Date(c.commit_date).getTime() - new Date(sorted[i].commit_date).getTime()) / 60_000)),
    [sorted],
  );
  const cadenceLabels = useMemo(() => sorted.slice(1).map(fmtLabel), [sorted]);
  const m19Data = useMemo(() => ({
    labels: cadenceLabels,
    datasets: [{ data: cadenceValues, backgroundColor: DATASET_COLORS.gray, borderRadius: 3 }],
  }), [cadenceLabels, cadenceValues]);
  const m19Options = useMemo(() => ({
    ...LIGHT_CHART_OPTIONS,
    plugins: {
      ...LIGHT_CHART_OPTIONS.plugins,
      tooltip: { ...LIGHT_CHART_OPTIONS.plugins.tooltip, callbacks: { label: (ctx: any) => ` ${ctx.parsed.y} min` } },
    },
  }), []);

  // Metric 20: Rolling Average (LWC line)
  const m20Series = useMemo(() => {
    const agentPcts = sorted.map((c) => c.agent_percentage);
    const rolling = computeRollingAverage(agentPcts, 3);
    return sorted.map((c, i) => ({
      time: Math.floor(new Date(c.commit_date).getTime() / 1000) as any,
      value: Math.round(rolling[i] * 10) / 10,
    }));
  }, [sorted]);

  return (
    <>
      <SectionHeading title="Temporal" />

      <MetricCard
        title="Commit Activity Timeline"
        description="Commits on a time axis coloured by AI percentage: green ≥70%, amber 40-69%, red <40%."
        source="commit_date, agent_percentage"
        wide
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-18" type="scatter" data={m18Data} options={m18Options} height={220} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      {isMulti && (
        <MetricCard
          title="Commit Cadence"
          description="Time delta in minutes between consecutive commits, sorted chronologically."
          source="commit_date"
        >
          {cadenceValues.length > 0 ? (
            <ChartJsWrapper id="metric-19" type="bar" data={m19Data} options={m19Options} height={180} />
          ) : (
            <NoData />
          )}
        </MetricCard>
      )}

      {isMulti && (
        <MetricCard
          title="Attribution Trend (Rolling Avg)"
          description="3-commit rolling average of agent percentage, showing the long-term AI attribution trend."
          source="agent_percentage, commit_date"
          wide
        >
          <LightweightChartWrapper id="metric-20" series={m20Series} height={200} />
        </MetricCard>
      )}
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
