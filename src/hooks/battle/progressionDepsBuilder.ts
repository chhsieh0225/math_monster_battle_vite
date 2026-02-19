import type { useBattleUIState } from '../useBattleUIState.ts';
import type { createBattleFieldSetters } from './battleFieldSetters.ts';
import type { runVictoryFlow } from './victoryFlow.ts';
import type { continueFromVictoryFlow } from './advanceFlow.ts';

type RunVictoryFlowArgs = Parameters<typeof runVictoryFlow>[0];
type ContinueFromVictoryFlowArgs = Parameters<typeof continueFromVictoryFlow>[0];

type BattleUiState = ReturnType<typeof useBattleUIState>;
type BattleFieldSetters = ReturnType<typeof createBattleFieldSetters>;

type BuildVictoryFlowArgsArgs = {
  verb: RunVictoryFlowArgs['verb'];
  sr: RunVictoryFlowArgs['sr'];
  runtime: Pick<
    RunVictoryFlowArgs,
    | 'randInt'
    | 'resolveLevelProgress'
    | 'getStageMaxHp'
    | 'tryUnlock'
    | 'applyVictoryAchievements'
    | 'updateEncDefeated'
    | 'onCollectionUpdated'
    | 'onDropResolved'
    | 'sfx'
    | 't'
  >;
  battleFields: Pick<
    BattleFieldSetters,
    | 'setBurnStack'
    | 'setStaticStack'
    | 'setFrozen'
    | 'setShattered'
    | 'setCursed'
    | 'setBossPhase'
    | 'setBossTurn'
    | 'setBossCharging'
    | 'setSealedMove'
    | 'setSealedTurns'
    | 'setPExp'
    | 'setPLvl'
    | 'setPHp'
    | 'setDefeated'
  >;
  ui: Pick<BattleUiState, 'setBText' | 'setPhase'>;
  frozenRef: RunVictoryFlowArgs['frozenRef'];
  pendingEvolveRef: { current: boolean };
};

type BuildContinueFromVictoryFlowArgsArgs = {
  sr: { current: ContinueFromVictoryFlowArgs['state'] };
  enemiesLength: ContinueFromVictoryFlowArgs['enemiesLength'];
  runtime: Pick<
    ContinueFromVictoryFlowArgs,
    | 'setScreen'
    | 'dispatchBattle'
    | 'localizeEnemy'
    | 'locale'
    | 'getStageMaxHp'
    | 'getStarterMaxHp'
    | 't'
  >;
  battleFields: Pick<BattleFieldSetters, 'setPHp' | 'setPHpSub'>;
  ui: Pick<BattleUiState, 'setBText' | 'setPhase'>;
  callbacks: Pick<ContinueFromVictoryFlowArgs, 'finishGame' | 'startBattle'>;
};

export function buildVictoryFlowArgs({
  verb,
  sr,
  runtime,
  battleFields,
  ui,
  frozenRef,
  pendingEvolveRef,
}: BuildVictoryFlowArgsArgs): RunVictoryFlowArgs {
  return {
    sr,
    verb,
    randInt: runtime.randInt,
    resolveLevelProgress: runtime.resolveLevelProgress,
    getStageMaxHp: runtime.getStageMaxHp,
    tryUnlock: runtime.tryUnlock,
    applyVictoryAchievements: runtime.applyVictoryAchievements,
    updateEncDefeated: runtime.updateEncDefeated,
    onCollectionUpdated: runtime.onCollectionUpdated,
    onDropResolved: runtime.onDropResolved,
    setBurnStack: battleFields.setBurnStack,
    setStaticStack: battleFields.setStaticStack,
    setFrozen: battleFields.setFrozen,
    setShattered: battleFields.setShattered,
    frozenRef,
    setCursed: battleFields.setCursed,
    setBossPhase: battleFields.setBossPhase,
    setBossTurn: battleFields.setBossTurn,
    setBossCharging: battleFields.setBossCharging,
    setSealedMove: battleFields.setSealedMove,
    setSealedTurns: battleFields.setSealedTurns,
    setPExp: battleFields.setPExp,
    setPLvl: battleFields.setPLvl,
    setPHp: battleFields.setPHp,
    setDefeated: battleFields.setDefeated,
    setBText: ui.setBText,
    setPhase: ui.setPhase,
    sfx: runtime.sfx,
    t: runtime.t,
    setPendingEvolve: (value) => { pendingEvolveRef.current = value; },
  };
}

export function buildContinueFromVictoryFlowArgs({
  sr,
  enemiesLength,
  runtime,
  battleFields,
  ui,
  callbacks,
}: BuildContinueFromVictoryFlowArgsArgs): ContinueFromVictoryFlowArgs {
  return {
    state: sr.current,
    enemiesLength,
    setScreen: runtime.setScreen,
    dispatchBattle: runtime.dispatchBattle,
    localizeEnemy: runtime.localizeEnemy,
    locale: runtime.locale,
    setBText: ui.setBText,
    setPhase: ui.setPhase,
    finishGame: callbacks.finishGame,
    setPHp: battleFields.setPHp,
    setPHpSub: battleFields.setPHpSub,
    getStageMaxHp: runtime.getStageMaxHp,
    getStarterMaxHp: runtime.getStarterMaxHp,
    startBattle: callbacks.startBattle,
    t: runtime.t,
  };
}
