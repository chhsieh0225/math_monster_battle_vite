import { getEnemySkill, enemySkillNameKey, type EnemySkillState } from '../../../data/enemySkills.ts';
import { memo } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { hasSpecialTrait } from '../../../utils/traits';
import HPBar from '../../ui/HPBar';
import XPBar from '../../ui/XPBar';
import type { EnemyVm, StarterVm, UseBattleState } from '../../../types/battle';
import { BALANCE_CONFIG } from '../../../data/balanceConfig.ts';
import { getPersonalityCue, PERSONALITY_TACTICS, type PersonalityContext, type EnemyBehaviorState } from '../../../data/enemyPersonalities.ts';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

const hpFocusClass = (active: boolean): string => `battle-hp-focus ${active ? 'is-active' : 'is-dim'}`;

function PersonalityIntent({ context, enemy, t, canVary, reserve = false }: {
  context: PersonalityContext; enemy: EnemyVm; t: Translator; canVary: boolean; reserve?: boolean;
}) {
  const cue = getPersonalityCue(context);
  if (!cue || !enemy.personality) return null;
  const message = reserve ? 'reserve' : enemy.personality.id === 'crafty' && !canVary ? 'limited' : cue;
  return <div className="battle-personality-intent" data-cue={reserve ? 'reserve' : cue} role="status">
    <strong>{enemy.personality.icon} {enemy.personality.name}</strong>
    <span>{t(`battle.personality.intent.${message}`, '', {
      anger: context.state?.anger ?? 0, max: PERSONALITY_TACTICS.angerHits,
      rage: Math.round((PERSONALITY_TACTICS.rageScale - 1) * 100),
      bonus: Math.round((PERSONALITY_TACTICS.openingScale - 1) * 100),
      hp: Math.round(PERSONALITY_TACTICS.timidHpRatio * 100),
      guard: Math.round((1 - PERSONALITY_TACTICS.guardScale) * 100),
      move: context.state?.watchedMoveName ?? '',
    })}</span>
  </div>;
}

type BattleEnemyInfoPanelProps = {
  panelRef?: RefObject<HTMLDivElement | null>;
  t: Translator;
  style: CSSProperties;
  enemy: EnemyVm;
  enemyHp: number;
  showEnemySub: boolean;
  enemySub: EnemyVm | null;
  enemySubHp: number;
  battleMode: UseBattleState['battleMode'];
  pvpEnemyBarActive: boolean;
  pvpComboTrigger: number;
  pvpEnemyBurn: number;
  pvpEnemyFreeze: boolean;
  pvpEnemyParalyze: boolean;
  pvpEnemyStatic: number;
  pvpEnemyCombo: number;
  pvpEnemySpecDef: boolean;
  burnStack: number;
  frozen: boolean;
  staticStack: number;
  bossPhase: number;
  bossCharging: boolean;
  enemyBehavior?: EnemyBehaviorState;
  enemySkillState?: EnemySkillState;
  canVaryMoves?: boolean;
};

export const BattleEnemyInfoPanel = memo(function BattleEnemyInfoPanel({
  panelRef,
  t,
  style,
  enemy,
  enemyHp,
  showEnemySub,
  enemySub,
  enemySubHp,
  battleMode,
  pvpEnemyBarActive,
  pvpComboTrigger,
  pvpEnemyBurn,
  pvpEnemyFreeze,
  pvpEnemyParalyze,
  pvpEnemyStatic,
  pvpEnemyCombo,
  pvpEnemySpecDef,
  burnStack,
  frozen,
  staticStack,
  bossPhase,
  bossCharging,
  enemyBehavior,
  enemySkillState,
  canVaryMoves = false,
}: BattleEnemyInfoPanelProps) {
  return (
    <div ref={panelRef} className="battle-info-enemy" style={style}>
      <div className={hpFocusClass(pvpEnemyBarActive)}>
        <HPBar
          cur={enemyHp}
          max={enemy.maxHp}
          color={enemy.c1}
          label={`${enemy.typeIcon}${enemy.typeIcon2 || ''}${enemy.name} ${t('battle.level', 'Lv.{level}', { level: enemy.lvl })}`}
        />
      </div>

      <PersonalityIntent context={{ enemy, hp: enemyHp, state: enemyBehavior?.main, battleMode }}
        enemy={enemy} t={t} canVary={canVaryMoves} />

      {showEnemySub && enemySub && (
        <div className={`battle-hp-sub-row ${hpFocusClass(false)}`}>
          <HPBar
            cur={enemySubHp}
            max={enemySub.maxHp}
            color={enemySub.c1}
            label={`${t('battle.subUnit', 'Sub')} ${enemySub.typeIcon}${enemySub.name} ${t('battle.level', 'Lv.{level}', { level: enemySub.lvl })}`}
          />
          {battleMode !== 'pvp' && <div className="battle-enemy-reserve-skill">{t('battle.enemySkill.reserve', 'Assist ready: {move}', {
            move: t(enemySkillNameKey(getEnemySkill(enemySub, enemySkillState?.sub.turn)), getEnemySkill(enemySub, enemySkillState?.sub.turn).name),
          })}</div>}
          <PersonalityIntent context={{ enemy: enemySub, hp: enemySubHp, state: enemyBehavior?.sub, battleMode }}
            enemy={enemySub} t={t} canVary={canVaryMoves} reserve />
        </div>
      )}

      <div className="battle-status-row">
        {battleMode === 'pvp' ? (
          <>
            {pvpEnemyBurn > 0 && <div className="battle-status-chip is-burn">🔥 {t('battle.status.burnStack', 'Burn x{count}', { count: pvpEnemyBurn })}</div>}
            {pvpEnemyFreeze && <div className="battle-status-chip is-freeze">❄️ {t('battle.status.freeze', 'Freeze')}</div>}
            {pvpEnemyParalyze && <div className="battle-status-chip is-paralyze">⚡ {t('battle.status.paralyze', 'Paralyze')}</div>}
            {pvpEnemyStatic > 0 && <div className="battle-status-chip is-static">⚡ {t('battle.status.chargeStack', 'Charge x{count}', { count: pvpEnemyStatic })}</div>}
            {pvpEnemySpecDef && <div className="battle-status-chip is-counter">🛡️ {t('battle.status.counterReady', 'Counter Ready')}</div>}
            {!pvpEnemySpecDef && pvpEnemyCombo > 0 && (
              <div className="battle-status-chip is-counter-soft">
                🛡️ {t('battle.status.comboProgress', 'Combo {count}/{target}', { count: pvpEnemyCombo, target: pvpComboTrigger })}
              </div>
            )}
          </>
        ) : (
          <>
            {enemy.personality?.name && !getPersonalityCue({ enemy, hp: enemyHp, state: enemyBehavior?.main, battleMode }) && (
              <div className="battle-status-chip is-personality" title={enemy.personality.desc}>
                {(enemy.personality.icon || '✨')} {enemy.personality.name}
              </div>
            )}
            {hasSpecialTrait(enemy.traitName, enemy.traitDesc) && (
              <div className="battle-status-chip is-trait">
                ✦ {enemy.traitName}
              </div>
            )}
            {burnStack > 0 && <div className="battle-status-chip is-burn">🔥 {t('battle.status.burnStack', 'Burn x{count}', { count: burnStack })}</div>}
            {frozen && <div className="battle-status-chip is-freeze">❄️ {t('battle.status.freeze', 'Freeze')}</div>}
            {staticStack > 0 && <div className="battle-status-chip is-static">⚡ {t('battle.status.staticStack', 'Static x{count}', { count: staticStack })}{staticStack >= 2 ? ' ⚠️' : ''}</div>}
            {bossPhase >= 2 && (
              <div className="battle-status-chip is-boss">
                {bossPhase >= 3
                  ? t('battle.status.bossAwaken', '💀 Awaken ATKx{multiplier}', { multiplier: BALANCE_CONFIG.traits.boss.phase3AttackMultiplier })
                  : t('battle.status.bossRage', '💀 Rage ATKx{multiplier}', { multiplier: BALANCE_CONFIG.traits.boss.phase2AttackMultiplier })}
              </div>
            )}
            {bossCharging && <div className="battle-status-chip is-charge">⚠️ {t('battle.status.charging', 'Charging!')}</div>}
          </>
        )}
      </div>
    </div>
  );
});

type BattlePlayerInfoPanelProps = {
  panelRef?: RefObject<HTMLDivElement | null>;
  t: Translator;
  style: CSSProperties;
  battleMode: UseBattleState['battleMode'];
  pLvl: number;
  pHp: number;
  pHpSub: number;
  pExp: number;
  expNext: number;
  mainMaxHp: number;
  subMaxHp: number;
  stName: string;
  isCoopBattle: boolean;
  coopUsingSub: boolean;
  showAllySub: boolean;
  allySub: StarterVm | null;
  mainBarActive: boolean;
  subBarActive: boolean;
  pvpComboTrigger: number;
  pvpPlayerBurn: number;
  pvpPlayerFreeze: boolean;
  pvpPlayerParalyze: boolean;
  pvpPlayerStatic: number;
  pvpPlayerCombo: number;
  pvpPlayerSpecDef: boolean;
  cursed: boolean;
  /** True when the current enemy has the venom trait */
  poisoned?: boolean;
};

export const BattlePlayerInfoPanel = memo(function BattlePlayerInfoPanel({
  panelRef,
  t,
  style,
  battleMode,
  pLvl,
  pHp,
  pHpSub,
  pExp,
  expNext,
  mainMaxHp,
  subMaxHp,
  stName,
  isCoopBattle,
  coopUsingSub,
  showAllySub,
  allySub,
  mainBarActive,
  subBarActive,
  pvpComboTrigger,
  pvpPlayerBurn,
  pvpPlayerFreeze,
  pvpPlayerParalyze,
  pvpPlayerStatic,
  pvpPlayerCombo,
  pvpPlayerSpecDef,
  cursed,
  poisoned = false,
}: BattlePlayerInfoPanelProps) {
  return (
    <div ref={panelRef} className="battle-info-player" style={style}>
      <div className={hpFocusClass(mainBarActive)}>
        <HPBar
          cur={pHp}
          max={mainMaxHp}
          color="#6366f1"
          label={`${isCoopBattle && !coopUsingSub ? '▶ ' : ''}${stName} ${t('battle.level', 'Lv.{level}', { level: pLvl })}`}
          poisoned={poisoned}
        />
      </div>

      {showAllySub && allySub && (
        <div className={`battle-hp-sub-row ${hpFocusClass(subBarActive)}`}>
          <HPBar
            cur={pHpSub}
            max={subMaxHp}
            color={allySub.c1}
            label={`${isCoopBattle && coopUsingSub ? '▶ ' : ''}${t('battle.partner', 'Partner')} ${allySub.typeIcon}${allySub.name}`}
            poisoned={poisoned}
          />
        </div>
      )}

      <XPBar exp={pExp} max={expNext} />
      {battleMode === 'pvp' ? (
        <div className="battle-status-row">
          {pvpPlayerBurn > 0 && <div className="battle-status-chip is-burn">🔥 {t('battle.status.burnStack', 'Burn x{count}', { count: pvpPlayerBurn })}</div>}
          {pvpPlayerFreeze && <div className="battle-status-chip is-freeze">❄️ {t('battle.status.freeze', 'Freeze')}</div>}
          {pvpPlayerParalyze && <div className="battle-status-chip is-paralyze">⚡ {t('battle.status.paralyze', 'Paralyze')}</div>}
          {pvpPlayerStatic > 0 && <div className="battle-status-chip is-static">⚡ {t('battle.status.chargeStack', 'Charge x{count}', { count: pvpPlayerStatic })}</div>}
          {pvpPlayerSpecDef && <div className="battle-status-chip is-counter">🛡️ {t('battle.status.counterReady', 'Counter Ready')}</div>}
          {!pvpPlayerSpecDef && pvpPlayerCombo > 0 && (
            <div className="battle-status-chip is-counter-soft">
              🛡️ {t('battle.status.comboProgress', 'Combo {count}/{target}', { count: pvpPlayerCombo, target: pvpComboTrigger })}
            </div>
          )}
        </div>
      ) : (
        <>
          {cursed && <div className="battle-status-chip is-curse battle-status-chip-inline">💀 {t('battle.status.curse', 'Cursed: next attack weakened')}</div>}
        </>
      )}
    </div>
  );
});
