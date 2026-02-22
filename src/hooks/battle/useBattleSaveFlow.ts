import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { BattleMode, EnemyVm, ScreenName, StarterVm } from '../../types/battle';
import type { BattleAction, BattleState } from './battleReducer.ts';
import { buildSaveSnapshot, loadSave, writeSave } from '../../utils/savegame.ts';
import { useBattleStateRef, useStableCallback } from '../useBattleRuntime.ts';

type SaveRuntimeState = {
  allySub?: StarterVm | null;
};

type UseBattleSaveFlowArgs = {
  battleMode: BattleMode;
  hasChallengeRun: boolean;
  starter: StarterVm | null;
  timedMode: boolean;
  battle: BattleState;
  coopActiveSlot: 'main' | 'sub';
  enemies: EnemyVm[];
  sr: { current: SaveRuntimeState };
  setBattleMode: (mode: BattleMode) => void;
  setTimedMode: (next: boolean) => void;
  setEnemies: (next: EnemyVm[]) => void;
  setStarter: (next: StarterVm | null) => void;
  setCoopActiveSlot: (slot: 'main' | 'sub') => void;
  dispatchBattle: Dispatch<BattleAction>;
  invalidateAsyncWork: () => void;
  beginRun: () => void;
  clearTimer: () => void;
  resetRunRuntimeState: () => void;
  initSession: (starter: StarterVm, timedMode: boolean) => void;
  setScreen: (screen: ScreenName) => void;
  startBattle: (idx: number, roster?: EnemyVm[]) => void;
};

type UseBattleSaveFlowResult = {
  startBattleWithSave: (idx: number, roster?: EnemyVm[]) => void;
  resumeFromSave: () => void;
};

export function useBattleSaveFlow(args: UseBattleSaveFlowArgs): UseBattleSaveFlowResult {
  const saveMidRunContextRef = useBattleStateRef({
    battleMode: args.battleMode,
    hasChallengeRun: args.hasChallengeRun,
    starter: args.starter,
    timedMode: args.timedMode,
    battle: args.battle,
    coopActiveSlot: args.coopActiveSlot,
    enemies: args.enemies,
    sr: args.sr,
  });
  const saveMidRunImpl = useCallback((nextRound: number) => {
    const ctx = saveMidRunContextRef.current;
    if (ctx.battleMode === 'pvp' || ctx.hasChallengeRun) return;
    if (!ctx.starter) return;
    writeSave(buildSaveSnapshot({
      battleMode: ctx.battleMode,
      timedMode: ctx.timedMode,
      nextRound,
      starter: ctx.starter,
      allySub: ctx.sr.current.allySub ?? null,
      coopActiveSlot: ctx.coopActiveSlot,
      battle: ctx.battle,
      enemies: ctx.enemies,
    }));
  }, [saveMidRunContextRef]);
  const saveMidRun = useStableCallback(saveMidRunImpl);

  const startBattleWithSave = useStableCallback((idx: number, roster?: EnemyVm[]) => {
    if (idx > 0) saveMidRun(idx);
    args.startBattle(idx, roster);
  });

  const resumeFromSaveContextRef = useBattleStateRef({
    setBattleMode: args.setBattleMode,
    setTimedMode: args.setTimedMode,
    setEnemies: args.setEnemies,
    setStarter: args.setStarter,
    setCoopActiveSlot: args.setCoopActiveSlot,
    dispatchBattle: args.dispatchBattle,
    invalidateAsyncWork: args.invalidateAsyncWork,
    beginRun: args.beginRun,
    clearTimer: args.clearTimer,
    resetRunRuntimeState: args.resetRunRuntimeState,
    initSession: args.initSession,
    setScreen: args.setScreen,
    startBattle: args.startBattle,
  });
  const resumeFromSaveImpl = useCallback(() => {
    const saved = loadSave();
    if (!saved) return;
    const ctx = resumeFromSaveContextRef.current;

    ctx.setBattleMode(saved.battleMode);
    ctx.setTimedMode(saved.timedMode);
    ctx.setEnemies(saved.enemies);
    ctx.setStarter(saved.starter);
    ctx.setCoopActiveSlot(saved.coopActiveSlot);

    const partnerSub = saved.allySub;
    ctx.dispatchBattle({
      type: 'reset_run',
      patch: {
        diffLevel: saved.battle.diffLevel,
        allySub: partnerSub,
        pHpSub: saved.battle.pHpSub,
        pHp: saved.battle.pHp,
        pStg: saved.battle.pStg,
      },
    });
    ctx.dispatchBattle({
      type: 'patch',
      patch: {
        pExp: saved.battle.pExp,
        pLvl: saved.battle.pLvl,
        streak: saved.battle.streak,
        passiveCount: saved.battle.passiveCount,
        charge: saved.battle.charge,
        tC: saved.battle.tC,
        tW: saved.battle.tW,
        defeated: saved.battle.defeated,
        maxStreak: saved.battle.maxStreak,
        mHits: saved.battle.mHits,
        mLvls: saved.battle.mLvls,
      },
    });

    ctx.invalidateAsyncWork();
    ctx.beginRun();
    ctx.clearTimer();
    ctx.resetRunRuntimeState();
    ctx.initSession(saved.starter, saved.timedMode);
    ctx.setScreen('battle');
    ctx.startBattle(saved.nextRound, saved.enemies);
  }, [resumeFromSaveContextRef]);
  const resumeFromSave = useStableCallback(resumeFromSaveImpl);

  return {
    startBattleWithSave,
    resumeFromSave,
  };
}
