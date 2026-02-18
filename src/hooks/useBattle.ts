import { useBattle as useBattleCore } from './useBattleCore.ts';
import type { UseBattlePublicApi } from '../types/battle';
import { coerceUseBattlePublicApi } from './battle/publicApi.ts';

export function useBattle(): UseBattlePublicApi {
  return coerceUseBattlePublicApi(useBattleCore());
}
