import { atom } from 'nanostores';
import type { PriceTick } from '../types';

export const priceStore = atom<PriceTick | null>(null);
