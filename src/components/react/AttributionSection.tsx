import { useMemo } from 'react';
import type { CheckpointMeta } from '../../lib/utils/ai-metrics-utils';
import { isFirstTimeRight, computeFirstTimeRightRate, computeRollingAverage } from '../../lib/utils/ai-metrics-utils';
import { LIGHT_CHART_OPTIONS, DATASET_COLORS } from '../../lib/light-chart-options';
import MetricCard from './MetricCard';
import StatCard from './StatCard';
import ChartJsWrapper from './ChartJsWrapper';
import LightweightChartWrapper from './LightweightChartWrapper';
import SectionHeading from './SectionHeading';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

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

  // Chart 4: Agent % Over Time — 3-checkpoint moving average
  const m4Series = useMemo(() => {
    const agentPcts = sorted.map((c) => c.agent_percentage);
    const rolling = computeRollingAverage(agentPcts, 3);
    return sorted.map((c, i) => ({
      time: Math.floor(new Date(c.commit_date).getTime() / 1000) as any,
      value: Math.round(rolling[i] * 10) / 10,
    }));
  }, [sorted]);

  // Per-developer AI usage
  const devStats = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const c of checkpoints) {
      const author = c.author || 'unknown';
      const prev = map.get(author) ?? { total: 0, count: 0 };
      map.set(author, { total: prev.total + c.agent_percentage, count: prev.count + 1 });
    }
    return [...map.entries()]
      .map(([name, { total, count }]) => ({ name, avg: Math.round((total / count) * 10) / 10, count }))
      .sort((a, b) => b.avg - a.avg);
  }, [checkpoints]);
  const hasMultipleDevs = devStats.length > 1 || (devStats.length === 1 && devStats[0].name !== 'unknown');

  const devChartData = useMemo(() => ({
    labels: devStats.map((d) => `${d.name} (${d.count})`),
    datasets: [{
      data: devStats.map((d) => d.avg),
      backgroundColor: devStats.map((_, i) => {
        const colors = [DATASET_COLORS.purple, DATASET_COLORS.cyan, DATASET_COLORS.green, DATASET_COLORS.amber, DATASET_COLORS.pink, DATASET_COLORS.teal];
        return colors[i % colors.length];
      }),
      borderRadius: 3,
    }],
  }), [devStats]);
  const devChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: LIGHT_CHART_OPTIONS.plugins,
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: '#666', font: { family: 'Inter', size: 11 } }, border: { display: false }, max: 100 },
      y: { ticks: { color: '#666', font: { family: 'Inter', size: 11 } }, grid: { display: false }, border: { display: false } },
    },
  }), []);

  // Chart 5: Pure-AI Commit Rate
  const pureAiCount = useMemo(() => checkpoints.filter((c) => c.agent_percentage === 100).length, [checkpoints]);
  const pureAiRate = checkpoints.length > 0 ? Math.round((pureAiCount / checkpoints.length) * 100) : 0;

  // Chart 6: Human Edit Rate
  const m6Data = useMemo(() => ({
    labels: sorted.map(fmtLabel),
    datasets: [{ data: sorted.map((c) => Math.round((100 - c.agent_percentage) * 10) / 10), backgroundColor: DATASET_COLORS.amber, borderRadius: 3 }],
  }), [sorted]);
  const m6Options = useMemo(() => ({
    ...LIGHT_CHART_OPTIONS,
    plugins: { ...LIGHT_CHART_OPTIONS.plugins, tooltip: { ...LIGHT_CHART_OPTIONS.plugins.tooltip, callbacks: { label: (ctx: any) => ` ${ctx.parsed.y.toFixed(1)}%` } } },
  }), []);

  // Chart 7: Attribution Breakdown (stacked)
  const m7Data = useMemo(() => ({
    labels: sorted.map(fmtLabel),
    datasets: [
      { label: 'Agent %', data: sorted.map((c) => Math.round(c.agent_percentage * 10) / 10), backgroundColor: DATASET_COLORS.purple, borderRadius: 2 },
      { label: 'Human %', data: sorted.map((c) => Math.round((100 - c.agent_percentage) * 10) / 10), backgroundColor: DATASET_COLORS.green, borderRadius: 2 },
    ],
  }), [sorted]);
  const m7Options = useMemo(() => ({
    ...LIGHT_CHART_OPTIONS,
    plugins: { ...LIGHT_CHART_OPTIONS.plugins, legend: { display: true, labels: { color: '#555', font: { family: 'Inter' } } } },
    scales: { ...LIGHT_CHART_OPTIONS.scales, x: { ...LIGHT_CHART_OPTIONS.scales.x, stacked: true }, y: { ...LIGHT_CHART_OPTIONS.scales.y, stacked: true, max: 100 } },
  }), []);

  // Chart 8: Avg Agent Attribution
  const avgAgent = checkpoints.length > 0
    ? Math.round((checkpoints.reduce((sum, c) => sum + c.agent_percentage, 0) / checkpoints.length) * 10) / 10
    : 0;

  // Chart 24: First-Time-Right Rate with cumulative rate sparkline
  const ftr = useMemo(() => computeFirstTimeRightRate(checkpoints), [checkpoints]);
  const ftrSeries = useMemo(() => {
    const eligible = sorted.filter((c) => c.agent_lines > 0);
    let ftrCount = 0;
    return eligible.map((c, i) => {
      if (isFirstTimeRight(c)) ftrCount++;
      return {
        time: Math.floor(new Date(c.commit_date).getTime() / 1000) as any,
        value: Math.round((ftrCount / (i + 1)) * 1000) / 10,
      };
    });
  }, [sorted]);

  return (
    <>
      <SectionHeading title="Attribution" />

      {isMulti && (
        <MetricCard
          title="Agent % Over Time (Smoothed)"
          chartType="Line"
          chartLibrary="lightweight-charts"
          description="AI-authored line share per commit, smoothed with a 3-checkpoint rolling average to reduce noise from outlier commits (e.g., config-only or zero-line checkpoints). Each point shows the mean agent_percentage of that commit and the two preceding ones. Raw values can swing wildly between commits; this view shows the actual adoption trajectory."
          infoRu="Доля кода, написанного ИИ, в каждом коммите — сглаженная скользящей средней по 3 коммитам. Показывает реальный тренд внедрения ИИ, отфильтровывая шум от одиночных аномальных коммитов. Рост линии означает, что команда всё больше доверяет ИИ генерацию кода."
          wide
        >
          <LightweightChartWrapper id="metric-4" series={m4Series} height={220} />
        </MetricCard>
      )}

      {hasMultipleDevs && (
        <MetricCard
          title="AI Usage by Developer"
          chartType="Horizontal bar"
          chartLibrary="Chart.js"
          description="Average agent_percentage per developer across all their checkpoints. Each bar shows how much AI-authored code a developer commits on average. The number in parentheses is the commit count. Higher values mean the developer relies more heavily on AI for code generation."
          infoRu="Средняя доля ИИ-кода по каждому разработчику. Показывает, кто из команды больше всего использует ИИ для генерации кода. В скобках — количество коммитов. Помогает выявить лидеров внедрения ИИ и тех, кому нужна поддержка."
          wide
        >
          <ChartJsWrapper id="metric-dev-usage" type="bar" data={devChartData} options={devChartOptions} height={Math.max(120, devStats.length * 40)} />
        </MetricCard>
      )}

      <StatCard
        title="Pure-AI Commit Rate"
        description="Percentage of commits where agent_percentage equals exactly 100% — meaning every line of code was AI-authored with zero human edits. Calculated as: (count of checkpoints with agent_percentage = 100) / (total checkpoints) × 100. Distinguishes 'AI helped a bit' from 'AI did the work end-to-end.'"
        infoRu="Процент коммитов, в которых 100% кода написано ИИ без единого человеческого изменения. Ключевая метрика зрелости: показывает, способен ли ИИ полностью закрывать задачи самостоятельно, а не просто помогать."
        value={`${pureAiRate}%`}
        detail={`${pureAiCount} of ${checkpoints.length} commits fully AI-authored`}
        hasData={checkpoints.length > 0}
        valueId="stat-pure-ai-rate"
        detailId="stat-pure-ai-detail"
      />

      <MetricCard
        title="Human Edit Rate"
        chartType="Bar"
        chartLibrary="Chart.js"
        description="Shows (100 − agent_percentage) for each checkpoint as a bar. Each bar represents the percentage of committed lines that were written or modified by a human. Rising bars signal that AI output is being rewritten more heavily before commit, suggesting quality issues or a mismatch between AI suggestions and team standards."
        infoRu="Доля кода, написанного или отредактированного человеком, в каждом коммите. Рост столбцов сигнализирует о проблемах с качеством ИИ-генерации: команда всё больше переписывает то, что предложил ИИ. Снижение — ИИ генерирует код, который принимается без правок."
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-6" type="bar" data={m6Data} options={m6Options} height={200} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Attribution Breakdown"
        chartType="Stacked bar"
        chartLibrary="Chart.js"
        description="Each bar is one checkpoint, stacked to 100%. The purple segment shows agent_percentage (AI-authored lines), the green segment shows (100 − agent_percentage) (human-contributed lines). Makes the human/AI balance instantly readable — a bar that is mostly purple means AI did most of the work for that commit."
        infoRu="Визуальное разделение вклада ИИ и человека в каждом коммите. Фиолетовый — код ИИ, зелёный — код человека. Столбцы сложены до 100%. Позволяет мгновенно оценить баланс: чем больше фиолетового, тем больше работы выполнил ИИ."
        wide
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-7" type="bar" data={m7Data} options={m7Options} height={220} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <StatCard
        title="Avg Agent Attribution"
        description="Arithmetic mean of agent_percentage across all selected checkpoints. Calculated as: sum(agent_percentage) / count(checkpoints). A single headline number summarizing how AI-native the project is overall. Values above 80% indicate the AI is writing most of the code; below 50% means humans are still doing the majority."
        infoRu="Средний процент кода, написанного ИИ, по всем коммитам проекта. Главный показатель «AI-зрелости» команды. Выше 80% — ИИ пишет большую часть кода. Ниже 50% — основную работу по-прежнему делают люди."
        value={`${avgAgent}%`}
        detail={`average across ${checkpoints.length} commits`}
        hasData={checkpoints.length > 0}
        valueId="stat-agent-lines"
        detailId="stat-agent-lines-detail"
      />

      <MetricCard
        title="First-Time-Right Rate"
        chartType="Stat card + trend"
        chartLibrary="lightweight-charts"
        description="Percentage of checkpoints where AI-generated code shipped with zero human intervention — no lines added, modified, or removed by humans. A checkpoint qualifies as 'first-time-right' when agent_lines > 0 AND human_added = 0 AND human_modified = 0 AND human_removed = 0. The sparkline shows the cumulative FTR rate — at each point, (FTR count so far) / (total so far) × 100 — converging to the headline number."
        infoRu="Процент коммитов, в которых код ИИ был принят полностью без правок — ни одна строка не была добавлена, изменена или удалена человеком. Самый сильный сигнал качества ИИ. Рост тренда означает, что ИИ генерирует всё более надёжный код, которому команда доверяет."
      >
        {ftr.total > 0 ? (
          <Box>
            <Typography
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 40,
                lineHeight: 1.1,
                fontWeight: 600,
                color: 'primary.main',
              }}
            >
              {ftr.rate}%
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
              {ftr.count} of {ftr.total} checkpoints with AI code shipped unedited
            </Typography>
            {isMulti && ftrSeries.length > 1 && (
              <LightweightChartWrapper id="metric-24" series={ftrSeries} lineColor={DATASET_COLORS.green} height={120} />
            )}
          </Box>
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
