import { useBattle as useBattleJs } from './useBattle.js';
import type { UseBattlePublicApi } from '../types/battle';

export const useBattle: () => UseBattlePublicApi = useBattleJs;
