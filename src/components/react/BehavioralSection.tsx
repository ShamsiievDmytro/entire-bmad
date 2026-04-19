import { useMemo } from 'react';
import type { CheckpointMeta } from '../../lib/utils/ai-metrics-utils';
import { aggregateSlashCommands, aggregateBmadOnlyCommands, classifyPromptType, classifyFileLayer, uniqueSessionCount, aggregateToolUsage, aggregateSkillUsage } from '../../lib/utils/ai-metrics-utils';
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

const horizontalBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: LIGHT_CHART_OPTIONS.plugins,
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: '#666', font: { family: 'Inter', size: 11 } }, border: { display: false } },
    y: { ticks: { color: '#666', font: { family: 'Inter', size: 10 } }, grid: { display: false }, border: { display: false } },
  },
};

export default function BehavioralSection({ checkpoints }: Props) {
  const sorted = useMemo(
    () => [...checkpoints].sort((a, b) => new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime()),
    [checkpoints],
  );

  // Chart 14a: Slash Command Frequency (all commands)
  const slashAgg = useMemo(() => aggregateSlashCommands(checkpoints), [checkpoints]);
  const m14aData = useMemo(() => ({
    labels: slashAgg.map((e) => e.command),
    datasets: [{ data: slashAgg.map((e) => e.count), backgroundColor: DATASET_COLORS.purple, borderRadius: 3 }],
  }), [slashAgg]);

  // Chart 14b: BMAD Command Frequency (only bmad* commands)
  const bmadAgg = useMemo(() => aggregateBmadOnlyCommands(checkpoints), [checkpoints]);
  const m14bData = useMemo(() => ({
    labels: bmadAgg.map((e) => e.command),
    datasets: [{ data: bmadAgg.map((e) => e.count), backgroundColor: DATASET_COLORS.blue, borderRadius: 3 }],
  }), [bmadAgg]);

  // Chart 15: Prompt Type Distribution (doughnut)
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

  // Chart 16: Files Touched by Layer (stacked bar)
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

  // Chart 17: Unique Sessions per Checkpoint
  const m17Data = useMemo(() => ({
    labels: sorted.map(fmtLabel),
    datasets: [{ data: sorted.map((c) => uniqueSessionCount(c)), backgroundColor: DATASET_COLORS.cyan, borderRadius: 3 }],
  }), [sorted]);

  // Chart 21: Tool Usage Mix — tools invoked BY the AI agent
  const toolAgg = useMemo(() => aggregateToolUsage(checkpoints), [checkpoints]);
  const m21Data = useMemo(() => ({
    labels: toolAgg.map((e) => e.tool),
    datasets: [{ data: toolAgg.map((e) => e.count), backgroundColor: DATASET_COLORS.green, borderRadius: 3 }],
  }), [toolAgg]);

  // Chart 22: Top-N Skills Invoked — skills invoked BY the AI agent via the Skill tool
  const skillAgg = useMemo(() => aggregateSkillUsage(checkpoints), [checkpoints]);
  const m22Data = useMemo(() => ({
    labels: skillAgg.map((e) => e.skill),
    datasets: [{ data: skillAgg.map((e) => e.count), backgroundColor: DATASET_COLORS.pink, borderRadius: 3 }],
  }), [skillAgg]);

  // Chart 23: Subagent Usage Timeline
  const m23Data = useMemo(() => ({
    labels: sorted.map(fmtLabel),
    datasets: [{ data: sorted.map((c) => c.subagent_count ?? 0), backgroundColor: DATASET_COLORS.orange, borderRadius: 3 }],
  }), [sorted]);

  return (
    <>
      <SectionHeading title="Behavioral / SDLC" />

      <MetricCard
        title="Slash Command Frequency"
        chartType="Horizontal bar"
        chartLibrary="Chart.js"
        description="Horizontal bar chart showing every slash command (e.g., /clear, /commit, /dev-story) used across all selected checkpoints, sorted by total invocation count. Data is extracted from user prompts in the JSONL transcripts by matching lines starting with '/'. Shows which parts of the team's structured workflow are actually being used vs which exist only on paper."
        infoRu="Частота использования всех слэш-команд в проекте. Показывает, какие элементы рабочего процесса реально используются командой, а какие существуют только «на бумаге». Помогает принимать решения об инвестициях в инструментарий."
        wide
      >
        {slashAgg.length > 0 ? (
          <ChartJsWrapper id="metric-14a" type="bar" data={m14aData} options={horizontalBarOptions} height={220} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="BMAD Command Frequency"
        chartType="Horizontal bar"
        chartLibrary="Chart.js"
        description="Same as Slash Command Frequency but filtered to only show commands with the /bmad prefix (e.g., /bmad-dev-story, /bmad-code-review, /bmad-create-story). Provides a focused view of BMAD-specific workflow adoption, separate from general slash commands like /clear or /commit."
        infoRu="Частота использования BMAD-команд (/bmad-dev-story, /bmad-code-review и др.). Отфильтрованный вид, показывающий только команды методологии BMAD. Позволяет оценить глубину внедрения BMAD-процесса в команде."
        wide
      >
        {bmadAgg.length > 0 ? (
          <ChartJsWrapper id="metric-14b" type="bar" data={m14bData} options={horizontalBarOptions} height={220} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Prompt Type Distribution"
        chartType="Doughnut"
        chartLibrary="Chart.js"
        description="Doughnut chart classifying every user prompt turn into three categories: Slash Command (starts with '/'), Free-form (regular natural language text), or Continuation (empty prompt — user pressed enter without typing). Higher slash-command share indicates a disciplined, structured workflow; high free-form share suggests exploratory or ad-hoc usage."
        infoRu="Распределение типов промптов: слэш-команды, свободный текст или пустые продолжения. Высокая доля слэш-команд — зрелый, дисциплинированный процесс. Много свободного текста — команда ещё экспериментирует с промптами."
      >
        {m15Total > 0 && m15HasReal ? (
          <ChartJsWrapper id="metric-15" type="doughnut" data={m15Data} options={m15Options} height={200} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Files Touched by Layer"
        chartType="Stacked bar"
        chartLibrary="Chart.js"
        description="Stacked bar per checkpoint showing how many files were modified, grouped by architectural layer. Layers are classified by file path: components/ → Components, services/ → Services, stores/ → Stores, utils/ → Utils, docs/ or *.md → Docs, everything else → Other. Reveals which parts of the codebase the AI is trusted with and which layers are avoided."
        infoRu="Распределение изменённых файлов по архитектурным слоям: компоненты, сервисы, сторы, утилиты, документация. Показывает, в каких частях кодовой базы ИИ доверяют работать, а какие остаются «людскими»."
        wide
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-16" type="bar" data={m16Data} options={m16Options} height={220} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Unique Sessions per Checkpoint"
        chartType="Bar"
        chartLibrary="Chart.js"
        description="Bar chart showing the count of distinct session_id values in each checkpoint's turns array. Calculated as: new Set(checkpoint.turns.map(t => t.session_id)).size. A value of 1 means the entire commit came from a single work session; higher values mean multiple sessions contributed to the same commit."
        infoRu="Количество уникальных рабочих сессий, вошедших в каждый коммит. Значение 1 — весь коммит из одной сессии. Больше — несколько сессий объединены в один коммит. Показывает стиль работы: короткие фокусные сессии или длинные марафоны."
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-17" type="bar" data={m17Data} options={LIGHT_CHART_OPTIONS} height={180} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Tool Usage Mix"
        chartType="Horizontal bar"
        chartLibrary="Chart.js"
        description="Horizontal bar chart showing every tool invoked BY the AI agent during its work, aggregated across all selected checkpoints. Data is extracted from tool_use blocks in assistant messages within the JSONL transcripts. Common tools include Read, Edit, Bash, Grep, Glob, Write, Skill, and Agent. Answers 'what kind of work did the AI do?' — reading-heavy (exploration), editing-heavy (implementation), or automating (Bash/WebSearch)."
        infoRu="Какие инструменты использовал ИИ-агент: Read (чтение), Edit (редактирование), Bash (автоматизация), Grep/Glob (поиск). Много Read — исследование кодовой базы. Много Edit — активная реализация. Много Bash — автоматизация задач. Показывает характер работы ИИ."
        wide
      >
        {toolAgg.length > 0 ? (
          <ChartJsWrapper id="metric-21" type="bar" data={m21Data} options={horizontalBarOptions} height={Math.max(180, toolAgg.length * 28)} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Top-N Skills Invoked"
        chartType="Horizontal bar"
        chartLibrary="Chart.js"
        description="Horizontal bar chart showing which Skills the AI agent invoked via the Skill tool, sorted by frequency. These are NOT skills invoked by the human — they are skills that the AI agent decided to use during its autonomous work (e.g., bmad-dev-story, bmad-code-review, commit). Data is extracted from tool_use blocks where name='Skill' and the skill ID is read from the input.skill field. Directly informs which skills in the catalog get real usage."
        infoRu="Навыки (Skills), которые ИИ-агент вызывал самостоятельно через инструмент Skill. Это НЕ навыки, вызванные человеком — это решения самого ИИ. Показывает, какие навыки из каталога реально востребованы, а какие можно удалить."
        wide
      >
        {skillAgg.length > 0 ? (
          <ChartJsWrapper id="metric-22" type="bar" data={m22Data} options={horizontalBarOptions} height={Math.max(180, skillAgg.length * 28)} />
        ) : (
          <NoData />
        )}
      </MetricCard>

      <MetricCard
        title="Subagent Usage Timeline"
        chartType="Bar"
        chartLibrary="Chart.js"
        description="Bar chart over time showing how many subagent tasks the AI spawned per checkpoint. Counts tool_use blocks where name is 'Task' or 'Agent' in the JSONL transcripts. Shows whether the team is adopting agentic workflows (delegating subtasks to AI subagents) over time — a leading indicator of moving from 'AI assists me' to 'I orchestrate AI agents.'"
        infoRu="Количество подагентов (субзадач), порождённых ИИ за коммит. Рост показывает переход от модели «ИИ помогает мне» к «я оркестрирую ИИ-агентов» — ключевой индикатор зрелости AI-native разработки."
        wide
      >
        {sorted.length > 0 ? (
          <ChartJsWrapper id="metric-23" type="bar" data={m23Data} options={LIGHT_CHART_OPTIONS} height={180} />
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
