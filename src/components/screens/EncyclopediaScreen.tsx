import { useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import { ENC_ENTRIES, ENC_TOTAL, STARTER_ENTRIES } from '../../data/encyclopedia.ts';
import { BOSS_IDS } from '../../data/monsterConfigs.ts';
import { useI18n } from '../../i18n';
import { hasSpecialTrait } from '../../utils/traits';
import { loadCollection, type CollectionData } from '../../utils/collectionStore.ts';
import './EncyclopediaScreen.css';
import {
  localizeEncyclopediaEnemyEntries,
  localizeEncyclopediaStarterEntries,
} from '../../utils/contentLocalization.ts';
import type {
  EncyclopediaCounts,
  EncyclopediaData,
  EncyclopediaEnemyEntry,
  EncyclopediaStarterEntry,
} from '../../types/game';

const PAGE_BG = 'linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)';
type EncyclopediaCssVars = CSSProperties & Record<`--${string}`, string | number | undefined>;

const LARGE_MONSTER_IDS: ReadonlySet<string> = new Set([...BOSS_IDS, 'golumn', 'golumn_mud', 'ghost_lantern']);
function encCardSpriteSize(key: string): number { return LARGE_MONSTER_IDS.has(key) ? 64 : 48; }
function encModalSpriteSize(key: string): number { return LARGE_MONSTER_IDS.has(key) ? 200 : 160; }

const DROP_CATALOG: { emoji: string; name: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' }[] = [
  { emoji: '🍬', name: 'Candy', rarity: 'common' },
  { emoji: '🧪', name: 'Potion', rarity: 'common' },
  { emoji: '🔥', name: 'Flame Shard', rarity: 'rare' },
  { emoji: '💧', name: 'Water Drop', rarity: 'rare' },
  { emoji: '⚡', name: 'Thunder Gem', rarity: 'rare' },
  { emoji: '💀', name: 'Dark Fragment', rarity: 'rare' },
  { emoji: '🛡️', name: 'Steel Plate', rarity: 'rare' },
  { emoji: '👻', name: 'Ghost Wisp', rarity: 'epic' },
  { emoji: '💎', name: 'Diamond', rarity: 'epic' },
  { emoji: '⭐', name: 'Star Crystal', rarity: 'epic' },
  { emoji: '🐉', name: 'Dragon Scale', rarity: 'legendary' },
  { emoji: '👑', name: 'Crown', rarity: 'legendary' },
  { emoji: '🏆', name: 'Trophy', rarity: 'legendary' },
  { emoji: '🏁', name: 'PvP Flag', rarity: 'epic' },
];

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
};

const TYPE_COLORS: Record<string, string> = {
  grass: '#22c55e',
  fire: '#ef4444',
  water: '#3b82f6',
  electric: '#eab308',
  ghost: '#a855f7',
  steel: '#94a3b8',
  dark: '#6b7280',
};

type SelectedEntry =
  | { kind: 'enemy'; entry: EncyclopediaEnemyEntry }
  | { kind: 'starter'; entry: EncyclopediaStarterEntry };

type EncyclopediaScreenProps = {
  encData?: EncyclopediaData;
  onBack: () => void;
};

function handleKeyboardActivate(ev: KeyboardEvent<HTMLElement>, action: () => void) {
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    action();
  }
}

function isEnemyEntry(value: unknown): value is EncyclopediaEnemyEntry {
  if (typeof value !== 'object' || value === null) return false;
  return 'key' in value && 'svgFn' in value;
}

function isStarterEntry(value: unknown): value is EncyclopediaStarterEntry {
  if (typeof value !== 'object' || value === null) return false;
  return 'key' in value && 'svgFn' in value;
}

function normalizeEnemyEntries(value: unknown): EncyclopediaEnemyEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isEnemyEntry);
}

function normalizeStarterEntries(value: unknown): EncyclopediaStarterEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStarterEntry);
}

type TabId = 'monsters' | 'starters' | 'drops';

const RARITY_DESC: Record<string, string> = {
  common: 'Common drop from any battle',
  rare: 'Uncommon drop from specific types',
  epic: 'Rare drop from tough foes',
  legendary: 'Extremely rare treasure',
};

export default function EncyclopediaScreen({ encData = {}, onBack }: EncyclopediaScreenProps) {
  const { t, locale } = useI18n();
  const enemyEntries = useMemo(
    () => normalizeEnemyEntries(localizeEncyclopediaEnemyEntries(ENC_ENTRIES, locale)),
    [locale],
  );
  const starterEntries = useMemo(
    () => normalizeStarterEntries(localizeEncyclopediaStarterEntries(STARTER_ENTRIES, locale)),
    [locale],
  );
  const enc: EncyclopediaCounts = encData.encountered || {};
  const def: EncyclopediaCounts = encData.defeated || {};
  const collection: CollectionData = useMemo(() => loadCollection(), []);
  const encCount = Object.keys(enc).length;
  const pct = ENC_TOTAL > 0 ? Math.round((encCount / ENC_TOTAL) * 100) : 0;

  const [selected, setSelected] = useState<SelectedEntry | null>(null);
  const [tab, setTab] = useState<TabId>('monsters');

  const tabs: { id: TabId; icon: string; label: string }[] = [
    { id: 'monsters', icon: '🐾', label: t('encyclopedia.tab.monsters', 'Monsters') },
    { id: 'starters', icon: '⚔️', label: t('encyclopedia.tab.starters', 'Partners') },
    { id: 'drops', icon: '🎒', label: t('encyclopedia.tab.drops', 'Drops') },
  ];

  return (
    <div className="enc-root" style={{ background: PAGE_BG }}>
      {/* Header */}
      <div className="enc-header">
        <div className="enc-title-row">
          <button className="back-touch-btn enc-back-btn" onClick={onBack} aria-label={t('a11y.common.backToTitle', 'Back to title')}>←</button>
          <div className="enc-title">📚 {t('encyclopedia.title', 'Encyclopedia')}</div>
          <div className="enc-spacer" />
          <div className="enc-count">{encCount}/{ENC_TOTAL}</div>
        </div>
        <div className="enc-progress-track">
          <div className="enc-progress-fill" style={{ width: `${pct}%` }} />
        </div>

        {/* Tab bar */}
        <div className="enc-tabbar">
          {tabs.map((tb) => {
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                className={`touch-btn enc-tab-btn ${active ? 'is-active' : ''}`}
                onClick={() => setTab(tb.id)}
                aria-pressed={active}
              >
                {tb.icon} {tb.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="enc-content">
        {tab === 'monsters' && (
          <>
            <div className="enc-subtitle">
              {t('encyclopedia.section.enemiesSub', '{count}/{total} discovered', { count: encCount, total: ENC_TOTAL })}
            </div>
            <div className="enc-grid-three">
              {enemyEntries.map((e) => {
                const seen = Boolean(enc[e.key]);
                const killed = Boolean(def[e.key]);
                return (
                  <div
                    key={e.key}
                    role={seen ? 'button' : undefined}
                    tabIndex={seen ? 0 : -1}
                    aria-label={seen
                      ? t('encyclopedia.a11y.viewEnemy', 'View encyclopedia: {name}', { name: e.name })
                      : t('encyclopedia.a11y.lockedEnemy', 'Locked monster')}
                    onKeyDown={(ev: KeyboardEvent<HTMLDivElement>) => {
                      if (!seen) return;
                      handleKeyboardActivate(ev, () => setSelected({ entry: e, kind: 'enemy' }));
                    }}
                    onClick={() => seen && setSelected({ entry: e, kind: 'enemy' })}
                    className={`enc-card ${seen ? 'is-seen' : 'is-hidden'} ${killed ? 'is-killed' : ''}`}
                  >
                    <div className={`enc-card-sprite-wrap ${seen ? '' : 'is-hidden'} ${LARGE_MONSTER_IDS.has(e.key) ? 'is-large' : ''}`}>
                      <MonsterSprite svgStr={e.svgFn(e.c1, e.c2)} size={encCardSpriteSize(e.key)} ariaLabel={seen
                        ? t('encyclopedia.a11y.enemySprite', '{name} sprite', { name: e.name })
                        : t('encyclopedia.a11y.unknownEnemySprite', 'Unknown monster sprite')} />
                    </div>
                    <div className="enc-card-name">{seen ? e.name : t('encyclopedia.unknownName', '???')}</div>
                    <div className="enc-card-meta">
                      {seen ? `${e.typeIcon}${e.typeIcon2 ? e.typeIcon2 : ''} ${e.typeName}${e.typeName2 ? ' / ' + e.typeName2 : ''}` : t('encyclopedia.unknownType', '??')}
                      {e.isEvolved && seen && <span className="enc-tag-evolved">{t('encyclopedia.tag.evolved', 'Evolved')}</span>}
                    </div>
                    {seen && <div className="enc-card-count-line">
                      {t('encyclopedia.countLine', 'Encounter {enc} / Defeat {def}', { enc: enc[e.key] || 0, def: def[e.key] || 0 })}
                    </div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'starters' && (
          <>
            <div className="enc-subtitle">
              {t('encyclopedia.section.startersSub', '{count} forms', { count: starterEntries.length })}
            </div>
            <div className="enc-grid-three">
              {starterEntries.map((e) => (
                <div
                  key={e.key}
                  role="button"
                  tabIndex={0}
                  aria-label={t('encyclopedia.a11y.viewStarter', 'View partner encyclopedia: {name}', { name: e.name })}
                  onKeyDown={(ev: KeyboardEvent<HTMLDivElement>) => handleKeyboardActivate(ev, () => setSelected({ entry: e, kind: 'starter' }))}
                  onClick={() => setSelected({ entry: e, kind: 'starter' })}
                  className="enc-card is-seen"
                  style={{ borderColor: `${TYPE_COLORS[e.mType] || '#6366f1'}22` }}
                >
                  <div className="enc-card-sprite-wrap">
                    <MonsterSprite svgStr={e.svgFn(e.c1, e.c2)} size={48} ariaLabel={t('encyclopedia.a11y.starterSprite', '{name} sprite', { name: e.name })} />
                  </div>
                  <div className="enc-card-name">{e.name}</div>
                  <div className="enc-card-meta">{e.typeIcon} {e.typeName}</div>
                  <div className="enc-card-stage">{e.stageLabel}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'drops' && (
          <>
            <div className="enc-subtitle">
              {t('encyclopedia.section.collectionSub', '{count}/{total} items', {
                count: Object.keys(collection).length,
                total: DROP_CATALOG.length,
              })}
            </div>
            <div className="enc-grid-drops">
              {DROP_CATALOG.map(({ emoji, name, rarity }) => {
                const count = collection[emoji] || 0;
                const owned = count > 0;
                const rc = RARITY_COLORS[rarity];
                const dropStyle: EncyclopediaCssVars = {
                  '--enc-rarity': rc,
                  '--enc-rarity-bg': `${rc}12`,
                  '--enc-rarity-border': `${rc}44`,
                };
                return (
                  <div key={emoji} className={`enc-drop-card ${owned ? 'is-owned' : 'is-locked'}`} style={dropStyle}>
                    <div className={`enc-drop-emoji ${owned ? '' : 'is-locked'}`}>{emoji}</div>
                    <div className={`enc-drop-name ${owned ? '' : 'is-locked'}`}>{name}</div>
                    <div className={`enc-drop-count ${owned ? '' : 'is-locked'}`}>
                      {owned ? `×${count}` : '???'}
                    </div>
                    <div className="enc-drop-rarity">{rarity}</div>
                    <div className="enc-drop-desc">{RARITY_DESC[rarity] || ''}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selected?.kind === 'enemy' && <DetailModal entry={selected.entry} enc={enc} def={def} onClose={() => setSelected(null)} />}
      {selected?.kind === 'starter' && <StarterDetailModal entry={selected.entry} onClose={() => setSelected(null)} />}
    </div>
  );
}

type DetailModalProps = {
  entry: EncyclopediaEnemyEntry;
  enc: EncyclopediaCounts;
  def: EncyclopediaCounts;
  onClose: () => void;
};

function DetailModal({ entry, enc, def, onClose }: DetailModalProps) {
  const { t } = useI18n();
  const tc = TYPE_COLORS[entry.mType] || '#6366f1';
  const encounterCount = enc[entry.key] || 0;
  const defeatCount = def[entry.key] || 0;
  const defeatRate = encounterCount > 0 ? Math.round((defeatCount / encounterCount) * 100) : 0;
  const modalToneStyle: EncyclopediaCssVars = {
    '--enc-type-color': tc,
    '--enc-type-light': `${tc}55`,
    '--enc-type-border': `${tc}33`,
    '--enc-type-shadow': `${tc}22`,
    '--enc-type-shadow-wide': `${tc}11`,
    '--enc-type-soft-bg': `${tc}25`,
    '--enc-type-soft-border': `${tc}44`,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('encyclopedia.a11y.closeEnemyDetail', 'Close monster details')}
      onKeyDown={(ev: KeyboardEvent<HTMLDivElement>) => handleKeyboardActivate(ev, onClose)}
      onClick={onClose}
      className="enc-modal-overlay"
    >
      <div
        onClick={(ev: MouseEvent<HTMLDivElement>) => ev.stopPropagation()}
        className="enc-modal-card"
        style={modalToneStyle}
      >
        <div
          className="enc-modal-hero"
          style={{ background: `radial-gradient(ellipse at 50% 80%, ${tc}18, transparent 70%)` }}
        >
          <button
            className="touch-btn enc-modal-close"
            onClick={onClose}
            aria-label={t('common.cancel', 'Close')}
          >
            ✕
          </button>

          <div className="enc-modal-rarity">{entry.rarity}</div>

          <div className="enc-modal-sprite-wrap">
            <MonsterSprite svgStr={entry.svgFn(entry.c1, entry.c2)} size={encModalSpriteSize(entry.key)} ariaLabel={t('encyclopedia.a11y.enemySprite', '{name} sprite', { name: entry.name })} />
          </div>

          <div className="enc-modal-name-wrap">
            <div className="enc-modal-name" style={{ textShadow: `0 0 20px ${tc}55` }}>{entry.name}</div>
            <div className="enc-modal-tag-row">
              <span className="enc-modal-pill enc-modal-pill-type">
                {entry.typeIcon}{entry.typeIcon2 || ''} {t('encyclopedia.typeTag', '{type} type', { type: entry.typeName + (entry.typeName2 ? ' / ' + entry.typeName2 : '') })}
              </span>
              {entry.isEvolved && (
                <span className="enc-modal-pill enc-modal-pill-evolved">
                  ✨ {t('encyclopedia.tag.evolved', 'Evolved')}
                </span>
              )}
              {hasSpecialTrait(entry.traitName, entry.traitDesc) && (
                <span className="enc-modal-pill enc-modal-pill-trait">
                  ✦ {entry.traitName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="enc-modal-body">
          <div className="enc-stat-row">
            <StatBox icon="❤️" label={t('encyclopedia.stat.hp', 'HP')} value={entry.hp} color="#ef4444" />
            <StatBox icon="⚔️" label={t('encyclopedia.stat.atk', 'ATK')} value={entry.atk} color="#f59e0b" />
            <StatBox icon="📍" label={t('encyclopedia.stat.habitat', 'Habitat')} color="#6366f1" sub={entry.habitat} />
          </div>

          {entry.desc && (
            <div className="enc-info-panel">
              <div className="enc-info-title">📖 {t('encyclopedia.section.desc', 'Description')}</div>
              <div className="enc-info-body">{entry.desc}</div>
            </div>
          )}

          {hasSpecialTrait(entry.traitName, entry.traitDesc) && (
            <div className="enc-trait-panel">
              <div className="enc-trait-title">
                ✦ {t('encyclopedia.section.trait', 'Trait')}: {entry.traitName}
              </div>
              <div className="enc-info-body">{entry.traitDesc}</div>
            </div>
          )}

          <div className="enc-dual-grid">
            {entry.weakAgainst.length > 0 && (
              <div className="enc-weak-panel">
                <div className="enc-weak-title">⚠️ {t('encyclopedia.section.weakness', 'Weakness')}</div>
                <div className="enc-type-list">{entry.weakAgainst.map((typeName) => t('encyclopedia.typeTag', '{type} type', { type: typeName })).join('、')}</div>
              </div>
            )}
            {entry.resistAgainst.length > 0 && (
              <div className="enc-resist-panel">
                <div className="enc-resist-title">🛡️ {t('encyclopedia.section.resistance', 'Resistance')}</div>
                <div className="enc-type-list">{entry.resistAgainst.map((typeName) => t('encyclopedia.typeTag', '{type} type', { type: typeName })).join('、')}</div>
              </div>
            )}
          </div>

          {entry.drops && entry.drops.length > 0 && (
            <div className="enc-drop-panel">
              <div className="enc-drop-panel-title">🎁 {t('encyclopedia.section.drops', 'Drops')}</div>
              <div className="enc-drop-icon-row">
                {entry.drops.map((drop, index) => <span key={`${entry.key}_drop_${index}`} className="enc-drop-icon">{drop}</span>)}
              </div>
            </div>
          )}

          <div className="enc-counter-panel">
            <div className="enc-counter-item">
              <div className="enc-counter-value is-encounter">{encounterCount}</div>
              <div className="enc-counter-label">{t('encyclopedia.stat.encounters', 'Encounters')}</div>
            </div>
            <div className="enc-counter-sep" />
            <div className="enc-counter-item">
              <div className="enc-counter-value is-defeat">{defeatCount}</div>
              <div className="enc-counter-label">{t('encyclopedia.stat.defeats', 'Defeats')}</div>
            </div>
            <div className="enc-counter-sep" />
            <div className="enc-counter-item">
              <div className="enc-counter-value is-rate">{defeatRate}%</div>
              <div className="enc-counter-label">{t('encyclopedia.stat.defeatRate', 'Defeat Rate')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type StatBoxProps = {
  icon: string;
  label: string;
  color: string;
  value?: number | string;
  sub?: string;
};

function StatBox({ icon, label, value, color, sub }: StatBoxProps) {
  return (
    <div className="enc-stat-box">
      <div className="enc-stat-icon">{icon}</div>
      {value !== undefined && value !== '' && <div className="enc-stat-value" style={{ color }}>{value}</div>}
      {sub && <div className="enc-stat-sub" style={{ color }}>{sub}</div>}
      <div className="enc-stat-label">{label}</div>
    </div>
  );
}

type StarterDetailModalProps = {
  entry: EncyclopediaStarterEntry;
  onClose: () => void;
};

function StarterDetailModal({ entry, onClose }: StarterDetailModalProps) {
  const { t } = useI18n();
  const tc = TYPE_COLORS[entry.mType] || '#6366f1';
  const stageStars = ['⭐', '⭐⭐', '⭐⭐⭐'][entry.stageIdx] || '⭐';
  const modalToneStyle: EncyclopediaCssVars = {
    '--enc-type-color': tc,
    '--enc-type-light': `${tc}55`,
    '--enc-type-border': `${tc}33`,
    '--enc-type-shadow': `${tc}22`,
    '--enc-type-shadow-wide': `${tc}11`,
    '--enc-type-soft-bg': `${tc}25`,
    '--enc-type-soft-border': `${tc}44`,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('encyclopedia.a11y.closeStarterDetail', 'Close partner details')}
      onKeyDown={(ev: KeyboardEvent<HTMLDivElement>) => handleKeyboardActivate(ev, onClose)}
      onClick={onClose}
      className="enc-modal-overlay"
    >
      <div
        onClick={(ev: MouseEvent<HTMLDivElement>) => ev.stopPropagation()}
        className="enc-modal-card"
        style={modalToneStyle}
      >
        <div
          className="enc-modal-hero"
          style={{ background: `radial-gradient(ellipse at 50% 80%, ${tc}18, transparent 70%)` }}
        >
          <button
            className="touch-btn enc-modal-close"
            onClick={onClose}
            aria-label={t('common.cancel', 'Close')}
          >
            ✕
          </button>

          <div className="enc-stage-label" style={{ color: tc }}>
            {stageStars} {entry.stageLabel}
          </div>

          <div className="enc-modal-sprite-wrap">
            <MonsterSprite svgStr={entry.svgFn(entry.c1, entry.c2)} size={160} ariaLabel={t('encyclopedia.a11y.starterSprite', '{name} sprite', { name: entry.name })} />
          </div>

          <div className="enc-modal-name-wrap">
            <div className="enc-modal-name" style={{ textShadow: `0 0 20px ${tc}55` }}>{entry.name}</div>
            <div className="enc-modal-tag-row is-wrap-center">
              <span className="enc-modal-pill enc-modal-pill-type">
                {entry.typeIcon} {t('encyclopedia.typeTag', '{type} type', { type: entry.typeName })}
              </span>
              {entry.skill && (
                <span className="enc-modal-pill enc-modal-pill-skill">
                  {entry.skill}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="enc-modal-body">
          {entry.desc && (
            <div className="enc-info-panel">
              <div className="enc-info-title">📖 {t('encyclopedia.section.desc', 'Description')}</div>
              <div className="enc-info-body">{entry.desc}</div>
            </div>
          )}

          {entry.moves.length > 0 && (
            <div className="enc-info-panel">
              <div className="enc-info-title enc-info-title-spaced">🎯 {t('encyclopedia.section.moves', 'Signature Moves')}</div>
              <div className="enc-move-grid">
                {entry.moves.map((move, index) => (
                  <div
                    key={`${entry.key}_move_${index}`}
                    className="enc-move-item"
                    style={{ borderColor: `${move.color || tc}22` }}
                  >
                    <div className="enc-move-icon">{move.icon}</div>
                    <div>
                      <div className="enc-move-name" style={{ color: move.color || tc }}>{move.name}</div>
                      <div className="enc-move-desc">{move.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
