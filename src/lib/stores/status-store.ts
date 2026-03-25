import { atom } from 'nanostores';
import type { ConnectionStatus } from '../types';

export const statusStore = atom<ConnectionStatus>('connecting');
