import { PLAYER_MAX_HP } from '../../data/constants.ts';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import type { EnemyVm, StarterVm } from '../../types/battle';

type BattleEntity = EnemyVm | null;

export type BattleState = {
  // Player
  pHp: number;
  allySub: StarterVm | null;
  pHpSub: number;
  pExp: number;
  pLvl: number;
  pStg: number;

  // Battle flow
  round: number;
  enemy: BattleEntity;
  eHp: number;
  enemySub: BattleEntity;
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

  // Status effects
  burnStack: number;
  frozen: boolean;
  staticStack: number;
  specDef: boolean;
  defAnim: string | null;
  cursed: boolean;

  // Adaptive difficulty
  diffLevel: number;

  // Boss mechanics
  bossPhase: number;
  bossTurn: number;
  bossCharging: boolean;
  sealedMove: number;
  sealedTurns: number;
};

export type BattlePatch = Partial<BattleState>;
type BattleStateValue = BattleState[keyof BattleState];

type SetFieldAction = {
  type: "set_field";
  key: keyof BattleState;
  value:
    | BattleState[keyof BattleState]
    | ((prev: BattleState[keyof BattleState]) => BattleState[keyof BattleState]);
};

type PatchAction = {
  type: "patch";
  patch?: BattlePatch | null;
};

type ResetRunAction = {
  type: "reset_run";
  patch?: BattlePatch | null;
};

type StartBattleAction = {
  type: "start_battle";
  enemy?: BattleEntity;
  enemySub?: BattleEntity;
  round?: number;
  /** Boss first-move intimidation: sealed move index (0-2) */
  sealedMove?: number;
  /** Boss first-move intimidation: seal duration in turns */
  sealedTurns?: number;
};

type PromoteEnemySubAction = {
  type: "promote_enemy_sub";
};

export type BattleAction =
  | SetFieldAction
  | PatchAction
  | ResetRunAction
  | StartBattleAction
  | PromoteEnemySubAction;

const BASE_STATE: BattleState = {
  // Player
  pHp: PLAYER_MAX_HP,
  allySub: null,
  pHpSub: 0,
  pExp: 0,
  pLvl: 1,
  pStg: 0,

  // Battle flow
  round: 0,
  enemy: null,
  eHp: 0,
  enemySub: null,
  eHpSub: 0,
  streak: 0,
  passiveCount: 0,
  charge: 0,
  tC: 0,
  tW: 0,
  defeated: 0,
  maxStreak: 0,
  mHits: [0, 0, 0, 0],
  mLvls: [1, 1, 1, 1],
  mLvlUp: null,

  // Status effects
  burnStack: 0,
  frozen: false,
  staticStack: 0,
  specDef: false,
  defAnim: null,
  cursed: false,

  // Adaptive difficulty
  diffLevel: 2,

  // Boss mechanics
  bossPhase: 0,
  bossTurn: 0,
  bossCharging: false,
  sealedMove: -1,
  sealedTurns: 0,
};

function resolveValue(
  current: BattleStateValue,
  next: BattleStateValue | ((prev: BattleStateValue) => BattleStateValue),
): BattleStateValue {
  return typeof next === 'function'
    ? next(current)
    : next;
}

function isBattleStateKey(key: string): key is keyof BattleState {
  return key in BASE_STATE;
}

function applyPatch(state: BattleState, patch?: BattlePatch | null): BattleState {
  if (!patch || typeof patch !== 'object') return state;
  const next = { ...state };
  let changed = false;

  for (const key of Object.keys(patch)) {
    if (!isBattleStateKey(key)) continue;
    const prevValue = next[key];
    const value = patch[key];
    if (typeof value === 'undefined') continue;
    if (Object.is(prevValue, value)) continue;
    Object.assign(next, { [key]: value });
    changed = true;
  }

  return changed ? next : state;
}

function enemyHp(enemy: BattleEntity): number {
  return enemy ? enemy.maxHp : 0;
}

export function createInitialBattleState(): BattleState {
  return {
    ...BASE_STATE,
    mHits: [...BASE_STATE.mHits],
    mLvls: [...BASE_STATE.mLvls],
  };
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'set_field': {
      const { key, value } = action;
      const prevValue = state[key];
      const nextValue = resolveValue(prevValue, value);
      if (Object.is(nextValue, prevValue)) return state;
      const next = { ...state };
      Object.assign(next, { [key]: nextValue });
      return next;
    }

    case 'patch':
      return applyPatch(state, action.patch);

    case 'reset_run': {
      const reset = {
        ...state,
        ...createInitialBattleState(),
        ...action.patch,
      };
      return reset;
    }

    case 'start_battle': {
      const enemy = action.enemy || null;
      const enemySub = action.enemySub || null;
      return {
        ...state,
        enemy,
        eHp: enemyHp(enemy),
        enemySub,
        eHpSub: enemyHp(enemySub),
        round: action.round ?? state.round,
        burnStack: 0,
        staticStack: 0,
        frozen: false,
        specDef: false,
        defAnim: null,
        bossPhase: BOSS_IDS.has(enemy?.id ?? '') ? 1 : 0,
        bossTurn: 0,
        bossCharging: false,
        sealedMove: action.sealedMove ?? -1,
        sealedTurns: action.sealedTurns ?? 0,
      };
    }

    case 'promote_enemy_sub': {
      if (!state.enemySub) return state;
      const promoted = state.enemySub;
      return {
        ...state,
        enemy: promoted,
        eHp: state.eHpSub,
        enemySub: null,
        eHpSub: 0,
        round: state.round + 1,
        burnStack: 0,
        staticStack: 0,
        frozen: false,
        specDef: false,
        defAnim: null,
        bossPhase: BOSS_IDS.has(promoted?.id ?? '') ? 1 : 0,
        bossTurn: 0,
        bossCharging: false,
        sealedMove: -1,
        sealedTurns: 0,
      };
    }

    default:
      return state;
  }
}
