import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { marketStore } from '../stores/market-store';
import { chartStore } from '../stores/chart-store';
import { MarketDataService, sampleHourlyPoints } from './market-data-service';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const MOCK_MARKET_RESPONSE = [
  {
    market_cap: 1340000000000,
    price_change_24h: 1534.22,
    price_change_percentage_24h: 2.3,
    high_24h: 68900,
    low_24h: 66900,
  },
];

const MOCK_CHART_RESPONSE = {
  prices: Array.from(
    { length: 288 },
    (_, i) => [1711972200000 + i * 300000, 68000 + i] as [number, number]
  ),
};

describe('MarketDataService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    marketStore.set(null);
    chartStore.set([]);
    mockFetch.mockReset();
    MarketDataService.resetInstance();
  });

  afterEach(() => {
    MarketDataService.resetInstance();
    vi.useRealTimers();
  });

  it('returns the same instance (singleton)', () => {
    const a = MarketDataService.getInstance();
    const b = MarketDataService.getInstance();
    expect(a).toBe(b);
  });

  it('populates marketStore on successful fetch', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_MARKET_RESPONSE),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_CHART_RESPONSE),
      });

    const service = MarketDataService.getInstance();
    service.start();

    // Let promises resolve
    await vi.advanceTimersByTimeAsync(0);

    const market = marketStore.get();
    expect(market).not.toBeNull();
    expect(market!.marketCap).toBe(1340000000000);
    expect(market!.change24h).toBe(1534.22);
    expect(market!.changePercent24h).toBe(2.3);
    expect(market!.high24h).toBe(68900);
    expect(market!.low24h).toBe(66900);
  });

  it('populates chartStore on successful fetch', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_MARKET_RESPONSE),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_CHART_RESPONSE),
      });

    const service = MarketDataService.getInstance();
    service.start();

    await vi.advanceTimersByTimeAsync(0);

    const chart = chartStore.get();
    expect(chart.length).toBeGreaterThan(0);
    expect(chart.length).toBeLessThanOrEqual(24);
    expect(chart[0]).toHaveProperty('time');
    expect(chart[0]).toHaveProperty('value');
  });

  it('retains marketStore on fetch error', async () => {
    const initialData = {
      marketCap: 1000,
      change24h: 10,
      changePercent24h: 1,
      high24h: 100,
      low24h: 90,
    };
    marketStore.set(initialData);

    mockFetch.mockRejectedValue(new Error('Network error'));

    const service = MarketDataService.getInstance();
    service.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(marketStore.get()).toEqual(initialData);
  });

  it('retains chartStore on fetch error', async () => {
    const initialChart = [{ time: 1000, value: 68000 }];
    chartStore.set(initialChart);

    mockFetch.mockRejectedValue(new Error('Network error'));

    const service = MarketDataService.getInstance();
    service.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(chartStore.get()).toEqual(initialChart);
  });

  it('logs console.warn on API error status', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockFetch.mockResolvedValue({ ok: false, status: 429 });

    const service = MarketDataService.getInstance();
    service.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(warnSpy).toHaveBeenCalled();
    const warnCalls = warnSpy.mock.calls.flat().join(' ');
    expect(warnCalls).toContain('CoinGecko');

    warnSpy.mockRestore();
  });

  it('logs console.warn on network error', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockFetch.mockRejectedValue(new Error('Network error'));

    const service = MarketDataService.getInstance();
    service.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('schedules next poll after fetch completes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_MARKET_RESPONSE),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_CHART_RESPONSE),
      });

    const service = MarketDataService.getInstance();
    service.start();

    await vi.advanceTimersByTimeAsync(0);

    // Should have made 2 fetch calls (markets + chart)
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Set up mocks for second poll
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_MARKET_RESPONSE),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_CHART_RESPONSE),
      });

    // Advance by 60 seconds to trigger next poll
    await vi.advanceTimersByTimeAsync(60_000);

    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('stop() clears the timer', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_MARKET_RESPONSE),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_CHART_RESPONSE),
      });

    const service = MarketDataService.getInstance();
    service.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(mockFetch).toHaveBeenCalledTimes(2);

    service.stop();

    // Set up mocks that should NOT be called
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_MARKET_RESPONSE),
    });

    // Advance past poll interval — no new fetches should happen
    await vi.advanceTimersByTimeAsync(120_000);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('stop() aborts in-flight fetch calls', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Make fetch hang until aborted
    mockFetch.mockImplementation((_url: string, options?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }
      });
    });

    const service = MarketDataService.getInstance();
    service.start();

    // Fetch is in-flight — stop should abort it
    service.stop();

    // Let abort propagate
    await vi.advanceTimersByTimeAsync(0);

    // Stores should remain at initial values (null / [])
    expect(marketStore.get()).toBeNull();
    expect(chartStore.get()).toEqual([]);

    warnSpy.mockRestore();
  });

  it('passes AbortSignal to fetch calls', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_MARKET_RESPONSE),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_CHART_RESPONSE),
      });

    const service = MarketDataService.getInstance();
    service.start();

    await vi.advanceTimersByTimeAsync(0);

    // Verify fetch was called with a signal option
    expect(mockFetch.mock.calls[0][1]).toHaveProperty('signal');
    expect(mockFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(mockFetch.mock.calls[1][1]).toHaveProperty('signal');
    expect(mockFetch.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('retains stores on empty API response', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    marketStore.set({
      marketCap: 1000,
      change24h: 10,
      changePercent24h: 1,
      high24h: 100,
      low24h: 90,
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ prices: [] }),
      });

    const service = MarketDataService.getInstance();
    service.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(marketStore.get()!.marketCap).toBe(1000);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

describe('sampleHourlyPoints', () => {
  it('returns all points when <= 24', () => {
    const prices: [number, number][] = Array.from({ length: 10 }, (_, i) => [
      i * 1000,
      68000 + i,
    ]);
    const result = sampleHourlyPoints(prices);
    expect(result).toHaveLength(10);
    expect(result[0]).toEqual({ time: 0, value: 68000 });
  });

  it('caps at 24 entries when input is larger', () => {
    const prices: [number, number][] = Array.from({ length: 288 }, (_, i) => [
      i * 300000,
      68000 + i,
    ]);
    const result = sampleHourlyPoints(prices);
    expect(result).toHaveLength(24);
  });

  it('samples evenly from input array', () => {
    const prices: [number, number][] = Array.from({ length: 288 }, (_, i) => [
      i * 300000,
      68000 + i,
    ]);
    const result = sampleHourlyPoints(prices);
    expect(result[0].time).toBe(0);
    expect(result[0].value).toBe(68000);
    // Points should be evenly spaced (step = 12)
    expect(result[1].time).toBe(12 * 300000);
    expect(result.length).toBe(24);
  });

  it('handles exactly 24 points', () => {
    const prices: [number, number][] = Array.from({ length: 24 }, (_, i) => [
      i * 3600000,
      68000 + i * 100,
    ]);
    const result = sampleHourlyPoints(prices);
    expect(result).toHaveLength(24);
    expect(result[0]).toEqual({ time: 0, value: 68000 });
    expect(result[23]).toEqual({ time: 23 * 3600000, value: 68000 + 23 * 100 });
  });

  it('handles single point', () => {
    const prices: [number, number][] = [[1711972200000, 68432.17]];
    const result = sampleHourlyPoints(prices);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ time: 1711972200000, value: 68432.17 });
  });

  it('handles empty array', () => {
    const result = sampleHourlyPoints([]);
    expect(result).toHaveLength(0);
  });
});
