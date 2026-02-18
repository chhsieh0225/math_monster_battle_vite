import type { BattleMode, BattlePhase, EnemyVm, ScreenName, StarterVm } from '../../types/battle';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import { BALANCE_CONFIG } from '../../data/balanceConfig.ts';
import { randomInt } from '../../utils/prng.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type StarterLite = StarterVm | null;
type AllyLite = StarterVm | null;
type EnemyLite = EnemyVm | null;
type ExistingEnemy = NonNullable<EnemyLite>;

type RunStartBattleFlowArgs = {
  idx: number;
  roster?: EnemyVm[] | null;
  enemies: EnemyVm[];
  locale: string;
  battleMode: BattleMode;
  allySub: AllyLite;
  starter: StarterLite;
  t?: Translator;
  sceneNames: Record<string, string>;
  localizeEnemy: (enemy: EnemyLite, locale: string) => EnemyLite;
  localizeSceneName: (sceneType: string, defaultName: string, locale: string) => string;
  dispatchBattle: (action: {
    type: 'start_battle';
    enemy: EnemyLite;
    enemySub: EnemyLite;
    round: number;
    sealedMove?: number;
    sealedTurns?: number;
  }) => void;
  updateEnc: (enemy: ExistingEnemy) => void;
  setPhase: (phase: BattlePhase) => void;
  setBText: (text: string) => void;
  setScreen: (screen: ScreenName) => void;
  finishGame: () => void;
  resetFrozen: () => void;
  playBattleIntro: () => void;
  pickIndex?: (size: number) => number;
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

export function runStartBattleFlow({
  idx,
  roster,
  enemies,
  locale,
  battleMode,
  allySub,
  starter,
  t,
  sceneNames,
  localizeEnemy,
  localizeSceneName,
  dispatchBattle,
  updateEnc,
  setPhase,
  setBText,
  setScreen,
  finishGame,
  resetFrozen,
  playBattleIntro,
  pickIndex,
}: RunStartBattleFlowArgs): void {
  const list = roster || enemies;
  const nextEnemy = list[idx];
  if (!nextEnemy) {
    finishGame();
    return;
  }

  const enemy = localizeEnemy(nextEnemy, locale);
  if (!enemy) {
    finishGame();
    return;
  }

  const isTeamMode = battleMode === 'double' || battleMode === 'coop';
  const enemySub = isTeamMode ? localizeEnemy(list[idx + 1] || null, locale) : null;

  // Boss first-move intimidation: seal a random move at battle start
  const isBoss = BOSS_IDS.has(enemy.id ?? '');
  const sealPool = BALANCE_CONFIG.traits.boss.sealMovePool;
  const sealIdx = isBoss
    ? sealPool[(pickIndex && sealPool.length > 0)
      ? pickIndex(sealPool.length)
      : randomInt(0, Math.max(0, sealPool.length - 1))]
    : undefined;
  const sealTurns = isBoss ? BALANCE_CONFIG.traits.boss.sealDurationTurns : undefined;

  dispatchBattle({ type: 'start_battle', enemy, enemySub, round: idx, sealedMove: sealIdx, sealedTurns: sealTurns });
  resetFrozen();

  updateEnc(enemy);
  if (enemySub) updateEnc(enemySub);

  const sceneType = enemy.sceneMType || enemy.mType || '';
  const localizedScene = localizeSceneName(
    sceneType,
    sceneNames[sceneType] || '',
    locale,
  );

  setPhase('text');
  if (enemySub) {
    if (allySub) {
      setBText(tr(
        t,
        'battle.start.doubleWithAlly',
        '【{scene}】2v2 battle! Our {leader} and {ally} face {enemy} and {enemySub}!',
        {
          scene: localizedScene,
          leader: starter?.name || tr(t, 'battle.role.main', 'Main'),
          ally: allySub.name || '',
          enemy: enemy.name || '',
          enemySub: enemySub.name || '',
        },
      ));
    } else {
      setBText(tr(
        t,
        'battle.start.double',
        '【{scene}】Double battle! {enemy}({enemyType}) and {enemySub}({enemySubType}) appeared!',
        {
          scene: localizedScene,
          enemy: enemy.name || '',
          enemyType: `${enemy.typeIcon || ''}${enemy.typeIcon2 || ''}${enemy.typeName || ''}${enemy.typeName2 ? '/' + enemy.typeName2 : ''}`,
          enemySub: enemySub.name || '',
          enemySubType: `${enemySub.typeIcon || ''}${enemySub.typeIcon2 || ''}${enemySub.typeName || ''}${enemySub.typeName2 ? '/' + enemySub.typeName2 : ''}`,
        },
      ));
    }
  } else {
    let introText = tr(
      t,
      'battle.start.single',
      '【{scene}】A wild {enemy}({enemyType}) Lv.{level} appeared!',
      {
        scene: localizedScene,
        enemy: enemy.name || '',
        enemyType: `${enemy.typeIcon || ''}${enemy.typeIcon2 || ''}${enemy.typeName || ''}${enemy.typeName2 ? '/' + enemy.typeName2 : ''}`,
        level: enemy.lvl ?? 1,
      },
    );
    // Append boss intimidation message
    if (isBoss && sealIdx != null && starter?.moves) {
      const sealedMoveName = starter.moves[sealIdx]?.name || '???';
      introText += '\n' + tr(
        t,
        'battle.boss.intimidate',
        '💀 {name} intimidates! Your "{move}" is sealed! ({turns} turns)',
        {
          name: enemy.name || '',
          move: sealedMoveName,
          turns: sealTurns ?? 0,
        },
      );
    }
    setBText(introText);
  }

  setScreen('battle');
  playBattleIntro();
}
