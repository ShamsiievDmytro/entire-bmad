import { atom } from 'nanostores';
import type { ChartPoint } from '../types';

export const chartStore = atom<ChartPoint[]>([]);
