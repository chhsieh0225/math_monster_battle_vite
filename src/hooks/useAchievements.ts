/**
 * useAchievements — Achievement state & unlock logic.
 *
 * Extracted from useBattle to reduce God Hook complexity.
 * Owns: achUnlocked, achPopup, achRef, tryUnlock, dismissAch.
 */
import { useState, useRef, useCallback } from 'react';
import { loadAch, saveAch } from '../utils/achievementStore';
import type { AchievementId } from '../types/game';

type UseAchievementsResult = {
  achUnlocked: AchievementId[];
  achPopup: AchievementId | null;
  tryUnlock: (id: AchievementId) => void;
  dismissAch: () => void;
};

export function useAchievements(): UseAchievementsResult {
  const [achUnlocked, setAchUnlocked] = useState<AchievementId[]>(
    () => loadAch() as AchievementId[],
  );
  const [achPopup, setAchPopup] = useState<AchievementId | null>(null);
  const achRef = useRef<Set<AchievementId>>(new Set(loadAch() as AchievementId[]));

  const tryUnlock = useCallback((id: AchievementId) => {
    if (achRef.current.has(id)) return;
    achRef.current.add(id);
    const arr = [...achRef.current];
    setAchUnlocked(arr);
    saveAch(arr);
    setAchPopup(id);
  }, []);

  const dismissAch = useCallback(() => setAchPopup(null), []);

  return { achUnlocked, achPopup, tryUnlock, dismissAch };
}
