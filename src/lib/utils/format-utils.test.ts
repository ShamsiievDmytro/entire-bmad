import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatPercent,
  formatAbsoluteChange,
  formatMarketCap,
  formatRange,
  formatChartTooltip,
} from './format-utils';

describe('formatPrice', () => {
  it('formats a normal price', () => {
    expect(formatPrice(68432.17)).toBe('$68,432.17');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('formats a large price', () => {
    expect(formatPrice(100000)).toBe('$100,000.00');
  });

  it('formats a small decimal', () => {
    expect(formatPrice(0.5)).toBe('$0.50');
  });

  it('handles NaN', () => {
    // Node.js Intl with style:'currency' returns '$NaN'
    expect(formatPrice(NaN)).toBe('$NaN');
  });

  it('handles Infinity', () => {
    expect(formatPrice(Infinity)).toContain('∞');
  });

  it('handles negative price', () => {
    expect(formatPrice(-100)).toBe('-$100.00');
  });
});

describe('formatPercent', () => {
  it('formats a positive percentage', () => {
    expect(formatPercent(2.3)).toBe('+2.3%');
  });

  it('formats a negative percentage', () => {
    expect(formatPercent(-1.8)).toBe('-1.8%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('+0.0%');
  });

  it('formats a large percentage', () => {
    expect(formatPercent(15.7)).toBe('+15.7%');
  });

  it('handles Infinity', () => {
    expect(formatPercent(Infinity)).toContain('∞');
  });
});

describe('formatAbsoluteChange', () => {
  it('formats a positive change', () => {
    expect(formatAbsoluteChange(1534.22)).toBe('+$1,534.22');
  });

  it('formats a negative change', () => {
    expect(formatAbsoluteChange(-892.4)).toBe('-$892.40');
  });

  it('formats zero', () => {
    const result = formatAbsoluteChange(0);
    expect(result).toMatch(/\$0\.00/);
  });

  it('handles Infinity', () => {
    expect(formatAbsoluteChange(Infinity)).toContain('∞');
  });
});

describe('formatMarketCap', () => {
  it('formats trillions', () => {
    expect(formatMarketCap(1340000000000)).toBe('$1.34T');
  });

  it('formats billions', () => {
    expect(formatMarketCap(892450000000)).toBe('$892.45B');
  });

  it('formats millions', () => {
    expect(formatMarketCap(5670000)).toBe('$5.67M');
  });

  it('formats zero', () => {
    expect(formatMarketCap(0)).toBe('$0.00');
  });

  it('handles Infinity', () => {
    expect(formatMarketCap(Infinity)).toContain('∞');
  });
});

describe('formatRange', () => {
  it('formats a normal range', () => {
    const result = formatRange(66900, 68900);
    // Intl compact notation uses uppercase K
    expect(result).toContain('—');
    expect(result).toMatch(/\$66\.9K?\s*—\s*\$68\.9K?/i);
  });

  it('formats equal values', () => {
    const result = formatRange(68000, 68000);
    expect(result).toMatch(/\$68\.0K\s*—\s*\$68\.0K/i);
  });

  it('handles Infinity', () => {
    const result = formatRange(Infinity, Infinity);
    expect(result).toContain('∞');
    expect(result).toContain('—');
  });
});

describe('formatChartTooltip', () => {
  it('formats price and time', () => {
    const date = new Date('2024-04-01T14:30:00Z');
    const result = formatChartTooltip(68432.17, date.getTime());
    expect(result).toBe('$68,432.17 at 14:30');
  });

  it('handles NaN timestamp', () => {
    expect(() => formatChartTooltip(68432.17, NaN)).toThrow();
  });
});
