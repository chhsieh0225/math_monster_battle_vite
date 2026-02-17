type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type StarterLite = {
  name?: string;
} | null;

type AllyLite = {
  name?: string;
} | null;

type EnemyLite = {
  name?: string;
  typeIcon?: string;
  typeIcon2?: string;
  typeName?: string;
  typeName2?: string;
  lvl?: number;
  mType?: string;
  mType2?: string;
  sceneMType?: string;
} | null;

type RunStartBattleFlowArgs = {
  idx: number;
  roster?: unknown[] | null;
  enemies: unknown[];
  locale: string;
  battleMode: string;
  allySub: AllyLite;
  starter: StarterLite;
  t?: Translator;
  sceneNames: Record<string, string>;
  localizeEnemy: (enemy: unknown, locale: string) => EnemyLite;
  localizeSceneName: (sceneType: string, defaultName: string, locale: string) => string;
  dispatchBattle: (action: {
    type: 'start_battle';
    enemy: EnemyLite;
    enemySub: EnemyLite;
    round: number;
  }) => void;
  updateEnc: (enemy: EnemyLite) => void;
  setPhase: (phase: string) => void;
  setBText: (text: string) => void;
  setScreen: (screen: string) => void;
  finishGame: () => void;
  resetFrozen: () => void;
  playBattleIntro: () => void;
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

  dispatchBattle({ type: 'start_battle', enemy, enemySub, round: idx });
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
    setBText(tr(
      t,
      'battle.start.single',
      '【{scene}】A wild {enemy}({enemyType}) Lv.{level} appeared!',
      {
        scene: localizedScene,
        enemy: enemy.name || '',
        enemyType: `${enemy.typeIcon || ''}${enemy.typeIcon2 || ''}${enemy.typeName || ''}${enemy.typeName2 ? '/' + enemy.typeName2 : ''}`,
        level: enemy.lvl ?? 1,
      },
    ));
  }

  setScreen('battle');
  playBattleIntro();
}
