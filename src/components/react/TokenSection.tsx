import { useMemo } from 'react';
import type { CheckpointMeta } from '../../lib/utils/ai-metrics-utils';
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

export default function TokenSection({ checkpoints }: Props) {
  const isMulti = checkpoints.length > 1;

  const sorted = useMemo(
    () => [...checkpoints].sort((a, b) => new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime()),
    [checkpoints],
  );

  // Metric 6: Token Breakdown — GROUPED bar (no cache_read, which dominates at 93-98%)
  const m6Data = useMemo(() => ({
    labels: sorted.map(fmtLabel),
    datasets: [
      { label: 'Input', data: sorted.map((c) => c.tokens.input), backgroundColor: DATASET_COLORS.purple, borderRadius: 3 },
      { label: 'Cache Creation', data: sorted.map((c) => c.tokens.cache_creation), backgroundColor: DATASET_COLORS.cyan, borderRadius: 3 },
      { label: 'Output', data: sorted.map((c) => c.tokens.output), backgroundColor: DATASET_COLORS.amber, borderRadius: 3 },
    ],
  }), [sorted]);
  const m6Options = useMemo(() => ({
    ...LIGHT_CHART_OPTIONS,
    plugins: {
      ...LIGHT_CHART_OPTIONS.plugins,
      legend: { display: true, labels: { color: '#555', font: { family: 'Inter' } } },
    },
  }), []);

  // Metric 7: Cache Leverage Score (LWC line)
  const m7Series = useMemo(
    () =>
      sorted.map((c) => {
        const total = c.tokens.input + c.tokens.cache_creation + c.tokens.cache_read + c.tokens.output;
        return {
          time: Math.floor(new Date(c.commit_date).getTime() / 1000) as any,
          value: total > 0 ? Math.round((c.tokens.cache_read / total) * 1000) / 10 : 0,
        };
      }),
    [sorted],
  );

  // Metric 8: API Call Count
  const m8Data = useMemo(() => ({
    labels: sorted.map(fmtLabel),
    datasets: [{ data: sorted.map((c) => c.turns.reduce((sum, t) => sum + t.turn_count, 0)), backgroundColor: DATASET_COLORS.purple, borderRadius: 3 }],
  }), [sorted]);

  // Metric 9: Model Distribution (doughnut)
  const m9 = useMemo(() => {
    const modelMap = new Map<string, number>();
    for (const cp of checkpoints) {
      for (const t of cp.turns) {
        const m = t.model || 'unknown';
        modelMap.set(m, (modelMap.get(m) ?? 0) + 1);
      }
    }
    const labels = [...modelMap.keys()];
    const values = [...modelMap.values()];
    const COLORS = [DATASET_COLORS.purple, DATASET_COLORS.cyan, DATASET_COLORS.green, DATASET_COLORS.amber, DATASET_COLORS.red, DATASET_COLORS.gray, DATASET_COLORS.pink, DATASET_COLORS.blue, DATASET_COLORS.teal, DATASET_COLORS.orange];
    return {
      labels,
      values,
      colors: labels.map((_, i) => COLORS[i % COLORS.length]),
      hasData: values.length > 0 && labels.some((l) => l.trim() !== ''),
    };
  }, [checkpoints]);

  const m9Data = useMemo(() => ({
    labels: m9.labels,
    datasets: [{ data: m9.values, backgroundColor: m9.colors, borderWidth: 0 }],
  }), [m9]);
  const m9Options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { color: '#555', font: { family: 'Inter', size: 10 }, boxWidth: 12, padding: 8 } },
      tooltip: LIGHT_CHART_OPTIONS.plugins.tooltip,
    },
  }), []);

  return (
    <>
      <SectionHeading title="Token Economics" />

      <MetricCard
        title="Token Breakdown per Commit"
        description="Input, cache creation, and output tokens per commit. Cache read tokens (93-98% of total) are shown separately in the Cache Leverage chart."
        source="tokens.input, tokens.cache_creation, tokens.output"
        wide
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-6" type="bar" data={m6Data} options={m6Options} height={220} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      {isMulti && (
        <MetricCard
          title="Cache Leverage Score"
          description="Ratio of cache-read tokens to total tokens per commit over time."
          source="tokens.cache_read, total_tokens, commit_date"
          wide
        >
          <LightweightChartWrapper id="metric-7" series={m7Series} lineColor={DATASET_COLORS.green} height={200} />
        </MetricCard>
      )}

      <MetricCard
        title="API Call Count"
        description="Number of turns (API calls) made per commit."
        source="turns.length"
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-8" type="bar" data={m8Data} options={LIGHT_CHART_OPTIONS} height={180} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Model Distribution"
        description="Frequency of each model used across all turns in all commits."
        source="turns[].model"
      >
        {m9.hasData ? (
          <ChartJsWrapper id="metric-9" type="doughnut" data={m9Data} options={m9Options} height={200} />
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
