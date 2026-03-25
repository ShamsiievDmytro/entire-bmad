import { atom } from 'nanostores';
import type { MarketData } from '../types';

export const marketStore = atom<MarketData | null>(null);
