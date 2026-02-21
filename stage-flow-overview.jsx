import { useState } from "react";

const SCENE_COLORS = {
  grass: { bg: "#166534", fg: "#bbf7d0", icon: "🌿", label: "綠意草原" },
  fire: { bg: "#991b1b", fg: "#fecaca", icon: "🌋", label: "炎熱火山" },
  water: { bg: "#1e3a5f", fg: "#bfdbfe", icon: "💧", label: "水之領域" },
  electric: { bg: "#854d0e", fg: "#fef08a", icon: "⚡", label: "雷暴荒原" },
  ghost: { bg: "#581c87", fg: "#e9d5ff", icon: "🌙", label: "幽暗墓地" },
  dark: { bg: "#1c1917", fg: "#d6d3d1", icon: "💀", label: "暗黑深淵" },
  steel: { bg: "#374151", fg: "#e5e7eb", icon: "⚙️", label: "鋼鐵要塞" },
  rock: { bg: "#78350f", fg: "#fde68a", icon: "🪨", label: "岩石峽谷" },
  candy: { bg: "#831843", fg: "#fbcfe8", icon: "🍬", label: "糖果大地" },
  poison: { bg: "#365314", fg: "#d9f99d", icon: "☠️", label: "毒沼深淵" },
  burnt_warplace: { bg: "#7c2d12", fg: "#fed7aa", icon: "🔥", label: "焦灼荒原" },
  heaven: { bg: "#1e3a5f", fg: "#e0f2fe", icon: "☁️", label: "天界聖域" },
};

const MONSTER_INFO = {
  slime: { icon: "🟢", name: "史萊姆", note: "隨機變體: 紅/藍/黃/暗/鋼 + 彩翼蝶" },
  fire: { icon: "🔥", name: "火焰蜥" },
  ghost: { icon: "👻", name: "幽靈魔", note: "隨機變體: 幽靈魔/提燈幽魂/孢子菇" },
  dragon: { icon: "🐉", name: "鋼鐵龍" },
  golumn: { icon: "🪨", name: "岩石高崙", note: "隨機變體: 花崗高崙/泥岩高崙" },
  candy_knight: { icon: "🍬", name: "糖果騎士", type: "夢幻" },
  candy_monster: { icon: "🍭", name: "棉花糖怪", type: "夢幻" },
  colorful_butterfly: { icon: "🦋", name: "彩翼蝶", type: "草" },
  boss: { icon: "💀", name: "Boss", note: "隨機: 暗黑龍王/三頭毒蛇/斷翼狂龍/劍神" },
};

/*──────────────────────────────────────────────────────────────────
 * 計時模式 (timed) — 10 waves, 線性, 無分支
 * 來源: balanceConfig.stage.waves.single (left === right, 無實質分支)
 * 特徵: enableRandomSwap = true, enableStarterEncounters = false
 *──────────────────────────────────────────────────────────────────*/
const TIMED_WAVES = [
  { wave: 1, monsterId: "slime", scene: null },
  { wave: 2, monsterId: "fire", scene: null },
  { wave: 3, monsterId: "ghost", scene: null },
  { wave: 4, monsterId: "candy_knight", scene: "candy" },
  { wave: 5, monsterId: "slime", scene: null },
  { wave: 6, monsterId: "candy_monster", scene: "candy" },
  { wave: 7, monsterId: "dragon", scene: null },
  { wave: 8, monsterId: "ghost", scene: null },
  { wave: 9, monsterId: "dragon", scene: null },
  { wave: 10, monsterId: "boss", scene: "dark" },
];

/*──────────────────────────────────────────────────────────────────
 * Co-op 模式 — 14 waves, 固定雙人
 *──────────────────────────────────────────────────────────────────*/
const COOP_WAVES = [
  { wave: 1, monsterId: "slime", slimeType: "grass", scene: "grass" },
  { wave: 2, monsterId: "slime", slimeType: "water", scene: "water" },
  { wave: 3, monsterId: "fire", scene: "fire" },
  { wave: 4, monsterId: "ghost", scene: "fire" },
  { wave: 5, monsterId: "slime", slimeType: "electric", scene: "electric" },
  { wave: 6, monsterId: "fire", scene: "fire" },
  { wave: 7, monsterId: "slime", slimeType: "steel", scene: "steel" },
  { wave: 8, monsterId: "dragon", scene: "steel" },
  { wave: 9, monsterId: "candy_knight", scene: "candy" },
  { wave: 10, monsterId: "candy_monster", scene: "candy" },
  { wave: 11, monsterId: "slime", slimeType: "dark", scene: "dark" },
  { wave: 12, monsterId: "fire", scene: "dark" },
  { wave: 13, monsterId: "boss", scene: "dark" },
  { wave: 14, monsterId: "boss", scene: "dark" },
];

/*──────────────────────────────────────────────────────────────────
 * 一般模式 (normal) — 10 rounds, 左/右分支選擇
 * 來源: balanceConfig.stage.campaign.branchChoices
 * 特徵: enableRandomSwap = false, enableStarterEncounters = true (65%)
 *──────────────────────────────────────────────────────────────────*/
const NORMAL_BRANCHES = [
  {
    round: 1,
    left: { monsterId: "slime", slimeType: "grass", scene: "grass" },
    right: { monsterId: "slime", slimeType: "water", scene: "water" },
  },
  {
    round: 2, event: true,
    left: { monsterId: "fire", scene: "fire" },
    right: { monsterId: "ghost", scene: "ghost" },
  },
  {
    round: 3, elite: true,
    left: { monsterId: "slime", slimeType: "steel", scene: "steel" },
    right: { monsterId: "golumn", scene: "rock" },
  },
  {
    round: 4,
    left: { monsterId: "dragon", scene: "steel" },
    right: { monsterId: "fire", scene: "dark" },
  },
  {
    round: 5, event: true,
    left: { monsterId: "slime", slimeType: "electric", scene: "electric" },
    right: { monsterId: "golumn", scene: "rock" },
  },
  {
    round: 6, elite: true,
    left: { monsterId: "dragon", scene: "dark" },
    right: { monsterId: "ghost", scene: "ghost" },
  },
  {
    round: 7, event: true,
    left: { monsterId: "fire", scene: "fire" },
    right: { monsterId: "dragon", scene: "dark" },
  },
  {
    round: 8, elite: true,
    left: { monsterId: "golumn", scene: "rock" },
    right: { monsterId: "candy_knight", scene: "candy" },
  },
  {
    round: 9,
    left: { monsterId: "candy_monster", scene: "candy" },
    right: { monsterId: "fire", scene: "dark" },
  },
  {
    round: 10,
    left: { monsterId: "boss", scene: "dark" },
    right: { monsterId: "boss", scene: "dark" },
  },
];

const EVOLVE_INFO = {
  slime: { lvl: 5, note: "Lv.5 進化 (叢林巨魔等)" },
  fire: { lvl: 5, note: "Lv.5 → 烈焰巨龍" },
  ghost: { lvl: 5, note: "Lv.5 → 冥界死神" },
  dragon: { lvl: 9, note: "Lv.9 → 天空要塞" },
};

const BOSS_POOL = [
  { id: "boss", name: "暗黑龍王", scene: "暗黑深淵", hp: 120, atk: 15 },
  { id: "boss_hydra", name: "三頭毒蛇", scene: "毒沼深淵", hp: 140, atk: 13 },
  { id: "boss_crazy_dragon", name: "斷翼狂龍", scene: "焦灼荒原", hp: 110, atk: 17 },
  { id: "boss_sword_god", name: "劍神", scene: "天界聖域", hp: 120, atk: 15 },
];

function SceneBadge({ scene }) {
  const s = SCENE_COLORS[scene] || { bg: "#334155", fg: "#e2e8f0", icon: "❓", label: scene };
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: s.bg, color: s.fg, padding: "2px 8px",
        borderRadius: 6, fontSize: 11, fontWeight: 600,
      }}
    >
      {s.icon} {s.label}
    </span>
  );
}

function MonsterBadge({ monsterId, slimeType }) {
  const m = MONSTER_INFO[monsterId] || { icon: "❓", name: monsterId };
  const ev = EVOLVE_INFO[monsterId];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontWeight: 700 }}>
        {m.icon} {m.name}
        {slimeType && <span style={{ opacity: 0.6, fontSize: 11 }}> ({slimeType}屬性)</span>}
        {m.type && <span style={{ opacity: 0.6, fontSize: 11 }}> [{m.type}屬性]</span>}
      </span>
      {m.note && <span style={{ fontSize: 10, opacity: 0.5 }}>{m.note}</span>}
      {ev && <span style={{ fontSize: 10, color: "#f59e0b" }}>{ev.note}</span>}
    </div>
  );
}

function WaveRow({ wave, monsterId, scene, slimeType, extra }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
        background: wave % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center", fontWeight: 800,
          fontSize: 13, background: monsterId === "boss" ? "#dc2626" : "#4f46e5",
          color: "#fff", flexShrink: 0,
        }}
      >
        {wave}
      </div>
      <div style={{ flex: 1 }}>
        <MonsterBadge monsterId={monsterId} slimeType={slimeType} />
      </div>
      {scene && <SceneBadge scene={scene} />}
      {extra && <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>{extra}</span>}
    </div>
  );
}

function BranchRow({ round, left, right, elite, event }) {
  const tagColor = elite ? "#dc2626" : event ? "#2563eb" : "transparent";
  const tagText = elite ? "⚔ 精英" : event ? "🎲 事件" : "";
  return (
    <div style={{ display: "flex", gap: 8, padding: "6px 0", alignItems: "stretch" }}>
      <div
        style={{
          width: 36, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28, height: 28, borderRadius: "50%", display: "flex",
            alignItems: "center", justifyContent: "center", fontWeight: 800,
            fontSize: 12, background: left.monsterId === "boss" ? "#dc2626" : "#4f46e5",
            color: "#fff",
          }}
        >
          {round}
        </div>
        {tagText && (
          <span style={{ fontSize: 9, color: tagColor, fontWeight: 700, marginTop: 2 }}>{tagText}</span>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", gap: 6 }}>
        {[left, right].map((side, i) => (
          <div
            key={i}
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 8,
              padding: "6px 10px", border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontSize: 10, opacity: 0.4, marginBottom: 2 }}>{i === 0 ? "← 左路" : "右路 →"}</div>
            <MonsterBadge monsterId={side.monsterId} slimeType={side.slimeType} />
            {side.scene && <div style={{ marginTop: 4 }}><SceneBadge scene={side.scene} /></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StageFlowOverview() {
  const [tab, setTab] = useState("normal");
  const tabs = [
    { id: "normal", label: "🎮 一般模式 (10 rounds)" },
    { id: "timed", label: "⏱️ 計時模式 (10 waves)" },
    { id: "coop", label: "👥 Co-op 模式 (14 waves)" },
    { id: "mechanics", label: "⚙️ 機制總覽" },
  ];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#e2e8f0", maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📋 關卡流程總覽</h1>
      <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 16 }}>數學怪獸大亂鬥 — Stage Flow Overview (統一版)</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 13,
              background: tab === t.id ? "#4f46e5" : "#1e1b4b",
              color: tab === t.id ? "#fff" : "#a5b4fc",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── 一般模式 (normal preset) ────────────────────────────── */}
      {tab === "normal" && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>🎮 一般模式 — 10 Rounds (分支選擇)</h2>
          <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8 }}>
            走 Campaign Planner：每回合隨機選左路或右路。含精英回合 + 事件回合。
            <br/>隨機置換: 停用 ／ 野生夥伴怪: 65% 機率出現
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {NORMAL_BRANCHES.map((b) => (
              <BranchRow key={b.round} {...b} />
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200, padding: 10, background: "rgba(37,99,235,0.08)", borderRadius: 8, border: "1px solid rgba(37,99,235,0.2)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6" }}>🎲 事件回合 (Round 2, 5, 7)</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                隨機事件池:<br/>
                • healing_spring — HP×0.9, ATK×0.92 (較弱)<br/>
                • focus_surge — HP×0.95, ATK×0.95<br/>
                • hazard_ambush — HP×1.1, ATK×1.08 (較強)
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200, padding: 10, background: "rgba(220,38,38,0.08)", borderRadius: 8, border: "1px solid rgba(220,38,38,0.2)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>⚔ 精英回合 (Round 3, 6, 8)</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                怪獸能力值加成:<br/>
                • HP ×1.22<br/>
                • ATK ×1.18
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 計時模式 (timed preset) ─────────────────────────────── */}
      {tab === "timed" && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>⏱️ 計時模式 — 10 Waves (線性)</h2>
          <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8 }}>
            同樣走 Campaign Planner，但 left === right（無實質分支）、無精英/事件加成。
            <br/>隨機置換: 啟用（岩石高崙注入）／ 野生夥伴怪: 停用
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TIMED_WAVES.map((w) => (
              <WaveRow key={w.wave} {...w} />
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 10, background: "rgba(245,158,11,0.08)", borderRadius: 8, border: "1px solid rgba(245,158,11,0.2)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>🔀 隨機置換機制</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
              • Wave 2~9 中隨機一關 → 岩石高崙 (岩石峽谷場景)
            </div>
          </div>
        </div>
      )}

      {/* ─── Co-op 模式 ──────────────────────────────────────────── */}
      {tab === "coop" && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>👥 Co-op 模式 — 14 Waves</h2>
          <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8 }}>
            每 wave 指定場景和史萊姆屬性。最終 2 波為 Boss×2。不走 Campaign Planner。
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {COOP_WAVES.map((w) => (
              <WaveRow key={w.wave} {...w} />
            ))}
          </div>
        </div>
      )}

      {/* ─── 機制總覽 ───────────────────────────────────────────── */}
      {tab === "mechanics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>⚙️ 機制總覽</h2>

          <div style={{ padding: 12, background: "rgba(79,70,229,0.08)", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>🔗 統一架構說明</h3>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              一般模式與計時模式現在都走同一個 Campaign Planner，差別只在 preset 配置：
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ textAlign: "left", padding: 4 }}>維度</th>
                    <th style={{ textAlign: "left", padding: 4 }}>一般模式 (normal)</th>
                    <th style={{ textAlign: "left", padding: 4 }}>計時模式 (timed)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style={{ padding: 4 }}>波數</td><td style={{ padding: 4 }}>10</td><td style={{ padding: 4 }}>10</td></tr>
                  <tr><td style={{ padding: 4 }}>分支選擇</td><td style={{ padding: 4 }}>左/右隨機</td><td style={{ padding: 4 }}>左===右（無分支）</td></tr>
                  <tr><td style={{ padding: 4 }}>精英回合</td><td style={{ padding: 4 }}>Round 3, 6, 8</td><td style={{ padding: 4 }}>無</td></tr>
                  <tr><td style={{ padding: 4 }}>事件回合</td><td style={{ padding: 4 }}>Round 2, 5, 7</td><td style={{ padding: 4 }}>無</td></tr>
                  <tr><td style={{ padding: 4 }}>隨機置換</td><td style={{ padding: 4 }}>停用</td><td style={{ padding: 4 }}>啟用（岩石高崙）</td></tr>
                  <tr><td style={{ padding: 4 }}>野生夥伴</td><td style={{ padding: 4 }}>65% 機率</td><td style={{ padding: 4 }}>停用</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>🐲 Boss 池 (最終一關隨機)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6 }}>
              {BOSS_POOL.map((b) => (
                <div key={b.id} style={{ padding: 8, background: "rgba(220,38,38,0.08)", borderRadius: 6, border: "1px solid rgba(220,38,38,0.15)" }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>💀 {b.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>HP {b.hp} / ATK {b.atk}</div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>{b.scene}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>🔄 隨機遭遇變體</h3>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ textAlign: "left", padding: 4 }}>基礎怪獸</th>
                  <th style={{ textAlign: "left", padding: 4 }}>可能變為</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ padding: 4 }}>🟢 slime</td><td style={{ padding: 4 }}>slime, 🦋 彩翼蝶</td></tr>
                <tr><td style={{ padding: 4 }}>👻 ghost</td><td style={{ padding: 4 }}>ghost, 提燈幽魂, 孢子菇</td></tr>
                <tr><td style={{ padding: 4 }}>🪨 golumn</td><td style={{ padding: 4 }}>花崗高崙, 泥岩高崙</td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>✨ 進化機制</h3>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ textAlign: "left", padding: 4 }}>怪獸</th>
                  <th style={{ textAlign: "left", padding: 4 }}>進化等級</th>
                  <th style={{ textAlign: "left", padding: 4 }}>進化型態</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ padding: 4 }}>🟢 史萊姆</td><td style={{ padding: 4 }}>Lv.5</td><td style={{ padding: 4 }}>叢林巨魔 / 雷霆巨魔 / 烈焰巨魔 等</td></tr>
                <tr><td style={{ padding: 4 }}>🔥 火焰蜥</td><td style={{ padding: 4 }}>Lv.5</td><td style={{ padding: 4 }}>烈焰巨龍</td></tr>
                <tr><td style={{ padding: 4 }}>👻 幽靈魔</td><td style={{ padding: 4 }}>Lv.5</td><td style={{ padding: 4 }}>冥界死神</td></tr>
                <tr><td style={{ padding: 4 }}>🐉 鋼鐵龍</td><td style={{ padding: 4 }}>Lv.9</td><td style={{ padding: 4 }}>天空要塞</td></tr>
              </tbody>
            </table>
            <p style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
              Wave index + 1 ≥ evolveLvl 時自動進化。dragon Lv.9 需 wave 9+ 才觸發。
              糖果系、高崙系、Boss 均無進化。
            </p>
          </div>

          <div style={{ padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>🎯 難度縮放</h3>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              <p>公式: HP/ATK = baseStats × (1.0 + waveIndex × 0.12) × variantMult × tierScale × eventScale</p>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ textAlign: "left", padding: 4 }}>Wave</th>
                    <th style={{ textAlign: "left", padding: 4 }}>基礎倍率</th>
                    <th style={{ textAlign: "left", padding: 4 }}>Wave</th>
                    <th style={{ textAlign: "left", padding: 4 }}>基礎倍率</th>
                  </tr>
                </thead>
                <tbody>
                  {[1,2,3,4,5].map(i => (
                    <tr key={i}>
                      <td style={{ padding: 4 }}>{i}</td>
                      <td style={{ padding: 4 }}>×{(1 + (i-1) * 0.12).toFixed(2)}</td>
                      <td style={{ padding: 4 }}>{i+5}</td>
                      <td style={{ padding: 4 }}>×{(1 + (i+4) * 0.12).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>🗺️ 場景總覽</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(SCENE_COLORS).map(([key, s]) => (
                <div key={key} style={{ padding: "4px 10px", background: s.bg, color: s.fg, borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                  {s.icon} {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
