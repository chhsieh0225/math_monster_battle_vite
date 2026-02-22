import type {
  UseBattleActions,
  UseBattlePublicApi,
  SfxApi,
  UseBattleState,
  UseBattleView,
} from '../../types/battle';

type BuildUseBattlePublicApiArgs = {
  state: UseBattleState;
  actions: UseBattleActions;
  view: UseBattleView;
};

type RecordLike = Record<string, unknown>;

function isRecordLike(value: unknown): value is RecordLike {
  return typeof value === 'object' && value !== null;
}

function assertRecordLike(value: unknown, path: string): asserts value is RecordLike {
  if (!isRecordLike(value)) {
    throw new TypeError(`[useBattle] ${path} must be an object.`);
  }
}

function assertHasKey(target: RecordLike, key: string, path: string): void {
  if (!(key in target)) {
    throw new TypeError(`[useBattle] ${path}.${key} is required.`);
  }
}

function assertHasFunction(target: RecordLike, key: string, path: string): void {
  assertHasKey(target, key, path);
  if (typeof target[key] !== 'function') {
    throw new TypeError(`[useBattle] ${path}.${key} must be a function.`);
  }
}

const REQUIRED_STATE_KEYS = [
  'screen',
  'timedMode',
  'battleMode',
  'enemies',
  'starter',
  'allySub',
  'pHp',
  'pHpSub',
  'pExp',
  'pLvl',
  'pStg',
  'coopActiveSlot',
  'pvpStarter2',
  'pvpHp2',
  'pvpTurn',
  'pvpWinner',
  'pvpState',
  'pvpChargeP1',
  'pvpChargeP2',
  'pvpActionCount',
  'pvpBurnP1',
  'pvpBurnP2',
  'pvpFreezeP1',
  'pvpFreezeP2',
  'pvpStaticP1',
  'pvpStaticP2',
  'pvpParalyzeP1',
  'pvpParalyzeP2',
  'pvpComboP1',
  'pvpComboP2',
  'pvpSpecDefP1',
  'pvpSpecDefP2',
  'round',
  'enemy',
  'eHp',
  'enemySub',
  'eHpSub',
  'streak',
  'passiveCount',
  'charge',
  'tC',
  'tW',
  'wrongQuestions',
  'defeated',
  'maxStreak',
  'mHits',
  'mLvls',
  'mLvlUp',
  'phase',
  'selIdx',
  'q',
  'fb',
  'bText',
  'answered',
  'dmgs',
  'parts',
  'eAnim',
  'pAnim',
  'atkEffect',
  'effMsg',
  'burnStack',
  'frozen',
  'shattered',
  'staticStack',
  'specDef',
  'defAnim',
  'cursed',
  'bossPhase',
  'bossTurn',
  'bossCharging',
  'sealedMove',
  'sealedTurns',
  'shadowShieldCD',
  'furyRegenUsed',
  'diffLevel',
  'gamePaused',
  'questionTimerSec',
  'dailyChallengeFeedback',
  'towerChallengeFeedback',
  'expNext',
  'chargeReady',
  'inventory',
  'achUnlocked',
  'achPopup',
  'collectionPopup',
  'encData',
] as const satisfies ReadonlyArray<keyof UseBattleState>;

type MissingStateKey = Exclude<keyof UseBattleState, (typeof REQUIRED_STATE_KEYS)[number]>;
const _assertStateCoverage: MissingStateKey extends never ? true : never = true;

const REQUIRED_ACTION_KEYS = [
  'dismissAch',
  'dismissCollectionPopup',
  'setTimedMode',
  'setBattleMode',
  'setScreen',
  'queueDailyChallenge',
  'queueTowerChallenge',
  'clearChallengeRun',
  'setStarter',
  'setPvpStarter2',
  'startGame',
  'selectMove',
  'useItem',
  'onAns',
  'advance',
  'continueAfterEvolve',
  'quitGame',
  'togglePause',
  'toggleCoopActive',
  'rmD',
  'rmP',
  'resumeFromSave',
] as const satisfies ReadonlyArray<keyof UseBattleActions>;

type MissingActionKey = Exclude<keyof UseBattleActions, (typeof REQUIRED_ACTION_KEYS)[number]>;
const _assertActionCoverage: MissingActionKey extends never ? true : never = true;

const REQUIRED_VIEW_KEYS = [
  'timerSubscribe',
  'getTimerLeft',
  'getPow',
  'dualEff',
  'sfx',
] as const satisfies ReadonlyArray<keyof UseBattleView>;

type MissingViewKey = Exclude<keyof UseBattleView, (typeof REQUIRED_VIEW_KEYS)[number]>;
const _assertViewCoverage: MissingViewKey extends never ? true : never = true;

const REQUIRED_SFX_KEYS = [
  'sfxMuted',
  'bgmMuted',
  'bgmVolume',
  'muted',
  'ready',
  'init',
  'setSfxMuted',
  'setBgmMuted',
  'setBgmVolume',
  'setMuted',
  'startBgm',
  'stopBgm',
  'prefetchBgm',
  'bgmTrack',
  'dispose',
] as const satisfies ReadonlyArray<keyof SfxApi>;

type MissingSfxKey = Exclude<keyof SfxApi, (typeof REQUIRED_SFX_KEYS)[number]>;
const _assertSfxCoverage: MissingSfxKey extends never ? true : never = true;

const REQUIRED_SFX_FUNCTION_KEYS = [
  'init',
  'setSfxMuted',
  'setBgmMuted',
  'setBgmVolume',
  'setMuted',
  'startBgm',
  'stopBgm',
  'prefetchBgm',
] as const satisfies ReadonlyArray<keyof SfxApi>;

/**
 * Typed construction point for useBattle public surface.
 * Keep the contract centralized so consumers and future TS migration share one source of truth.
 */
export function buildUseBattlePublicApi({
  state,
  actions,
  view,
}: BuildUseBattlePublicApiArgs): UseBattlePublicApi {
  return { state, actions, view };
}

/**
 * Runtime contract guard between JS implementation and TS consumers.
 * Fail fast when useBattle public shape is broken during refactors.
 */
export function assertUseBattlePublicApiShape(raw: unknown): asserts raw is UseBattlePublicApi {
  assertRecordLike(raw, 'publicApi');

  const state = raw.state;
  const actions = raw.actions;
  const view = raw.view;

  assertRecordLike(state, 'publicApi.state');
  assertRecordLike(actions, 'publicApi.actions');
  assertRecordLike(view, 'publicApi.view');

  for (const key of REQUIRED_STATE_KEYS) {
    assertHasKey(state, key, 'publicApi.state');
  }
  for (const key of REQUIRED_ACTION_KEYS) {
    assertHasFunction(actions, key, 'publicApi.actions');
  }
  for (const key of REQUIRED_VIEW_KEYS) {
    assertHasKey(view, key, 'publicApi.view');
  }
  for (const key of REQUIRED_VIEW_KEYS) {
    if (key !== 'sfx') assertHasFunction(view, key, 'publicApi.view');
  }

  const sfx = view.sfx;
  assertRecordLike(sfx, 'publicApi.view.sfx');
  for (const key of REQUIRED_SFX_KEYS) {
    assertHasKey(sfx, key, 'publicApi.view.sfx');
  }
  for (const key of REQUIRED_SFX_FUNCTION_KEYS) {
    assertHasFunction(sfx, key, 'publicApi.view.sfx');
  }
}

export function coerceUseBattlePublicApi(raw: unknown): UseBattlePublicApi {
  assertUseBattlePublicApiShape(raw);
  return buildUseBattlePublicApi({
    state: raw.state,
    actions: raw.actions,
    view: raw.view,
  });
}
