export interface PriceTick {
  price: number;
  timestamp: number;
  direction: 'up' | 'down' | 'neutral';
}

export interface MarketData {
  marketCap: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
}

export interface ChartPoint {
  time: number;
  value: number;
}

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'stale' | 'fallback';

// git-ai test: timestamp 2026-04-17T14:13 — this line was added to generate attribution data
export const GIT_AI_TEST_MARKER = 'git-ai-attribution-test' as const;
