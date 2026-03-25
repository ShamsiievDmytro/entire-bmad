import { describe, it, expect, beforeEach, vi } from 'vitest';
import { priceStore } from '../stores/price-store';
import { initTabTitleUpdater } from './tab-title-updater';

// Provide a minimal document.title mock for Node environment
let titleValue = '';
vi.stubGlobal('document', {
  get title() {
    return titleValue;
  },
  set title(val: string) {
    titleValue = val;
  },
});

describe('initTabTitleUpdater', () => {
  beforeEach(() => {
    priceStore.set(null);
    titleValue = '';
  });

  it('sets title to "Metrics" when priceStore is null', () => {
    initTabTitleUpdater();
    expect(document.title).toBe('Metrics');
  });

  it('sets title with formatted price when priceStore has data', () => {
    initTabTitleUpdater();
    priceStore.set({ price: 68432.17, timestamp: Date.now(), direction: 'up' });
    expect(document.title).toBe('$68,432.17 — Metrics');
  });

  it('updates title on each price change', () => {
    initTabTitleUpdater();
    priceStore.set({ price: 68432.17, timestamp: Date.now(), direction: 'up' });
    expect(document.title).toBe('$68,432.17 — Metrics');

    priceStore.set({ price: 69000.0, timestamp: Date.now(), direction: 'up' });
    expect(document.title).toBe('$69,000.00 — Metrics');
  });

  it('reverts to "Metrics" when priceStore becomes null', () => {
    initTabTitleUpdater();
    priceStore.set({ price: 68432.17, timestamp: Date.now(), direction: 'up' });
    priceStore.set(null);
    expect(document.title).toBe('Metrics');
  });
});
