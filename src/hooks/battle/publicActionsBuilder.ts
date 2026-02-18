import type { UseBattleActions, BattleMode, ScreenName, StarterVm } from '../../types/battle';
import type { ItemId } from '../../types/game';
import type { DailyChallengePlan, StreakTowerPlan } from '../../types/challenges';

export type BuildUseBattleActionsArgs = {
  dismissAch: () => void;
  setTimedMode: (next: boolean) => void;
  setBattleMode: (mode: BattleMode) => void;
  setScreen: (screen: ScreenName) => void;
  queueDailyChallenge: (plan: DailyChallengePlan) => void;
  queueTowerChallenge: (plan: StreakTowerPlan) => void;
  clearChallengeRun: () => void;
  setStarterLocalized: (starter: StarterVm | null) => void;
  setPvpStarter2Localized: (starter: StarterVm | null) => void;
  startGame: (
    starter?: StarterVm | null,
    mode?: BattleMode | null,
    starter2?: StarterVm | null,
  ) => void;
  selectMove: (idx: number) => void;
  useItem: (itemId: ItemId) => void;
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
    queueTowerChallenge: args.queueTowerChallenge,
    clearChallengeRun: args.clearChallengeRun,
    setStarter: args.setStarterLocalized,
    setPvpStarter2: args.setPvpStarter2Localized,
    startGame: args.startGame,
    selectMove: args.selectMove,
    useItem: args.useItem,
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
