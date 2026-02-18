import type { UseBattleActions, BattleMode, ScreenName } from '../../types/battle';
import type { DailyChallengePlan } from '../../types/challenges';

export type BuildUseBattleActionsArgs = {
  dismissAch: () => void;
  setTimedMode: (next: boolean) => void;
  setBattleMode: (mode: BattleMode) => void;
  setScreen: (screen: ScreenName) => void;
  queueDailyChallenge: (plan: DailyChallengePlan) => void;
  clearChallengeRun: () => void;
  setStarterLocalized: (starter: unknown) => void;
  setPvpStarter2Localized: (starter: unknown) => void;
  startGame: (starter?: unknown, mode?: BattleMode, starter2?: unknown) => void;
  selectMove: (idx: number) => void;
  onAns: (choice: number) => void;
  advance: () => void;
  continueAfterEvolve: () => void;
  quitGame: () => void;
  togglePause: () => void;
  toggleCoopActive: () => void;
  rmD: (id: number) => void;
  rmP: (id: number) => void;
};

/**
 * Typed mapping for the public actions contract.
 * Keeps action-shape drift out of useBattle.js while TS migration is in progress.
 */
export function buildUseBattleActions(args: BuildUseBattleActionsArgs): UseBattleActions {
  return {
    dismissAch: args.dismissAch,
    setTimedMode: args.setTimedMode,
    setBattleMode: args.setBattleMode,
    setScreen: args.setScreen,
    queueDailyChallenge: args.queueDailyChallenge,
    clearChallengeRun: args.clearChallengeRun,
    setStarter: args.setStarterLocalized,
    setPvpStarter2: args.setPvpStarter2Localized,
    startGame: args.startGame,
    selectMove: args.selectMove,
    onAns: args.onAns,
    advance: args.advance,
    continueAfterEvolve: args.continueAfterEvolve,
    quitGame: args.quitGame,
    togglePause: args.togglePause,
    toggleCoopActive: args.toggleCoopActive,
    rmD: args.rmD,
    rmP: args.rmP,
  };
}
