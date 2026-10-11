import type { UseBattleActions, BattleMode, ScreenName, SpringResult, StarterVm } from '../../types/battle';
import type { ItemId } from '../../types/game';
import type { DailyChallengePlan, StreakTowerPlan } from '../../types/challenges';
import type { ExpeditionId } from '../../data/worldMap';
import type { PlayerProfile } from '../../utils/playerProfile';
import type { SecretId } from '../../data/worldSecrets';

export type BuildUseBattleActionsArgs = {
  dismissAch: () => void;
  dismissCollectionPopup: () => void;
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
  requestHint: () => void;
  advance: () => void;
  continueAfterEvolve: () => void;
  presentBattle: () => void;
  quitGame: () => void;
  togglePause: () => void;
  toggleCoopActive: () => void;
  rmD: (id: number) => void;
  rmP: (id: number) => void;
  resumeFromSave: () => void;
  openWorldMap: () => void;
  startExpedition: (id: ExpeditionId) => void;
  chooseRoute: (lane: number) => void;
  pauseExpedition: () => void;
  setPlayerProfile: (profile: PlayerProfile) => void;
  finishSpring: (result: SpringResult) => void;
  discoverSecret: (id: SecretId) => void;
};

/**
 * Typed mapping for the public actions contract.
 * Keeps action-shape drift out of useBattle.js while TS migration is in progress.
 */
export function buildUseBattleActions(args: BuildUseBattleActionsArgs): UseBattleActions {
  return {
    dismissAch: args.dismissAch,
    dismissCollectionPopup: args.dismissCollectionPopup,
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
    requestHint: args.requestHint,
    advance: args.advance,
    continueAfterEvolve: args.continueAfterEvolve,
    presentBattle: args.presentBattle,
    quitGame: args.quitGame,
    togglePause: args.togglePause,
    toggleCoopActive: args.toggleCoopActive,
    rmD: args.rmD,
    rmP: args.rmP,
    resumeFromSave: args.resumeFromSave,
    openWorldMap: args.openWorldMap,
    startExpedition: args.startExpedition,
    chooseRoute: args.chooseRoute,
    pauseExpedition: args.pauseExpedition,
    setPlayerProfile: args.setPlayerProfile,
    finishSpring: args.finishSpring,
    discoverSecret: args.discoverSecret,
  };
}
