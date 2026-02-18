import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import { STARTERS } from '../../data/starters.ts';
import { PVP_SELECTABLE_ROSTER } from '../../data/pvpRoster.ts';
import type { SelectionMode, StarterId, StarterSelectable } from '../../types/game';
import { useI18n } from '../../i18n';
import { localizeStarterList } from '../../utils/contentLocalization.ts';
import './SelectionScreen.css';

type StarterDesc = {
  desc: string;
  passive: string;
  specDef: string;
};

type TranslateParams = Record<string, string | number>;
type TranslateFn = (key: string, fallback?: string, params?: TranslateParams) => string;

function buildStarterDescs(t: TranslateFn): Record<string, StarterDesc> {
  return {
    fire: {
      desc: t('selection.fire.desc', 'A fiery partner from volcanic lands. Excels at multiplication with high attack growth.'),
      passive: t('selection.fire.passive', '🔥 Burn: attacks can apply burning damage over time.'),
      specDef: t('selection.fire.specDef', '🛡️ Shield: at 8-combo, blocks an incoming hit completely.'),
    },
    water: {
      desc: t('selection.water.desc', 'A calm partner from the deep sea. Excels at division and precise calculations.'),
      passive: t('selection.water.passive', '❄️ Freeze: attacks may freeze enemies and skip their turn.'),
      specDef: t('selection.water.specDef', '💨 Perfect Dodge: at 8-combo, evades an incoming hit completely.'),
    },
    grass: {
      desc: t('selection.grass.desc', 'A gentle partner from ancient forests. Excels at addition/subtraction with high endurance.'),
      passive: t('selection.grass.passive', '💚 Heal: recover a little HP on each attack.'),
      specDef: t('selection.grass.specDef', '🌿 Reflect: at 8-combo, reflects damage back to enemy.'),
    },
    electric: {
      desc: t('selection.electric.desc', 'A nimble partner from thunderclouds. Excels at mixed operations.'),
      passive: t('selection.electric.passive', '⚡ Static Charge: correct answers build charge; 3 stacks trigger bonus damage.'),
      specDef: t('selection.electric.specDef', '⚡ Paralysis: at 8-combo, paralyzes the enemy.'),
    },
    lion: {
      desc: t('selection.lion.desc', 'A brave partner from golden plains. Excels at unknowns with high-risk high-reward style.'),
      passive: t('selection.lion.passive', '🦁 Courage: lower HP grants higher damage (up to +50%).'),
      specDef: t('selection.lion.specDef', '✨ Roar: at 8-combo, blocks a hit and deals fixed counter damage.'),
    },
    boss: {
      desc: t('selection.boss.desc', 'A final boss from the abyss. Heavy dark-thunder pressure with ruthless finishers.'),
      passive: t('selection.boss.passive', '💀 Tyrant: controls battle pace with overwhelming pressure.'),
      specDef: t('selection.boss.specDef', '🛡️ Boss Guard: high combo enables stronger counter tempo.'),
    },
    boss_hydra: {
      desc: t('selection.bossHydra.desc', 'A venom ruler of the toxic mire. Sustained pressure and combo control specialist.'),
      passive: t('selection.bossHydra.passive', '☠️ Venom Fog: corrosive momentum and relentless follow-up pressure.'),
      specDef: t('selection.bossHydra.specDef', '🛡️ Multi-Head Counter: combo readiness turns defense into offense.'),
    },
    boss_crazy_dragon: {
      desc: t('selection.bossCrazyDragon.desc', 'A one-winged berserk dragon. Explosive dark-flame burst with high risk/high reward style.'),
      passive: t('selection.bossCrazyDragon.passive', '🔥 Frenzy: dangerous offense that scales hard during heated exchanges.'),
      specDef: t('selection.bossCrazyDragon.specDef', '🛡️ Rage Parry: combo threshold unlocks deadly retaliation windows.'),
    },
    boss_sword_god: {
      desc: t('selection.bossSwordGod.desc', 'A celestial sword sovereign. Precision punishment and clean execution specialist.'),
      passive: t('selection.bossSwordGod.passive', '⚔️ Divine Verdict: punishes mistakes with strict tempo control.'),
      specDef: t('selection.bossSwordGod.specDef', '🛡️ Sword Intent: combo readiness empowers decisive counters.'),
    },
  };
}

function clampStageIdx(starter: StarterSelectable | null, idx: number): number {
  const total = starter?.stages?.length || 1;
  const maxIdx = Math.max(0, total - 1);
  const raw = Number.isFinite(idx) ? idx : 0;
  return Math.max(0, Math.min(maxIdx, raw));
}

function createStarterVariant(starter: StarterSelectable | null, stageIdx = 0): StarterSelectable | null {
  if (!starter) return null;
  const idx = clampStageIdx(starter, stageIdx);
  const stage = starter.stages?.[idx] || starter.stages?.[0];
  return {
    ...starter,
    selectedStageIdx: idx,
    name: stage?.name || starter.name,
  };
}

type DualSelectionPayload = {
  p1: StarterSelectable;
  p2: StarterSelectable;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

const STARTER_ID_SET: ReadonlySet<StarterId> = new Set([
  'fire',
  'water',
  'grass',
  'electric',
  'lion',
  'boss',
  'boss_hydra',
  'boss_crazy_dragon',
  'boss_sword_god',
]);

function isStarterId(value: unknown): value is StarterId {
  return typeof value === 'string' && STARTER_ID_SET.has(value as StarterId);
}

function isStarterSelectable(value: unknown): value is StarterSelectable {
  if (!isRecord(value)) return false;
  if (!isStarterId(value.id)) return false;
  if (typeof value.type !== 'string') return false;
  if (typeof value.name !== 'string') return false;
  if (typeof value.c1 !== 'string' || typeof value.c2 !== 'string') return false;
  if (typeof value.typeIcon !== 'string' || typeof value.typeName !== 'string') return false;
  if (!Array.isArray(value.stages) || value.stages.length === 0) return false;
  if (!value.stages.every((stage) => isRecord(stage) && typeof stage.name === 'string' && typeof stage.svgFn === 'function')) return false;
  if (!Array.isArray(value.moves)) return false;
  return value.moves.every((move) => isRecord(move) && typeof move.name === 'string' && typeof move.icon === 'string');
}

function normalizeStarterList(value: unknown): StarterSelectable[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStarterSelectable);
}

type SelectionScreenProps = {
  mode?: SelectionMode;
  onSelect: (payload: StarterSelectable | DualSelectionPayload) => void;
  onBack: () => void;
};

export default function SelectionScreen({ mode = 'single', onSelect, onBack }: SelectionScreenProps) {
  const { t, locale } = useI18n();
  const DESCS = buildStarterDescs(t);
  const starters = useMemo(
    () => normalizeStarterList(localizeStarterList(mode === 'pvp' ? PVP_SELECTABLE_ROSTER : STARTERS, locale)),
    [locale, mode],
  );
  const isDual = mode === 'coop' || mode === 'pvp' || mode === 'double';
  const [picked, setPicked] = useState<StarterSelectable | null>(null);
  const [picked1, setPicked1] = useState<StarterSelectable | null>(null);
  const [picked2, setPicked2] = useState<StarterSelectable | null>(null);
  const [focusSlot, setFocusSlot] = useState<'p1' | 'p2'>('p1');

  const handlePick = (starter: StarterSelectable) => {
    if (!isDual) {
      if (picked?.id === starter.id) {
        setPicked(null);
        return;
      }
      setPicked(createStarterVariant(starter, 0));
      return;
    }

    if (focusSlot === 'p1') {
      if (picked2?.id === starter.id) return;
      if (picked1?.id === starter.id) {
        setPicked1(null);
        setFocusSlot('p1');
        return;
      }
      setPicked1(createStarterVariant(starter, 0));
      if (!picked2) setFocusSlot('p2');
      return;
    }

    if (picked1?.id === starter.id) return;
    if (picked2?.id === starter.id) {
      setPicked2(null);
      return;
    }
    setPicked2(createStarterVariant(starter, 0));
  };

  const focusedPicked = !isDual
    ? picked
    : (focusSlot === 'p1' ? picked1 : picked2);

  const updateFocusedStage = (stageIdx: number) => {
    if (!focusedPicked) return;
    const next = createStarterVariant(focusedPicked, stageIdx);
    if (!isDual) {
      setPicked(next);
      return;
    }
    if (focusSlot === 'p1') setPicked1(next);
    else setPicked2(next);
  };

  const confirmSingle = () => {
    if (!picked) return;
    onSelect(picked);
  };

  const confirmDual = () => {
    if (!picked1 || !picked2) return;
    onSelect({ p1: picked1, p2: picked2 });
  };

  return (
    <div className="selection-screen">
      <div className="selection-header">
        <button
          className="back-touch-btn selection-back-btn"
          onClick={onBack}
          aria-label={t('a11y.common.backToTitle', 'Back to title')}
        >
          ←
        </button>
        <div>
          <div className="selection-title">
            {isDual
              ? (mode === 'pvp'
                ? t('selection.title.pvp', 'Choose both sides!')
                : t('selection.title.dual', 'Choose 2 partners!'))
              : t('selection.title.single', 'Choose your partner!')}
          </div>
          <div className="selection-subtitle">
            {isDual
              ? t('selection.subtitle.dual', 'Each role can only be picked by one player')
              : t('selection.subtitle.single', 'Tap a role to view details')}
          </div>
        </div>
      </div>

      {isDual && (
        <div className="selection-slot-row">
          <button
            className={`touch-btn selection-slot-btn slot-p1 ${focusSlot === 'p1' ? 'is-focus' : ''}`}
            onClick={() => setFocusSlot('p1')}
            aria-label={t('selection.a11y.slotP1', 'Choose player 1 slot')}
          >
            {t('selection.slot.p1', 'Player 1')}：{picked1 ? `${picked1.typeIcon}${picked1.name}` : t('selection.slot.empty', 'None')}
          </button>
          <button
            className={`touch-btn selection-slot-btn slot-p2 ${focusSlot === 'p2' ? 'is-focus' : ''}`}
            onClick={() => setFocusSlot('p2')}
            aria-label={t('selection.a11y.slotP2', 'Choose player 2 slot')}
          >
            {t('selection.slot.p2', 'Player 2')}：{picked2 ? `${picked2.typeIcon}${picked2.name}` : t('selection.slot.empty', 'None')}
          </button>
        </div>
      )}

      {focusedPicked && (
        <div className="selection-stage-wrap">
          <div className="selection-stage-caption">
            {isDual
              ? t('selection.stage.pickFor', '{player} stage', {
                  player: focusSlot === 'p1'
                    ? t('selection.slot.p1', 'Player 1')
                    : t('selection.slot.p2', 'Player 2'),
                })
              : t('selection.stage.pick', 'Choose stage')}
          </div>
          <div className="selection-stage-row">
            {focusedPicked.stages.map((stage, idx) => {
              const active = (focusedPicked.selectedStageIdx || 0) === idx;
              const stageLabel = idx === 0
                ? t('selection.stage.base', 'Base')
                : idx === 1
                  ? t('selection.stage.evolved', 'Evolved')
                  : t('selection.stage.final', 'Final');
              const stageVars = {
                '--stage-c1': focusedPicked.c1,
                '--stage-bg-active': `${focusedPicked.c1}2f`,
              } as CSSProperties;
              return (
                <button
                  className={`touch-btn selection-stage-btn ${active ? 'is-active' : ''}`}
                  key={`${focusedPicked.id}_stage_${idx}`}
                  onClick={() => updateFocusedStage(idx)}
                  aria-label={t('selection.a11y.pickStage', 'Choose stage {name}', { name: stage.name })}
                  style={stageVars}
                >
                  {stageLabel} · {stage.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="selection-card-list">
        {starters.map((starter) => {
          const isP1 = picked1?.id === starter.id;
          const isP2 = picked2?.id === starter.id;
          const selected = isDual ? (isP1 || isP2) : picked?.id === starter.id;
          const selectedStageIdx = !selected
            ? 0
            : isDual
              ? (isP1 ? (picked1?.selectedStageIdx || 0) : (picked2?.selectedStageIdx || 0))
              : (picked?.selectedStageIdx || 0);
          const selectedStage = starter.stages[selectedStageIdx] || starter.stages[0];
          const info = DESCS[starter.id];
          const descText = info?.desc || t('selection.generic.desc', 'A versatile combatant with unique battle rhythm.');
          const passiveText = info?.passive || t('selection.generic.passive', 'Passive effects change battle tempo as the fight unfolds.');
          const specDefText = info?.specDef || t('selection.generic.specDef', 'Build combo to unlock a strong defensive response.');
          const cardVars = {
            '--sel-c1': starter.c1,
            '--sel-c2': starter.c2,
            '--sel-bg-a': `${starter.c1}18`,
            '--sel-bg-b': `${starter.c2}10`,
            '--sel-bg-selected-a': `${starter.c1}44`,
            '--sel-bg-selected-b': `${starter.c2}33`,
            '--sel-border-soft': `${starter.c1}22`,
            '--sel-border-top': `${starter.c1}44`,
          } as CSSProperties;

          return (
            <button
              className={[
                'selection-card-btn',
                selected ? 'is-selected' : '',
                isP1 ? 'is-p1' : '',
                isP2 ? 'is-p2' : '',
              ].join(' ').trim()}
              key={starter.id}
              onClick={() => handlePick(starter)}
              aria-label={t('selection.a11y.pickStarter', 'Choose starter {name}', { name: starter.name })}
              style={cardVars}
            >
              <div className="selection-card-top">
                <div className={`selection-card-sprite ${selected ? 'is-selected' : ''}`}>
                  <MonsterSprite
                    svgStr={selectedStage.svgFn(starter.c1, starter.c2)}
                    size={selected ? 72 : 56}
                    ariaLabel={t('selection.a11y.starterSprite', '{name} sprite', { name: starter.name })}
                  />
                </div>
                <div className="selection-card-main">
                  <div className="selection-card-name">
                    {starter.typeIcon} {selected ? selectedStage.name : starter.name}
                    <span className="selection-card-type-tag">
                      {t('selection.typeTag', '{type} type', { type: starter.typeName })}
                    </span>
                    {isDual && isP1 && <span className="selection-role-tag is-p1">{t('selection.slot.p1', 'Player 1')}</span>}
                    {isDual && isP2 && <span className="selection-role-tag is-p2">{t('selection.slot.p2', 'Player 2')}</span>}
                  </div>
                  <div className="selection-card-moves-brief">
                    {starter.moves.slice(0, 3).map((move, idx) => (
                      <span key={idx}>{move.icon} {move.name}{idx < 2 ? '　' : ''}</span>
                    ))}
                  </div>
                </div>
              </div>

              {selected && (
                <div className="selection-card-expand">
                  <div className="selection-card-desc">{descText}</div>
                  <div className="selection-card-passive-list">
                    <div className="selection-card-passive-item">
                      <span className="selection-card-passive-label">{t('selection.label.passive', 'Passive')}｜</span>{passiveText}
                    </div>
                    <div className="selection-card-passive-item">
                      <span className="selection-card-passive-label">{t('selection.label.combo', 'Combo')}｜</span>{specDefText}
                    </div>
                  </div>
                  <div className="selection-card-move-grid">
                    {starter.moves.map((move, idx) => (
                      <div key={idx} className="selection-move-chip">
                        <div className="selection-move-chip-icon">{move.icon}</div>
                        <div className="selection-move-chip-name">{move.name}</div>
                        <div className="selection-move-chip-desc">{move.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!isDual && picked && (
        <div className="selection-confirm-wrap">
          <button
            className="selection-confirm-btn touch-btn selection-confirm-btn-single"
            onClick={confirmSingle}
            aria-label={t('selection.a11y.confirmSingle', 'Confirm {name}', { name: picked.name })}
            style={{
              '--confirm-c1': picked.c1,
              '--confirm-c2': picked.c2,
              '--confirm-shadow': `${picked.c1}66`,
            } as CSSProperties}
          >
            {t('selection.confirm.single', 'Start with {icon} {name}!', { icon: picked.typeIcon, name: picked.name })}
          </button>
        </div>
      )}

      {isDual && picked1 && picked2 && (
        <div className="selection-confirm-wrap">
          <button
            className={`selection-confirm-btn touch-btn selection-confirm-btn-dual ${mode === 'pvp' ? 'is-pvp' : 'is-coop'}`}
            onClick={confirmDual}
            aria-label={t('selection.a11y.confirmDual', 'Confirm dual selection')}
          >
            {mode === 'pvp'
              ? t('selection.confirm.pvp', '{p1Label} {p1} vs {p2Label} {p2}', {
                  p1Label: t('selection.slot.p1', 'Player 1'),
                  p2Label: t('selection.slot.p2', 'Player 2'),
                  p1: `${picked1.typeIcon}${picked1.name}`,
                  p2: `${picked2.typeIcon}${picked2.name}`,
                })
              : t('selection.confirm.coop', 'Co-op: {p1} + {p2}', {
                  p1: `${picked1.typeIcon}${picked1.name}`,
                  p2: `${picked2.typeIcon}${picked2.name}`,
                })}
          </button>
        </div>
      )}
    </div>
  );
}
