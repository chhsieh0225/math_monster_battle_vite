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
type CampaignNodeMeta = {
  roundIndex: number;
  totalNodes: number;
  branch: 'left' | 'right';
  tier: 'normal' | 'elite' | 'boss';
  eventTag: 'healing_spring' | 'focus_surge' | 'hazard_ambush' | null;
};

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
  getCampaignNodeMeta?: (roundIndex: number) => CampaignNodeMeta | null;
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
  getCampaignNodeMeta,
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
  const campaignMeta = getCampaignNodeMeta ? getCampaignNodeMeta(idx) : null;
  const campaignLines: string[] = [];
  if (campaignMeta) {
    const branchLabel = campaignMeta.branch === 'left'
      ? tr(t, 'battle.route.branch.left', 'Left Path')
      : tr(t, 'battle.route.branch.right', 'Right Path');
    campaignLines.push(tr(
      t,
      'battle.route.node',
      '🧭 Route node {step}/{total} ({branch})',
      {
        step: campaignMeta.roundIndex + 1,
        total: campaignMeta.totalNodes,
        branch: branchLabel,
      },
    ));
    if (campaignMeta.tier === 'elite') {
      campaignLines.push(tr(
        t,
        'battle.route.elite',
        '⚔️ Elite node: enemy stats increased this battle.',
      ));
    }
    if (campaignMeta.eventTag) {
      const fallbackByTag: Record<NonNullable<CampaignNodeMeta['eventTag']>, string> = {
        healing_spring: '💧 Event: Healing Spring (enemy stats reduced this battle).',
        focus_surge: '✨ Event: Focus Surge (enemy slightly weakened this battle).',
        hazard_ambush: '⚠️ Event: Ambush Trap (enemy gains bonus this battle).',
      };
      campaignLines.push(tr(
        t,
        `battle.route.event.${campaignMeta.eventTag}`,
        fallbackByTag[campaignMeta.eventTag],
      ));
    }
  }

  setPhase('text');
  if (enemySub) {
    if (allySub) {
      const intro = tr(
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
      );
      setBText(campaignLines.length > 0 ? `${campaignLines.join('\n')}\n${intro}` : intro);
    } else {
      const intro = tr(
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
      );
      setBText(campaignLines.length > 0 ? `${campaignLines.join('\n')}\n${intro}` : intro);
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
    setBText(campaignLines.length > 0 ? `${campaignLines.join('\n')}\n${introText}` : introText);
  }

  setScreen('battle');
  playBattleIntro();
}
