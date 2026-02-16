import type { runSelectMoveFlow } from './selectMoveFlow.ts';
import type { runEnemyTurnController } from './enemyTurnController.ts';

type RunSelectMoveFlowArgs = Parameters<typeof runSelectMoveFlow>[0];
type RunEnemyTurnArgs = Parameters<typeof runEnemyTurnController>[0];

type BuildSelectMoveFlowArgsArgs = {
  index: number;
  sr: { current: RunSelectMoveFlowArgs['state'] };
  runtime: Pick<
    RunSelectMoveFlowArgs,
    | 'timedMode'
    | 'questionTimeLimitSec'
    | 'questionAllowedOps'
    | 'diffMods'
    | 't'
    | 'getActingStarter'
    | 'getMoveDiffLevel'
    | 'genQuestion'
    | 'startTimer'
    | 'markQStart'
    | 'sfx'
  >;
  ui: Pick<
    RunSelectMoveFlowArgs,
    'setSelIdx' | 'setQ' | 'setFb' | 'setAnswered' | 'setPhase'
  >;
  battleFields: Pick<RunSelectMoveFlowArgs, 'setDiffLevel'>;
};

type BuildEnemyTurnArgsArgs = {
  sr: RunEnemyTurnArgs['sr'];
  runtime: Pick<
    RunEnemyTurnArgs,
    'safeTo' | 'rand' | 'randInt' | 'chance' | 'sfx' | 'setScreen' | 't'
  >;
  battleFields: Pick<
    RunEnemyTurnArgs,
    | 'setSealedTurns'
    | 'setSealedMove'
    | 'setBossPhase'
    | 'setBossTurn'
    | 'setBossCharging'
    | 'setPHp'
    | 'setPHpSub'
    | 'setSpecDef'
    | 'setDefAnim'
    | 'setEHp'
    | 'setCursed'
  >;
  ui: Pick<
    RunEnemyTurnArgs,
    'setBText' | 'setPhase' | 'setEAnim' | 'setPAnim' | 'setEffMsg' | 'addD' | 'addP'
  >;
  callbacks: Pick<
    RunEnemyTurnArgs,
    '_endSession' | 'handleVictory' | 'handlePlayerPartyKo'
  >;
};

export function buildSelectMoveFlowArgs({
  index,
  sr,
  runtime,
  ui,
  battleFields,
}: BuildSelectMoveFlowArgsArgs): RunSelectMoveFlowArgs {
  return {
    index,
    state: sr.current,
    timedMode: runtime.timedMode,
    questionTimeLimitSec: runtime.questionTimeLimitSec,
    questionAllowedOps: runtime.questionAllowedOps,
    diffMods: runtime.diffMods,
    t: runtime.t,
    getActingStarter: runtime.getActingStarter,
    getMoveDiffLevel: runtime.getMoveDiffLevel,
    genQuestion: runtime.genQuestion,
    startTimer: runtime.startTimer,
    markQStart: runtime.markQStart,
    sfx: runtime.sfx,
    setSelIdx: ui.setSelIdx,
    setDiffLevel: battleFields.setDiffLevel,
    setQ: ui.setQ,
    setFb: ui.setFb,
    setAnswered: ui.setAnswered,
    setPhase: ui.setPhase,
  };
}

export function buildEnemyTurnArgs({
  sr,
  runtime,
  battleFields,
  ui,
  callbacks,
}: BuildEnemyTurnArgsArgs): RunEnemyTurnArgs {
  return {
    sr,
    safeTo: runtime.safeTo,
    rand: runtime.rand,
    randInt: runtime.randInt,
    chance: runtime.chance,
    sfx: runtime.sfx,
    setSealedTurns: battleFields.setSealedTurns,
    setSealedMove: battleFields.setSealedMove,
    setBossPhase: battleFields.setBossPhase,
    setBossTurn: battleFields.setBossTurn,
    setBossCharging: battleFields.setBossCharging,
    setBText: ui.setBText,
    setPhase: ui.setPhase,
    setEAnim: ui.setEAnim,
    setPAnim: ui.setPAnim,
    setPHp: battleFields.setPHp,
    setPHpSub: battleFields.setPHpSub,
    setSpecDef: battleFields.setSpecDef,
    setDefAnim: battleFields.setDefAnim,
    setEHp: battleFields.setEHp,
    setEffMsg: ui.setEffMsg,
    setCursed: battleFields.setCursed,
    addD: ui.addD,
    addP: ui.addP,
    _endSession: callbacks._endSession,
    setScreen: runtime.setScreen,
    handleVictory: callbacks.handleVictory,
    handlePlayerPartyKo: callbacks.handlePlayerPartyKo,
    t: runtime.t,
  };
}
