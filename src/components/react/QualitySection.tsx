import { useMemo } from 'react';
import type { CheckpointMeta } from '../../lib/utils/ai-metrics-utils';
import { LIGHT_CHART_OPTIONS, DATASET_COLORS } from '../../lib/light-chart-options';
import MetricCard from './MetricCard';
import ChartJsWrapper from './ChartJsWrapper';
import SectionHeading from './SectionHeading';

interface Props {
  checkpoints: CheckpointMeta[];
}

export default function QualitySection({ checkpoints }: Props) {
  const m13Data = useMemo(() => ({
    datasets: [{
      data: checkpoints.map((c) => ({ x: c.turns.reduce((sum, t) => sum + t.turn_count, 0), y: c.agent_percentage })),
      backgroundColor: DATASET_COLORS.blue,
      pointRadius: 5,
      pointHoverRadius: 7,
    }],
  }), [checkpoints]);

  const m13Options = useMemo(() => ({
    ...LIGHT_CHART_OPTIONS,
    plugins: {
      ...LIGHT_CHART_OPTIONS.plugins,
      tooltip: {
        ...LIGHT_CHART_OPTIONS.plugins.tooltip,
        callbacks: { label: (ctx: any) => ` turns: ${ctx.parsed.x}, agent: ${ctx.parsed.y.toFixed(1)}%` },
      },
    },
    scales: {
      ...LIGHT_CHART_OPTIONS.scales,
      x: { ...LIGHT_CHART_OPTIONS.scales.x, title: { display: true, text: 'API Calls (turns)', color: '#888', font: { family: 'Inter', size: 10 } } },
      y: { ...LIGHT_CHART_OPTIONS.scales.y, title: { display: true, text: 'Agent %', color: '#888', font: { family: 'Inter', size: 10 } } },
    },
  }), []);

  const hasData = checkpoints.length > 0;

  return (
    <>
      <SectionHeading title="Quality Signals" />

      <MetricCard
        title="Session Depth vs Agent Percentage"
        description="Each point is a commit: x-axis shows API calls made, y-axis shows AI-authored percentage."
        source="turns.length, agent_percentage"
        wide
      >
        {hasData ? (
          <ChartJsWrapper id="metric-13" type="scatter" data={m13Data} options={m13Options} height={220} />
        ) : (
          <NoData />
        )}
      </MetricCard>
    </>
  );
}

function NoData() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#999', fontSize: 14 }}>
      No data available
    </div>
  );
}
