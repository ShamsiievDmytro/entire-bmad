import type { PriceTick } from '../types';
import { priceStore } from '../stores/price-store';
import { statusStore } from '../stores/status-store';

const WS_BINANCE_URL = 'wss://stream.binance.com:9443/ws/btcusdt@trade';
const WS_COINCAP_URL = 'wss://ws.coincap.io/prices?assets=bitcoin';

// Reconnection constants
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const BACKOFF_MULTIPLIER = 2;

// Fallback constants
const MAX_BINANCE_RETRIES = 3;
const MAX_COINCAP_RETRIES = 3;
const STALE_THRESHOLD_MS = 30000;
const PROMOTION_CHECK_INTERVAL_MS = 60000;
const STALE_CHECK_INTERVAL_MS = 5000;
const PROMOTION_TIMEOUT_MS = 5000;

type DataSource = 'binance' | 'coincap' | 'rest';

interface BinanceTradeMessage {
  e: string;
  E: number;
  s: string;
  t: number;
  p: string;
  q: string;
  b: number;
  a: number;
  T: number;
  m: boolean;
  M: boolean;
}

interface CoinCapPriceMessage {
  bitcoin: string;
}

export function normalizeBinanceMessage(
  raw: BinanceTradeMessage,
  previousPrice: number | null,
): PriceTick {
  const price = parseFloat(raw.p);
  const timestamp = raw.T;

  let direction: PriceTick['direction'] = 'neutral';
  if (previousPrice !== null) {
    if (price > previousPrice) direction = 'up';
    else if (price < previousPrice) direction = 'down';
  }

  return { price, timestamp, direction };
}

export function normalizeCoinCapMessage(
  raw: CoinCapPriceMessage,
  previousPrice: number | null,
): PriceTick | null {
  const price = parseFloat(raw.bitcoin);
  if (isNaN(price) || price <= 0) return null;

  const timestamp = Date.now();

  let direction: PriceTick['direction'] = 'neutral';
  if (previousPrice !== null) {
    if (price > previousPrice) direction = 'up';
    else if (price < previousPrice) direction = 'down';
  }

  return { price, timestamp, direction };
}

export class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private ws: WebSocket | null = null;
  private previousPrice: number | null = null;
  private reconnectAttempt: number = 0;
  private reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
  private currentSource: DataSource = 'binance';
  private lastPriceUpdateTime: number = 0;
  private staleCheckTimerId: ReturnType<typeof setTimeout> | null = null;
  private promotionTimerId: ReturnType<typeof setTimeout> | null = null;
  private isConnecting: boolean = false;

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  static resetInstance(): void {
    if (ConnectionManager.instance) {
      ConnectionManager.instance.disconnect();
    }
    ConnectionManager.instance = null;
  }

  connect(): void {
    this.reconnectAttempt = 0;
    this.currentSource = 'binance';
    this.previousPrice = null;
    this.isConnecting = false;
    this.connectBinance();
    this.startStaleCheck();
  }

  private connectBinance(): void {
    if (this.isConnecting) return;
    this.cleanup();
    this.isConnecting = true;
    this.currentSource = 'binance';
    statusStore.set('connecting');
    this.ws = new WebSocket(WS_BINANCE_URL);

    this.ws.onopen = () => {
      this.isConnecting = false;
      statusStore.set('live');
      this.reconnectAttempt = 0;
      if (this.reconnectTimerId !== null) {
        clearTimeout(this.reconnectTimerId);
        this.reconnectTimerId = null;
      }
      this.stopPromotionCheck();
      this.startStaleCheck();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      let raw: BinanceTradeMessage;
      try {
        raw = JSON.parse(event.data);
      } catch {
        console.error('Failed to parse WebSocket message:', event.data);
        return;
      }

      const tick = normalizeBinanceMessage(raw, this.previousPrice);

      if (isNaN(tick.price) || tick.price <= 0) {
        return;
      }

      this.previousPrice = tick.price;
      this.lastPriceUpdateTime = Date.now();
      priceStore.set(tick);

      if (statusStore.get() === 'stale') {
        statusStore.set('live');
      }
    };

    this.ws.onerror = (event: Event) => {
      console.warn('WebSocket error:', event);
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.scheduleReconnect();
    };
  }

  private connectCoinCap(): void {
    this.cleanup();
    this.currentSource = 'coincap';
    statusStore.set('reconnecting');
    this.ws = new WebSocket(WS_COINCAP_URL);

    this.ws.onopen = () => {
      statusStore.set('fallback');
      this.reconnectAttempt = 0;
      if (this.reconnectTimerId !== null) {
        clearTimeout(this.reconnectTimerId);
        this.reconnectTimerId = null;
      }
      this.startStaleCheck();
      this.schedulePromotionCheck();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      let raw: CoinCapPriceMessage;
      try {
        raw = JSON.parse(event.data);
      } catch {
        console.error('Failed to parse CoinCap message:', event.data);
        return;
      }

      const tick = normalizeCoinCapMessage(raw, this.previousPrice);
      if (tick === null) return;

      this.previousPrice = tick.price;
      this.lastPriceUpdateTime = Date.now();
      priceStore.set(tick);

      if (statusStore.get() === 'stale') {
        statusStore.set('fallback');
      }
    };

    this.ws.onerror = (event: Event) => {
      console.warn('CoinCap WebSocket error:', event);
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };
  }

  private enterRestMode(): void {
    this.cleanup();
    this.currentSource = 'rest';
    statusStore.set('stale');
    console.warn('All WebSocket sources exhausted, relying on REST polling');
    this.schedulePromotionCheck();
  }

  private getBackoffDelay(): number {
    return Math.min(
      INITIAL_BACKOFF_MS * (BACKOFF_MULTIPLIER ** this.reconnectAttempt),
      MAX_BACKOFF_MS,
    );
  }

  private scheduleReconnect(): void {
    if (statusStore.get() !== 'reconnecting') {
      statusStore.set('reconnecting');
    }

    // Check if we should fall back to next source
    if (this.currentSource === 'binance' && this.reconnectAttempt >= MAX_BINANCE_RETRIES) {
      this.reconnectAttempt = 0;
      this.connectCoinCap();
      return;
    }

    if (this.currentSource === 'coincap' && this.reconnectAttempt >= MAX_COINCAP_RETRIES) {
      this.enterRestMode();
      return;
    }

    if (this.reconnectTimerId !== null) {
      clearTimeout(this.reconnectTimerId);
    }

    const delay = this.getBackoffDelay();
    console.warn(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt + 1})`);

    this.reconnectTimerId = setTimeout(() => {
      this.attemptReconnect();
    }, delay);

    this.reconnectAttempt++;
  }

  private attemptReconnect(): void {
    this.cleanup();
    if (this.currentSource === 'coincap') {
      this.connectCoinCap();
    } else {
      this.connectBinance();
    }
  }

  private startStaleCheck(): void {
    this.stopStaleCheck();
    const check = () => {
      if (this.lastPriceUpdateTime > 0) {
        const elapsed = Date.now() - this.lastPriceUpdateTime;
        if (elapsed > STALE_THRESHOLD_MS) {
          if (statusStore.get() !== 'stale') {
            statusStore.set('stale');
          }
        }
      }
      this.staleCheckTimerId = setTimeout(check, STALE_CHECK_INTERVAL_MS);
    };
    this.staleCheckTimerId = setTimeout(check, STALE_CHECK_INTERVAL_MS);
  }

  private stopStaleCheck(): void {
    if (this.staleCheckTimerId !== null) {
      clearTimeout(this.staleCheckTimerId);
      this.staleCheckTimerId = null;
    }
  }

  private attemptPromotion(): void {
    if (this.currentSource === 'binance') return;

    const testWs = new WebSocket(WS_BINANCE_URL);
    const timeoutId = setTimeout(() => {
      testWs.onopen = null;
      testWs.onerror = null;
      testWs.close();
      this.schedulePromotionCheck();
    }, PROMOTION_TIMEOUT_MS);

    testWs.onopen = () => {
      clearTimeout(timeoutId);
      testWs.onopen = null;
      testWs.onerror = null;
      testWs.close();
      this.connect();
    };

    testWs.onerror = () => {
      clearTimeout(timeoutId);
      testWs.onopen = null;
      testWs.onerror = null;
      testWs.close();
      this.schedulePromotionCheck();
    };
  }

  private schedulePromotionCheck(): void {
    this.stopPromotionCheck();
    this.promotionTimerId = setTimeout(
      () => this.attemptPromotion(),
      PROMOTION_CHECK_INTERVAL_MS,
    );
  }

  private stopPromotionCheck(): void {
    if (this.promotionTimerId !== null) {
      clearTimeout(this.promotionTimerId);
      this.promotionTimerId = null;
    }
  }

  private cleanup(): void {
    this.isConnecting = false;
    if (this.reconnectTimerId !== null) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }

    this.stopStaleCheck();
    this.stopPromotionCheck();

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  disconnect(): void {
    this.cleanup();
    this.reconnectAttempt = 0;
    statusStore.set('connecting');
  }
}
