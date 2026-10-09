import { memo, useMemo, useCallback, useState } from 'react';
import { alignOpsToGrade, type Grade } from '../../../data/gradeCurriculum.ts';
import { opDisplayName } from '../../../data/opNames.ts';
import type { CSSProperties } from 'react';
import type { BossTactic, StarterVm } from '../../../types/battle';
import { getBossTacticProfile } from '../../../utils/turnFlow.ts';
import type { BossIntent } from '../../../utils/turnFlow.ts';
import type { InventoryData, ItemId } from '../../../types/game';
import { BATTLE_ITEM_ORDER, ITEM_CATALOG } from '../../../data/itemCatalog.ts';
import { getSkillMastery } from '../../../utils/skillPresentation.ts';
import { getFireTactic, planFireTactic, planElementTactic, planNatureTactic } from '../../../utils/combatTactics.ts';
import type { getShadowWard } from '../../../utils/combatTactics.ts';
import { BALANCE_CONFIG } from '../../../data/balanceConfig.ts';
import type { MoveRuntime } from './buildBattleCore';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;
type BattleCssVars = CSSProperties & Record<`--${string}`, string | number | undefined>;

/** A move outside the child's grade practises an earlier skill; say which. */
function describeMoveForGrade(
  move: { desc: string; ops?: string[] },
  grade: Grade | null,
  battleMode: string,
  t: Translator,
): string {
  if (!grade || battleMode === 'pvp' || !move.ops?.length) return move.desc;
  const aligned = alignOpsToGrade(move.ops, grade);
  if (aligned.length === move.ops.length && aligned.every((op, i) => op === move.ops?.[i])) return move.desc;
  return t('battle.move.gradeAligned', 'Grade {grade}: {skills}', {
    grade,
    skills: aligned.map((op) => opDisplayName(op, t)).join('、'),
  });
}

type BattleMoveMenuProps = {
  t: Translator;
  activeStarter: StarterVm;
  isCoopBattle: boolean;
  coopUsingSub: boolean;
  coopCanSwitch: boolean;
  battleMode: 'single' | 'coop' | 'pvp' | 'double';
  pvpTurn: 'p1' | 'p2';
  pvpActiveCharge: number;
  pvpActiveCombo: number;
  pvpActiveSpecDefReady: boolean;
  pvpComboTrigger: number;
  chargeReadyDisplay: boolean;
  chargeReady: boolean;
  sealedTurns: number;
  moveRuntime: MoveRuntime[];
  inventory: InventoryData;
  bossIntent?: BossIntent | null;
  shadowWard?: ReturnType<typeof getShadowWard>;
  burnStack?: number;
  tideStack?: number;
  staticStack?: number;
  enemyExposed?: boolean;
  shattered?: boolean;
  onSelectMove: (idx: number, bossTactic?: BossTactic) => void;
  onUseItem: (itemId: ItemId) => void;
  onToggleCoopActive: () => void;
  onTogglePause: () => void;
  onOpenSettings: () => void;
  onQuitGame: () => void;
  /** The child's grade; moves whose operations are not taught yet show what they practise instead. */
  playerGrade?: Grade | null;
};

function resolveSpecDefItemName(starterType: string, t: Translator): string {
  if (starterType === 'fire') return t('battle.specDef.fire');
  if (starterType === 'water') return t('battle.specDef.water');
  if (starterType === 'ice') return t('battle.specDef.ice');
  if (starterType === 'electric') return t('battle.specDef.electric');
  if (starterType === 'steel') return t('battle.specDef.steel');
  if (starterType === 'light') return t('battle.specDef.light');
  return t('battle.specDef.grass');
}

export const BattleMoveMenu = memo(function BattleMoveMenu({
  t,
  activeStarter,
  isCoopBattle,
  coopUsingSub,
  coopCanSwitch,
  battleMode,
  pvpTurn,
  pvpActiveCharge,
  pvpActiveCombo,
  pvpActiveSpecDefReady,
  pvpComboTrigger,
  chargeReadyDisplay,
  chargeReady,
  sealedTurns,
  moveRuntime,
  inventory,
  bossIntent,
  shadowWard,
  burnStack = 0,
  tideStack = 0,
  staticStack = 0,
  enemyExposed = false,
  shattered = false,
  onSelectMove,
  onUseItem,
  onToggleCoopActive,
  onTogglePause,
  onOpenSettings,
  onQuitGame,
  playerGrade = null,
}: BattleMoveMenuProps) {
  const [bossTactic, setBossTactic] = useState<BossTactic>('guarded');
  const specDefItemName = resolveSpecDefItemName(activeStarter.type, t);
  const resource = planElementTactic(activeStarter.id, battleMode, 0, tideStack, staticStack);
  const handleMoveSelect = useCallback((idx: number, locked: boolean) => {
    if (locked) return;
    if (bossIntent?.charging) onSelectMove(idx, bossTactic);
    else onSelectMove(idx);
  }, [onSelectMove, bossIntent?.charging, bossTactic]);
  const handleUseItem = useCallback((itemId: ItemId) => {
    onUseItem(itemId);
  }, [onUseItem]);
  const moveVisuals = useMemo(() => moveRuntime.map(({ m, i, sealed, locked, lv, pw, atCap, eff, moveProgressPct }) => {
    const moveBtnStyle: BattleCssVars = {
      '--move-bg': locked
        ? 'rgba(255,255,255,0.03)'
        : eff > 1
          ? `linear-gradient(135deg,${m.bg},rgba(34,197,94,0.08))`
          : eff < 1
            ? `linear-gradient(135deg,${m.bg},rgba(148,163,184,0.08))`
            : m.bg,
      '--move-border': sealed
        ? 'rgba(168,85,247,0.4)'
        : locked
          ? 'rgba(255,255,255,0.08)'
          : eff > 1
            ? '#22c55e66'
            : `${m.color}44`,
      '--move-opacity': locked ? '0.4' : '1',
      '--move-cursor': locked ? 'default' : 'pointer',
      '--move-enter-delay': `${i * 0.05}s`,
      '--move-name-color': locked ? '#94a3b8' : m.color,
      '--move-desc-color': locked ? '#64748b' : '#94a3b8',
      '--move-power-color': lv > 1 ? m.color : 'inherit',
    };
    const moveLevelBadgeStyle: BattleCssVars | undefined = atCap
      ? undefined
      : { '--move-level-bg': m.color };
    const moveProgressStyle: BattleCssVars = {
      '--move-progress-width': `${moveProgressPct}%`,
      '--move-progress-color': m.color,
    };
    return {
      m,
      i,
      sealed,
      locked,
      lv,
      pw,
      atCap,
      eff,
      moveBtnStyle,
      moveLevelBadgeStyle,
      moveProgressStyle,
    };
  }), [moveRuntime]);

  return (
    <div className={`battle-menu-wrap${bossIntent ? ' has-boss-intent' : ''}`}>
      {battleMode !== 'pvp' && (activeStarter.id === 'fire' || resource || enemyExposed || shattered) && <div className="battle-menu-hint battle-tactic-state" data-element={resource?.kind} role="status">
        {activeStarter.id === 'fire' && <span>{t('battle.tactics.burn', undefined, { stacks: burnStack, max: BALANCE_CONFIG.traits.player.burnMaxStacks })}</span>}
        {resource && <span>{t(`battle.tactics.${resource.kind}.resource`, '{stacks}/{max}', { stacks: resource.before, max: resource.max })}</span>}
        {enemyExposed && <strong>{t('battle.tactics.exposed', undefined, { bonus: Math.round((BALANCE_CONFIG.tactics.exposedScale - 1) * 100) })}</strong>}
        {shattered && <span>{t('battle.tactics.frost')}</span>}
      </div>}
      {isCoopBattle && (
        <div className="battle-menu-hint">
          🤝 {t('battle.coopTurn')} {activeStarter.typeIcon} {activeStarter.name}
        </div>
      )}
      {battleMode === 'pvp' && (
        <div className="battle-menu-hint">
          {pvpTurn === 'p1' ? t('battle.pvpTurn.p1') : t('battle.pvpTurn.p2')}
          {' · '}
          {activeStarter.typeIcon} {activeStarter.name}
          {' · '}
          ⚡{pvpActiveCharge}/3
          {' · '}
          {pvpActiveSpecDefReady
            ? `🛡️${t('battle.status.counterReady')}`
            : `🛡️${pvpActiveCombo}/${pvpComboTrigger}`}
        </div>
      )}

      {bossIntent && (
        <section className={`battle-intent ${bossIntent.charging ? 'is-charging' : ''}`} aria-label={t('battle.intent.title')}>
          <div className="battle-intent-head" role="status">
            <span className="battle-intent-label">{t('battle.intent.title')}</span>
            <strong>{t(`battle.intent.${bossIntent.event}`, bossIntent.event)}</strong>
          </div>
          {shadowWard && <div className={`battle-ward ${shadowWard.open ? 'is-open' : ''}`} role="status">
            <strong>{shadowWard.open
              ? t('battle.ward.open', undefined, { bonus: Math.round((shadowWard.damageScale - 1) * 100) })
              : t('battle.ward.guard', undefined, { layers: shadowWard.layers })}</strong>
            <span className="battle-ward-pips" aria-hidden="true">{Array.from({ length: shadowWard.max }, (_, i) => <i key={i} className={i < shadowWard.layers ? 'is-lit' : ''} />)}</span>
            <p>{shadowWard.open ? t('battle.ward.openHelp')
              : t('battle.ward.help')}</p>
          </div>}
          {bossIntent.charging ? (
            <>
              <div className="battle-tactics" role="group" aria-label={t('battle.tactic.choose')}>
                {(['guarded', 'force'] as const).map((tactic) => {
                  const profile = getBossTacticProfile(tactic);
                  return (
                    <button type="button" key={tactic} className="battle-tactic" aria-pressed={bossTactic === tactic} onClick={() => setBossTactic(tactic)}>
                      <strong>{t(`battle.tactic.${tactic}`, tactic)}</strong>
                      <span>{t(`battle.tactic.${tactic}Detail`, '', {
                        power: Math.round(profile.damageScale * 100),
                        counter: Math.round(profile.counterRatio * 100),
                      })}</span>
                    </button>
                  );
                })}
              </div>
              <p className="battle-intent-note">{t('battle.tactic.rule')}</p>
            </>
          ) : (
            <p className="battle-intent-note">{t('battle.intent.conditional')}</p>
          )}
        </section>
      )}

      <div className="battle-menu-grid">
        {moveVisuals.map(({ m, i, sealed, locked, lv, pw, atCap, eff, moveBtnStyle, moveLevelBadgeStyle, moveProgressStyle }) => {
          const mastery = getSkillMastery(lv);
          const fireTactic = getFireTactic(activeStarter.id, battleMode, i);
          const tactic = planFireTactic(fireTactic, burnStack, enemyExposed);
          const element = planElementTactic(activeStarter.id, battleMode, i, tideStack, staticStack);
          const nature = planNatureTactic(activeStarter.id, battleMode, i, lv, enemyExposed, shattered);
          return (
            <button
              className={`battle-menu-btn ${locked ? 'is-locked' : ''}`}
              key={i}
              onClick={() => handleMoveSelect(i, locked)}
              style={moveBtnStyle}
            >
              {sealed && (
                <div className="move-sealed-mask">
                  <span className="move-sealed-text">
                    {t('battle.sealed', undefined, { turns: sealedTurns })}
                  </span>
                </div>
              )}
              <div className="move-badge-stack">
                {battleMode !== 'pvp' && lv > 1 && (
                  <div
                    className={`move-badge move-badge-level ${atCap ? 'cap' : ''}`}
                    style={moveLevelBadgeStyle}
                  >
                    Lv{lv}
                  </div>
                )}
                {eff > 1 && <div className="move-badge move-badge-up">{t('battle.effect.up')}</div>}
                {eff < 1 && <div className="move-badge move-badge-down">{t('battle.effect.down')}</div>}
              </div>
              <div className="move-name-row">
                <span className="move-icon">{m.icon}</span>
                <span className="move-name">{m.name}</span>
              </div>
              <div className="move-desc-row">
                {describeMoveForGrade(m, playerGrade, battleMode, t)} · {t('battle.power')} <b className="move-power">{pw}</b>
                {eff > 1 ? ' ×1.5' : eff < 1 ? ' ×0.6' : ''}
                {m.risky && battleMode === 'pvp' && !chargeReadyDisplay && ` ${t('battle.risky.lockedPvp')}`}
                {m.risky && battleMode === 'pvp' && chargeReadyDisplay && ` ${t('battle.risky.readyPvp')}`}
                {m.risky && !chargeReady && battleMode !== 'pvp' && ` ${t('battle.risky.locked')}`}
                {m.risky && chargeReady && battleMode !== 'pvp' && ` ${t('battle.risky.ready')}`}
                {battleMode !== 'pvp' && !m.risky && !atCap && lv > 1 && ' ↑'}
                {battleMode !== 'pvp' && atCap && ` ${t('battle.max')}`}
              </div>
              {battleMode !== 'pvp' && !m.risky && !atCap && (
                <div className="move-progress-track">
                  <div className="move-progress-fill" style={moveProgressStyle} />
                </div>
              )}
              {fireTactic ? <div className="move-tactic" data-ready={tactic.consumedStacks > 0 || undefined}>
                {t(`battle.tactics.move.${fireTactic}`, fireTactic, {
                  bonus: tactic.bonusDamage, stacks: tactic.consumedStacks,
                  add: fireTactic === 'kindle' ? BALANCE_CONFIG.tactics.fire.kindleStacks : BALANCE_CONFIG.tactics.fire.rushStacks,
                  expose: Math.round((BALANCE_CONFIG.tactics.exposedScale - 1) * 100),
                })}
              </div> : element ? <div className="move-tactic" data-ready={element.spent > 0 || element.dischargeDamage > 0 || undefined}>
                {t(`battle.tactics.${element.kind}.move.${i}`, '', {
                  stacks: element.spent, add: element.added, bonus: element.bonusDamage, max: element.max,
                  power: Math.round(element.powerScale * 100), discharge: element.dischargeDamage,
                  ward: element.wardBreak === 2 ? t('battle.tactics.twoLayers') : '',
                  control: element.guaranteedFreeze ? t('battle.tactics.freezeReady')
                    : t('battle.tactics.freezeAtMax'),
                })}
                {element.dischargeDamage > 0 && <strong> · {t('battle.tactics.dischargeReady', undefined, { damage: element.dischargeDamage })}</strong>}
              </div> : nature ? <div className="move-tactic" data-ready={nature.ready || undefined}>
                {t(`battle.tactics.${nature.kind}.move.${i}${nature.kind === 'grass' && nature.ready ? '.ready' : ''}`, '', {
                  heal: nature.heal, power: Math.round(nature.powerScale * 100),
                  multiplier: BALANCE_CONFIG.tactics.grass.openingHealScale,
                  expose: Math.round((BALANCE_CONFIG.tactics.exposedScale - 1) * 100),
                  shatter: Math.round((nature.shatterScale - 1) * 100),
                })}
              </div> : battleMode !== 'pvp' && <div className="move-mastery" data-mastery={mastery.tier}
                title={mastery.nextLevel
                  ? t('battle.skill.next', undefined, { level: mastery.nextLevel })
                  : t('battle.skill.complete')}>
                <span className="move-mastery-pips" aria-hidden="true">{[1, 2, 3].map((tier) => <i key={tier} className={tier <= mastery.tier ? 'is-lit' : ''} />)}</span>
                <span>{t(`battle.skill.tier.${mastery.tier}`, 'Skill form')}</span>
                <span className="move-mastery-next">{mastery.nextLevel ? `Lv.${mastery.nextLevel}` : 'MAX'}</span>
              </div>}
            </button>
          );
        })}
      </div>

      <div className="battle-item-row" role="group" aria-label={t('a11y.battle.items')}>
        {BATTLE_ITEM_ORDER.map((itemId) => {
          const item = ITEM_CATALOG[itemId];
          const count = inventory[itemId] || 0;
          const disabled = battleMode === 'pvp' || count <= 0;
          const itemDisplayName = itemId === 'shield'
            ? specDefItemName
            : t(item.nameKey, item.nameFallback);
          const itemDisplayIcon = itemId === 'shield' ? '✨' : item.icon;
          return (
            <button
              key={itemId}
              className="battle-item-btn"
              onClick={() => handleUseItem(itemId)}
              disabled={disabled}
              aria-label={t('a11y.battle.useItem', undefined, {
                item: itemDisplayName,
              })}
            >
              <span className="battle-item-btn-icon">{itemDisplayIcon}</span>
              <span className="battle-item-btn-name">{itemDisplayName}</span>
              <span className="battle-item-btn-count">x{count}</span>
            </button>
          );
        })}
        {battleMode === 'pvp' && (
          <span className="battle-item-note">
            {t('battle.item.use.disabledPvpShort')}
          </span>
        )}
      </div>

      <div className="battle-util-row">
        {isCoopBattle && (
          <button className="battle-util-btn" onClick={onToggleCoopActive} disabled={!coopCanSwitch}>
            🔁 {coopUsingSub ? t('battle.coop.mainTurn') : t('battle.coop.subTurn')}
          </button>
        )}
        <button className="battle-util-btn" aria-label={t('a11y.battle.pause')} onClick={onTogglePause}>
          ⏸️ {t('battle.pause')}
        </button>
        <button className="battle-util-btn" aria-label={t('a11y.battle.settings')} onClick={onOpenSettings}>
          ⚙️ {t('battle.settings')}
        </button>
        <button className="battle-util-btn battle-util-btn-danger" aria-label={t('a11y.battle.run')} onClick={onQuitGame}>
          🏳️ {t('battle.run')}
        </button>
      </div>
    </div>
  );
});
