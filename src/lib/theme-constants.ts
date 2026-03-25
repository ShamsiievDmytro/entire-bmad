// src/lib/theme-constants.ts
// Duplicated color values for lightweight-charts JS API.
// These MUST stay in sync with @theme tokens in global.css.
// Acceptable duplication for v1 (5 chart-specific values).

export const CHART_COLORS = {
  lineColor: '#00f5ff',          // accent-primary
  areaTopColor: 'rgba(0, 245, 255, 0.1)',
  areaBottomColor: 'transparent',
  gridLinesColor: 'rgba(255, 255, 255, 0.03)',
  crosshairColor: 'rgba(255, 255, 255, 0.3)',
  backgroundColor: 'transparent', // card provides background
  textColor: '#f0f0f0',          // text-primary
} as const;

export const PRICE_COLORS = {
  up: '#22c55e',       // price-up
  down: '#ef4444',     // price-down
  flashUp: '#00f5ff',  // price-flash-up (cyan)
  flashDown: '#ef4444', // price-flash-down
  neutral: '#f0f0f0',  // text-primary
} as const;

export const STATUS_COLORS = {
  live: '#22c55e',
  reconnecting: '#f59e0b',
  stale: '#ef4444',
} as const;
