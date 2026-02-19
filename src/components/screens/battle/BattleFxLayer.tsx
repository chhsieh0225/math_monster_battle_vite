import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { SpriteTarget } from '../../../hooks/useSpriteTargets';
import { ACH_MAP } from '../../../data/achievements';
import type { StarterVm, UseBattleState } from '../../../types/battle';
import DamagePopup from '../../ui/DamagePopup';
import Particle from '../../ui/Particle';
import AttackEffect from '../../effects/AttackEffect';
import AchievementPopup from '../../ui/AchievementPopup';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;
type BattleCssVars = CSSProperties & Record<`--${string}`, string | number | undefined>;

type BattleFxLayerProps = {
  t: Translator;
  showHeavyFx: boolean;
  lowPerfMode: boolean;
  impactPhase: string;
  sceneType: string;
  atkEffect: UseBattleState['atkEffect'];
  effectTarget: SpriteTarget;
  dmgs: UseBattleState['dmgs'];
  parts: UseBattleState['parts'];
  battleMode: UseBattleState['battleMode'];
  moveLevelUpIdx: number | null;
  starter: StarterVm;
  moveLvls: number[];
  getPow: (idx: number) => number;
  achPopup: UseBattleState['achPopup'];
  phase: UseBattleState['phase'];
  enemyDrops?: string[];
  defAnim: UseBattleState['defAnim'];
  effMsg: UseBattleState['effMsg'];
  onRemoveDamage: (id: number) => void;
  onRemoveParticle: (id: number) => void;
  onDismissAchievement: () => void;
};

/** Scenes whose backgrounds are bright enough to wash out warm-coloured FX. */
const BRIGHT_SCENES = new Set(['grass', 'fire', 'rock', 'light', 'heaven', 'burnt_warplace']);

function resolveUltimateTone(type?: string): string {
  if (type === 'fire') return 'is-fire';
  if (type === 'water') return 'is-water';
  if (type === 'electric') return 'is-electric';
  if (type === 'grass') return 'is-grass';
  if (type === 'light') return 'is-light';
  return 'is-dark';
}

export const BattleFxLayer = memo(function BattleFxLayer({
  t,
  showHeavyFx,
  lowPerfMode,
  impactPhase,
  sceneType,
  atkEffect,
  effectTarget,
  dmgs,
  parts,
  battleMode,
  moveLevelUpIdx,
  starter,
  moveLvls,
  getPow,
  achPopup,
  phase,
  enemyDrops,
  defAnim,
  effMsg,
  onRemoveDamage,
  onRemoveParticle,
  onDismissAchievement,
}: BattleFxLayerProps) {
  const isUltimateEffect = Boolean(atkEffect && atkEffect.idx >= 3);
  const ultimateToneClass = resolveUltimateTone(atkEffect?.type);
  const ultimateSyncStyle: BattleCssVars = {
    '--ult-sync-top': effectTarget.top,
    '--ult-sync-right': effectTarget.right,
  };
  const toastShadowStyle: BattleCssVars | undefined = effMsg
    ? { '--battle-eff-shadow': `0 8px 22px ${effMsg.color}55` }
    : undefined;

  return (
    <>
      {/* Hit reaction layer */}
      {showHeavyFx && impactPhase !== 'idle' && (
        <div className={`battle-hit-react-layer is-${impactPhase} ${isUltimateEffect ? 'is-ult' : ''}`} aria-hidden="true" />
      )}

      {/* Popups & particles */}
      {dmgs.map((d) => (
        <DamagePopup
          key={d.id}
          id={d.id}
          value={d.value}
          x={d.x}
          y={d.y}
          color={d.color}
          onDone={onRemoveDamage}
        />
      ))}
      {showHeavyFx && parts.map((p) => (
        <Particle
          key={p.id}
          id={p.id}
          emoji={p.emoji}
          x={p.x}
          y={p.y}
          seed={p.id}
          onDone={onRemoveParticle}
        />
      ))}

      {/* Move level-up toast */}
      {battleMode !== 'pvp' && moveLevelUpIdx !== null && (
        <div className="battle-level-toast">
          {starter.moves[moveLevelUpIdx].icon} {starter.moves[moveLevelUpIdx].name}{' '}
          {t('battle.moveLevelUp', 'leveled up to Lv.{level}! Power -> {power}', {
            level: moveLvls[moveLevelUpIdx],
            power: getPow(moveLevelUpIdx),
          })}
        </div>
      )}

      {/* Achievement popup */}
      {achPopup && ACH_MAP[achPopup] && (
        <AchievementPopup achievement={ACH_MAP[achPopup]} onDone={onDismissAchievement} />
      )}

      {/* Attack effects */}
      {showHeavyFx && (isUltimateEffect || atkEffect) && (
        <div className={`battle-attack-fx-layer${BRIGHT_SCENES.has(sceneType) ? ' fx-bright-scene' : ''}`} aria-hidden="true">
          {isUltimateEffect && (
            <div className={`battle-ult-sync ${ultimateToneClass}`} style={ultimateSyncStyle}>
              <div className="battle-ult-sync-flash" />
              <div className="battle-ult-sync-core" />
              <div className="battle-ult-sync-ring" />
              <div className="battle-ult-sync-ring battle-ult-sync-ring-alt" />
            </div>
          )}
          {atkEffect && (
            <AttackEffect type={atkEffect.type} idx={atkEffect.idx} lvl={atkEffect.lvl} target={effectTarget} />
          )}
        </div>
      )}

      {/* Victory drop toast */}
      {phase === 'victory' && !lowPerfMode && Array.isArray(enemyDrops) && enemyDrops.length > 0 && (
        <div className="battle-drop-toast" aria-hidden="true">
          {enemyDrops[0]}
        </div>
      )}

      {/* Special Defense animations */}
      {showHeavyFx && defAnim === 'fire' && (
        <div className="battle-def-fx battle-def-fx-fire">
          <div className="battle-def-layer battle-def-layer-fire-core" />
          <div className="battle-def-layer battle-def-layer-fire-ring" />
          <div className="battle-def-icon battle-def-icon-fire">🛡️</div>
        </div>
      )}
      {showHeavyFx && defAnim === 'water' && (
        <div className="battle-def-fx battle-def-fx-water">
          <div className="battle-def-layer battle-def-layer-water-ripple-1" />
          <div className="battle-def-layer battle-def-layer-water-ripple-2" />
          <div className="battle-def-layer battle-def-layer-water-ripple-3" />
          <div className="battle-def-icon battle-def-icon-water">💨</div>
        </div>
      )}
      {showHeavyFx && defAnim === 'grass' && (
        <div className="battle-def-fx battle-def-fx-grass">
          <div className="battle-def-layer battle-def-layer-grass-core" />
          <div className="battle-def-layer battle-def-layer-grass-ring" />
          <div className="battle-def-icon battle-def-icon-grass">🌿</div>
        </div>
      )}
      {showHeavyFx && defAnim === 'electric' && (
        <div className="battle-def-fx battle-def-fx-electric">
          <div className="battle-def-layer battle-def-layer-electric-core" />
          <div className="battle-def-layer battle-def-layer-electric-ring" />
          <div className="battle-def-icon battle-def-icon-electric">⚡</div>
        </div>
      )}
      {showHeavyFx && defAnim === 'light' && (
        <div className="battle-def-fx battle-def-fx-light">
          <div className="battle-def-layer battle-def-layer-light-core" />
          <div className="battle-def-layer battle-def-layer-light-ring" />
          <div className="battle-def-layer battle-def-layer-light-ring-outer" />
          <div className="battle-def-icon battle-def-icon-light">✨</div>
        </div>
      )}
      {showHeavyFx && defAnim && <div className={`battle-def-screen battle-def-screen-${defAnim}`} />}

      {/* Type effectiveness popup */}
      {effMsg && (
        <div
          className={`battle-eff-toast ${effMsg.color === '#22c55e' ? 'battle-eff-toast-good' : 'battle-eff-toast-bad'}`}
          style={toastShadowStyle}
        >
          {effMsg.text}
        </div>
      )}
    </>
  );
});
