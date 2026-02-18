import { memo } from 'react';
import type { CSSProperties } from 'react';
import { hasSpecialTrait } from '../../../utils/traits';
import HPBar from '../../ui/HPBar';
import XPBar from '../../ui/XPBar';
import type { EnemyVm, StarterVm, UseBattleState } from '../../../types/battle';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

const hpFocusClass = (active: boolean): string => `battle-hp-focus ${active ? 'is-active' : 'is-dim'}`;

type BattleEnemyInfoPanelProps = {
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
};

export const BattleEnemyInfoPanel = memo(function BattleEnemyInfoPanel({
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
}: BattleEnemyInfoPanelProps) {
  return (
    <div className="battle-info-enemy" style={style}>
      <div className={hpFocusClass(pvpEnemyBarActive)}>
        <HPBar
          cur={enemyHp}
          max={enemy.maxHp}
          color={enemy.c1}
          label={`${enemy.typeIcon}${enemy.typeIcon2 || ''}${enemy.name} ${t('battle.level', 'Lv.{level}', { level: enemy.lvl })}`}
        />
      </div>

      {showEnemySub && enemySub && (
        <div className={`battle-hp-sub-row ${hpFocusClass(false)}`}>
          <HPBar
            cur={enemySubHp}
            max={enemySub.maxHp}
            color={enemySub.c1}
            label={`${t('battle.subUnit', 'Sub')} ${enemySub.typeIcon}${enemySub.name} ${t('battle.level', 'Lv.{level}', { level: enemySub.lvl })}`}
          />
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
            {hasSpecialTrait(enemy.traitName, enemy.traitDesc) && <div className="battle-status-chip is-counter-soft">✦{enemy.traitName}</div>}
            {burnStack > 0 && <div className="battle-status-chip is-burn">🔥 {t('battle.status.burnStack', 'Burn x{count}', { count: burnStack })}</div>}
            {frozen && <div className="battle-status-chip is-freeze">❄️ {t('battle.status.freeze', 'Freeze')}</div>}
            {staticStack > 0 && <div className="battle-status-chip is-static">⚡ {t('battle.status.staticStack', 'Static x{count}', { count: staticStack })}{staticStack >= 2 ? ' ⚠️' : ''}</div>}
            {bossPhase >= 2 && (
              <div className="battle-status-chip is-boss">
                {bossPhase >= 3 ? t('battle.status.bossAwaken', '💀 Awaken ATKx2') : t('battle.status.bossRage', '💀 Rage ATKx1.5')}
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
    <div className="battle-info-player" style={style}>
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
