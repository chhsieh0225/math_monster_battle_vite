import { PLAYER_MAX_HP } from '../../data/constants.js';

const BASE_STATE = {
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

function resolveValue(current, next) {
  return typeof next === "function" ? next(current) : next;
}

function applyPatch(state, patch) {
  if (!patch || typeof patch !== "object") return state;
  const next = { ...state };
  let changed = false;
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (Object.is(next[key], value)) continue;
    next[key] = value;
    changed = true;
  }
  return changed ? next : state;
}

export function createInitialBattleState() {
  return {
    ...BASE_STATE,
    mHits: [...BASE_STATE.mHits],
    mLvls: [...BASE_STATE.mLvls],
  };
}

export function battleReducer(state, action) {
  switch (action.type) {
    case "set_field": {
      const { key, value } = action;
      const nextValue = resolveValue(state[key], value);
      if (Object.is(nextValue, state[key])) return state;
      return { ...state, [key]: nextValue };
    }

    case "patch":
      return applyPatch(state, action.patch);

    case "reset_run":
      return {
        ...state,
        ...createInitialBattleState(),
        ...action.patch,
      };

    case "start_battle": {
      const enemy = action.enemy || null;
      const enemySub = action.enemySub || null;
      return {
        ...state,
        enemy,
        eHp: enemy ? enemy.maxHp : 0,
        enemySub,
        eHpSub: enemySub ? enemySub.maxHp : 0,
        round: action.round ?? state.round,
        burnStack: 0,
        staticStack: 0,
        frozen: false,
        specDef: false,
        defAnim: null,
        bossPhase: enemy?.id === "boss" ? 1 : 0,
        bossTurn: 0,
        bossCharging: false,
        sealedMove: -1,
        sealedTurns: 0,
      };
    }

    case "promote_enemy_sub": {
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
        bossPhase: promoted?.id === "boss" ? 1 : 0,
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
