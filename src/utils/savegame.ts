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
 * by looking up IDs in the static registries (`STARTERS`, `MONSTERS`).
 *
 * Storage key: "mathMonsterBattle_save"
 */

import { readJson, writeJson, removeKey } from './storage.ts';
import { STARTERS } from '../data/starters.ts';
import { MONSTERS } from '../data/monsters.ts';
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

/** Fields kept from StarterVm (everything except stage svgFn). */
type SerialStarterVm = Omit<StarterVm, 'stages' | 'moves'> & {
  /** We only need id + selectedStageIdx to reconstruct. */
  _starterId: string;
  _stageIdx: number;
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

function rehydrateEnemySvg(e: SerialEnemyVm): EnemyVm {
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
          ...e,
          svgFn: stage.svgFn,
        } as EnemyVm;
      }
    }
  }

  // 2. Try the MONSTERS registry
  const monster = MONSTERS.find((m) => m.id === baseId);
  if (monster) {
    const useEvolved = e.isEvolved && monster.evolvedSvgFn;
    return {
      ...e,
      svgFn: useEvolved ? monster.evolvedSvgFn! : monster.svgFn,
    } as EnemyVm;
  }

  // 3. Try player starters (used as enemies in some modes)
  const starterMatch = STARTERS.find((s) => s.id === baseId);
  if (starterMatch) {
    const stageIdx = e.selectedStageIdx ?? 0;
    const stage = starterMatch.stages[stageIdx] || starterMatch.stages[0];
    return {
      ...e,
      svgFn: stage.svgFn,
    } as EnemyVm;
  }

  // 4. Fallback: return a no-op svgFn (should never happen if data is consistent)
  return {
    ...e,
    svgFn: () => '',
  } as EnemyVm;
}

function rehydrateStarter(id: string, stageIdx: number, locale?: string): StarterVm | null {
  const config = STARTERS.find((s) => s.id === id);
  if (!config) return null;

  return {
    id: config.id as StarterId,
    name: config.name,
    type: config.type,
    typeIcon: config.typeIcon,
    typeName: config.typeName,
    c1: config.c1,
    c2: config.c2,
    stages: config.stages.map((s) => ({
      name: s.name,
      emoji: s.emoji,
      svgFn: s.svgFn,
    })),
    moves: config.moves.map((m) => ({
      icon: m.icon,
      name: m.name,
      desc: m.desc || '',
      color: m.color || config.c1,
      basePower: m.basePower,
      growth: m.growth,
      range: m.range,
      type: m.type,
      ops: m.ops,
      bg: m.bg,
      risky: m.risky,
    })),
    selectedStageIdx: stageIdx,
  };
}

// ─── Public API ──────────────────────────────────────────────────

export function hasSave(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed && parsed.version === SAVE_VERSION;
  } catch {
    return false;
  }
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
  const snapshot = readJson<SaveSnapshot | null>(SAVE_KEY, null);
  if (!snapshot || snapshot.version !== SAVE_VERSION) return null;

  const starter = rehydrateStarter(snapshot.starterId, snapshot.starterStageIdx);
  if (!starter) return null;

  const allySub = snapshot.allySubId
    ? rehydrateStarter(snapshot.allySubId, snapshot.allySubStageIdx)
    : null;

  const enemies = snapshot.enemies.map(rehydrateEnemySvg);

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
