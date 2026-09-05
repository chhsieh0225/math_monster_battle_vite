/**
 * savegame.ts — Mid-run save/load system.
 *
 * Persists enough state to let the player close the browser and resume from
 * the last defeated enemy.  Only the *between-battle* snapshot is stored —
 * we never try to freeze an ongoing animation or timer.
 *
 * Serialisation strategy
 * ──────────────────────
 * `StarterVm` and `EnemyVm` contain `svgFn` (a closure) which is not
 * JSON-serialisable.  We strip functions on write and re-attach them on read
 * by looking up IDs and active sprite keys in the shared content registries.
 *
 * Storage key: "mathMonsterBattle_save"
 */

import { readJson, writeJson, removeKey } from './storage.ts';
import { STARTERS } from '../data/starters.ts';
import { getMonsterSprite } from '../data/monsters.ts';
import { getEnemyPersonality } from '../data/enemyPersonalities.ts';
import { BOSS_IDS } from '../data/monsterConfigs.ts';
import type { StarterId } from '../types/game';
import type { BattleMode, EnemyVm, StarterVm } from '../types/battle';
import type { BattleState } from '../hooks/battle/battleReducer.ts';

const SAVE_KEY = 'mathMonsterBattle_save';
const SAVE_VERSION = 1;

// ─── Serialisable slice types ────────────────────────────────────

/** Fields kept from EnemyVm (everything except svgFn). */
type SerialEnemyVm = Omit<EnemyVm, 'svgFn' | 'personality'> & {
  personalityId?: string;
};

/** The complete snapshot written to localStorage. */
export type SaveSnapshot = {
  version: number;
  ts: number; // Date.now() at save time

  // Run metadata
  battleMode: BattleMode;
  timedMode: boolean;
  nextRound: number; // the round index the player will start next

  // Player identity
  starterId: string;
  starterStageIdx: number;
  allySubId: string | null;
  allySubStageIdx: number;
  coopActiveSlot: 'main' | 'sub';

  // Core battle reducer state (scalar + arrays only)
  battle: SerialBattleState;

  // Enemy roster for the run (stripped of functions)
  enemies: SerialEnemyVm[];
};

/**
 * Subset of BattleState that we persist.
 * We include every field except `enemy`/`enemySub`/`allySub` (these are
 * reconstructed from the roster + startBattle dispatch on resume).
 */
type SerialBattleState = {
  pHp: number;
  pHpSub: number;
  pExp: number;
  pLvl: number;
  pStg: number;
  streak: number;
  passiveCount: number;
  charge: number;
  tC: number;
  tW: number;
  defeated: number;
  maxStreak: number;
  mHits: number[];
  mLvls: number[];
  diffLevel: number;
};

// ─── Strip / rehydrate helpers ───────────────────────────────────

function stripEnemy(e: EnemyVm): SerialEnemyVm {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { svgFn, personality, ...rest } = e;
  return {
    ...rest,
    personalityId: personality?.id,
  };
}

function rehydrateEnemy(e: SerialEnemyVm): EnemyVm | null {
  const { personalityId, ...fields } = e;
  const personality = personalityId ? getEnemyPersonality(personalityId) : undefined;
  if (personalityId && !personality) return null;
  const baseId = e.id.startsWith('pvp_') ? e.id.slice(4) : e.id;
  const isWildStarter = baseId.startsWith('wild_starter_');
  const wildStarterId = isWildStarter ? baseId.replace('wild_starter_', '') : null;

  // 1. Try boss starters (player starters used as enemies in PvP / wild encounters)
  if (wildStarterId || BOSS_IDS.has(baseId)) {
    const lookupId = wildStarterId || baseId;
    const starterConfig = STARTERS.find((s) => s.id === lookupId);
    if (starterConfig) {
      const stageIdx = e.selectedStageIdx ?? 0;
      const stage = starterConfig.stages[stageIdx] || starterConfig.stages[0];
      if (stage?.svgFn) {
        return {
          ...fields,
          personality,
          svgFn: stage.svgFn,
        };
      }
    }
  }

  // Active keys preserve variants; ID lookup also supports older snapshots.
  const svgFn = getMonsterSprite(baseId, e.isEvolved, e.activeSpriteKey);
  if (svgFn) {
    return {
      ...fields,
      personality,
      svgFn,
    };
  }

  // Try player starters used as enemies in some modes.
  const starterMatch = STARTERS.find((s) => s.id === baseId);
  if (starterMatch) {
    const stageIdx = e.selectedStageIdx ?? 0;
    const stage = starterMatch.stages[stageIdx] || starterMatch.stages[0];
    return {
      ...fields,
      personality,
      svgFn: stage.svgFn,
    };
  }

  // An unsupported save is safer than an invisible enemy and a poisoned sprite cache.
  return null;
}

function rehydrateStarter(id: string, stageIdx: number): StarterVm | null {
  const config = STARTERS.find((s) => s.id === id);
  if (!config || !Number.isInteger(stageIdx) || !config.stages[stageIdx]) return null;

  return {
    ...config,
    id: config.id as StarterId,
    stages: config.stages.map((s) => ({ ...s })),
    moves: config.moves.map((m) => ({
      ...m,
      desc: m.desc || '',
      color: m.color || config.c1,
    })),
    selectedStageIdx: stageIdx,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value);
}

function isSaveSnapshot(value: unknown): value is SaveSnapshot {
  if (!isRecord(value) || value.version !== SAVE_VERSION || !isRecord(value.battle)) return false;
  if (typeof value.battleMode !== 'string' || !['single', 'double', 'coop', 'pvp'].includes(value.battleMode)) return false;
  if (typeof value.timedMode !== 'boolean' || typeof value.starterId !== 'string') return false;
  if (value.allySubId !== null && typeof value.allySubId !== 'string') return false;
  if (value.coopActiveSlot !== 'main' && value.coopActiveSlot !== 'sub') return false;
  if (!isNonNegativeInteger(value.starterStageIdx) || !isNonNegativeInteger(value.allySubStageIdx)) return false;
  if (!Array.isArray(value.enemies) || !isNonNegativeInteger(value.nextRound)) return false;
  if (value.nextRound >= value.enemies.length) return false;
  const battle = value.battle;
  const scalarKeys = ['pHp', 'pHpSub', 'pExp', 'pLvl', 'pStg', 'streak', 'passiveCount',
    'charge', 'tC', 'tW', 'defeated', 'maxStreak', 'diffLevel'] as const;
  if (!scalarKeys.every((key) => isNonNegativeNumber(battle[key]))) return false;
  if (![battle.pLvl, battle.pStg, battle.diffLevel].every(isNonNegativeInteger) || battle.pLvl === 0) return false;
  if (![battle.mHits, battle.mLvls].every((items) => Array.isArray(items) && items.length > 0 && items.every(isNonNegativeInteger))) return false;
  return value.enemies.every((enemy) => isRecord(enemy)
    && ['id', 'name', 'mType', 'typeIcon', 'c1', 'c2'].every((key) => typeof enemy[key] === 'string')
    && isNonNegativeNumber(enemy.maxHp) && enemy.maxHp > 0 && isNonNegativeInteger(enemy.lvl)
    && ['hp', 'atk'].every((key) => enemy[key] === undefined || isNonNegativeNumber(enemy[key]))
    && ['personalityId', 'activeSpriteKey', 'spriteKey', 'evolvedSpriteKey'].every((key) => enemy[key] === undefined || typeof enemy[key] === 'string')
    && (enemy.isEvolved === undefined || typeof enemy.isEvolved === 'boolean')
    && (enemy.selectedStageIdx === undefined || isNonNegativeInteger(enemy.selectedStageIdx))
    && (enemy.drops === undefined || (Array.isArray(enemy.drops) && enemy.drops.every((drop) => typeof drop === 'string'))));
}

// ─── Public API ──────────────────────────────────────────────────

export function hasSave(): boolean {
  return loadSave() !== null;
}

export function writeSave(snapshot: SaveSnapshot): boolean {
  return writeJson(SAVE_KEY, snapshot);
}

export function clearSave(): boolean {
  return removeKey(SAVE_KEY);
}

export type LoadedSave = {
  battleMode: BattleMode;
  timedMode: boolean;
  nextRound: number;
  starter: StarterVm;
  allySub: StarterVm | null;
  coopActiveSlot: 'main' | 'sub';
  battle: SerialBattleState;
  enemies: EnemyVm[];
};

export function loadSave(): LoadedSave | null {
  const snapshot = readJson<unknown>(SAVE_KEY, null);
  if (!isSaveSnapshot(snapshot)) return null;

  const starter = rehydrateStarter(snapshot.starterId, snapshot.starterStageIdx);
  if (!starter) return null;
  if (snapshot.battle.mHits.length !== starter.moves.length || snapshot.battle.mLvls.length !== starter.moves.length) return null;
  if (snapshot.battle.mLvls.some((level) => level < 1) || !starter.stages[snapshot.battle.pStg]) return null;

  const allySub = snapshot.allySubId
    ? rehydrateStarter(snapshot.allySubId, snapshot.allySubStageIdx)
    : null;
  if (snapshot.allySubId && !allySub) return null;

  const enemies: EnemyVm[] = [];
  for (const savedEnemy of snapshot.enemies) {
    const enemy = rehydrateEnemy(savedEnemy);
    if (!enemy) return null;
    enemies.push(enemy);
  }

  return {
    battleMode: snapshot.battleMode,
    timedMode: snapshot.timedMode,
    nextRound: snapshot.nextRound,
    starter,
    allySub,
    coopActiveSlot: snapshot.coopActiveSlot,
    battle: snapshot.battle,
    enemies,
  };
}

/**
 * Build a SaveSnapshot from current game state.
 * Call this after each enemy defeat, before advancing to the next round.
 */
export function buildSaveSnapshot(args: {
  battleMode: BattleMode;
  timedMode: boolean;
  nextRound: number;
  starter: StarterVm;
  allySub: StarterVm | null;
  coopActiveSlot: 'main' | 'sub';
  battle: BattleState;
  enemies: EnemyVm[];
}): SaveSnapshot {
  return {
    version: SAVE_VERSION,
    ts: Date.now(),
    battleMode: args.battleMode,
    timedMode: args.timedMode,
    nextRound: args.nextRound,
    starterId: String(args.starter.id || ''),
    starterStageIdx: args.starter.selectedStageIdx ?? 0,
    allySubId: args.allySub?.id ? String(args.allySub.id) : null,
    allySubStageIdx: args.allySub?.selectedStageIdx ?? 0,
    coopActiveSlot: args.coopActiveSlot,
    battle: {
      pHp: args.battle.pHp,
      pHpSub: args.battle.pHpSub,
      pExp: args.battle.pExp,
      pLvl: args.battle.pLvl,
      pStg: args.battle.pStg,
      streak: args.battle.streak,
      passiveCount: args.battle.passiveCount,
      charge: args.battle.charge,
      tC: args.battle.tC,
      tW: args.battle.tW,
      defeated: args.battle.defeated,
      maxStreak: args.battle.maxStreak,
      mHits: [...args.battle.mHits],
      mLvls: [...args.battle.mLvls],
      diffLevel: args.battle.diffLevel,
    },
    enemies: args.enemies.map(stripEnemy),
  };
}
