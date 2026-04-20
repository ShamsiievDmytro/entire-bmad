import { useMemo } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
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

interface RecentItem {
  text: string;
  label: string;
}

export default function QualityDebtSection({ checkpoints }: Props) {
  const sorted = useMemo(
    () => [...checkpoints].sort((a, b) => new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime()),
    [checkpoints],
  );

  // ── Chart 25: Friction Events per Checkpoint ──────────────────────────

  const frictionCounts = useMemo(() => sorted.map((c) => c.summary.friction.length), [sorted]);
  const hasFriction = useMemo(() => frictionCounts.some((v) => v > 0), [frictionCounts]);

  const frictionData = useMemo(
    () => ({
      labels: sorted.map(fmtLabel),
      datasets: [
        {
          data: frictionCounts,
          backgroundColor: DATASET_COLORS.amber,
          borderRadius: 3,
        },
      ],
    }),
    [sorted, frictionCounts],
  );

  const frictionOptions = useMemo(
    () => ({
      ...LIGHT_CHART_OPTIONS,
      indexAxis: 'y' as const,
      scales: {
        ...LIGHT_CHART_OPTIONS.scales,
        x: {
          ...LIGHT_CHART_OPTIONS.scales.x,
          ticks: { ...LIGHT_CHART_OPTIONS.scales.x.ticks, stepSize: 1 },
        },
      },
      plugins: {
        ...LIGHT_CHART_OPTIONS.plugins,
        tooltip: {
          ...LIGHT_CHART_OPTIONS.plugins.tooltip,
          callbacks: {
            label: (ctx: any) => {
              const cp = sorted[ctx.dataIndex];
              if (!cp?.summary.friction.length) return ' No friction events';
              return cp.summary.friction.map((f: string) => ` • ${f}`);
            },
          },
        },
      },
    }),
    [sorted],
  );

  const recentFriction = useMemo<RecentItem[]>(() => {
    const items: RecentItem[] = [];
    for (let i = sorted.length - 1; i >= 0 && items.length < 5; i--) {
      const cp = sorted[i];
      for (const text of cp.summary.friction) {
        if (items.length >= 5) break;
        items.push({ text, label: fmtLabel(cp) });
      }
    }
    return items;
  }, [sorted]);

  // ── Chart 26: Open Items per Checkpoint ───────────────────────────────

  const openItemCounts = useMemo(() => sorted.map((c) => c.summary.open_items.length), [sorted]);
  const hasOpenItems = useMemo(() => openItemCounts.some((v) => v > 0), [openItemCounts]);

  const cumulativeOpenItems = useMemo(() => {
    let sum = 0;
    return openItemCounts.map((v) => {
      sum += v;
      return sum;
    });
  }, [openItemCounts]);

  const openItemsData = useMemo(
    () => ({
      labels: sorted.map(fmtLabel),
      datasets: [
        {
          label: 'Open items',
          data: openItemCounts,
          backgroundColor: DATASET_COLORS.blue,
          borderRadius: 3,
          order: 1,
        },
        {
          label: 'Cumulative',
          data: cumulativeOpenItems,
          type: 'line' as const,
          borderColor: DATASET_COLORS.gray,
          borderDash: [6, 3],
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: DATASET_COLORS.gray,
          fill: false,
          order: 0,
        },
      ],
    }),
    [sorted, openItemCounts, cumulativeOpenItems],
  );

  const openItemsOptions = useMemo(
    () => ({
      ...LIGHT_CHART_OPTIONS,
      plugins: {
        ...LIGHT_CHART_OPTIONS.plugins,
        legend: { ...LIGHT_CHART_OPTIONS.plugins.legend, display: true },
        tooltip: {
          ...LIGHT_CHART_OPTIONS.plugins.tooltip,
          callbacks: {
            label: (ctx: any) => {
              if (ctx.datasetIndex === 1) return ` Cumulative: ${ctx.parsed.y}`;
              const cp = sorted[ctx.dataIndex];
              if (!cp?.summary.open_items.length) return ' No open items';
              return cp.summary.open_items.map((item: string) => ` • ${item}`);
            },
          },
        },
      },
      scales: {
        ...LIGHT_CHART_OPTIONS.scales,
        y: {
          ...LIGHT_CHART_OPTIONS.scales.y,
          ticks: { ...LIGHT_CHART_OPTIONS.scales.y.ticks, stepSize: 1 },
        },
      },
    }),
    [sorted],
  );

  const recentOpenItems = useMemo<RecentItem[]>(() => {
    const items: RecentItem[] = [];
    for (let i = sorted.length - 1; i >= 0 && items.length < 5; i--) {
      const cp = sorted[i];
      for (const text of cp.summary.open_items) {
        if (items.length >= 5) break;
        items.push({ text, label: fmtLabel(cp) });
      }
    }
    return items;
  }, [sorted]);

  return (
    <>
      <SectionHeading title="Quality & Debt" />

      {/* Chart 25: Friction Events */}
      <MetricCard
        title="Friction Events per Checkpoint"
        chartType="Horizontal Bar"
        chartLibrary="Chart.js"
        description="Agent-reported places where work hit resistance — a fix that required two edits, a wrong assumption, a warning that blocked progress. Rising counts signal growing complexity or drifting prompt quality. Hover a bar to see the specific friction text."
        infoRu="Места, где AI-агент столкнулся с трудностями — исправления, потребовавшие нескольких попыток, ошибочные предположения, блокирующие предупреждения. Рост числа событий сигнализирует об усложнении кодовой базы или ухудшении качества промптов."
        wide
      >
        {hasFriction ? (
          <>
            <ChartJsWrapper
              id="metric-25"
              type="bar"
              data={frictionData}
              options={frictionOptions}
              height={Math.max(220, sorted.length * 28)}
            />
            {recentFriction.length > 0 && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>
                  Recent friction items
                </Typography>
                {recentFriction.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.75 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap', minWidth: 80 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </>
        ) : (
          <NoData />
        )}
      </MetricCard>

      {/* Chart 26: Open Items */}
      <MetricCard
        title="Open Items per Checkpoint"
        chartType="Bar + Line"
        chartLibrary="Chart.js"
        description="Acknowledged-but-deferred work items per checkpoint. Bars show items added at each checkpoint; the dashed line tracks cumulative acknowledged debt. Rising trend signals accumulating technical debt. Note: cumulative line is an upper bound — items may have been resolved in later commits."
        infoRu="Отложенные задачи, зафиксированные при каждом коммите. Столбцы — количество новых отложенных элементов, пунктирная линия — кумулятивный долг. Растущий тренд сигнализирует о накоплении технического долга. Кумулятивная линия — верхняя граница, элементы могут быть закрыты в последующих коммитах."
        wide
      >
        {hasOpenItems ? (
          <>
            <ChartJsWrapper
              id="metric-26"
              type="bar"
              data={openItemsData}
              options={openItemsOptions}
              height={220}
            />
            {recentOpenItems.length > 0 && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>
                  Recent open items
                </Typography>
                {recentOpenItems.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.75 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap', minWidth: 80 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </>
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
