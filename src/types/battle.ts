import type { AchievementId, EncyclopediaData, StarterId } from './game';
import type { DailyChallengeFeedback, DailyChallengePlan } from './challenges';

export type BattleMode = "single" | "coop" | "pvp" | "double";
export type ScreenName =
  | "title"
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
  type: string;
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
  mType: string;
  sceneMType?: string;
  typeIcon: string;
  c1: string;
  c2: string;
  isEvolved?: boolean;
  trait?: string;
  traitName?: string;
  traitDesc?: string;
  drops?: string[];
  svgFn: (...args: string[]) => string;
};

export type QuestionVm = {
  display: string;
  op: string;
  answer: number;
  choices: number[];
  steps?: string[];
};

export type FeedbackVm = {
  correct: boolean;
  answer: number;
  steps?: string[];
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
  type: "fire" | "electric" | "water" | "grass" | "dark" | "light";
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
  /** Legacy: true when both sfx AND bgm are muted. */
  muted: boolean;
  ready: boolean;
  init: () => Promise<void>;
  setSfxMuted: (next: boolean) => boolean;
  setBgmMuted: (next: boolean) => boolean;
  /** Legacy: mute both SFX + BGM. */
  setMuted: (next: boolean) => boolean;
  startBgm: (track: 'menu' | 'battle' | 'boss') => void;
  stopBgm: () => void;
  bgmTrack: string | null;
};

export type UseBattleState = {
  screen: ScreenName;
  timedMode: boolean;
  battleMode: BattleMode;
  enemies: unknown[];
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
  defeated: number;
  maxStreak: number;
  mHits: number[];
  mLvls: number[];
  mLvlUp: number | null;
  phase: BattlePhase;
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
  staticStack: number;
  specDef: boolean;
  defAnim: string | null;
  cursed: boolean;
  bossPhase: number;
  bossTurn: number;
  bossCharging: boolean;
  sealedMove: number;
  sealedTurns: number;
  diffLevel: number;
  gamePaused: boolean;
  questionTimerSec: number;
  dailyChallengeFeedback: DailyChallengeFeedback | null;
  expNext: number;
  chargeReady: boolean;
  achUnlocked: AchievementId[];
  achPopup: AchievementId | null;
  encData: EncyclopediaData;
};

export type UseBattleActions = {
  dismissAch: () => void;
  setTimedMode: (next: boolean) => void;
  setBattleMode: (mode: BattleMode) => void;
  setScreen: (screen: ScreenName) => void;
  queueDailyChallenge: (plan: DailyChallengePlan) => void;
  clearChallengeRun: () => void;
  setStarter: (starter: unknown) => void;
  setPvpStarter2: (starter: unknown) => void;
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
