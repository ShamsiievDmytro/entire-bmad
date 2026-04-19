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
        title="Session Depth vs Agent %"
        chartType="Scatter"
        chartLibrary="Chart.js"
        description="Each dot represents one checkpoint. The X-axis shows the total number of API turns (sum of turn_count across all sessions in that checkpoint) — a proxy for how long and deep the AI session was. The Y-axis shows the agent_percentage — how much of the final committed code was AI-authored. This reveals whether longer sessions produce higher-quality AI output or degrade as context windows fill up. A positive correlation (dots trending up-right) means deeper sessions yield more AI code; a flat or negative pattern suggests context degradation."
        infoRu="Корреляция между глубиной сессии (количество обращений к модели) и долей ИИ-кода. Если точки растут вправо-вверх — длинные сессии дают больше ИИ-кода. Если тренд плоский или нисходящий — контекстное окно модели переполняется и качество падает. Важно для выбора оптимальной длины сессии."
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
