import type { AchievementId } from '../../types/game';
import { addToCollection, type CollectionAddResult } from '../../utils/collectionStore.ts';
import { resolveBattleDrop } from '../../utils/dropResolver.ts';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type ProgressResult = {
  nextExp: number;
  nextLevel: number;
  hpBonus: number;
  evolveCount: number;
};

type EnemyLite = {
  id: string;
  lvl?: number;
  name?: string;
  drops?: string[];
  mType?: string;
  sceneMType?: string;
  campaignBranch?: 'left' | 'right';
};

type BattleState = {
  enemy?: EnemyLite | null;
  pExp?: number;
  pLvl?: number;
  pStg?: number;
};

type StateRef = {
  current: BattleState;
};

type NumberSetter = (value: number | ((prev: number) => number)) => void;
type BoolSetter = (value: boolean | ((prev: boolean) => boolean)) => void;
type TextSetter = (value: string) => void;
type PhaseSetter = (value: string) => void;

type RunVictoryFlowArgs = {
  sr: StateRef;
  verb: string;
  randInt: (min: number, max: number) => number;
  resolveLevelProgress: (args: {
    currentExp: number;
    currentLevel: number;
    currentStage: number;
    gainExp: number;
  }) => ProgressResult;
  getStageMaxHp: (stageIdx?: number, levelOverride?: number) => number;
  tryUnlock: (id: AchievementId) => void;
  applyVictoryAchievements: (args: { state: BattleState; tryUnlock: (id: AchievementId) => void }) => void;
  updateEncDefeated: (enemy: EnemyLite) => void;
  setBurnStack: NumberSetter;
  setStaticStack: NumberSetter;
  setFrozen: BoolSetter;
  setShattered: BoolSetter;
  frozenRef: { current: boolean };
  setCursed: BoolSetter;
  setBossPhase: NumberSetter;
  setBossTurn: NumberSetter;
  setBossCharging: BoolSetter;
  setSealedMove: NumberSetter;
  setSealedTurns: NumberSetter;
  setPExp: NumberSetter;
  setPLvl: NumberSetter;
  setPHp: NumberSetter;
  setDefeated: NumberSetter;
  setBText: TextSetter;
  setPhase: PhaseSetter;
  sfx: { play: (name: string) => void };
  t?: Translator;
  setPendingEvolve: (value: boolean) => void;
  onCollectionUpdated?: (result: CollectionAddResult) => void;
  onDropResolved?: (drop: string) => void;
};

function formatFallback(template: string, params?: TranslatorParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m: string, token: string) => String(params[token] ?? ''));
}

function tr(
  t: Translator | undefined,
  key: string,
  fallback: string,
  params?: TranslatorParams,
): string {
  if (typeof t === 'function') return t(key, fallback, params);
  return formatFallback(fallback, params);
}

export function runVictoryFlow({
  sr,
  verb,
  randInt,
  resolveLevelProgress,
  getStageMaxHp,
  tryUnlock,
  applyVictoryAchievements,
  updateEncDefeated,
  setBurnStack,
  setStaticStack,
  setFrozen,
  setShattered,
  frozenRef,
  setCursed,
  setBossPhase,
  setBossTurn,
  setBossCharging,
  setSealedMove,
  setSealedTurns,
  setPExp,
  setPLvl,
  setPHp,
  setDefeated,
  setBText,
  setPhase,
  sfx,
  t,
  setPendingEvolve,
  onCollectionUpdated,
  onDropResolved,
}: RunVictoryFlowArgs): void {
  const s = sr.current;
  const enemy = s.enemy;
  if (!enemy) return;

  setBurnStack(0);
  setStaticStack(0);
  setFrozen(false);
  setShattered(false);
  frozenRef.current = false;
  setCursed(false);
  setBossPhase(0);
  setBossTurn(0);
  setBossCharging(false);
  setSealedMove(-1);
  setSealedTurns(0);

  const xp = (enemy.lvl || 1) * 15;
  const progress = resolveLevelProgress({
    currentExp: s.pExp || 0,
    currentLevel: s.pLvl || 1,
    currentStage: s.pStg || 0,
    gainExp: xp,
  });

  if (progress.evolveCount > 0) {
    setPendingEvolve(true);
    sfx.play('evolve');
  }

  setPExp(progress.nextExp);
  if (progress.nextLevel !== (s.pLvl || 1)) {
    setPLvl(progress.nextLevel);
    if (progress.hpBonus > 0) {
      setPHp((prev) => Math.min(prev + progress.hpBonus, getStageMaxHp(s.pStg || 0, progress.nextLevel)));
    }
  }

  setDefeated((prev) => prev + 1);
  updateEncDefeated(enemy);
  applyVictoryAchievements({ state: s, tryUnlock });

  const dropPool = Array.isArray(enemy.drops) && enemy.drops.length > 0 ? enemy.drops : [''];
  const dropResult = resolveBattleDrop({
    enemyId: enemy.id,
    enemyDrops: dropPool,
    campaignBranch: enemy.campaignBranch ?? null,
    sceneType: enemy.sceneMType || enemy.mType || null,
    randInt,
  });
  const drop = dropResult.drop;
  if (drop && typeof onDropResolved === 'function') {
    onDropResolved(drop);
  }

  // Persist the drop to the collection store (best-effort).
  if (drop) {
    const result = addToCollection([drop]);
    if (typeof onCollectionUpdated === 'function') {
      onCollectionUpdated(result);
    }
  }

  const victoryGainText = tr(
    t,
    'battle.victory.gain',
    '{enemy} {verb}! Gained {xp} EXP {drop}',
    {
      enemy: enemy.name || tr(t, 'battle.enemy.unknown', 'Enemy'),
      verb,
      xp,
      drop,
    },
  );
  const isBossVictory = BOSS_IDS.has(enemy.id ?? '');
  const bossRewardText = isBossVictory
    ? tr(
      t,
      'battle.victory.bossReward',
      '🏆 Boss reward acquired: {drop}',
      { drop: drop || '🎁' },
    )
    : '';
  const finalVictoryText = bossRewardText
    ? `${victoryGainText}\n${bossRewardText}`
    : victoryGainText;

  setBText(finalVictoryText);
  setPhase('victory');
  sfx.play('victory');
}
