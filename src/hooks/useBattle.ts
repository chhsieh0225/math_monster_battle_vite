import { useBattle as useBattleJs } from './useBattle.js';
import type { UseBattlePublicApi } from '../types/battle';
import { coerceUseBattlePublicApi } from './battle/publicApi.ts';

export function useBattle(): UseBattlePublicApi {
  return coerceUseBattlePublicApi(useBattleJs());
}
