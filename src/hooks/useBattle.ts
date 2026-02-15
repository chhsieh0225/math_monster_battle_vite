import { useBattle as useBattleJs } from './useBattle.js';
import type { UseBattlePublicApi } from '../types/battle';

const useBattleTyped = useBattleJs as unknown as () => UseBattlePublicApi;

export function useBattle(): UseBattlePublicApi {
  return useBattleTyped();
}
