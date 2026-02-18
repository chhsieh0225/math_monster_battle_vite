import type { useBattleUIState } from '../useBattleUIState.ts';
import type { usePvpState } from '../usePvpState.ts';
import type { createBattleFieldSetters } from './battleFieldSetters.ts';
import type { runStandardAnswerFlow, tryHandlePvpAnswer } from './answerFlow.ts';

type PvpAnswerHandlers = Parameters<typeof tryHandlePvpAnswer>[0]['handlers'];
type PlayerAnswerHandlers = Parameters<typeof runStandardAnswerFlow>[0]['handlers'];

type BattleUiState = ReturnType<typeof useBattleUIState>;
type PvpState = ReturnType<typeof usePvpState>;
type BattleFieldSetters = ReturnType<typeof createBattleFieldSetters>;

type PvpRuntimeDeps = Pick<
  PvpAnswerHandlers,
  'sr' | 'rand' | 'chance' | 'safeTo' | 'sfx' | 'getOtherPvpTurn' | 'setScreen' | 't'
>;

type PlayerRuntimeDeps = Pick<
  PlayerAnswerHandlers,
  'sr' | 'safeTo' | 'chance' | 'sfx' | 't'
>;

type PlayerCallbackDeps = Pick<
  PlayerAnswerHandlers,
  | 'tryUnlock'
  | 'frozenR'
  | 'doEnemyTurn'
  | 'handleVictory'
  | 'handleFreeze'
  | '_endSession'
  | 'setScreen'
  | 'handlePlayerPartyKo'
  | 'runAllySupportTurn'
>;

type BuildPvpAnswerHandlerDepsArgs = {
  runtime: PvpRuntimeDeps;
  ui: BattleUiState;
  pvp: PvpState;
  battleFields: BattleFieldSetters;
};

type BuildPlayerAnswerHandlerDepsArgs = {
  runtime: PlayerRuntimeDeps;
  ui: BattleUiState;
  battleFields: BattleFieldSetters;
  callbacks: PlayerCallbackDeps;
};

export function buildPvpAnswerHandlerDeps({
  runtime,
  ui,
  pvp,
  battleFields,
}: BuildPvpAnswerHandlerDepsArgs): PvpAnswerHandlers {
  return {
    sr: runtime.sr,
    rand: runtime.rand,
    chance: runtime.chance,
    safeTo: runtime.safeTo,
    sfx: runtime.sfx,
    getOtherPvpTurn: runtime.getOtherPvpTurn,
    setFb: ui.setFb,
    setTC: battleFields.setTC,
    setTW: battleFields.setTW,
    setPvpChargeP1: pvp.setPvpChargeP1,
    setPvpChargeP2: pvp.setPvpChargeP2,
    setPvpComboP1: pvp.setPvpComboP1,
    setPvpComboP2: pvp.setPvpComboP2,
    setPvpTurn: pvp.setPvpTurn,
    setPvpActionCount: pvp.setPvpActionCount,
    setBText: ui.setBText,
    setPhase: ui.setPhase,
    setPvpSpecDefP1: pvp.setPvpSpecDefP1,
    setPvpSpecDefP2: pvp.setPvpSpecDefP2,
    setEffMsg: ui.setEffMsg,
    setAtkEffect: ui.setAtkEffect,
    addP: ui.addP,
    setPvpParalyzeP1: pvp.setPvpParalyzeP1,
    setPvpParalyzeP2: pvp.setPvpParalyzeP2,
    setPAnim: ui.setPAnim,
    setEAnim: ui.setEAnim,
    addD: ui.addD,
    setPHp: battleFields.setPHp,
    setPvpHp2: pvp.setPvpHp2,
    setEHp: battleFields.setEHp,
    setScreen: runtime.setScreen,
    setPvpWinner: pvp.setPvpWinner,
    setPvpBurnP1: pvp.setPvpBurnP1,
    setPvpBurnP2: pvp.setPvpBurnP2,
    setPvpFreezeP1: pvp.setPvpFreezeP1,
    setPvpFreezeP2: pvp.setPvpFreezeP2,
    setPvpStaticP1: pvp.setPvpStaticP1,
    setPvpStaticP2: pvp.setPvpStaticP2,
    t: runtime.t,
  };
}

export function buildPlayerAnswerHandlerDeps({
  runtime,
  ui,
  battleFields,
  callbacks,
}: BuildPlayerAnswerHandlerDepsArgs): PlayerAnswerHandlers {
  return {
    sr: runtime.sr,
    safeTo: runtime.safeTo,
    chance: runtime.chance,
    sfx: runtime.sfx,
    setFb: ui.setFb,
    setTC: battleFields.setTC,
    setTW: battleFields.setTW,
    setStreak: battleFields.setStreak,
    setPassiveCount: battleFields.setPassiveCount,
    setCharge: battleFields.setCharge,
    setMaxStreak: battleFields.setMaxStreak,
    setSpecDef: battleFields.setSpecDef,
    tryUnlock: callbacks.tryUnlock,
    setMLvls: battleFields.setMLvls,
    setMLvlUp: battleFields.setMLvlUp,
    setMHits: battleFields.setMHits,
    setPhase: ui.setPhase,
    setPAnim: ui.setPAnim,
    setAtkEffect: ui.setAtkEffect,
    setEAnim: ui.setEAnim,
    setEffMsg: ui.setEffMsg,
    setBossCharging: battleFields.setBossCharging,
    setBurnStack: battleFields.setBurnStack,
    setPHp: battleFields.setPHp,
    setPHpSub: battleFields.setPHpSub,
    setFrozen: battleFields.setFrozen,
    frozenR: callbacks.frozenR,
    setStaticStack: battleFields.setStaticStack,
    setEHp: battleFields.setEHp,
    addD: ui.addD,
    doEnemyTurn: callbacks.doEnemyTurn,
    handleVictory: callbacks.handleVictory,
    handleFreeze: callbacks.handleFreeze,
    setCursed: battleFields.setCursed,
    setShadowShieldCD: battleFields.setShadowShieldCD,
    setFuryRegenUsed: battleFields.setFuryRegenUsed,
    _endSession: callbacks._endSession,
    setScreen: callbacks.setScreen,
    setBText: ui.setBText,
    handlePlayerPartyKo: callbacks.handlePlayerPartyKo,
    runAllySupportTurn: callbacks.runAllySupportTurn,
    t: runtime.t,
  };
}
