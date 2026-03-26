import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { createChart, LineSeries } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import { CHART_COLORS } from '../theme-constants';
import {
  DARK_CHART_OPTIONS,
  aggregateBmadCommands,
  classifyPromptType,
  classifyFileLayer,
  uniqueSessionCount,
  computeRollingAverage,
} from './ai-metrics-utils';
import type { CheckpointMeta } from './ai-metrics-utils';

Chart.register(...registerables);

// ── Chart instance registry ─────────────────────────────────────────────────
const chartjsRegistry = new Map<string, Chart>();
const lwcRegistry = new Map<string, IChartApi>();

function destroyChartJs(id: string) {
  // Destroy from our registry first
  const c = chartjsRegistry.get(id);
  if (c) { c.destroy(); chartjsRegistry.delete(id); return; }
  // Also destroy any Chart.js instance created by initial SSR scripts
  const el = document.getElementById(id);
  if (el && el.tagName === 'CANVAS') {
    const existing = Chart.getChart(el as HTMLCanvasElement);
    if (existing) existing.destroy();
  }
}

function destroyLwc(id: string) {
  const c = lwcRegistry.get(id);
  if (c) { c.remove(); lwcRegistry.delete(id); }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const NO_DATA = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#606070;font-family:Inter,sans-serif;font-size:14px">No data available</div>';

function ensureCanvas(id: string): HTMLCanvasElement | null {
  let el = document.getElementById(id);
  if (!el) return null;
  // If previously replaced with "No data" div, recreate canvas
  if (el.tagName !== 'CANVAS') {
    const parent = el.parentElement;
    if (!parent) return null;
    const canvas = document.createElement('canvas');
    canvas.id = id;
    parent.innerHTML = '';
    parent.appendChild(canvas);
    return canvas;
  }
  return el as HTMLCanvasElement;
}

function ensureDiv(id: string): HTMLDivElement | null {
  const el = document.getElementById(id);
  if (!el) return null;
  // Clear previous lightweight-charts content
  el.innerHTML = '';
  return el as HTMLDivElement;
}

function fmtLabel(c: CheckpointMeta): string {
  const d = new Date(c.commit_date);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ── Per-metric render functions ─────────────────────────────────────────────

function renderMetric1(sorted: CheckpointMeta[]) {
  destroyLwc('metric-1');
  const container = ensureDiv('metric-1');
  if (!container) return;
  const series = sorted.map(c => ({
    time: Math.floor(new Date(c.commit_date).getTime() / 1000) as any,
    value: c.agent_percentage,
  }));
  if (!series.length) { container.innerHTML = NO_DATA; return; }
  const chart = createChart(container, {
    layout: { background: { color: 'transparent' }, textColor: CHART_COLORS.textColor },
    grid: { vertLines: { color: CHART_COLORS.gridLinesColor }, horzLines: { color: CHART_COLORS.gridLinesColor } },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false, timeVisible: false },
    handleScroll: false, handleScale: false, autoSize: true,
  });
  const s = chart.addSeries(LineSeries, { color: CHART_COLORS.lineColor, lineWidth: 2, pointMarkersVisible: true });
  const deduped = series.filter((p, i) => i === 0 || p.time !== series[i-1].time);
  s.setData(deduped);
  chart.timeScale().fitContent();
  lwcRegistry.set('metric-1', chart);
}

function renderMetric2(checkpoints: CheckpointMeta[]) {
  const valEl = document.getElementById('stat-pure-ai-rate');
  const detailEl = document.getElementById('stat-pure-ai-detail');
  if (!valEl || !detailEl) return;
  const pureAiCount = checkpoints.filter(c => c.agent_percentage === 100).length;
  const rate = checkpoints.length > 0 ? Math.round((pureAiCount / checkpoints.length) * 100) : 0;
  valEl.textContent = `${rate}%`;
  detailEl.textContent = `${pureAiCount} of ${checkpoints.length} commits fully AI-authored`;
}

function renderMetric3(sorted: CheckpointMeta[]) {
  destroyChartJs('metric-3');
  const canvas = ensureCanvas('metric-3');
  if (!canvas) return;
  const labels = sorted.map(fmtLabel);
  const values = sorted.map(c => Math.round((100 - c.agent_percentage) * 10) / 10);
  if (!values.length) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ data: values, backgroundColor: '#f59e0b', borderRadius: 3 }] },
    options: { ...DARK_CHART_OPTIONS, plugins: { ...DARK_CHART_OPTIONS.plugins, tooltip: { ...DARK_CHART_OPTIONS.plugins.tooltip, callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(1)}%` } } } },
  });
  chartjsRegistry.set('metric-3', ch);
}

function renderMetric4(sorted: CheckpointMeta[]) {
  destroyChartJs('metric-4');
  const canvas = ensureCanvas('metric-4');
  if (!canvas) return;
  const labels = sorted.map(fmtLabel);
  const datasets = [
    { label: 'Agent %', data: sorted.map(c => Math.round(c.agent_percentage * 10) / 10), backgroundColor: '#8b5cf6', borderRadius: 2 },
    { label: 'Human %', data: sorted.map(c => Math.round((100 - c.agent_percentage) * 10) / 10), backgroundColor: '#22c55e', borderRadius: 2 },
  ];
  if (!labels.length) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'bar', data: { labels, datasets },
    options: { ...DARK_CHART_OPTIONS, plugins: { ...DARK_CHART_OPTIONS.plugins, legend: { display: true, labels: { color: '#a0a0b0', font: { family: 'Inter' } } } }, scales: { ...DARK_CHART_OPTIONS.scales, x: { ...DARK_CHART_OPTIONS.scales.x, stacked: true }, y: { ...DARK_CHART_OPTIONS.scales.y, stacked: true, max: 100 } } },
  });
  chartjsRegistry.set('metric-4', ch);
}

function renderMetric5(checkpoints: CheckpointMeta[]) {
  const valEl = document.getElementById('stat-agent-lines');
  const detailEl = document.getElementById('stat-agent-lines-detail');
  if (!valEl) return;
  const avg = checkpoints.length > 0
    ? Math.round(checkpoints.reduce((sum, c) => sum + c.agent_percentage, 0) / checkpoints.length * 10) / 10
    : 0;
  valEl.textContent = `${avg}%`;
  if (detailEl) detailEl.textContent = `average across ${checkpoints.length} checkpoints`;
}

function renderMetric6(sorted: CheckpointMeta[]) {
  destroyChartJs('metric-6');
  const canvas = ensureCanvas('metric-6');
  if (!canvas) return;
  const labels = sorted.map(fmtLabel);
  const datasets = [
    { label: 'Input', data: sorted.map(c => c.tokens.input), backgroundColor: '#8b5cf6', borderRadius: 2 },
    { label: 'Cache Creation', data: sorted.map(c => c.tokens.cache_creation), backgroundColor: '#00f5ff', borderRadius: 2 },
    { label: 'Cache Read', data: sorted.map(c => c.tokens.cache_read), backgroundColor: '#22c55e', borderRadius: 2 },
    { label: 'Output', data: sorted.map(c => c.tokens.output), backgroundColor: '#f59e0b', borderRadius: 2 },
  ];
  if (!labels.length) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'bar', data: { labels, datasets },
    options: { ...DARK_CHART_OPTIONS, plugins: { ...DARK_CHART_OPTIONS.plugins, legend: { display: true, labels: { color: '#a0a0b0', font: { family: 'Inter' } } } }, scales: { ...DARK_CHART_OPTIONS.scales, x: { ...DARK_CHART_OPTIONS.scales.x, stacked: true }, y: { ...DARK_CHART_OPTIONS.scales.y, stacked: true } } },
  });
  chartjsRegistry.set('metric-6', ch);
}

function renderMetric7(sorted: CheckpointMeta[]) {
  destroyLwc('metric-7');
  const container = ensureDiv('metric-7');
  if (!container) return;
  const series = sorted.map(c => {
    const total = c.tokens.input + c.tokens.cache_creation + c.tokens.cache_read + c.tokens.output;
    return { time: Math.floor(new Date(c.commit_date).getTime() / 1000) as any, value: total > 0 ? Math.round((c.tokens.cache_read / total) * 1000) / 10 : 0 };
  });
  if (!series.length) { container.innerHTML = NO_DATA; return; }
  const chart = createChart(container, {
    layout: { background: { color: 'transparent' }, textColor: CHART_COLORS.textColor },
    grid: { vertLines: { color: CHART_COLORS.gridLinesColor }, horzLines: { color: CHART_COLORS.gridLinesColor } },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false, timeVisible: false },
    handleScroll: false, handleScale: false, autoSize: true,
  });
  const s = chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 2, pointMarkersVisible: true });
  const deduped = series.filter((p, i) => i === 0 || p.time !== series[i-1].time);
  s.setData(deduped);
  chart.timeScale().fitContent();
  lwcRegistry.set('metric-7', chart);
}

function renderMetric8(sorted: CheckpointMeta[]) {
  destroyChartJs('metric-8');
  const canvas = ensureCanvas('metric-8');
  if (!canvas) return;
  const labels = sorted.map(fmtLabel);
  const values = sorted.map(c => c.turns.reduce((sum, t) => sum + t.turn_count, 0));
  if (!values.length) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'bar', data: { labels, datasets: [{ data: values, backgroundColor: '#8b5cf6', borderRadius: 3 }] },
    options: DARK_CHART_OPTIONS,
  });
  chartjsRegistry.set('metric-8', ch);
}

function renderMetric9(checkpoints: CheckpointMeta[]) {
  destroyChartJs('metric-9');
  const canvas = ensureCanvas('metric-9');
  if (!canvas) return;
  const modelMap = new Map<string, number>();
  for (const cp of checkpoints) for (const t of cp.turns) {
    const m = t.model || 'unknown';
    modelMap.set(m, (modelMap.get(m) ?? 0) + 1);
  }
  const labels = [...modelMap.keys()];
  const values = [...modelMap.values()];
  const COLORS = ['#8b5cf6','#00f5ff','#22c55e','#f59e0b','#ef4444','#a0a0b0','#e879f9','#38bdf8','#4ade80','#fb923c'];
  const colors = labels.map((_, i) => COLORS[i % COLORS.length]);
  if (!values.length || !labels.some(l => l.trim() !== '')) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#a0a0b0', font: { family: 'Inter', size: 10 }, boxWidth: 12, padding: 8 } }, tooltip: DARK_CHART_OPTIONS.plugins.tooltip } },
  });
  chartjsRegistry.set('metric-9', ch);
}

function renderMetric13(checkpoints: CheckpointMeta[]) {
  destroyChartJs('metric-13');
  const canvas = ensureCanvas('metric-13');
  if (!canvas) return;
  const points = checkpoints.map(c => ({ x: c.turns.reduce((sum, t) => sum + t.turn_count, 0), y: c.agent_percentage }));
  if (!points.length) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'scatter',
    data: { datasets: [{ data: points, backgroundColor: '#00f5ff', pointRadius: 5, pointHoverRadius: 7 }] },
    options: { ...DARK_CHART_OPTIONS, plugins: { ...DARK_CHART_OPTIONS.plugins, tooltip: { ...DARK_CHART_OPTIONS.plugins.tooltip, callbacks: { label: ctx => ` turns: ${ctx.parsed.x}, agent: ${ctx.parsed.y.toFixed(1)}%` } } }, scales: { ...DARK_CHART_OPTIONS.scales, x: { ...DARK_CHART_OPTIONS.scales.x, title: { display: true, text: 'API Calls (turns)', color: '#606070', font: { family: 'Inter', size: 10 } } }, y: { ...DARK_CHART_OPTIONS.scales.y, title: { display: true, text: 'Agent %', color: '#606070', font: { family: 'Inter', size: 10 } } } } },
  });
  chartjsRegistry.set('metric-13', ch);
}

function renderMetric14(checkpoints: CheckpointMeta[]) {
  destroyChartJs('metric-14');
  const canvas = ensureCanvas('metric-14');
  if (!canvas) return;
  const bmadAgg = aggregateBmadCommands(checkpoints);
  const labels = bmadAgg.map(e => e.command);
  const values = bmadAgg.map(e => e.count);
  if (!values.length) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'bar', data: { labels, datasets: [{ data: values, backgroundColor: '#8b5cf6', borderRadius: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const, plugins: DARK_CHART_OPTIONS.plugins, scales: { x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#a0a0b0', font: { family: 'Inter', size: 11 } }, border: { display: false } }, y: { ticks: { color: '#a0a0b0', font: { family: 'Inter', size: 10 } }, grid: { display: false }, border: { display: false } } } },
  });
  chartjsRegistry.set('metric-14', ch);
}

function renderMetric15(checkpoints: CheckpointMeta[]) {
  destroyChartJs('metric-15');
  const canvas = ensureCanvas('metric-15');
  if (!canvas) return;
  const counts = { 'Slash Command': 0, 'Free-form': 0, Continuation: 0 };
  for (const cp of checkpoints) for (const t of cp.turns) {
    (counts as any)[classifyPromptType(t.prompt_txt)]++;
  }
  const labels = Object.keys(counts);
  const values = Object.values(counts);
  const total = values.reduce((a, b) => a + b, 0);
  const hasReal = values[0] > 0 || values[1] > 0;
  if (!total || !hasReal) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: ['#00f5ff','#8b5cf6','#a0a0b0'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#a0a0b0', font: { family: 'Inter', size: 10 }, boxWidth: 12, padding: 8 } }, tooltip: DARK_CHART_OPTIONS.plugins.tooltip } },
  });
  chartjsRegistry.set('metric-15', ch);
}

function renderMetric16(sorted: CheckpointMeta[]) {
  destroyChartJs('metric-16');
  const canvas = ensureCanvas('metric-16');
  if (!canvas) return;
  const labels = sorted.map(fmtLabel);
  const FILE_LAYERS = ['components','services','stores','utils','docs','other'] as const;
  const COLORS: Record<string,string> = { components:'#8b5cf6', services:'#00f5ff', stores:'#22c55e', utils:'#f59e0b', docs:'#a0a0b0', other:'#606070' };
  const datasets = FILE_LAYERS.map(layer => ({ label: layer.charAt(0).toUpperCase()+layer.slice(1), data: sorted.map(c => c.files_touched.filter(f => classifyFileLayer(f) === layer).length), backgroundColor: COLORS[layer], borderRadius: 2 }));
  if (!labels.length) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'bar', data: { labels, datasets },
    options: { ...DARK_CHART_OPTIONS, plugins: { ...DARK_CHART_OPTIONS.plugins, legend: { display: true, labels: { color: '#a0a0b0', font: { family: 'Inter', size: 10 }, boxWidth: 10, padding: 6 } } }, scales: { ...DARK_CHART_OPTIONS.scales, x: { ...DARK_CHART_OPTIONS.scales.x, stacked: true }, y: { ...DARK_CHART_OPTIONS.scales.y, stacked: true } } },
  });
  chartjsRegistry.set('metric-16', ch);
}

function renderMetric17(sorted: CheckpointMeta[]) {
  destroyChartJs('metric-17');
  const canvas = ensureCanvas('metric-17');
  if (!canvas) return;
  const labels = sorted.map(fmtLabel);
  const values = sorted.map(c => uniqueSessionCount(c));
  if (!values.length) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'bar', data: { labels, datasets: [{ data: values, backgroundColor: '#00f5ff', borderRadius: 3 }] },
    options: DARK_CHART_OPTIONS,
  });
  chartjsRegistry.set('metric-17', ch);
}

function renderMetric18(sorted: CheckpointMeta[]) {
  destroyChartJs('metric-18');
  const canvas = ensureCanvas('metric-18');
  if (!canvas) return;
  const points = sorted.map(c => ({
    x: new Date(c.commit_date).getTime(),
    y: c.agent_percentage,
    color: c.agent_percentage >= 70 ? '#22c55e' : c.agent_percentage >= 40 ? '#f59e0b' : '#ef4444',
  }));
  if (!points.length) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'scatter',
    data: { datasets: [{ data: points.map(p => ({ x: p.x, y: p.y })), backgroundColor: points.map(p => p.color), pointRadius: 6, pointHoverRadius: 8 }] },
    options: { ...DARK_CHART_OPTIONS, plugins: { ...DARK_CHART_OPTIONS.plugins, tooltip: { ...DARK_CHART_OPTIONS.plugins.tooltip, callbacks: { label: ctx => ` ${new Date(ctx.parsed.x).toLocaleDateString()}: ${ctx.parsed.y.toFixed(1)}%` } } }, scales: { ...DARK_CHART_OPTIONS.scales, x: { type: 'time' as const, time: { unit: 'hour' as const, displayFormats: { hour: 'MMM d HH:mm' } }, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#a0a0b0', font: { family: 'Inter', size: 10 }, maxRotation: 45 }, border: { display: false } }, y: { ...DARK_CHART_OPTIONS.scales.y, title: { display: true, text: 'Agent %', color: '#606070', font: { family: 'Inter', size: 10 } } } } },
  });
  chartjsRegistry.set('metric-18', ch);
}

function renderMetric19(sorted: CheckpointMeta[]) {
  destroyChartJs('metric-19');
  const canvas = ensureCanvas('metric-19');
  if (!canvas) return;
  const cadenceValues = sorted.slice(1).map((c, i) => Math.round((new Date(c.commit_date).getTime() - new Date(sorted[i].commit_date).getTime()) / 60_000));
  const cadenceLabels = sorted.slice(1).map(fmtLabel);
  if (!cadenceValues.length) { canvas.parentElement!.innerHTML = NO_DATA; return; }
  const ch = new Chart(canvas, {
    type: 'bar', data: { labels: cadenceLabels, datasets: [{ data: cadenceValues, backgroundColor: '#a0a0b0', borderRadius: 3 }] },
    options: { ...DARK_CHART_OPTIONS, plugins: { ...DARK_CHART_OPTIONS.plugins, tooltip: { ...DARK_CHART_OPTIONS.plugins.tooltip, callbacks: { label: ctx => ` ${ctx.parsed.y} min` } } } },
  });
  chartjsRegistry.set('metric-19', ch);
}

function renderMetric20(sorted: CheckpointMeta[]) {
  destroyLwc('metric-20');
  const container = ensureDiv('metric-20');
  if (!container) return;
  const agentPcts = sorted.map(c => c.agent_percentage);
  const rolling = computeRollingAverage(agentPcts, 3);
  const series = sorted.map((c, i) => ({
    time: Math.floor(new Date(c.commit_date).getTime() / 1000) as any,
    value: Math.round(rolling[i] * 10) / 10,
  }));
  if (!series.length) { container.innerHTML = NO_DATA; return; }
  const chart = createChart(container, {
    layout: { background: { color: 'transparent' }, textColor: CHART_COLORS.textColor },
    grid: { vertLines: { color: CHART_COLORS.gridLinesColor }, horzLines: { color: CHART_COLORS.gridLinesColor } },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false, timeVisible: false },
    handleScroll: false, handleScale: false, autoSize: true,
  });
  const s = chart.addSeries(LineSeries, { color: CHART_COLORS.lineColor, lineWidth: 2, pointMarkersVisible: true });
  const deduped = series.filter((p, i) => i === 0 || p.time !== series[i-1].time);
  s.setData(deduped);
  chart.timeScale().fitContent();
  lwcRegistry.set('metric-20', chart);
}

// ── Multi-checkpoint-only card visibility ───────────────────────────────────
// IDs of the CARD containers (closest .card-glass parent) for metrics that
// only make sense with multiple checkpoints.
const MULTI_ONLY_METRIC_IDS = ['metric-1', 'metric-7', 'metric-19', 'metric-20'];

function setMultiOnlyVisibility(isMulti: boolean) {
  for (const id of MULTI_ONLY_METRIC_IDS) {
    const el = document.getElementById(id);
    const card = el?.closest('.card-glass') as HTMLElement | null;
    if (card) card.style.display = isMulti ? '' : 'none';
  }
}

// ── Master render ───────────────────────────────────────────────────────────
export function renderDashboard(checkpoints: CheckpointMeta[]): void {
  const isMulti = checkpoints.length > 1;
  const sorted = [...checkpoints].sort(
    (a, b) => new Date(a.commit_date).getTime() - new Date(b.commit_date).getTime(),
  );

  // Multi-checkpoint-only charts
  setMultiOnlyVisibility(isMulti);

  // Attribution
  if (isMulti) renderMetric1(sorted);
  renderMetric2(checkpoints);
  renderMetric3(sorted);
  renderMetric4(sorted);
  renderMetric5(checkpoints);

  // Token Economics
  renderMetric6(sorted);
  if (isMulti) renderMetric7(sorted);
  renderMetric8(sorted);
  renderMetric9(checkpoints);

  // Quality Signals
  renderMetric13(checkpoints);

  // Behavioral / SDLC
  renderMetric14(checkpoints);
  renderMetric15(checkpoints);
  renderMetric16(sorted);
  renderMetric17(sorted);

  // Temporal
  renderMetric18(sorted);
  if (isMulti) renderMetric19(sorted);
  if (isMulti) renderMetric20(sorted);
}
