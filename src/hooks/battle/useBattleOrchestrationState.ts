import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

type PendingTextAdvanceAction = (() => void) | null;

export type UseBattleOrchestrationStateApi = {
  frozenRef: MutableRefObject<boolean>;
  doEnemyTurnRef: MutableRefObject<() => void>;
  pendingEvolveRef: MutableRefObject<boolean>;
  pendingTextAdvanceActionRef: MutableRefObject<PendingTextAdvanceAction>;
  recentQuestionDisplaysRef: MutableRefObject<Map<string, string[]>>;
  setPendingTextAdvanceAction: (action: PendingTextAdvanceAction) => void;
  consumePendingTextAdvanceAction: () => PendingTextAdvanceAction;
  clearRecentQuestionDisplays: () => void;
};

export function useBattleOrchestrationState(): UseBattleOrchestrationStateApi {
  const frozenRef = useRef(false);
  const doEnemyTurnRef = useRef(() => {});
  const pendingEvolveRef = useRef(false);
  const pendingTextAdvanceActionRef = useRef<PendingTextAdvanceAction>(null);
  const recentQuestionDisplaysRef = useRef<Map<string, string[]>>(new Map());

  const setPendingTextAdvanceAction = useCallback((action: PendingTextAdvanceAction) => {
    pendingTextAdvanceActionRef.current = action;
  }, []);

  const consumePendingTextAdvanceAction = useCallback(() => {
    const action = pendingTextAdvanceActionRef.current;
    pendingTextAdvanceActionRef.current = null;
    return action;
  }, []);

  const clearRecentQuestionDisplays = useCallback(() => {
    recentQuestionDisplaysRef.current.clear();
  }, []);

  return {
    frozenRef,
    doEnemyTurnRef,
    pendingEvolveRef,
    pendingTextAdvanceActionRef,
    recentQuestionDisplaysRef,
    setPendingTextAdvanceAction,
    consumePendingTextAdvanceAction,
    clearRecentQuestionDisplays,
  };
}

export function useBattlePauseState({
  pauseTimer,
  resumeTimer,
}: {
  pauseTimer: () => void;
  resumeTimer: () => void;
}): {
  gamePaused: boolean;
  togglePause: () => void;
} {
  const [gamePaused, setGamePaused] = useState(false);

  const togglePause = useCallback(() => {
    setGamePaused((prevPaused) => {
      if (prevPaused) {
        resumeTimer();
        return false;
      }
      pauseTimer();
      return true;
    });
  }, [pauseTimer, resumeTimer]);

  return {
    gamePaused,
    togglePause,
  };
}
