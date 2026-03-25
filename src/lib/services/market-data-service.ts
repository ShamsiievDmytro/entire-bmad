import { marketStore } from '../stores/market-store';
import { chartStore } from '../stores/chart-store';
import type { MarketData, ChartPoint } from '../types';

const COINGECKO_MARKETS_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h';

const COINGECKO_MARKET_CHART_URL =
  'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1';

const REST_POLL_INTERVAL_MS = 60_000;
const CHART_MAX_ENTRIES = 24;

interface CoinGeckoMarketResponse {
  market_cap: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
}

interface CoinGeckoChartResponse {
  prices: [number, number][];
}

export class MarketDataService {
  private static instance: MarketDataService | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;

  private constructor() {}

  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  /** Reset singleton for testing purposes */
  static resetInstance(): void {
    if (MarketDataService.instance) {
      MarketDataService.instance.stop();
    }
    MarketDataService.instance = null;
  }

  start(): void {
    this.abortController = new AbortController();
    this.fetchAndSchedule();
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private async fetchAndSchedule(): Promise<void> {
    await Promise.allSettled([this.fetchMarketData(), this.fetchChartData()]);
    // Only schedule next poll if service hasn't been stopped
    if (this.abortController) {
      this.scheduleNext();
    }
  }

  private scheduleNext(): void {
    // Clear any existing timer before scheduling (memory leak prevention)
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
    }
    this.timerId = setTimeout(() => this.fetchAndSchedule(), REST_POLL_INTERVAL_MS);
  }

  private async fetchMarketData(): Promise<void> {
    try {
      const response = await fetch(COINGECKO_MARKETS_URL, {
        signal: this.abortController?.signal,
      });
      if (!response.ok) {
        console.warn(`CoinGecko markets API error: ${COINGECKO_MARKETS_URL} — status ${response.status}`);
        return;
      }
      const data: CoinGeckoMarketResponse[] = await response.json();
      if (!data || data.length === 0) {
        console.warn('CoinGecko markets API returned empty data');
        return;
      }
      const item = data[0];
      const marketData: MarketData = {
        marketCap: item.market_cap,
        change24h: item.price_change_24h,
        changePercent24h: item.price_change_percentage_24h,
        high24h: item.high_24h,
        low24h: item.low_24h,
      };
      marketStore.set(marketData);
    } catch (error) {
      console.warn(`CoinGecko markets fetch failed: ${COINGECKO_MARKETS_URL}`, error);
      // Do NOT clear marketStore — retain last known values (NFR12)
    }
  }

  private async fetchChartData(): Promise<void> {
    try {
      const response = await fetch(COINGECKO_MARKET_CHART_URL, {
        signal: this.abortController?.signal,
      });
      if (!response.ok) {
        console.warn(`CoinGecko chart API error: ${COINGECKO_MARKET_CHART_URL} — status ${response.status}`);
        return;
      }
      const data: CoinGeckoChartResponse = await response.json();
      if (!data || !data.prices || data.prices.length === 0) {
        console.warn('CoinGecko chart API returned empty prices');
        return;
      }
      const chartPoints = sampleHourlyPoints(data.prices);
      chartStore.set(chartPoints);
    } catch (error) {
      console.warn(`CoinGecko chart fetch failed: ${COINGECKO_MARKET_CHART_URL}`, error);
      // Do NOT clear chartStore — retain last known values (NFR12)
    }
  }
}

export function sampleHourlyPoints(prices: [number, number][]): ChartPoint[] {
  if (prices.length <= CHART_MAX_ENTRIES) {
    return prices.map(([time, value]) => ({ time, value }));
  }
  const step = Math.floor(prices.length / CHART_MAX_ENTRIES);
  const sampled: ChartPoint[] = [];
  for (let i = 0; i < prices.length && sampled.length < CHART_MAX_ENTRIES; i += step) {
    sampled.push({ time: prices[i][0], value: prices[i][1] });
  }
  return sampled;
}
