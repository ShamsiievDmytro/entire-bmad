import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { priceStore } from '../stores/price-store';
import { statusStore } from '../stores/status-store';

// Mock WebSocket
let mockWsInstance: MockWebSocket;
let lastWsUrl: string;

class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    lastWsUrl = url;
    mockWsInstance = this;
  }
}

vi.stubGlobal('WebSocket', MockWebSocket);

// Import after WebSocket mock is set up
const { ConnectionManager, normalizeBinanceMessage } = await import(
  './connection-manager'
);

describe('normalizeBinanceMessage', () => {
  const rawMessage = {
    e: 'trade',
    E: 1672515782136,
    s: 'BTCUSDT',
    t: 12345,
    p: '68432.17000000',
    q: '0.001',
    b: 88,
    a: 50,
    T: 1672515782136,
    m: true,
    M: true,
  };

  it('produces correct PriceTick from raw Binance message', () => {
    const tick = normalizeBinanceMessage(rawMessage, null);
    expect(tick).toEqual({
      price: 68432.17,
      timestamp: 1672515782136,
      direction: 'neutral',
    });
  });

  it('parses price string correctly to number', () => {
    const tick = normalizeBinanceMessage(rawMessage, null);
    expect(tick.price).toBe(68432.17);
    expect(typeof tick.price).toBe('number');
  });

  it('preserves timestamp from T field', () => {
    const tick = normalizeBinanceMessage(rawMessage, null);
    expect(tick.timestamp).toBe(1672515782136);
  });

  it('returns direction neutral when no previous price exists', () => {
    const tick = normalizeBinanceMessage(rawMessage, null);
    expect(tick.direction).toBe('neutral');
  });

  it('returns direction up when current price > previous price', () => {
    const tick = normalizeBinanceMessage(rawMessage, 60000);
    expect(tick.direction).toBe('up');
  });

  it('returns direction down when current price < previous price', () => {
    const tick = normalizeBinanceMessage(rawMessage, 70000);
    expect(tick.direction).toBe('down');
  });

  it('returns direction neutral when current price === previous price', () => {
    const tick = normalizeBinanceMessage(rawMessage, 68432.17);
    expect(tick.direction).toBe('neutral');
  });
});

describe('ConnectionManager', () => {
  beforeEach(() => {
    // Reset singleton for each test
    ConnectionManager.resetInstance();
    priceStore.set(null);
    statusStore.set('connecting');
  });

  afterEach(() => {
    ConnectionManager.getInstance().disconnect();
  });

  it('returns same instance (singleton pattern)', () => {
    const a = ConnectionManager.getInstance();
    const b = ConnectionManager.getInstance();
    expect(a).toBe(b);
  });

  it('sets statusStore to connecting on connect()', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    expect(statusStore.get()).toBe('connecting');
  });

  it('creates WebSocket with correct Binance URL', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    expect(lastWsUrl).toBe('wss://stream.binance.com:9443/ws/btcusdt@trade');
  });

  it('sets statusStore to live on WebSocket open', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));
    expect(statusStore.get()).toBe('live');
  });

  it('writes normalized PriceTick to priceStore on message', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    const rawData = JSON.stringify({
      e: 'trade',
      E: 1672515782136,
      s: 'BTCUSDT',
      t: 12345,
      p: '68432.17000000',
      q: '0.001',
      b: 88,
      a: 50,
      T: 1672515782136,
      m: true,
      M: true,
    });

    mockWsInstance.onmessage!(new MessageEvent('message', { data: rawData }));

    const stored = priceStore.get();
    expect(stored).toEqual({
      price: 68432.17,
      timestamp: 1672515782136,
      direction: 'neutral',
    });
  });

  it('computes direction correctly across multiple messages', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    // First message — neutral (no previous)
    const msg1 = JSON.stringify({
      e: 'trade',
      E: 1,
      s: 'BTCUSDT',
      t: 1,
      p: '100.00',
      q: '0.001',
      b: 1,
      a: 1,
      T: 1000,
      m: true,
      M: true,
    });
    mockWsInstance.onmessage!(new MessageEvent('message', { data: msg1 }));
    expect(priceStore.get()?.direction).toBe('neutral');

    // Second message — up
    const msg2 = JSON.stringify({
      e: 'trade',
      E: 2,
      s: 'BTCUSDT',
      t: 2,
      p: '110.00',
      q: '0.001',
      b: 1,
      a: 1,
      T: 2000,
      m: true,
      M: true,
    });
    mockWsInstance.onmessage!(new MessageEvent('message', { data: msg2 }));
    expect(priceStore.get()?.direction).toBe('up');

    // Third message — down
    const msg3 = JSON.stringify({
      e: 'trade',
      E: 3,
      s: 'BTCUSDT',
      t: 3,
      p: '105.00',
      q: '0.001',
      b: 1,
      a: 1,
      T: 3000,
      m: true,
      M: true,
    });
    mockWsInstance.onmessage!(new MessageEvent('message', { data: msg3 }));
    expect(priceStore.get()?.direction).toBe('down');
  });

  it('skips priceStore update for NaN price', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    const badMsg = JSON.stringify({
      e: 'trade',
      E: 1,
      s: 'BTCUSDT',
      t: 1,
      p: 'not-a-number',
      q: '0.001',
      b: 1,
      a: 1,
      T: 1000,
      m: true,
      M: true,
    });
    mockWsInstance.onmessage!(new MessageEvent('message', { data: badMsg }));
    expect(priceStore.get()).toBeNull();
  });

  it('skips priceStore update for non-positive price', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    const zeroMsg = JSON.stringify({
      e: 'trade',
      E: 1,
      s: 'BTCUSDT',
      t: 1,
      p: '0',
      q: '0.001',
      b: 1,
      a: 1,
      T: 1000,
      m: true,
      M: true,
    });
    mockWsInstance.onmessage!(new MessageEvent('message', { data: zeroMsg }));
    expect(priceStore.get()).toBeNull();
  });

  it('handles malformed JSON without crashing', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockWsInstance.onmessage!(
      new MessageEvent('message', { data: 'not-json' }),
    );
    expect(priceStore.get()).toBeNull();
    consoleSpy.mockRestore();
  });

  it('cleans up old WebSocket on reconnect', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    const firstWs = mockWsInstance;

    manager.connect();
    expect(firstWs.close).toHaveBeenCalled();
    expect(firstWs.onopen).toBeNull();
    expect(firstWs.onmessage).toBeNull();
    expect(firstWs.onerror).toBeNull();
    expect(firstWs.onclose).toBeNull();
  });

  it('disconnect() cleans up WebSocket', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    const ws = mockWsInstance;

    manager.disconnect();
    expect(ws.close).toHaveBeenCalled();
    expect(ws.onopen).toBeNull();
    expect(ws.onmessage).toBeNull();
  });

  it('isConnecting guard prevents re-entry into connectBinance', () => {
    const manager = ConnectionManager.getInstance();

    // Track how many WebSocket instances are created
    let wsCreationCount = 0;
    const OriginalMockWs = MockWebSocket;
    const countingWs = class extends OriginalMockWs {
      constructor(url: string) {
        super(url);
        wsCreationCount++;
      }
    };
    vi.stubGlobal('WebSocket', countingWs);

    manager.connect(); // creates 1st WS, sets isConnecting = true
    const countAfterFirstConnect = wsCreationCount;

    // Access private connectBinance via bracket notation to simulate
    // a concurrent call while isConnecting is still true (before onopen)
    (manager as unknown as { connectBinance: () => void }).connectBinance();

    // No new WebSocket should have been created due to the guard
    expect(wsCreationCount).toBe(countAfterFirstConnect);

    // Restore original mock
    vi.stubGlobal('WebSocket', OriginalMockWs);
  });

  it('statusStore transitions from connecting to live', () => {
    // Set to a non-connecting state first so the transition is observable
    statusStore.set('live');
    const manager = ConnectionManager.getInstance();
    const states: string[] = [];
    statusStore.listen((val) => states.push(val));

    manager.connect(); // should set 'connecting'
    mockWsInstance.onopen!(new Event('open')); // should set 'live'

    expect(states).toContain('connecting');
    expect(states).toContain('live');
  });
});

describe('ConnectionManager reconnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    ConnectionManager.resetInstance();
    priceStore.set(null);
    statusStore.set('connecting');
  });

  afterEach(() => {
    ConnectionManager.getInstance().disconnect();
    vi.useRealTimers();
  });

  it('getBackoffDelay returns correct exponential delays for Binance retries', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    // With MAX_BINANCE_RETRIES=3, we get 3 backoff delays before CoinCap fallback
    const expectedDelays = [1000, 2000, 4000];
    const actualDelays: number[] = [];

    for (let i = 0; i < expectedDelays.length; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));

      const lastCall = warnSpy.mock.calls[warnSpy.mock.calls.length - 1];
      const match = (lastCall[0] as string).match(/Reconnecting in (\d+)ms/);
      if (match) actualDelays.push(parseInt(match[1], 10));

      vi.advanceTimersByTime(expectedDelays[i]);
    }

    warnSpy.mockRestore();

    expect(actualDelays).toEqual(expectedDelays);
  });

  it('sets statusStore to reconnecting on WebSocket close', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));
    expect(statusStore.get()).toBe('live');

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockWsInstance.onclose!(new CloseEvent('close'));
    expect(statusStore.get()).toBe('reconnecting');
  });

  it('clears previous reconnect timer before scheduling new one', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // First close triggers reconnect
    mockWsInstance.onclose!(new CloseEvent('close'));

    // Advance partway, then trigger another close on the new WS
    vi.advanceTimersByTime(500);
    mockWsInstance.onclose!(new CloseEvent('close'));

    // clearTimeout should have been called to clear the previous timer
    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(0);
  });

  it('resets reconnectAttempt to 0 on successful reconnection', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Disconnect, reconnect with backoff
    mockWsInstance.onclose!(new CloseEvent('close'));
    expect(statusStore.get()).toBe('reconnecting');

    // Advance timer to trigger reconnect attempt
    vi.advanceTimersByTime(1000);

    // Simulate successful reconnection
    mockWsInstance.onopen!(new Event('open'));
    expect(statusStore.get()).toBe('live');

    // Now if it disconnects again, it should start at 1s (attempt 0)
    mockWsInstance.onclose!(new CloseEvent('close'));

    const lastCall = vi.mocked(console.warn).mock.calls;
    const lastMsg = lastCall[lastCall.length - 1][0] as string;
    expect(lastMsg).toContain('Reconnecting in 1000ms');
  });

  it('sets statusStore to live on successful reconnection', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockWsInstance.onclose!(new CloseEvent('close'));
    expect(statusStore.get()).toBe('reconnecting');

    vi.advanceTimersByTime(1000);
    mockWsInstance.onopen!(new Event('open'));
    expect(statusStore.get()).toBe('live');
  });

  it('cleanup clears reconnect timer', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    const wsAfterConnect = mockWsInstance;
    mockWsInstance.onopen!(new Event('open'));

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockWsInstance.onclose!(new CloseEvent('close'));

    // disconnect() calls cleanup() which should clear the timer
    manager.disconnect();

    // Track the current mock WS instance
    const wsAfterDisconnect = mockWsInstance;

    // Advancing time should NOT trigger a reconnect attempt (no new WS created)
    vi.advanceTimersByTime(5000);

    // mockWsInstance should not have changed — no new WebSocket was constructed
    expect(mockWsInstance).toBe(wsAfterDisconnect);
  });

  it('disconnect resets reconnect attempt counter', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Build up some reconnect attempts
    mockWsInstance.onclose!(new CloseEvent('close'));
    vi.advanceTimersByTime(1000);
    mockWsInstance.onclose!(new CloseEvent('close'));
    vi.advanceTimersByTime(2000);

    // Disconnect and reconnect — should start fresh at 1s
    manager.disconnect();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));
    mockWsInstance.onclose!(new CloseEvent('close'));

    const lastCall = vi.mocked(console.warn).mock.calls;
    const lastMsg = lastCall[lastCall.length - 1][0] as string;
    expect(lastMsg).toContain('Reconnecting in 1000ms');
  });

  it('onclose triggers scheduleReconnect, not onerror', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const callsBefore = setTimeoutSpy.mock.calls.length;

    // onerror should NOT schedule a reconnect
    mockWsInstance.onerror!(new Event('error'));
    const callsAfterError = setTimeoutSpy.mock.calls.length;
    expect(callsAfterError).toBe(callsBefore);

    // onclose SHOULD schedule a reconnect
    mockWsInstance.onclose!(new CloseEvent('close'));
    const callsAfterClose = setTimeoutSpy.mock.calls.length;
    expect(callsAfterClose).toBeGreaterThan(callsAfterError);
  });

  it('priceStore is NOT cleared on disconnect', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    // Set a price
    const rawData = JSON.stringify({
      e: 'trade',
      E: 1,
      s: 'BTCUSDT',
      t: 1,
      p: '68432.17',
      q: '0.001',
      b: 1,
      a: 1,
      T: 1000,
      m: true,
      M: true,
    });
    mockWsInstance.onmessage!(new MessageEvent('message', { data: rawData }));
    expect(priceStore.get()).not.toBeNull();

    // Trigger disconnect via onclose
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockWsInstance.onclose!(new CloseEvent('close'));

    // Price should still be there
    expect(priceStore.get()).not.toBeNull();
    expect(priceStore.get()!.price).toBe(68432.17);
  });

  it('disconnect sets statusStore to connecting', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    manager.disconnect();
    expect(statusStore.get()).toBe('connecting');
  });
});

// Import normalizeCoinCapMessage after the module has been loaded
const { normalizeCoinCapMessage } = await import('./connection-manager');

describe('normalizeCoinCapMessage', () => {
  it('produces correct PriceTick from CoinCap message', () => {
    const tick = normalizeCoinCapMessage({ bitcoin: '68432.17' }, null);
    expect(tick).not.toBeNull();
    expect(tick!.price).toBe(68432.17);
    expect(tick!.direction).toBe('neutral');
    expect(typeof tick!.timestamp).toBe('number');
  });

  it('computes direction up when price > previousPrice', () => {
    const tick = normalizeCoinCapMessage({ bitcoin: '70000' }, 60000);
    expect(tick!.direction).toBe('up');
  });

  it('computes direction down when price < previousPrice', () => {
    const tick = normalizeCoinCapMessage({ bitcoin: '50000' }, 60000);
    expect(tick!.direction).toBe('down');
  });

  it('computes direction neutral when price === previousPrice', () => {
    const tick = normalizeCoinCapMessage({ bitcoin: '60000' }, 60000);
    expect(tick!.direction).toBe('neutral');
  });

  it('returns null for NaN price', () => {
    const tick = normalizeCoinCapMessage({ bitcoin: 'not-a-number' }, null);
    expect(tick).toBeNull();
  });

  it('returns null for non-positive price', () => {
    expect(normalizeCoinCapMessage({ bitcoin: '0' }, null)).toBeNull();
    expect(normalizeCoinCapMessage({ bitcoin: '-100' }, null)).toBeNull();
  });

  it('returns null for empty string price', () => {
    const tick = normalizeCoinCapMessage({ bitcoin: '' }, null);
    expect(tick).toBeNull();
  });
});

describe('ConnectionManager fallback chain', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    ConnectionManager.resetInstance();
    priceStore.set(null);
    statusStore.set('connecting');
  });

  afterEach(() => {
    ConnectionManager.getInstance().disconnect();
    vi.useRealTimers();
  });

  it('falls back to CoinCap after 3 Binance failures', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manager = ConnectionManager.getInstance();
    manager.connect();

    // Each onclose + advanceTimer = one reconnect cycle
    // After 3 cycles, reconnectAttempt reaches 3
    // The 4th onclose triggers the fallback to CoinCap
    for (let i = 0; i < 3; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));
      vi.advanceTimersByTime(10000);
    }
    // Now reconnectAttempt is 3, trigger one more onclose on the new Binance WS
    mockWsInstance.onclose!(new CloseEvent('close'));

    expect(lastWsUrl).toBe('wss://ws.coincap.io/prices?assets=bitcoin');

    warnSpy.mockRestore();
  });

  it('falls back to REST mode after 3 CoinCap failures', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manager = ConnectionManager.getInstance();
    manager.connect();

    // Exhaust Binance retries
    for (let i = 0; i < 3; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));
      vi.advanceTimersByTime(10000);
    }
    mockWsInstance.onclose!(new CloseEvent('close')); // triggers CoinCap

    // Exhaust CoinCap retries
    for (let i = 0; i < 3; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));
      vi.advanceTimersByTime(10000);
    }
    mockWsInstance.onclose!(new CloseEvent('close')); // triggers REST mode

    expect(statusStore.get()).toBe('stale');

    warnSpy.mockRestore();
  });

  it('CoinCap connection sets statusStore to fallback', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manager = ConnectionManager.getInstance();
    manager.connect();

    // Exhaust Binance retries to trigger CoinCap
    for (let i = 0; i < 3; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));
      vi.advanceTimersByTime(10000);
    }
    mockWsInstance.onclose!(new CloseEvent('close')); // triggers CoinCap

    // CoinCap connection opens
    mockWsInstance.onopen!(new Event('open'));
    expect(statusStore.get()).toBe('fallback');

    warnSpy.mockRestore();
  });

  it('Binance connection sets statusStore to live', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));
    expect(statusStore.get()).toBe('live');
  });

  it('REST mode sets statusStore to stale', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manager = ConnectionManager.getInstance();
    manager.connect();

    // Exhaust Binance retries
    for (let i = 0; i < 3; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));
      vi.advanceTimersByTime(10000);
    }
    mockWsInstance.onclose!(new CloseEvent('close')); // triggers CoinCap

    // Exhaust CoinCap retries
    for (let i = 0; i < 3; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));
      vi.advanceTimersByTime(10000);
    }
    mockWsInstance.onclose!(new CloseEvent('close')); // triggers REST mode

    expect(statusStore.get()).toBe('stale');
    warnSpy.mockRestore();
  });

  it('stale detection fires when no price update for >30s', () => {
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    // Send a price to set lastPriceUpdateTime
    const rawData = JSON.stringify({
      e: 'trade', E: 1, s: 'BTCUSDT', t: 1,
      p: '68432.17', q: '0.001', b: 1, a: 1, T: 1000, m: true, M: true,
    });
    mockWsInstance.onmessage!(new MessageEvent('message', { data: rawData }));
    expect(statusStore.get()).toBe('live');

    // Advance time beyond stale threshold (30s) + stale check interval (5s)
    vi.advanceTimersByTime(35000);
    expect(statusStore.get()).toBe('stale');
  });

  it('promotion check attempts Binance reconnection from CoinCap mode', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manager = ConnectionManager.getInstance();
    manager.connect();

    // Exhaust Binance retries to get to CoinCap
    for (let i = 0; i < 3; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));
      vi.advanceTimersByTime(10000);
    }
    mockWsInstance.onclose!(new CloseEvent('close')); // triggers CoinCap

    // CoinCap connected
    mockWsInstance.onopen!(new Event('open'));
    expect(statusStore.get()).toBe('fallback');

    // Advance to promotion check (60s)
    vi.advanceTimersByTime(60000);

    // A new WS should have been created for the canary test to Binance
    expect(lastWsUrl).toBe('wss://stream.binance.com:9443/ws/btcusdt@trade');

    warnSpy.mockRestore();
  });

  it('successful promotion resets to Binance as primary source', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manager = ConnectionManager.getInstance();
    manager.connect();

    // Exhaust Binance retries to get to CoinCap
    for (let i = 0; i < 3; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));
      vi.advanceTimersByTime(10000);
    }
    mockWsInstance.onclose!(new CloseEvent('close')); // triggers CoinCap

    // CoinCap connected
    mockWsInstance.onopen!(new Event('open'));
    expect(statusStore.get()).toBe('fallback');

    // Advance to promotion check
    vi.advanceTimersByTime(60000);

    // Canary WS opens successfully — promotion happens
    mockWsInstance.onopen!(new Event('open'));

    // After promotion, the manager calls connect() which connects to Binance
    expect(lastWsUrl).toBe('wss://stream.binance.com:9443/ws/btcusdt@trade');

    // Simulate the new Binance connection opening
    mockWsInstance.onopen!(new Event('open'));
    expect(statusStore.get()).toBe('live');

    warnSpy.mockRestore();
  });

  it('cleanup clears all timers (reconnect, stale check, promotion)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manager = ConnectionManager.getInstance();
    manager.connect();

    // Exhaust Binance retries to get to CoinCap
    for (let i = 0; i < 3; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));
      vi.advanceTimersByTime(10000);
    }
    mockWsInstance.onclose!(new CloseEvent('close')); // triggers CoinCap
    mockWsInstance.onopen!(new Event('open'));

    // Disconnect clears everything
    manager.disconnect();

    // Track the current mockWsInstance
    const wsAfterDisconnect = mockWsInstance;

    // Advance time — no timers should fire
    vi.advanceTimersByTime(120000);

    // No new WS should have been created
    expect(mockWsInstance).toBe(wsAfterDisconnect);

    warnSpy.mockRestore();
  });

  it('priceStore is never cleared during fallback transitions', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manager = ConnectionManager.getInstance();
    manager.connect();
    mockWsInstance.onopen!(new Event('open'));

    // Set a price
    const rawData = JSON.stringify({
      e: 'trade', E: 1, s: 'BTCUSDT', t: 1,
      p: '68432.17', q: '0.001', b: 1, a: 1, T: 1000, m: true, M: true,
    });
    mockWsInstance.onmessage!(new MessageEvent('message', { data: rawData }));
    expect(priceStore.get()!.price).toBe(68432.17);

    // Exhaust Binance retries
    for (let i = 0; i < 3; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));
      vi.advanceTimersByTime(10000);
      expect(priceStore.get()!.price).toBe(68432.17);
    }
    mockWsInstance.onclose!(new CloseEvent('close')); // triggers CoinCap
    expect(priceStore.get()!.price).toBe(68432.17);

    // Exhaust CoinCap retries
    for (let i = 0; i < 3; i++) {
      mockWsInstance.onclose!(new CloseEvent('close'));
      vi.advanceTimersByTime(10000);
      expect(priceStore.get()!.price).toBe(68432.17);
    }
    mockWsInstance.onclose!(new CloseEvent('close')); // triggers REST mode

    // Still preserved in REST mode
    expect(priceStore.get()!.price).toBe(68432.17);

    warnSpy.mockRestore();
  });
});
