import { useState } from 'react';
import type { CSSProperties } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import { STARTERS } from '../../data/starters';
import type { SelectionMode, StarterId, StarterSelectable } from '../../types/game';
import { useI18n } from '../../i18n';

const PAGE_BG = "linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)";

type StarterDesc = {
  desc: string;
  passive: string;
  specDef: string;
};

type TranslateParams = Record<string, string | number>;
type TranslateFn = (key: string, fallback?: string, params?: TranslateParams) => string;

function buildStarterDescs(t: TranslateFn): Record<StarterId, StarterDesc> {
  return {
    fire: {
      desc: t("selection.fire.desc", "A fiery partner from volcanic lands. Excels at multiplication with high attack growth."),
      passive: t("selection.fire.passive", "🔥 Burn: attacks can apply burning damage over time."),
      specDef: t("selection.fire.specDef", "🛡️ Shield: at 8-combo, blocks an incoming hit completely."),
    },
    water: {
      desc: t("selection.water.desc", "A calm partner from the deep sea. Excels at division and precise calculations."),
      passive: t("selection.water.passive", "❄️ Freeze: attacks may freeze enemies and skip their turn."),
      specDef: t("selection.water.specDef", "💨 Perfect Dodge: at 8-combo, evades an incoming hit completely."),
    },
    grass: {
      desc: t("selection.grass.desc", "A gentle partner from ancient forests. Excels at addition/subtraction with high endurance."),
      passive: t("selection.grass.passive", "💚 Heal: recover a little HP on each attack."),
      specDef: t("selection.grass.specDef", "🌿 Reflect: at 8-combo, reflects damage back to enemy."),
    },
    electric: {
      desc: t("selection.electric.desc", "A nimble partner from thunderclouds. Excels at mixed operations."),
      passive: t("selection.electric.passive", "⚡ Static Charge: correct answers build charge; 3 stacks trigger bonus damage."),
      specDef: t("selection.electric.specDef", "⚡ Paralysis: at 8-combo, paralyzes the enemy."),
    },
    lion: {
      desc: t("selection.lion.desc", "A brave partner from golden plains. Excels at unknowns with high-risk high-reward style."),
      passive: t("selection.lion.passive", "🦁 Courage: lower HP grants higher damage (up to +50%)."),
      specDef: t("selection.lion.specDef", "✨ Roar: at 8-combo, blocks a hit and deals fixed counter damage."),
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

type SelectionScreenProps = {
  mode?: SelectionMode;
  onSelect: (payload: StarterSelectable | DualSelectionPayload) => void;
  onBack: () => void;
};

export default function SelectionScreen({ mode = "single", onSelect, onBack }: SelectionScreenProps) {
  const { t } = useI18n();
  const DESCS = buildStarterDescs(t);
  const starters = STARTERS as StarterSelectable[];
  const isDual = mode === "coop" || mode === "pvp" || mode === "double";
  const [picked, setPicked] = useState<StarterSelectable | null>(null);
  const [picked1, setPicked1] = useState<StarterSelectable | null>(null);
  const [picked2, setPicked2] = useState<StarterSelectable | null>(null);
  const [focusSlot, setFocusSlot] = useState<"p1" | "p2">("p1");

  const handlePick = (s: StarterSelectable) => {
    if (!isDual) {
      if (picked?.id === s.id) { setPicked(null); return; }
      setPicked(createStarterVariant(s, 0));
      return;
    }

    if (focusSlot === "p1") {
      if (picked2?.id === s.id) return;
      if (picked1?.id === s.id) {
        setPicked1(null);
        setFocusSlot("p1");
        return;
      }
      setPicked1(createStarterVariant(s, 0));
      if (!picked2) setFocusSlot("p2");
      return;
    }

    if (picked1?.id === s.id) return;
    if (picked2?.id === s.id) {
      setPicked2(null);
      return;
    }
    setPicked2(createStarterVariant(s, 0));
  };

  const focusedPicked = !isDual
    ? picked
    : (focusSlot === "p1" ? picked1 : picked2);

  const updateFocusedStage = (stageIdx: number) => {
    if (!focusedPicked) return;
    const next = createStarterVariant(focusedPicked, stageIdx);
    if (!isDual) {
      setPicked(next);
      return;
    }
    if (focusSlot === "p1") setPicked1(next);
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
    <div className="selection-screen" style={{ height: "100%", display: "flex", flexDirection: "column", background: PAGE_BG, color: "white", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 6px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button className="back-touch-btn" onClick={onBack} aria-label={t("a11y.common.backToTitle", "Back to title")} style={backBtn}>←</button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 1 }}>
            {isDual
              ? (mode === "pvp"
                ? t("selection.title.pvp", "Choose both sides!")
                : t("selection.title.dual", "Choose 2 partners!"))
              : t("selection.title.single", "Choose your partner!")}
          </div>
          <div style={{ fontSize: 10, opacity: 0.4, marginTop: 1 }}>
            {isDual
              ? t("selection.subtitle.dual", "Each role can only be picked by one player")
              : t("selection.subtitle.single", "Tap a role to view details")}
          </div>
        </div>
      </div>

      {isDual && (
        <div style={{ padding: "0 16px 6px", display: "flex", gap: 8, flexShrink: 0 }}>
          <button className="touch-btn" onClick={() => setFocusSlot("p1")} aria-label={t("selection.a11y.slotP1", "Choose player 1 slot")} style={{
            flex: 1,
            borderRadius: 10,
            border: focusSlot === "p1" ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,0.12)",
            background: focusSlot === "p1" ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.04)",
            color: "white",
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 8px",
          }}>
            {t("selection.slot.p1", "Player 1")}：{picked1 ? `${picked1.typeIcon}${picked1.name}` : t("selection.slot.empty", "None")}
          </button>
          <button className="touch-btn" onClick={() => setFocusSlot("p2")} aria-label={t("selection.a11y.slotP2", "Choose player 2 slot")} style={{
            flex: 1,
            borderRadius: 10,
            border: focusSlot === "p2" ? "1px solid #f472b6" : "1px solid rgba(255,255,255,0.12)",
            background: focusSlot === "p2" ? "rgba(244,114,182,0.2)" : "rgba(255,255,255,0.04)",
            color: "white",
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 8px",
          }}>
            {t("selection.slot.p2", "Player 2")}：{picked2 ? `${picked2.typeIcon}${picked2.name}` : t("selection.slot.empty", "None")}
          </button>
        </div>
      )}

      {focusedPicked && (
        <div style={{ padding: "0 16px 8px", flexShrink: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.45, marginBottom: 4 }}>
            {isDual
              ? t("selection.stage.pickFor", "{player} stage", { player: focusSlot === "p1" ? t("selection.slot.p1", "Player 1") : t("selection.slot.p2", "Player 2") })
              : t("selection.stage.pick", "Choose stage")}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {focusedPicked.stages.map((stage, idx) => {
              const active = (focusedPicked.selectedStageIdx || 0) === idx;
              const stageLabel = idx === 0
                ? t("selection.stage.base", "Base")
                : idx === 1
                  ? t("selection.stage.evolved", "Evolved")
                  : t("selection.stage.final", "Final");
              return (
                <button
                  className="touch-btn"
                  key={`${focusedPicked.id}_stage_${idx}`}
                  onClick={() => updateFocusedStage(idx)}
                  aria-label={t("selection.a11y.pickStage", "Choose stage {name}", { name: stage.name })}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    border: active ? `1px solid ${focusedPicked.c1}` : "1px solid rgba(255,255,255,0.12)",
                    background: active ? `${focusedPicked.c1}2f` : "rgba(255,255,255,0.04)",
                    color: "white",
                    fontSize: 11,
                    fontWeight: active ? 800 : 600,
                    padding: "6px 8px",
                    cursor: "pointer",
                  }}
                >
                  {stageLabel} · {stage.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Starter cards */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 12px 8px", gap: 5, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {starters.map((s) => {
          const isP1 = picked1?.id === s.id;
          const isP2 = picked2?.id === s.id;
          const sel = isDual ? (isP1 || isP2) : picked?.id === s.id;
          const selectedStageIdx = !sel
            ? 0
            : isDual
              ? (isP1 ? (picked1?.selectedStageIdx || 0) : (picked2?.selectedStageIdx || 0))
              : (picked?.selectedStageIdx || 0);
          const selectedStage = s.stages[selectedStageIdx] || s.stages[0];
          const info = DESCS[s.id];
          return (
            <button className="selection-card-btn" key={s.id} onClick={() => handlePick(s)} aria-label={t("selection.a11y.pickStarter", "Choose starter {name}", { name: s.name })} style={{
              background: sel
                ? `linear-gradient(135deg, ${s.c1}44, ${s.c2}33)`
                : `linear-gradient(135deg, ${s.c1}18, ${s.c2}10)`,
              border: isDual
                ? isP1 ? "2px solid #60a5fa" : isP2 ? "2px solid #f472b6" : `1px solid ${s.c1}22`
                : sel ? `2px solid ${s.c1}` : `1px solid ${s.c1}22`,
              borderRadius: 12, padding: sel ? "10px 12px" : "8px 12px",
              display: "flex", flexDirection: "column", gap: 0,
              cursor: "pointer", textAlign: "left", color: "white",
              transition: "all 0.3s ease", flexShrink: 0,
            }}>
              {/* Top row: sprite + name + moves */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  flexShrink: 0,
                  animation: sel ? "spinSelect 0.7s ease-in-out" : "none",
                  transition: "transform 0.3s",
                }}>
                  <MonsterSprite svgStr={selectedStage.svgFn(s.c1, s.c2)} size={sel ? 72 : 56} ariaLabel={t("selection.a11y.starterSprite", "{name} sprite", { name: s.name })} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>
                    {s.typeIcon} {sel ? selectedStage.name : s.name}
                    <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 5 }}>
                      {t("selection.typeTag", "{type} type", { type: s.typeName })}
                    </span>
                    {isDual && isP1 && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 8, background: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.5)" }}>{t("selection.slot.p1", "Player 1")}</span>}
                    {isDual && isP2 && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 8, background: "rgba(244,114,182,0.2)", border: "1px solid rgba(244,114,182,0.5)" }}>{t("selection.slot.p2", "Player 2")}</span>}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.5, lineHeight: 1.4 }}>
                    {s.moves.slice(0, 3).map((m, j) => (
                      <span key={j}>{m.icon} {m.name}{j < 2 ? "　" : ""}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expanded detail when selected */}
              {sel && (
                <div style={{
                  marginTop: 8, paddingTop: 8,
                  borderTop: `1px solid ${s.c1}44`,
                  animation: "fadeIn 0.3s ease",
                }}>
                  <div style={{ fontSize: 11, opacity: 0.8, lineHeight: 1.6, marginBottom: 6 }}>{info.desc}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: 8, lineHeight: 1.5 }}>
                      <span style={{ opacity: 0.5 }}>{t("selection.label.passive", "Passive")}｜</span>{info.passive}
                    </div>
                    <div style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: 8, lineHeight: 1.5 }}>
                      <span style={{ opacity: 0.5 }}>{t("selection.label.combo", "Combo")}｜</span>{info.specDef}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {s.moves.map((m, j) => (
                      <div key={j} style={{
                        flex: 1, background: "rgba(255,255,255,0.07)",
                        borderRadius: 8, padding: "5px 3px", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 12 }}>{m.icon}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, marginTop: 1 }}>{m.name}</div>
                        <div style={{ fontSize: 8, opacity: 0.5, marginTop: 1 }}>{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      {!isDual && picked && (
        <div style={{ padding: "6px 14px 14px", animation: "fadeIn 0.3s ease", flexShrink: 0 }}>
          <button className="selection-confirm-btn touch-btn" onClick={confirmSingle} aria-label={t("selection.a11y.confirmSingle", "Confirm {name}", { name: picked.name })} style={{
            width: "100%", padding: "13px 0",
            background: `linear-gradient(135deg, ${picked.c1}, ${picked.c2})`,
            border: "none", borderRadius: 14,
            color: "white", fontSize: 16, fontWeight: 800,
            letterSpacing: 2, cursor: "pointer",
            boxShadow: `0 4px 20px ${picked.c1}66`,
          }}>
            {t("selection.confirm.single", "Start with {icon} {name}!", { icon: picked.typeIcon, name: picked.name })}
          </button>
        </div>
      )}
      {isDual && picked1 && picked2 && (
        <div style={{ padding: "6px 14px 14px", animation: "fadeIn 0.3s ease", flexShrink: 0 }}>
          <button className="selection-confirm-btn touch-btn" onClick={confirmDual} aria-label={t("selection.a11y.confirmDual", "Confirm dual selection")} style={{
            width: "100%", padding: "13px 0",
            background: mode === "pvp"
              ? "linear-gradient(135deg,#ec4899,#f43f5e)"
              : "linear-gradient(135deg,#0ea5e9,#22d3ee)",
            border: "none", borderRadius: 14,
            color: "white", fontSize: 16, fontWeight: 800,
            letterSpacing: 1, cursor: "pointer",
            boxShadow: mode === "pvp"
              ? "0 4px 20px rgba(244,63,94,0.32)"
              : "0 4px 20px rgba(14,165,233,0.32)",
          }}>
            {mode === "pvp"
              ? t("selection.confirm.pvp", "{p1Label} {p1} vs {p2Label} {p2}", {
                  p1Label: t("selection.slot.p1", "Player 1"),
                  p2Label: t("selection.slot.p2", "Player 2"),
                  p1: `${picked1.typeIcon}${picked1.name}`,
                  p2: `${picked2.typeIcon}${picked2.name}`,
                })
              : t("selection.confirm.coop", "Co-op: {p1} + {p2}", {
                  p1: `${picked1.typeIcon}${picked1.name}`,
                  p2: `${picked2.typeIcon}${picked2.name}`,
                })}
          </button>
        </div>
      )}
    </div>
  );
}

const backBtn: CSSProperties = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 16, fontWeight: 700, width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };
