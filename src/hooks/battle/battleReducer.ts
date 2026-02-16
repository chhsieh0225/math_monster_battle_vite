import { PLAYER_MAX_HP } from '../../data/constants.ts';

type UnknownRecord = Record<string, unknown>;

type BattleEntity = ({ id?: string; maxHp: number } & UnknownRecord) | null;

export type BattleState = {
  // Player
  pHp: number;
  allySub: UnknownRecord | null;
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

export type BattlePatch = Record<string, unknown>;

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

function resolveValue<T>(current: T, next: T | ((prev: T) => T)): T {
  return typeof next === 'function' ? (next as (prev: T) => T)(current) : next;
}

function applyPatch(state: BattleState, patch?: BattlePatch | null): BattleState {
  if (!patch || typeof patch !== 'object') return state;
  const next = { ...state } as BattleState;
  let changed = false;

  for (const key of Object.keys(patch)) {
    const prevValue = (next as Record<string, unknown>)[key];
    const value = patch[key];
    if (Object.is(prevValue, value)) continue;
    (next as Record<string, unknown>)[key] = value;
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
      return { ...state, [key]: nextValue } as BattleState;
    }

    case 'patch':
      return applyPatch(state, action.patch);

    case 'reset_run':
      return {
        ...state,
        ...createInitialBattleState(),
        ...action.patch,
      } as BattleState;

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
        bossPhase: enemy?.id === 'boss' ? 1 : 0,
        bossTurn: 0,
        bossCharging: false,
        sealedMove: -1,
        sealedTurns: 0,
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
        bossPhase: promoted?.id === 'boss' ? 1 : 0,
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
