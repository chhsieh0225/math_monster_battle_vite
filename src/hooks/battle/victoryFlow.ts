import type { AchievementId } from '../../types/game';
import type { CollectionAddResult } from '../../utils/collectionStore.ts';

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
}: RunVictoryFlowArgs): void {
  const s = sr.current;
  const enemy = s.enemy;
  if (!enemy) return;

  setBurnStack(0);
  setStaticStack(0);
  setFrozen(false);
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
  const drop = dropPool[randInt(0, dropPool.length - 1)] || '';

  // Persist the drop to the collection store (best-effort fire-and-forget).
  if (drop) {
    import('../../utils/collectionStore.ts')
      .then(({ addToCollection }) => {
        const result = addToCollection([drop]);
        if (typeof onCollectionUpdated === 'function') {
          onCollectionUpdated(result);
        }
      })
      .catch(() => { /* non-critical */ });
  }

  setBText(tr(
    t,
    'battle.victory.gain',
    '{enemy} {verb}! Gained {xp} EXP {drop}',
    {
      enemy: enemy.name || tr(t, 'battle.enemy.unknown', 'Enemy'),
      verb,
      xp,
      drop,
    },
  ));
  setPhase('victory');
  sfx.play('victory');
}
