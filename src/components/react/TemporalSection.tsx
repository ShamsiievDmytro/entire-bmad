import { useMemo } from 'react';
import type { CheckpointMeta } from '../../lib/utils/ai-metrics-utils';
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

export default function TemporalSection({ checkpoints }: Props) {
  const isMulti = checkpoints.length > 1;

  const sorted = useMemo(
    () => [...checkpoints].sort((a, b) => new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime()),
    [checkpoints],
  );

  // Chart 19: Checkpoint Cadence — hours between consecutive commits
  const cadenceValues = useMemo(
    () => sorted.slice(1).map((c, i) => {
      const minutes = (new Date(c.commit_date).getTime() - new Date(sorted[i].commit_date).getTime()) / 60_000;
      return Math.round(minutes / 60 * 10) / 10; // convert to hours with 1 decimal
    }),
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
      tooltip: { ...LIGHT_CHART_OPTIONS.plugins.tooltip, callbacks: { label: (ctx: any) => ` ${ctx.parsed.y} hours` } },
    },
  }), []);

  return (
    <>
      <SectionHeading title="Temporal" />

      {isMulti && (
        <MetricCard
          title="Checkpoint Cadence"
          chartType="Bar"
          chartLibrary="Chart.js"
          description="Time gap in hours between each consecutive pair of checkpoints, sorted chronologically. Calculated as: (commit_date[i] − commit_date[i−1]) converted to hours. Exposes work rhythm — short bars mean tight bursts of shipping, tall bars mean long gaps between commits. Useful for spotting stalled work or unsustainable intensity."
        infoRu="Интервал в часах между последовательными коммитами. Короткие столбцы — интенсивная работа, частые коммиты. Высокие столбцы — длинные паузы. Помогает выявить застой в работе или неустойчивый темп разработки."
          wide
        >
          {cadenceValues.length > 0 ? (
            <ChartJsWrapper id="metric-19" type="bar" data={m19Data} options={m19Options} height={220} />
          ) : (
            <NoData />
          )}
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
