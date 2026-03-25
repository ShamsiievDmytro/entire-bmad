import { describe, it, expect } from 'vitest';
import type { PriceTick, MarketData, ChartPoint, ConnectionStatus } from './types';

describe('TypeScript interfaces', () => {
  it('PriceTick has correct shape', () => {
    const tick: PriceTick = { price: 50000, timestamp: Date.now(), direction: 'up' };
    expect(tick.price).toBe(50000);
    expect(tick.direction).toBe('up');
  });

  it('MarketData has correct shape', () => {
    const data: MarketData = {
      marketCap: 1_000_000_000,
      change24h: 500,
      changePercent24h: 2.5,
      high24h: 51000,
      low24h: 49000,
    };
    expect(data.marketCap).toBe(1_000_000_000);
    expect(data.changePercent24h).toBe(2.5);
  });

  it('ChartPoint has correct shape', () => {
    const point: ChartPoint = { time: Date.now(), value: 50000 };
    expect(point.time).toBeGreaterThan(0);
    expect(point.value).toBe(50000);
  });

  it('ConnectionStatus accepts valid values', () => {
    const statuses: ConnectionStatus[] = ['connecting', 'live', 'reconnecting', 'stale', 'fallback'];
    expect(statuses).toHaveLength(5);
  });
});
