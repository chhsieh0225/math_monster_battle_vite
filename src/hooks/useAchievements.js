/**
 * useAchievements — Achievement state & unlock logic.
 *
 * Extracted from useBattle to reduce God Hook complexity.
 * Owns: achUnlocked, achPopup, achRef, tryUnlock, dismissAch.
 */
import { useState, useRef, useCallback } from 'react';
import { loadAch, saveAch } from '../utils/achievementStore';

export function useAchievements() {
  const [achUnlocked, setAchUnlocked] = useState(() => loadAch());
  const [achPopup, setAchPopup] = useState(null);
  const achRef = useRef(new Set(loadAch()));

  const tryUnlock = useCallback((id) => {
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
