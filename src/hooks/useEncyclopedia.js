/**
 * useEncyclopedia — Monster encyclopedia encounter/defeat tracking.
 *
 * Extracted from useBattle to reduce God Hook complexity.
 * Owns: encData, updateEnc, updateEncDefeated.
 */
import { useState } from 'react';
import { loadEnc, saveEnc } from '../utils/achievementStore';

export function useEncyclopedia() {
  const [encData, setEncData] = useState(() => loadEnc());

  const updateEnc = (enemyObj) => {
    setEncData(prev => {
      const key = enemyObj.isEvolved ? enemyObj.id + "Evolved" : enemyObj.id;
      const next = {
        encountered: { ...prev.encountered, [key]: (prev.encountered[key] || 0) + 1 },
        defeated: { ...prev.defeated },
      };
      // Also mark base form as encountered if evolved
      if (enemyObj.isEvolved) {
        next.encountered[enemyObj.id] = (prev.encountered[enemyObj.id] || 0);
        if (!next.encountered[enemyObj.id]) next.encountered[enemyObj.id] = 1;
      }
      saveEnc(next);
      return next;
    });
  };

  const updateEncDefeated = (enemyObj) => {
    setEncData(prev => {
      const key = enemyObj.isEvolved ? enemyObj.id + "Evolved" : enemyObj.id;
      const next = {
        encountered: { ...prev.encountered },
        defeated: { ...prev.defeated, [key]: (prev.defeated[key] || 0) + 1 },
      };
      if (enemyObj.isEvolved) {
        if (!next.defeated[enemyObj.id]) next.defeated[enemyObj.id] = 0;
      }
      saveEnc(next);
      return next;
    });
  };

  return { encData, setEncData, updateEnc, updateEncDefeated };
}
