import type {
  AchievementId,
  EncyclopediaData,
  InventoryData,
  ItemId,
  StarterId,
} from './game';
import type { EnemyPersonality } from '../data/enemyPersonalities';
import type {
  DailyChallengeFeedback,
  DailyChallengePlan,
  StreakTowerPlan,
  TowerChallengeFeedback,
} from './challenges';

export type BattleMode = "single" | "coop" | "pvp" | "double";
export type ScreenName =
  | "title"
  | "howto"
  | "daily_challenge"
  | "selection"
  | "battle"
  | "achievements"
  | "encyclopedia"
  | "dashboard"
  | "settings"
  | "leaderboard"
  | "pvp_result"
  | "evolve"
  | "gameover";

export type BattlePhase =
  | "menu"
  | "bossIntro"
  | "bossVictory"
  | "question"
  | "text"
  | "playerAtk"
  | "enemyAtk"
  | "victory"
  | "ko";

export type TimerSubscribe = (listener: () => void) => () => void;

export type MoveVm = {
  icon: string;
  name: string;
  desc: string;
  color: string;
  basePower: number;
  growth: number;
  range?: [number, number];
  type: string;
  ops?: string[];
  bg?: string;
  risky?: boolean;
};

export type StarterStageVm = {
  name: string;
  emoji: string;
  svgFn: (...args: string[]) => string;
};

export type StarterVm = {
  id?: StarterId;
  name: string;
  type: string;
  typeIcon: string;
  typeName?: string;
  c1: string;
  c2: string;
  stages: StarterStageVm[];
  moves: MoveVm[];
  selectedStageIdx?: number;
};

export type EnemyVm = {
  id: string;
  name: string;
  lvl: number;
  maxHp: number;
  hp?: number;
  atk?: number;
  mType: string;
  mType2?: string;
  sceneMType?: string;
  typeIcon: string;
  typeIcon2?: string;
  typeName?: string;
  typeName2?: string;
  c1: string;
  c2: string;
  isEvolved?: boolean;
  trait?: string;
  traitName?: string;
  traitDesc?: string;
  drops?: string[];
  selectedStageIdx?: number;
  personality?: EnemyPersonality;
  svgFn: (...args: string[]) => string;
  /** SVG export name of the base sprite (e.g. 'ghostLanternSVG'). */
  spriteKey?: string;
  /** SVG export name of the evolved sprite (if applicable). */
  evolvedSpriteKey?: string;
  /** SVG export name of the currently active sprite (for size compensation). */
  activeSpriteKey?: string;
  campaignNodeIndex?: number;
  campaignNodeTotal?: number;
  campaignTier?: 'normal' | 'elite' | 'boss';
  campaignBranch?: 'left' | 'right';
  campaignEventTag?: 'healing_spring' | 'focus_surge' | 'hazard_ambush' | null;
  campaignPathKey?: string;
};

export type QuestionVm = {
  display: string;
  op: string;
  answer: number;
  choices: number[];
  choiceLabels?: string[];
  answerLabel?: string;
  steps?: string[];
};

export type FeedbackVm = {
  correct: boolean;
  answer?: number;
  steps?: string[];
};

export type WrongQuestionReviewVm = {
  id: number;
  display: string;
  answer: string;
  steps: string[];
};

export type DamageVm = {
  id: number;
  value: number | string;
  x: number;
  y: number;
  color: string;
};

export type ParticleVm = {
  id: number;
  emoji: string;
  x: number;
  y: number;
};

export type AttackEffectVm = {
  type: string;
  idx: number;
  lvl: number;
  targetSide?: "enemy" | "player";
};

export type EffectMsgVm = {
  text: string;
  color: string;
};

export type SfxApi = {
  sfxMuted: boolean;
  bgmMuted: boolean;
  bgmVolume: number;
  /** Legacy: true when both sfx AND bgm are muted. */
  muted: boolean;
  ready: boolean;
  init: () => Promise<void>;
  setSfxMuted: (next: boolean) => boolean;
  setBgmMuted: (next: boolean) => boolean;
  setBgmVolume: (next: number) => number;
  /** Legacy: mute both SFX + BGM. */
  setMuted: (next: boolean) => boolean;
  startBgm: (
    track:
      | 'menu'
      | 'battle'
      | 'volcano'
      | 'coast'
      | 'thunder'
      | 'ironclad'
      | 'graveyard'
      | 'canyon'
      | 'boss'
      | 'boss_hydra'
      | 'boss_crazy_dragon'
      | 'boss_sword_god'
      | 'boss_dark_king'
  ) => void;
  prefetchBgm: (
    tracks: ReadonlyArray<
      | 'menu'
      | 'battle'
      | 'volcano'
      | 'coast'
      | 'thunder'
      | 'ironclad'
      | 'graveyard'
      | 'canyon'
      | 'boss'
      | 'boss_hydra'
      | 'boss_crazy_dragon'
      | 'boss_sword_god'
      | 'boss_dark_king'
    >,
    mode?: 'metadata' | 'auto',
  ) => void;
  stopBgm: () => void;
  bgmTrack: string | null;
  dispose: () => void;
};

export type CollectionPopupVm = {
  id: number;
  icon: string;
  title: string;
  desc: string;
};

export type PvpCombatantStateVm = {
  charge: number;
  burn: number;
  freeze: boolean;
  static: number;
  paralyze: boolean;
  combo: number;
  specDef: boolean;
};

export type PvpStateVm = {
  p1: PvpCombatantStateVm;
  p2: PvpCombatantStateVm;
  turn: 'p1' | 'p2';
  winner: 'p1' | 'p2' | null;
  actionCount: number;
};

export type UseBattleState = {
  screen: ScreenName;
  timedMode: boolean;
  battleMode: BattleMode;
  enemies: EnemyVm[];
  starter: StarterVm | null;
  allySub: StarterVm | null;
  pHp: number;
  pHpSub: number;
  pExp: number;
  pLvl: number;
  pStg: number;
  coopActiveSlot: "main" | "sub";
  pvpStarter2: StarterVm | null;
  pvpHp2: number;
  pvpTurn: "p1" | "p2";
  pvpWinner: "p1" | "p2" | null;
  pvpState: PvpStateVm;
  pvpChargeP1: number;
  pvpChargeP2: number;
  pvpActionCount: number;
  pvpBurnP1: number;
  pvpBurnP2: number;
  pvpFreezeP1: boolean;
  pvpFreezeP2: boolean;
  pvpStaticP1: number;
  pvpStaticP2: number;
  pvpParalyzeP1: boolean;
  pvpParalyzeP2: boolean;
  pvpComboP1: number;
  pvpComboP2: number;
  pvpSpecDefP1: boolean;
  pvpSpecDefP2: boolean;
  round: number;
  enemy: EnemyVm | null;
  eHp: number;
  enemySub: EnemyVm | null;
  eHpSub: number;
  streak: number;
  passiveCount: number;
  charge: number;
  tC: number;
  tW: number;
  wrongQuestions: WrongQuestionReviewVm[];
  defeated: number;
  maxStreak: number;
  mHits: number[];
  mLvls: number[];
  mLvlUp: number | null;
  phase: string;
  selIdx: number | null;
  q: QuestionVm | null;
  fb: FeedbackVm | null;
  bText: string;
  answered: boolean;
  dmgs: DamageVm[];
  parts: ParticleVm[];
  eAnim: string;
  pAnim: string;
  atkEffect: AttackEffectVm | null;
  effMsg: EffectMsgVm | null;
  burnStack: number;
  frozen: boolean;
  shattered: boolean;
  staticStack: number;
  specDef: boolean;
  defAnim: string | null;
  cursed: boolean;
  bossPhase: number;
  bossTurn: number;
  bossCharging: boolean;
  sealedMove: number;
  sealedTurns: number;
  shadowShieldCD: number;
  furyRegenUsed: boolean;
  diffLevel: number;
  gamePaused: boolean;
  questionTimerSec: number;
  dailyChallengeFeedback: DailyChallengeFeedback | null;
  towerChallengeFeedback: TowerChallengeFeedback | null;
  expNext: number;
  chargeReady: boolean;
  inventory: InventoryData;
  achUnlocked: AchievementId[];
  achPopup: AchievementId | null;
  collectionPopup: CollectionPopupVm | null;
  encData: EncyclopediaData;
};

export type UseBattleActions = {
  dismissAch: () => void;
  dismissCollectionPopup: () => void;
  setTimedMode: (next: boolean) => void;
  setBattleMode: (mode: BattleMode) => void;
  setScreen: (screen: ScreenName) => void;
  queueDailyChallenge: (plan: DailyChallengePlan) => void;
  queueTowerChallenge: (plan: StreakTowerPlan) => void;
  clearChallengeRun: () => void;
  setStarter: (starter: StarterVm | null) => void;
  setPvpStarter2: (starter: StarterVm | null) => void;
  startGame: (
    starter?: StarterVm | null,
    mode?: BattleMode,
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
  resumeFromSave: () => void;
};

export type UseBattleView = {
  timerSubscribe: TimerSubscribe;
  getTimerLeft: () => number;
  getPow: (idx: number) => number;
  dualEff: (move: MoveVm) => number;
  sfx: SfxApi;
};

export type UseBattlePublicApi = {
  state: UseBattleState;
  actions: UseBattleActions;
  view: UseBattleView;
};

export type PerfMode = "auto" | "on" | "off";

export type UseMobileExperienceApi = {
  compactUI: boolean;
  lowPerfMode: boolean;
  autoLowEnd: boolean;
  perfMode: PerfMode;
  setPerfMode: (mode: PerfMode) => void;
  cyclePerfMode: () => void;
};
