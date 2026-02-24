import { useCallback } from 'react';
import { useBattleStateRef, useStableCallback } from '../useBattleRuntime.ts';
import { runAnswerWithContext } from './actionFlowDelegates.ts';
import type { runBattleAnswer } from './interactionFlowAdapter.ts';
import type { buildPvpAnswerHandlerDeps } from './answerDepsBuilder.ts';

/**
 * Types derived from the flow layer so this wiring hook stays in sync
 * without duplicating structural definitions.
 */
type RunBattleAnswerArgs = Parameters<typeof runBattleAnswer>[0];
type AnswerBaseArgs = Omit<RunBattleAnswerArgs, 'choice'>;
type PvpAnswerDepsInput = Parameters<typeof buildPvpAnswerHandlerDeps>[0];
type PlayerDepsArgs = RunBattleAnswerArgs['playerDepsArgs'];
type AnswerControllerArgsInput = RunBattleAnswerArgs['answerControllerArgsInput'];

type UseOnAnsWiringDeps = {
  answered: AnswerBaseArgs['answered'];
  setAnswered: AnswerBaseArgs['setAnswered'];
  clearTimer: AnswerBaseArgs['clearTimer'];
  sr: PlayerDepsArgs['runtime']['sr'] & PvpAnswerDepsInput['runtime']['sr'];
  rand: PvpAnswerDepsInput['runtime']['rand'];
  chance: PvpAnswerDepsInput['runtime']['chance'];
  safeTo: PvpAnswerDepsInput['runtime']['safeTo'];
  getOtherPvpTurn: PvpAnswerDepsInput['runtime']['getOtherPvpTurn'];
  setScreenFromString: PvpAnswerDepsInput['runtime']['setScreen'];
  t: PvpAnswerDepsInput['runtime']['t'];
  uiRef: { current: PvpAnswerDepsInput['ui'] };
  pvpStoreRef: { current: PvpAnswerDepsInput['pvp'] };
  battleFieldSettersRef: { current: PvpAnswerDepsInput['battleFields'] };
  getCollectionDamageScale: PlayerDepsArgs['runtime']['getCollectionDamageScale'];
  challengeDamageMult: PlayerDepsArgs['runtime']['challengeDamageMult'];
  challengeComboMult: PlayerDepsArgs['runtime']['challengeComboMult'];
  tryUnlock: PlayerDepsArgs['callbacks']['tryUnlock'];
  frozenR: PlayerDepsArgs['callbacks']['frozenR'];
  doEnemyTurn: PlayerDepsArgs['callbacks']['doEnemyTurn'];
  handleVictory: PlayerDepsArgs['callbacks']['handleVictory'];
  handleFreeze: PlayerDepsArgs['callbacks']['handleFreeze'];
  _endSession: PlayerDepsArgs['callbacks']['_endSession'];
  handlePlayerPartyKo: PlayerDepsArgs['callbacks']['handlePlayerPartyKo'];
  runAllySupportTurn: PlayerDepsArgs['callbacks']['runAllySupportTurn'];
  setPendingTextAdvanceAction: PlayerDepsArgs['callbacks']['setPendingTextAdvanceAction'];
  getActingStarter: AnswerControllerArgsInput['getActingStarter'];
  logAns: AnswerControllerArgsInput['logAns'];
  appendSessionEvent: AnswerControllerArgsInput['appendSessionEvent'];
  updateAbility: AnswerControllerArgsInput['updateAbility'];
  markCoopRotatePending: AnswerControllerArgsInput['markCoopRotatePending'];
  sfx: PvpAnswerDepsInput['runtime']['sfx'];
};

/**
 * useOnAnsWiring — Extracted from useBattleCore.
 *
 * Captures the ~30 dependencies needed by the answer flow into a
 * `useBattleStateRef`, assembles the four nested arg objects, and
 * delegates to `runAnswerWithContext`.
 *
 * Returns a stable `onAns(choice)` callback.
 */
export function useOnAnsWiring(deps: UseOnAnsWiringDeps): (choice: number) => void {
  const {
    answered,
    setAnswered,
    clearTimer,
    sr,
    rand,
    chance,
    safeTo,
    getOtherPvpTurn,
    setScreenFromString,
    t,
    uiRef,
    pvpStoreRef,
    battleFieldSettersRef,
    getCollectionDamageScale,
    challengeDamageMult,
    challengeComboMult,
    tryUnlock,
    frozenR,
    doEnemyTurn,
    handleVictory,
    handleFreeze,
    _endSession,
    handlePlayerPartyKo,
    runAllySupportTurn,
    setPendingTextAdvanceAction,
    getActingStarter,
    logAns,
    appendSessionEvent,
    updateAbility,
    markCoopRotatePending,
    sfx,
  } = deps;

  const onAnsContextRef = useBattleStateRef({
    answered,
    setAnswered,
    clearTimer,
    sr,
    rand,
    chance,
    safeTo,
    getOtherPvpTurn,
    setScreenFromString,
    t,
    uiRef,
    pvpStoreRef,
    battleFieldSettersRef,
    getCollectionDamageScale,
    challengeDamageMult,
    challengeComboMult,
    tryUnlock,
    frozenR,
    doEnemyTurn,
    handleVictory,
    handleFreeze,
    _endSession,
    handlePlayerPartyKo,
    runAllySupportTurn,
    setPendingTextAdvanceAction,
    getActingStarter,
    logAns,
    appendSessionEvent,
    updateAbility,
    markCoopRotatePending,
  });
  const onAnsImpl = useCallback((choice: number) => {
    const ctx = onAnsContextRef.current;
    const answerInput = {
      answered: ctx.answered,
      setAnswered: ctx.setAnswered,
      clearTimer: ctx.clearTimer,
      pvpAnswerDepsInput: {
        runtime: {
          sr: ctx.sr,
          rand: ctx.rand,
          chance: ctx.chance,
          safeTo: ctx.safeTo,
          sfx,
          getOtherPvpTurn: ctx.getOtherPvpTurn,
          setScreen: ctx.setScreenFromString,
          t: ctx.t,
        },
        ui: ctx.uiRef.current,
        pvp: ctx.pvpStoreRef.current,
        battleFields: ctx.battleFieldSettersRef.current,
      },
      playerDepsArgs: {
        runtime: {
          sr: ctx.sr,
          safeTo: ctx.safeTo,
          chance: ctx.chance,
          sfx,
          getCollectionDamageScale: ctx.getCollectionDamageScale,
          challengeDamageMult: ctx.challengeDamageMult,
          challengeComboMult: ctx.challengeComboMult,
          t: ctx.t,
        },
        ui: ctx.uiRef.current,
        battleFields: ctx.battleFieldSettersRef.current,
        callbacks: {
          tryUnlock: ctx.tryUnlock,
          frozenR: ctx.frozenR,
          doEnemyTurn: ctx.doEnemyTurn,
          handleVictory: ctx.handleVictory,
          handleFreeze: ctx.handleFreeze,
          _endSession: ctx._endSession,
          setScreen: ctx.setScreenFromString,
          handlePlayerPartyKo: ctx.handlePlayerPartyKo,
          runAllySupportTurn: ctx.runAllySupportTurn,
          setPendingTextAdvanceAction: ctx.setPendingTextAdvanceAction,
        },
      },
      answerControllerArgsInput: {
        sr: ctx.sr,
        getActingStarter: ctx.getActingStarter,
        logAns: ctx.logAns,
        appendSessionEvent: ctx.appendSessionEvent,
        updateAbility: ctx.updateAbility,
        markCoopRotatePending: ctx.markCoopRotatePending,
      },
    };
    runAnswerWithContext(answerInput, choice);
  }, [onAnsContextRef, sfx]);
  return useStableCallback(onAnsImpl);
}
