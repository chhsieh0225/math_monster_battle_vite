import { useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import { ENC_ENTRIES, ENC_TOTAL, STARTER_ENTRIES } from '../../data/encyclopedia';
import { useI18n } from '../../i18n';
import { hasSpecialTrait } from '../../utils/traits';
import type {
  EncyclopediaCounts,
  EncyclopediaData,
  EncyclopediaEnemyEntry,
  EncyclopediaStarterEntry,
} from '../../types/game';

const PAGE_BG = "linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)";

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
  if (ev.key === "Enter" || ev.key === " ") {
    ev.preventDefault();
    action();
  }
}

export default function EncyclopediaScreen({ encData = {}, onBack }: EncyclopediaScreenProps) {
  const { t } = useI18n();
  const enemyEntries = ENC_ENTRIES as EncyclopediaEnemyEntry[];
  const starterEntries = STARTER_ENTRIES as EncyclopediaStarterEntry[];
  const enc: EncyclopediaCounts = encData.encountered || {};
  const def: EncyclopediaCounts = encData.defeated || {};
  const encCount = Object.keys(enc).length;
  const pct = ENC_TOTAL > 0 ? Math.round((encCount / ENC_TOTAL) * 100) : 0;

  const [selected, setSelected] = useState<SelectedEntry | null>(null);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: PAGE_BG, color: 'white', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button className="back-touch-btn" onClick={onBack} aria-label={t("a11y.common.backToTitle", "Back to title")} style={backBtn}>←</button>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>📚 {t("encyclopedia.title", "Encyclopedia")}</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, opacity: 0.5 }}>{encCount}/{ENC_TOTAL}</div>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#22c55e,#3b82f6)', borderRadius: 3, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 16px', WebkitOverflowScrolling: 'touch' }}>
        <SectionDivider
          icon="🐾"
          label={t("encyclopedia.section.enemies", "Wild Monsters")}
          sub={t("encyclopedia.section.enemiesSub", "{count}/{total} discovered", { count: encCount, total: ENC_TOTAL })}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
          {enemyEntries.map((e) => {
            const seen = Boolean(enc[e.key]);
            const killed = Boolean(def[e.key]);
            return (
              <div
                key={e.key}
                role={seen ? "button" : undefined}
                tabIndex={seen ? 0 : -1}
                aria-label={seen
                  ? t("encyclopedia.a11y.viewEnemy", "View encyclopedia: {name}", { name: e.name })
                  : t("encyclopedia.a11y.lockedEnemy", "Locked monster")}
                onKeyDown={(ev: KeyboardEvent<HTMLDivElement>) => {
                  if (!seen) return;
                  handleKeyboardActivate(ev, () => setSelected({ entry: e, kind: 'enemy' }));
                }}
                onClick={() => seen && setSelected({ entry: e, kind: 'enemy' })}
                style={{
                  background: seen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: killed ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: '10px 6px 8px',
                  textAlign: 'center',
                  cursor: seen ? 'pointer' : 'default',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                <div
                  style={{
                    margin: '0 auto 6px',
                    width: 56,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    filter: seen ? 'none' : 'brightness(0) opacity(0.15)',
                  }}
                >
                  <MonsterSprite svgStr={e.svgFn(e.c1, e.c2)} size={48} ariaLabel={seen
                    ? t("encyclopedia.a11y.enemySprite", "{name} sprite", { name: e.name })
                    : t("encyclopedia.a11y.unknownEnemySprite", "Unknown monster sprite")} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{seen ? e.name : t("encyclopedia.unknownName", "???")}</div>
                <div style={{ fontSize: 10, opacity: 0.5 }}>
                  {seen ? `${e.typeIcon} ${e.typeName}` : t("encyclopedia.unknownType", "??")}
                  {e.isEvolved && seen && <span style={{ marginLeft: 4, fontSize: 9, background: 'rgba(168,85,247,0.25)', padding: '1px 5px', borderRadius: 6 }}>{t("encyclopedia.tag.evolved", "Evolved")}</span>}
                </div>
                {seen && <div style={{ fontSize: 9, opacity: 0.25, marginTop: 3 }}>
                  {t("encyclopedia.countLine", "Encounter {enc} / Defeat {def}", { enc: enc[e.key] || 0, def: def[e.key] || 0 })}
                </div>}
              </div>
            );
          })}
        </div>

        <SectionDivider
          icon="⚔️"
          label={t("encyclopedia.section.starters", "Partner Roles")}
          sub={t("encyclopedia.section.startersSub", "{count} forms", { count: starterEntries.length })}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {starterEntries.map((e) => (
            <div
              key={e.key}
              role="button"
              tabIndex={0}
              aria-label={t("encyclopedia.a11y.viewStarter", "View partner encyclopedia: {name}", { name: e.name })}
              onKeyDown={(ev: KeyboardEvent<HTMLDivElement>) => handleKeyboardActivate(ev, () => setSelected({ entry: e, kind: 'starter' }))}
              onClick={() => setSelected({ entry: e, kind: 'starter' })}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${(TYPE_COLORS[e.mType] || '#6366f1')}22`,
                borderRadius: 12,
                padding: '10px 6px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
            >
              <div
                style={{
                  margin: '0 auto 6px',
                  width: 56,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MonsterSprite svgStr={e.svgFn(e.c1, e.c2)} size={48} ariaLabel={t("encyclopedia.a11y.starterSprite", "{name} sprite", { name: e.name })} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{e.name}</div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>{e.typeIcon} {e.typeName}</div>
              <div style={{ fontSize: 9, opacity: 0.3, marginTop: 3 }}>{e.stageLabel}</div>
            </div>
          ))}
        </div>
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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t("encyclopedia.a11y.closeEnemyDetail", "Close monster details")}
      onKeyDown={(ev: KeyboardEvent<HTMLDivElement>) => handleKeyboardActivate(ev, onClose)}
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(ev: MouseEvent<HTMLDivElement>) => ev.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          maxHeight: '90%',
          background: 'linear-gradient(180deg,#1e1b4b,#0f172a)',
          borderRadius: 20,
          border: `2px solid ${tc}33`,
          boxShadow: `0 8px 40px ${tc}22, 0 0 80px ${tc}11`,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          animation: 'popIn 0.3s ease',
        }}
      >
        <div
          style={{
            position: 'relative',
            padding: '28px 20px 16px',
            textAlign: 'center',
            background: `radial-gradient(ellipse at 50% 80%, ${tc}18, transparent 70%)`,
          }}
        >
          <button
            className="touch-btn"
            onClick={onClose}
            aria-label={t("common.cancel", "Close")}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              width: 32,
              height: 32,
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>

          <div style={{ fontSize: 14, color: '#fbbf24', letterSpacing: 3, marginBottom: 8, opacity: 0.7 }}>{entry.rarity}</div>

          <div
            style={{
              display: 'inline-block',
              position: 'relative',
              filter: `drop-shadow(0 0 20px ${tc}55)`,
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            <MonsterSprite svgStr={entry.svgFn(entry.c1, entry.c2)} size={160} ariaLabel={t("encyclopedia.a11y.enemySprite", "{name} sprite", { name: entry.name })} />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 2, textShadow: `0 0 20px ${tc}55` }}>{entry.name}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span
                style={{
                  background: `${tc}25`,
                  border: `1px solid ${tc}44`,
                  padding: '3px 12px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  color: tc,
                }}
              >
                {entry.typeIcon} {t("encyclopedia.typeTag", "{type} type", { type: entry.typeName })}
              </span>
              {entry.isEvolved && (
                <span
                  style={{
                    background: 'rgba(168,85,247,0.2)',
                    border: '1px solid rgba(168,85,247,0.3)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#c084fc',
                  }}
                >
                  ✨ {t("encyclopedia.tag.evolved", "Evolved")}
                </span>
              )}
              {hasSpecialTrait(entry.traitName, entry.traitDesc) && (
                <span
                  style={{
                    background: 'rgba(99,102,241,0.2)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#a5b4fc',
                  }}
                >
                  ✦ {entry.traitName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 18px 20px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <StatBox icon="❤️" label={t("encyclopedia.stat.hp", "HP")} value={entry.hp} color="#ef4444" />
            <StatBox icon="⚔️" label={t("encyclopedia.stat.atk", "ATK")} value={entry.atk} color="#f59e0b" />
            <StatBox icon="📍" label={t("encyclopedia.stat.habitat", "Habitat")} color="#6366f1" sub={entry.habitat} />
          </div>

          {entry.desc && (
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 12,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 4 }}>📖 {t("encyclopedia.section.desc", "Description")}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.8 }}>{entry.desc}</div>
            </div>
          )}

          {hasSpecialTrait(entry.traitName, entry.traitDesc) && (
            <div
              style={{
                background: 'rgba(99,102,241,0.08)',
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 12,
                border: '1px solid rgba(99,102,241,0.15)',
              }}
            >
              <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 700, marginBottom: 4 }}>
                ✦ {t("encyclopedia.section.trait", "Trait")}: {entry.traitName}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8 }}>{entry.traitDesc}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {entry.weakAgainst.length > 0 && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  border: '1px solid rgba(239,68,68,0.15)',
                }}
              >
                <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>⚠️ {t("encyclopedia.section.weakness", "Weakness")}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.weakAgainst.map((typeName) => t("encyclopedia.typeTag", "{type} type", { type: typeName })).join('、')}</div>
              </div>
            )}
            {entry.resistAgainst.length > 0 && (
              <div
                style={{
                  background: 'rgba(34,197,94,0.08)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  border: '1px solid rgba(34,197,94,0.15)',
                }}
              >
                <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, marginBottom: 4 }}>🛡️ {t("encyclopedia.section.resistance", "Resistance")}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.resistAgainst.map((typeName) => t("encyclopedia.typeTag", "{type} type", { type: typeName })).join('、')}</div>
              </div>
            )}
          </div>

          {entry.drops && entry.drops.length > 0 && (
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 12,
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 10, opacity: 0.4 }}>🎁 {t("encyclopedia.section.drops", "Drops")}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {entry.drops.map((drop, index) => <span key={`${entry.key}_drop_${index}`} style={{ fontSize: 20 }}>{drop}</span>)}
              </div>
            </div>
          )}

          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 10,
              padding: '10px 12px',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#6366f1' }}>{encounterCount}</div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>{t("encyclopedia.stat.encounters", "Encounters")}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#22c55e' }}>{defeatCount}</div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>{t("encyclopedia.stat.defeats", "Defeats")}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b' }}>{defeatRate}%</div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>{t("encyclopedia.stat.defeatRate", "Defeat Rate")}</div>
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
    <div
      style={{
        flex: 1,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 10,
        padding: '8px 6px',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ fontSize: 14, marginBottom: 2 }}>{icon}</div>
      {value !== undefined && value !== '' && <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>}
      {sub && <div style={{ fontSize: 10, fontWeight: 600, color, lineHeight: 1.3 }}>{sub}</div>}
      <div style={{ fontSize: 9, opacity: 0.4, marginTop: 1 }}>{label}</div>
    </div>
  );
}

type SectionDividerProps = {
  icon: string;
  label: string;
  sub?: string;
};

function SectionDivider({ icon, label, sub }: SectionDividerProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 8px', padding: '0 2px' }}>
      <div style={{ fontSize: 16 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, opacity: 0.35 }}>{sub}</div>}
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)', marginLeft: 4 }} />
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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t("encyclopedia.a11y.closeStarterDetail", "Close partner details")}
      onKeyDown={(ev: KeyboardEvent<HTMLDivElement>) => handleKeyboardActivate(ev, onClose)}
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(ev: MouseEvent<HTMLDivElement>) => ev.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          maxHeight: '90%',
          background: 'linear-gradient(180deg,#1e1b4b,#0f172a)',
          borderRadius: 20,
          border: `2px solid ${tc}33`,
          boxShadow: `0 8px 40px ${tc}22, 0 0 80px ${tc}11`,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          animation: 'popIn 0.3s ease',
        }}
      >
        <div
          style={{
            position: 'relative',
            padding: '28px 20px 16px',
            textAlign: 'center',
            background: `radial-gradient(ellipse at 50% 80%, ${tc}18, transparent 70%)`,
          }}
        >
          <button
            className="touch-btn"
            onClick={onClose}
            aria-label={t("common.cancel", "Close")}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              width: 32,
              height: 32,
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>

          <div style={{ fontSize: 12, color: tc, fontWeight: 700, letterSpacing: 2, marginBottom: 8, opacity: 0.8 }}>
            {stageStars} {entry.stageLabel}
          </div>

          <div
            style={{
              display: 'inline-block',
              position: 'relative',
              filter: `drop-shadow(0 0 20px ${tc}55)`,
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            <MonsterSprite svgStr={entry.svgFn(entry.c1, entry.c2)} size={160} ariaLabel={t("encyclopedia.a11y.starterSprite", "{name} sprite", { name: entry.name })} />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 2, textShadow: `0 0 20px ${tc}55` }}>{entry.name}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span
                style={{
                  background: `${tc}25`,
                  border: `1px solid ${tc}44`,
                  padding: '3px 12px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  color: tc,
                }}
              >
                {entry.typeIcon} {t("encyclopedia.typeTag", "{type} type", { type: entry.typeName })}
              </span>
              {entry.skill && (
                <span
                  style={{
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#a5b4fc',
                  }}
                >
                  {entry.skill}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 18px 20px' }}>
          {entry.desc && (
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 12,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 4 }}>📖 {t("encyclopedia.section.desc", "Description")}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.8 }}>{entry.desc}</div>
            </div>
          )}

          {entry.moves.length > 0 && (
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 12,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 8 }}>🎯 {t("encyclopedia.section.moves", "Signature Moves")}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {entry.moves.map((move, index) => (
                  <div
                    key={`${entry.key}_move_${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 10,
                      padding: '8px 10px',
                      border: `1px solid ${(move.color || tc)}22`,
                    }}
                  >
                    <div style={{ fontSize: 20 }}>{move.icon}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: move.color || tc }}>{move.name}</div>
                      <div style={{ fontSize: 9, opacity: 0.4 }}>{move.desc}</div>
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

const backBtn: CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'white',
  fontSize: 16,
  fontWeight: 700,
  width: 36,
  height: 36,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
};
