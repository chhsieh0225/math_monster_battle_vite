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

  // Derive the encyclopedia key for an enemy object.
  // For evolved slime variants, id already contains "Evolved" (e.g. "slimeElectricEvolved"),
  // so we must NOT append "Evolved" again.
  const _encKey = (obj) => {
    if (!obj.isEvolved) return obj.id;
    return obj.id.endsWith("Evolved") ? obj.id : obj.id + "Evolved";
  };

  const updateEnc = (enemyObj) => {
    setEncData(prev => {
      const key = _encKey(enemyObj);
      const next = {
        encountered: { ...prev.encountered, [key]: (prev.encountered[key] || 0) + 1 },
        defeated: { ...prev.defeated },
      };
      // Also mark base form as encountered if evolved (use original base id)
      if (enemyObj.isEvolved) {
        const baseId = enemyObj.id.endsWith("Evolved")
          ? enemyObj.id                     // evolved variant id IS the key
          : enemyObj.id;                    // non-variant evolved: base id
        // Ensure at least 1 encounter on the base entry for non-variant evolved forms
        if (!enemyObj.id.endsWith("Evolved")) {
          next.encountered[baseId] = (prev.encountered[baseId] || 0);
          if (!next.encountered[baseId]) next.encountered[baseId] = 1;
        }
      }
      saveEnc(next);
      return next;
    });
  };

  const updateEncDefeated = (enemyObj) => {
    setEncData(prev => {
      const key = _encKey(enemyObj);
      const next = {
        encountered: { ...prev.encountered },
        defeated: { ...prev.defeated, [key]: (prev.defeated[key] || 0) + 1 },
      };
      saveEnc(next);
      return next;
    });
  };

  return { encData, setEncData, updateEnc, updateEncDefeated };
}
