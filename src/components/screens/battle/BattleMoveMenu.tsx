import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { StarterVm } from '../../../types/battle';
import type { InventoryData, ItemId } from '../../../types/game';
import { BATTLE_ITEM_ORDER, ITEM_CATALOG } from '../../../data/itemCatalog.ts';
import type { MoveRuntime } from './buildBattleCore';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;
type BattleCssVars = CSSProperties & Record<`--${string}`, string | number | undefined>;

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
  onSelectMove: (idx: number) => void;
  onUseItem: (itemId: ItemId) => void;
  onToggleCoopActive: () => void;
  onTogglePause: () => void;
  onOpenSettings: () => void;
  onQuitGame: () => void;
};

function resolveSpecDefItemName(starterType: string, t: Translator): string {
  if (starterType === 'fire') return t('battle.specDef.fire', '🛡️ Shield');
  if (starterType === 'water') return t('battle.specDef.water', '💨 Perfect Dodge');
  if (starterType === 'electric') return t('battle.specDef.electric', '⚡ Paralysis');
  if (starterType === 'light') return t('battle.specDef.light', '✨ Lion Roar');
  return t('battle.specDef.grass', '🌿 Reflect');
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
  onSelectMove,
  onUseItem,
  onToggleCoopActive,
  onTogglePause,
  onOpenSettings,
  onQuitGame,
}: BattleMoveMenuProps) {
  const specDefItemName = resolveSpecDefItemName(activeStarter.type, t);
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
    <div className="battle-menu-wrap">
      {isCoopBattle && (
        <div className="battle-menu-hint">
          🤝 {t('battle.coopTurn', 'Co-op · Active:')} {activeStarter.typeIcon} {activeStarter.name}
        </div>
      )}
      {battleMode === 'pvp' && (
        <div className="battle-menu-hint">
          {pvpTurn === 'p1' ? t('battle.pvpTurn.p1', '🔵 Player 1 Turn') : t('battle.pvpTurn.p2', '🔴 Player 2 Turn')}
          {' · '}
          {activeStarter.typeIcon} {activeStarter.name}
          {' · '}
          ⚡{pvpActiveCharge}/3
          {' · '}
          {pvpActiveSpecDefReady
            ? `🛡️${t('battle.status.counterReady', 'Counter Ready')}`
            : `🛡️${pvpActiveCombo}/${pvpComboTrigger}`}
        </div>
      )}

      <div className="battle-menu-grid">
        {moveVisuals.map(({ m, i, sealed, locked, lv, pw, atCap, eff, moveBtnStyle, moveLevelBadgeStyle, moveProgressStyle }) => {
          return (
            <button
              className={`battle-menu-btn ${locked ? 'is-locked' : ''}`}
              key={i}
              onClick={() => !locked && onSelectMove(i)}
              style={moveBtnStyle}
            >
              {sealed && (
                <div className="move-sealed-mask">
                  <span className="move-sealed-text">
                    {t('battle.sealed', '🔮 Sealed ({turns})', { turns: sealedTurns })}
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
                {eff > 1 && <div className="move-badge move-badge-up">{t('battle.effect.up', 'Effect Up')}</div>}
                {eff < 1 && <div className="move-badge move-badge-down">{t('battle.effect.down', 'Effect Down')}</div>}
              </div>
              <div className="move-name-row">
                <span className="move-icon">{m.icon}</span>
                <span className="move-name">{m.name}</span>
              </div>
              <div className="move-desc-row">
                {m.desc} · {t('battle.power', 'Power')} <b className="move-power">{pw}</b>
                {eff > 1 ? ' ×1.5' : eff < 1 ? ' ×0.6' : ''}
                {m.risky && battleMode === 'pvp' && !chargeReadyDisplay && ` ${t('battle.risky.lockedPvp', '🔒Need 3 correct')}`}
                {m.risky && battleMode === 'pvp' && chargeReadyDisplay && ` ${t('battle.risky.readyPvp', '⚡Cast Ready')}`}
                {m.risky && !chargeReady && battleMode !== 'pvp' && ` ${t('battle.risky.locked', '🔒')}`}
                {m.risky && chargeReady && battleMode !== 'pvp' && ` ${t('battle.risky.ready', '⚡Charge Ready!')}`}
                {battleMode !== 'pvp' && !m.risky && !atCap && lv > 1 && ' ↑'}
                {battleMode !== 'pvp' && atCap && ` ${t('battle.max', '✦MAX')}`}
              </div>
              {battleMode !== 'pvp' && !m.risky && !atCap && (
                <div className="move-progress-track">
                  <div className="move-progress-fill" style={moveProgressStyle} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="battle-item-row" role="group" aria-label={t('a11y.battle.items', 'Battle items')}>
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
              onClick={() => onUseItem(itemId)}
              disabled={disabled}
              aria-label={t('a11y.battle.useItem', 'Use {item}', {
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
            {t('battle.item.use.disabledPvpShort', 'Items disabled in PvP')}
          </span>
        )}
      </div>

      <div className="battle-util-row">
        {isCoopBattle && (
          <button className="battle-util-btn" onClick={onToggleCoopActive} disabled={!coopCanSwitch}>
            🔁 {coopUsingSub ? t('battle.coop.mainTurn', 'Main Turn') : t('battle.coop.subTurn', 'Sub Turn')}
          </button>
        )}
        <button className="battle-util-btn" aria-label={t('a11y.battle.pause', 'Pause game')} onClick={onTogglePause}>
          ⏸️ {t('battle.pause', 'Pause')}
        </button>
        <button className="battle-util-btn" aria-label={t('a11y.battle.settings', 'Open battle settings')} onClick={onOpenSettings}>
          ⚙️ {t('battle.settings', 'Settings')}
        </button>
        <button className="battle-util-btn battle-util-btn-danger" aria-label={t('a11y.battle.run', 'Run from battle')} onClick={onQuitGame}>
          🏳️ {t('battle.run', 'Run')}
        </button>
      </div>
    </div>
  );
});
