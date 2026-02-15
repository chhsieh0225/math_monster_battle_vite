/**
 * DashboardScreen — Parent analytics dashboard.
 *
 * Shows per-operation accuracy rates, response-time trends,
 * session history, and weak-area indicators.
 * Protected by a 4-digit PIN.
 */
import { useState, useMemo } from 'react';
import { loadSessions, clearSessions, loadPin, savePin } from '../../utils/sessionLogger';
import {
  OPS,
  buildDashboardInsights,
  opIcon,
  opName,
} from '../../utils/dashboardInsights';

// ─── PIN Gate ───
function PINGate({ onUnlock, onBack }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const pin = loadPin();

  const check = () => {
    if (input === pin) onUnlock();
    else { setError(true); setInput(""); }
  };

  return (
    <div style={wrap}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>家長專區</div>
      <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 20 }}>請輸入 PIN（預設 1234）</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
        <input
          type="password" inputMode="numeric" maxLength={6}
          value={input} onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => { if (e.key === "Enter") check(); }}
          style={{ background: "rgba(255,255,255,0.1)", border: error ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "white", fontSize: 24, fontWeight: 700, padding: "8px 12px", textAlign: "center", width: 120, outline: "none", letterSpacing: 8 }}
        />
        <button onClick={check} style={btnPrimary}>確認</button>
      </div>
      {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>PIN 錯誤，請重試</div>}
      <button onClick={onBack} style={btnGhost}>← 返回</button>
    </div>
  );
}

// ─── Main Dashboard ───
export default function DashboardScreen({ onBack }) {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState("overview"); // overview | history | settings
  const [sessions, setSessions] = useState(() => loadSessions());
  const [pinInput, setPinInput] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  if (!unlocked) return <PINGate onUnlock={() => setUnlocked(true)} onBack={onBack} />;

  const refresh = () => setSessions(loadSessions());

  return (
    <div style={{ ...wrap, justifyContent: "flex-start", padding: "16px 12px", overflow: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", marginBottom: 12 }}>
        <button className="back-touch-btn" onClick={onBack} style={backBtn}>←</button>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>📊 家長儀表板</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, width: "100%" }}>
        {[["overview", "📈 總覽"], ["history", "📋 歷史"], ["settings", "⚙️ 設定"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, background: tab === k ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)", border: tab === k ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 12, fontWeight: 700, padding: "8px 0", borderRadius: 10 }}>{l}</button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab sessions={sessions} />}
      {tab === "history" && <HistoryTab sessions={sessions} />}
      {tab === "settings" && <SettingsTab pinInput={pinInput} setPinInput={setPinInput} pinMsg={pinMsg} setPinMsg={setPinMsg} sessions={sessions} refresh={refresh} />}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Overview Tab
// ═══════════════════════════════════════════════
function OverviewTab({ sessions }) {
  const insights = useMemo(() => buildDashboardInsights(sessions), [sessions]);
  const { overview: stats, weakSuggestions, weeklyReport, practiceTasks } = insights;
  const visibleOps = OPS.filter(op => stats.opData[op]?.attempted > 0 || ["+", "-", "×", "÷"].includes(op));

  return (
    <div style={{ width: "100%" }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <Card label="總遊戲次數" value={stats.totalSessions} color="#6366f1" />
        <Card label="總答題數" value={stats.totalQ} color="#8b5cf6" />
        <Card label="整體正確率" value={`${stats.overallAcc}%`} color={stats.overallAcc >= 70 ? "#22c55e" : stats.overallAcc >= 50 ? "#f59e0b" : "#ef4444"} />
        <Card label="平均回答時間" value={stats.avgTimeS === "—" ? "—" : `${stats.avgTimeS}s`} color="#3b82f6" />
      </div>

      <SectionTitle text="弱點題型建議" />
      <WeakSuggestions items={weakSuggestions} />

      <SectionTitle text="每週學習報告" />
      <WeeklyReport report={weeklyReport} />

      <SectionTitle text="練習任務推薦" />
      <PracticeTaskList tasks={practiceTasks} />

      {sessions.length === 0 && <Empty text="尚無遊戲記錄，開始遊戲後儀表板會自動更新分析。" />}

      {/* Per-operation accuracy */}
      <SectionTitle text="各運算正確率" />
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {visibleOps.map(op => {
          const d = stats.opData[op] || { attempted: 0, correct: 0, acc: 0, avgTime: 0, weak: false };
          return (
            <div key={op} style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 6px", textAlign: "center", border: d.weak ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{opIcon(op)}</div>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>{opName(op)}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: d.acc >= 70 ? "#22c55e" : d.acc >= 50 ? "#f59e0b" : "#ef4444" }}>{d.attempted > 0 ? `${d.acc}%` : "—"}</div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>{d.attempted} 題</div>
              {d.weak && <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginTop: 2 }}>⚠️ 需加強</div>}
            </div>
          );
        })}
      </div>

      {/* Accuracy trend (last 10 sessions as simple bar chart) */}
      {sessions.length >= 2 && <>
        <SectionTitle text="最近 10 場正確率趨勢" />
        <BarChart data={stats.recentAcc} />
      </>}

      {/* Per-operation avg time */}
      <SectionTitle text="各運算平均回答時間" />
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {visibleOps.map(op => {
          const d = stats.opData[op] || { attempted: 0, avgTime: 0 };
          return (
            <div key={op} style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 14 }}>{opIcon(op)}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8" }}>{d.attempted > 0 ? `${d.avgTime}s` : "—"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeakSuggestions({ items }) {
  if (!items.length) return <Empty text="目前尚無弱點建議。" />;
  return (
    <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
      {items.map((item) => (
        <div key={item.id} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 12px", textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{item.title}</div>
          <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 6 }}>{item.summary}</div>
          <div style={{ fontSize: 11, color: "#c4b5fd" }}>{item.action}</div>
        </div>
      ))}
    </div>
  );
}

function WeeklyReport({ report }) {
  const avgTimeText = report.current.avgTimeSec == null ? "—" : `${report.current.avgTimeSec.toFixed(1)}s`;
  const accDelta = formatDelta(report.delta.acc, "%");
  const qDelta = formatDelta(report.delta.questions, "題");
  const sDelta = formatDelta(report.delta.sessions, "場");
  const strongest = report.current.strongest;
  const weakest = report.current.weakest;

  return (
    <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px", marginBottom: 14, textAlign: "left" }}>
      <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 6 }}>{report.range.startLabel} - {report.range.endLabel}</div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{report.headline}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <MiniCard label="本週場次" value={`${report.current.sessions}`} />
        <MiniCard label="本週題數" value={`${report.current.totalQ}`} />
        <MiniCard label="本週正確率" value={`${report.current.acc}%`} />
        <MiniCard label="平均作答" value={avgTimeText} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <DeltaPill label="正確率" value={accDelta} />
        <DeltaPill label="題量" value={qDelta} />
        <DeltaPill label="場次" value={sDelta} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Tag text={strongest ? `強項 ${strongest.icon}${strongest.label} ${strongest.acc}%` : "強項資料不足"} color="rgba(34,197,94,0.2)" />
        <Tag text={weakest ? `弱項 ${weakest.icon}${weakest.label} ${weakest.acc}%` : "弱項資料不足"} color="rgba(239,68,68,0.2)" />
      </div>
    </div>
  );
}

function PracticeTaskList({ tasks }) {
  if (!tasks.length) return <Empty text="目前尚無任務建議。" />;
  return (
    <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
      {tasks.map((task, i) => (
        <div key={task.id} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 12px", textAlign: "left" }}>
          <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 2 }}>任務 {i + 1}</div>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{task.title}</div>
          <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 6 }}>{task.summary}</div>
          <div style={{ fontSize: 11, color: "#93c5fd", marginBottom: 8 }}>目標：{task.goal}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(task.focusOps || []).slice(0, 4).map(op => (
              <span key={`${task.id}-${op}`} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {opIcon(op)} {opName(op)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
// History Tab
// ═══════════════════════════════════════════════
function HistoryTab({ sessions }) {
  if (sessions.length === 0) return <Empty text="尚無遊戲記錄。" />;
  const sorted = [...sessions].reverse(); // newest first

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 8 }}>共 {sessions.length} 場（最新在前）</div>
      {sorted.map((s, i) => {
        const acc = s.tC + s.tW > 0 ? Math.round(s.tC / (s.tC + s.tW) * 100) : 0;
        const dt = new Date(s.startTime);
        return (
          <div key={s.id || i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px", marginBottom: 6, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                {s.starterName || "—"} {s.timedMode ? "⏱️" : "⚔️"} {s.completed ? "✅通關" : `💀第${s.defeated}關`}
              </div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>{dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
              <span>正確率 <b style={{ color: acc >= 70 ? "#22c55e" : "#f59e0b" }}>{acc}%</b></span>
              <span>答對 <b style={{ color: "#22c55e" }}>{s.tC}</b></span>
              <span>答錯 <b style={{ color: "#ef4444" }}>{s.tW}</b></span>
              <span>連擊 <b style={{ color: "#f97316" }}>{s.maxStreak}</b></span>
              <span>Lv.<b>{s.finalLevel}</b></span>
            </div>
            {/* Mini op breakdown */}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {["+", "-", "×", "÷"].map(op => {
                const od = s.opStats?.[op];
                if (!od || od.attempted === 0) return null;
                const oa = Math.round(od.correct / od.attempted * 100);
                return <span key={op} style={{ fontSize: 10, background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 6, color: oa >= 70 ? "#22c55e" : oa >= 50 ? "#f59e0b" : "#ef4444" }}>{opIcon(op)} {oa}%</span>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Settings Tab
// ═══════════════════════════════════════════════
function SettingsTab({ pinInput, setPinInput, pinMsg, setPinMsg, sessions, refresh }) {
  const [confirmClear, setConfirmClear] = useState(false);

  const handlePinChange = () => {
    if (pinInput.length < 4) { setPinMsg("PIN 至少 4 位數"); return; }
    savePin(pinInput);
    setPinMsg("✅ PIN 已更新");
    setPinInput("");
  };

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearSessions();
    refresh();
    setConfirmClear(false);
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Change PIN */}
      <SectionTitle text="更改 PIN" />
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <input
          type="password" inputMode="numeric" maxLength={6}
          value={pinInput} onChange={e => { setPinInput(e.target.value); setPinMsg(""); }}
          placeholder="新 PIN"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "white", fontSize: 16, fontWeight: 700, padding: "8px 12px", width: 100, outline: "none", textAlign: "center", letterSpacing: 4 }}
        />
        <button onClick={handlePinChange} style={btnPrimary}>更新</button>
      </div>
      {pinMsg && <div style={{ fontSize: 12, color: pinMsg.startsWith("✅") ? "#22c55e" : "#ef4444", marginBottom: 12 }}>{pinMsg}</div>}

      {/* Clear data */}
      <SectionTitle text="資料管理" />
      <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 8 }}>目前共 {sessions.length} 場記錄</div>
      <button onClick={handleClear} style={{ ...btnGhost, border: "1px solid #ef4444", color: "#ef4444" }}>
        {confirmClear ? "⚠️ 確認清除所有記錄？" : "🗑️ 清除所有遊戲記錄"}
      </button>
      {confirmClear && <button onClick={() => setConfirmClear(false)} style={{ ...btnGhost, marginTop: 6 }}>取消</button>}

      <div style={{ marginTop: 20, fontSize: 10, opacity: 0.3, lineHeight: 1.8 }}>
        <div>• 遊戲數據自動記錄於裝置本地（localStorage）</div>
        <div>• 最多保留最近 100 場記錄</div>
        <div>• 清除瀏覽器資料會導致記錄遺失</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Shared UI helpers
// ═══════════════════════════════════════════════

const PAGE_BG = "linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)";
const wrap = { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: PAGE_BG, color: "white", padding: 24, textAlign: "center" };
const btnPrimary = { background: "linear-gradient(135deg,#6366f1,#a855f7)", border: "none", color: "white", fontSize: 14, fontWeight: 700, padding: "10px 20px", borderRadius: 12, cursor: "pointer" };
const btnGhost = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 13, fontWeight: 600, padding: "8px 18px", borderRadius: 10, cursor: "pointer" };
const backBtn = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 16, fontWeight: 700, width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };

function Card({ label, value, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 8px", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SectionTitle({ text }) {
  return <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.6, marginBottom: 8, textAlign: "left", width: "100%" }}>{text}</div>;
}

function Empty({ text }) {
  return <div style={{ textAlign: "center", opacity: 0.4, fontSize: 13, marginTop: 40 }}>{text}</div>;
}

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, marginBottom: 14, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 9, color: d.value >= 70 ? "#22c55e" : d.value >= 50 ? "#f59e0b" : "#ef4444", fontWeight: 700, marginBottom: 2 }}>{d.value}%</div>
          <div style={{ width: "100%", height: `${Math.max(4, d.value / max * 60)}px`, background: d.value >= 70 ? "#22c55e" : d.value >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 4, transition: "height 0.3s" }} />
          <div style={{ fontSize: 8, opacity: 0.3, marginTop: 2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.45 }}>{label}</div>
    </div>
  );
}

function DeltaPill({ label, value }) {
  const isUp = value.startsWith("+");
  const isFlat = value === "—";
  const color = isFlat ? "rgba(148,163,184,0.25)" : isUp ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
  return (
    <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: color, border: "1px solid rgba(255,255,255,0.14)" }}>
      {label} {value}
    </span>
  );
}

function Tag({ text, color }) {
  return (
    <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 999, background: color, border: "1px solid rgba(255,255,255,0.14)" }}>
      {text}
    </span>
  );
}

function formatDelta(value, unit) {
  if (value == null || Number.isNaN(value)) return "—";
  if (value === 0) return `0${unit}`;
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}${unit}`;
}
