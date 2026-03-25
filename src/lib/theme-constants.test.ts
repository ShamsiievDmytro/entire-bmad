import { describe, expect, it } from 'vitest';
import { CHART_COLORS, PRICE_COLORS, STATUS_COLORS } from './theme-constants';

describe('CHART_COLORS', () => {
  it('exports all required chart color properties', () => {
    expect(CHART_COLORS).toHaveProperty('lineColor');
    expect(CHART_COLORS).toHaveProperty('areaTopColor');
    expect(CHART_COLORS).toHaveProperty('areaBottomColor');
    expect(CHART_COLORS).toHaveProperty('gridLinesColor');
    expect(CHART_COLORS).toHaveProperty('crosshairColor');
    expect(CHART_COLORS).toHaveProperty('backgroundColor');
    expect(CHART_COLORS).toHaveProperty('textColor');
  });

  it('has correct color values matching global.css tokens', () => {
    expect(CHART_COLORS.lineColor).toBe('#00f5ff');
    expect(CHART_COLORS.areaTopColor).toBe('rgba(0, 245, 255, 0.1)');
    expect(CHART_COLORS.areaBottomColor).toBe('transparent');
    expect(CHART_COLORS.gridLinesColor).toBe('rgba(255, 255, 255, 0.03)');
    expect(CHART_COLORS.crosshairColor).toBe('rgba(255, 255, 255, 0.3)');
    expect(CHART_COLORS.backgroundColor).toBe('transparent');
    expect(CHART_COLORS.textColor).toBe('#f0f0f0');
  });
});

describe('PRICE_COLORS', () => {
  it('exports all required price color properties', () => {
    expect(PRICE_COLORS).toHaveProperty('up');
    expect(PRICE_COLORS).toHaveProperty('down');
    expect(PRICE_COLORS).toHaveProperty('flashUp');
    expect(PRICE_COLORS).toHaveProperty('flashDown');
    expect(PRICE_COLORS).toHaveProperty('neutral');
  });

  it('has correct color values matching global.css tokens', () => {
    expect(PRICE_COLORS.up).toBe('#22c55e');
    expect(PRICE_COLORS.down).toBe('#ef4444');
    expect(PRICE_COLORS.flashUp).toBe('#00f5ff');
    expect(PRICE_COLORS.flashDown).toBe('#ef4444');
    expect(PRICE_COLORS.neutral).toBe('#f0f0f0');
  });
});

describe('STATUS_COLORS', () => {
  it('exports all required status color properties', () => {
    expect(STATUS_COLORS).toHaveProperty('live');
    expect(STATUS_COLORS).toHaveProperty('reconnecting');
    expect(STATUS_COLORS).toHaveProperty('stale');
  });

  it('has correct color values matching global.css tokens', () => {
    expect(STATUS_COLORS.live).toBe('#22c55e');
    expect(STATUS_COLORS.reconnecting).toBe('#f59e0b');
    expect(STATUS_COLORS.stale).toBe('#ef4444');
  });
});
