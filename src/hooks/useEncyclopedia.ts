/**
 * useEncyclopedia — Monster encyclopedia encounter/defeat tracking.
 *
 * Extracted from useBattle to reduce God Hook complexity.
 * Owns: encData, updateEnc, updateEncDefeated.
 */
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { loadEnc, saveEnc } from '../utils/achievementStore';
import type { EncyclopediaData } from '../types/game';

type EncyclopediaCounts = Record<string, number>;
type EncyclopediaState = {
  encountered: EncyclopediaCounts;
  defeated: EncyclopediaCounts;
};

type EnemyEncyclopediaEntry = {
  id: string;
  isEvolved?: boolean;
};

type UseEncyclopediaResult = {
  encData: EncyclopediaState;
  setEncData: Dispatch<SetStateAction<EncyclopediaState>>;
  updateEnc: (enemyObj: EnemyEncyclopediaEntry) => void;
  updateEncDefeated: (enemyObj: EnemyEncyclopediaEntry) => void;
};

function normalizeEncyclopediaData(data: EncyclopediaData | null | undefined): EncyclopediaState {
  return {
    encountered: { ...(data?.encountered ?? {}) } as EncyclopediaCounts,
    defeated: { ...(data?.defeated ?? {}) } as EncyclopediaCounts,
  };
}

function getEncKey(obj: EnemyEncyclopediaEntry): string {
  if (!obj.isEvolved) return obj.id;
  return obj.id.endsWith('Evolved') ? obj.id : `${obj.id}Evolved`;
}

export function useEncyclopedia(): UseEncyclopediaResult {
  const [encData, setEncData] = useState<EncyclopediaState>(
    () => normalizeEncyclopediaData(loadEnc() as EncyclopediaData),
  );

  const updateEnc = (enemyObj: EnemyEncyclopediaEntry): void => {
    setEncData((prev) => {
      const key = getEncKey(enemyObj);
      const next: EncyclopediaState = {
        encountered: { ...prev.encountered, [key]: (prev.encountered[key] || 0) + 1 },
        defeated: { ...prev.defeated },
      };

      // Also mark base form as encountered if evolved (use original base id)
      // For evolved variants, the id already includes "Evolved" and is the final key.
      if (enemyObj.isEvolved && !enemyObj.id.endsWith('Evolved')) {
        const baseId = enemyObj.id;
        next.encountered[baseId] = prev.encountered[baseId] || 1;
      }

      saveEnc(next);
      return next;
    });
  };

  const updateEncDefeated = (enemyObj: EnemyEncyclopediaEntry): void => {
    setEncData((prev) => {
      const key = getEncKey(enemyObj);
      const next: EncyclopediaState = {
        encountered: { ...prev.encountered },
        defeated: { ...prev.defeated, [key]: (prev.defeated[key] || 0) + 1 },
      };
      saveEnc(next);
      return next;
    });
  };

  return { encData, setEncData, updateEnc, updateEncDefeated };
}
