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
