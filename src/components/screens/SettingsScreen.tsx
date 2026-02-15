/**
 * SettingsScreen — Unified runtime settings.
 * Includes performance and audio controls.
 */
import type { CSSProperties } from 'react';

const PAGE_BG = "radial-gradient(120% 80% at 50% 0%, #1f2a44 0%, #131a2f 45%, #0a1020 100%)";

type PerfMode = "auto" | "on" | "off";

type SettingsScreenProps = {
  onBack: () => void;
  perfMode: PerfMode;
  lowPerfMode: boolean;
  autoLowEnd: boolean;
  onSetPerfMode: (nextMode: PerfMode) => void;
  audioMuted: boolean;
  onSetAudioMuted: (muted: boolean) => void;
};

const cardStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.05))",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 16,
  padding: "14px 14px 12px",
  textAlign: "left",
  boxShadow: "0 10px 26px rgba(0,0,0,0.25)",
};

export default function SettingsScreen({
  onBack,
  perfMode,
  lowPerfMode,
  autoLowEnd,
  onSetPerfMode,
  audioMuted,
  onSetAudioMuted,
}: SettingsScreenProps) {
  const soundOn = !audioMuted;
  const perfResolved = lowPerfMode ? "省電執行" : "標準執行";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: PAGE_BG, color: "white", padding: "16px 12px", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button className="back-touch-btn" onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", color: "white", fontSize: 17, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>←</button>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.6 }}>⚙️ 遊戲設定</div>
          <div style={{ fontSize: 11, opacity: 0.55 }}>簡潔控制效能與聲音</div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>🔊 聲音</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 10 }}>控制戰鬥音效開關（本機保存）</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <OptionButton
            label="開啟"
            active={soundOn}
            tone="green"
            onClick={() => onSetAudioMuted(false)}
          />
          <OptionButton
            label="靜音"
            active={!soundOn}
            tone="gray"
            onClick={() => onSetAudioMuted(true)}
          />
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: soundOn ? "#86efac" : "#cbd5e1", fontWeight: 700 }}>
          狀態：{soundOn ? "音效已開啟" : "已靜音"}
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>🚀 效能</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 10 }}>降低動畫與特效以提升穩定度</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
          <ModeButton
            title="自動"
            subtitle={autoLowEnd ? "偵測到低階裝置，將偏向省電" : "依裝置能力自動選擇"}
            active={perfMode === "auto"}
            onClick={() => onSetPerfMode("auto")}
          />
          <ModeButton
            title="省電"
            subtitle="減少背景動畫與重特效"
            active={perfMode === "on"}
            onClick={() => onSetPerfMode("on")}
          />
          <ModeButton
            title="標準"
            subtitle="保留完整視覺特效"
            active={perfMode === "off"}
            onClick={() => onSetPerfMode("off")}
          />
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: lowPerfMode ? "#fbbf24" : "#93c5fd", fontWeight: 700 }}>
          目前生效：{perfResolved}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: "10px 12px", opacity: 0.82 }}>
        <div style={{ fontSize: 10, lineHeight: 1.8, opacity: 0.72 }}>
          <div>• 設定儲存在本機 localStorage</div>
          <div>• 重新整理或重開遊戲後仍會保留</div>
        </div>
      </div>
    </div>
  );
}

type OptionButtonProps = {
  label: string;
  active: boolean;
  tone: "green" | "gray";
  onClick: () => void;
};

function OptionButton({ label, active, tone, onClick }: OptionButtonProps) {
  const activeStyle = tone === "green"
    ? "linear-gradient(135deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))"
    : "linear-gradient(135deg, rgba(100,116,139,0.9), rgba(71,85,105,0.9))";

  return (
    <button
      className="touch-btn"
      onClick={onClick}
      style={{
        background: active ? activeStyle : "rgba(255,255,255,0.06)",
        color: "white",
        border: active ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: "10px 0",
        fontSize: 13,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

type ModeButtonProps = {
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
};

function ModeButton({ title, subtitle, active, onClick }: ModeButtonProps) {
  return (
    <button
      className="touch-btn"
      onClick={onClick}
      style={{
        textAlign: "left",
        background: active
          ? "linear-gradient(135deg, rgba(59,130,246,0.32), rgba(14,165,233,0.22))"
          : "rgba(255,255,255,0.05)",
        border: active ? "1px solid rgba(56,189,248,0.7)" : "1px solid rgba(255,255,255,0.12)",
        color: "white",
        borderRadius: 12,
        padding: "10px 12px",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.4 }}>{subtitle}</div>
    </button>
  );
}
