/**
 * DashboardScreen — Parent analytics dashboard.
 *
 * Shows per-operation accuracy rates, response-time trends,
 * session history, and weak-area indicators.
 * Protected by a 4-digit PIN.
 */
import { useMemo, useState } from 'react';
import type { ChangeEvent, CSSProperties, KeyboardEvent } from 'react';
import { loadSessions, clearSessions, loadPin, savePin } from '../../utils/sessionLogger';
import {
  OPS,
  buildDashboardInsights,
  opIcon,
  opName,
} from '../../utils/dashboardInsights';

type DashboardOp =
  | '+' | '-' | '×' | '÷'
  | 'mixed2' | 'mixed3' | 'mixed4'
  | 'unknown1' | 'unknown2' | 'unknown3' | 'unknown4';

type DashboardTab = 'overview' | 'history' | 'settings';

type SessionOpStat = {
  attempted: number;
  correct: number;
  totalMs: number;
};

type DashboardSession = {
  id?: string;
  startTime: number;
  starterName?: string | null;
  timedMode?: boolean;
  completed?: boolean;
  defeated?: number;
  finalLevel?: number;
  maxStreak?: number;
  tC: number;
  tW: number;
  opStats?: Partial<Record<DashboardOp, SessionOpStat>>;
};

type GroupMetric = {
  id: string;
  label: string;
  icon: string;
  ops: DashboardOp[];
  attempted: number;
  correct: number;
  totalMs: number;
  acc: number;
  avgTimeSec: number | null;
  weaknessScore: number;
};

type OverviewOpData = {
  attempted: number;
  correct: number;
  totalMs: number;
  acc: number;
  avgTimeSec: number | null;
  avgTime: string;
  weak: boolean;
};

type OverviewStats = {
  totalSessions: number;
  totalQ: number;
  overallAcc: number;
  avgTimeS: string;
  opData: Record<DashboardOp, OverviewOpData>;
  recentAcc: { label: string; value: number }[];
  groupData: GroupMetric[];
};

type WeakSuggestion = {
  id: string;
  groupId: string;
  icon: string;
  label: string;
  title: string;
  summary: string;
  action: string;
  focusOps: DashboardOp[];
  score: number;
};

type WeeklyPeriod = {
  sessions: number;
  activeDays: number;
  totalQ: number;
  totalC: number;
  totalW: number;
  acc: number;
  avgTimeSec: number | null;
  groupData: GroupMetric[];
  strongest: GroupMetric | null;
  weakest: GroupMetric | null;
};

type WeeklyReport = {
  range: {
    start: number;
    end: number;
    startLabel: string;
    endLabel: string;
  };
  current: WeeklyPeriod;
  previous: WeeklyPeriod;
  delta: {
    acc: number | null;
    questions: number;
    sessions: number;
  };
  headline: string;
};

type PracticeTask = {
  id: string;
  title: string;
  summary: string;
  goal: string;
  focusOps: DashboardOp[];
  level: string;
};

type DashboardInsights = {
  overview: OverviewStats;
  weakSuggestions: WeakSuggestion[];
  weeklyReport: WeeklyReport;
  practiceTasks: PracticeTask[];
};

const OPS_TYPED = OPS as DashboardOp[];
const CORE_OPS: DashboardOp[] = ['+', '-', '×', '÷'];
const loadSessionsTyped = loadSessions as () => DashboardSession[];
const clearSessionsTyped = clearSessions as () => void;
const loadPinTyped = loadPin as () => string;
const savePinTyped = savePin as (pin: string) => void;
const buildDashboardInsightsTyped = buildDashboardInsights as (sessions: DashboardSession[]) => DashboardInsights;
const opIconTyped = opIcon as (op: DashboardOp) => string;
const opNameTyped = opName as (op: DashboardOp) => string;

// ─── PIN Gate ───
type PINGateProps = {
  onUnlock: () => void;
  onBack: () => void;
};

function PINGate({ onUnlock, onBack }: PINGateProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const pin = loadPinTyped();

  const check = () => {
    if (input === pin) onUnlock();
    else { setError(true); setInput(''); }
  };

  return (
    <div style={wrap}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>家長專區</div>
      <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 20 }}>請輸入 PIN（預設 1234）</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setInput(e.target.value); setError(false); }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') check(); }}
          style={{ background: 'rgba(255,255,255,0.1)', border: error ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: 'white', fontSize: 24, fontWeight: 700, padding: '8px 12px', textAlign: 'center', width: 120, outline: 'none', letterSpacing: 8 }}
        />
        <button onClick={check} style={btnPrimary}>確認</button>
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>PIN 錯誤，請重試</div>}
      <button onClick={onBack} style={btnGhost}>← 返回</button>
    </div>
  );
}

// ─── Main Dashboard ───
type DashboardScreenProps = {
  onBack: () => void;
};

export default function DashboardScreen({ onBack }: DashboardScreenProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [sessions, setSessions] = useState<DashboardSession[]>(() => loadSessionsTyped());
  const [pinInput, setPinInput] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  if (!unlocked) return <PINGate onUnlock={() => setUnlocked(true)} onBack={onBack} />;

  const refresh = () => setSessions(loadSessionsTyped());
  const tabs: Array<{ key: DashboardTab; label: string }> = [
    { key: 'overview', label: '📈 總覽' },
    { key: 'history', label: '📋 歷史' },
    { key: 'settings', label: '⚙️ 設定' },
  ];

  return (
    <div style={{ ...wrap, justifyContent: 'flex-start', padding: '16px 12px', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 12 }}>
        <button className="back-touch-btn" onClick={onBack} style={backBtn}>←</button>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>📊 家長儀表板</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, width: '100%' }}>
        {tabs.map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)} style={{ flex: 1, background: tab === item.key ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)', border: tab === item.key ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12, fontWeight: 700, padding: '8px 0', borderRadius: 10 }}>{item.label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab sessions={sessions} />}
      {tab === 'history' && <HistoryTab sessions={sessions} />}
      {tab === 'settings' && <SettingsTab pinInput={pinInput} setPinInput={setPinInput} pinMsg={pinMsg} setPinMsg={setPinMsg} sessions={sessions} refresh={refresh} />}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Overview Tab
// ═══════════════════════════════════════════════
type OverviewTabProps = {
  sessions: DashboardSession[];
};

function OverviewTab({ sessions }: OverviewTabProps) {
  const insights = useMemo(() => buildDashboardInsightsTyped(sessions), [sessions]);
  const { overview: stats, weakSuggestions, weeklyReport, practiceTasks } = insights;
  const visibleOps = OPS_TYPED.filter((op) => stats.opData[op]?.attempted > 0 || CORE_OPS.includes(op));

  return (
    <div style={{ width: '100%' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <Card label="總遊戲次數" value={stats.totalSessions} color="#6366f1" />
        <Card label="總答題數" value={stats.totalQ} color="#8b5cf6" />
        <Card label="整體正確率" value={`${stats.overallAcc}%`} color={stats.overallAcc >= 70 ? '#22c55e' : stats.overallAcc >= 50 ? '#f59e0b' : '#ef4444'} />
        <Card label="平均回答時間" value={stats.avgTimeS === '—' ? '—' : `${stats.avgTimeS}s`} color="#3b82f6" />
      </div>

      <SectionTitle text="弱點題型建議" />
      <WeakSuggestions items={weakSuggestions} />

      <SectionTitle text="每週學習報告" />
      <WeeklyReportView report={weeklyReport} />

      <SectionTitle text="練習任務推薦" />
      <PracticeTaskList tasks={practiceTasks} />

      {sessions.length === 0 && <Empty text="尚無遊戲記錄，開始遊戲後儀表板會自動更新分析。" />}

      {/* Per-operation accuracy */}
      <SectionTitle text="各運算正確率" />
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {visibleOps.map((op) => {
          const d = stats.opData[op] || { attempted: 0, correct: 0, totalMs: 0, acc: 0, avgTimeSec: null, avgTime: '—', weak: false };
          return (
            <div key={op} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 6px', textAlign: 'center', border: d.weak ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{opIconTyped(op)}</div>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>{opNameTyped(op)}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: d.acc >= 70 ? '#22c55e' : d.acc >= 50 ? '#f59e0b' : '#ef4444' }}>{d.attempted > 0 ? `${d.acc}%` : '—'}</div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>{d.attempted} 題</div>
              {d.weak && <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginTop: 2 }}>⚠️ 需加強</div>}
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {visibleOps.map((op) => {
          const d = stats.opData[op] || { attempted: 0, correct: 0, totalMs: 0, acc: 0, avgTimeSec: null, avgTime: '—', weak: false };
          return (
            <div key={op} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 14 }}>{opIconTyped(op)}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>{d.attempted > 0 ? `${d.avgTime}s` : '—'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type WeakSuggestionsProps = {
  items: WeakSuggestion[];
};

function WeakSuggestions({ items }: WeakSuggestionsProps) {
  if (!items.length) return <Empty text="目前尚無弱點建議。" />;
  return (
    <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
      {items.map((item) => (
        <div key={item.id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px', textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{item.title}</div>
          <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 6 }}>{item.summary}</div>
          <div style={{ fontSize: 11, color: '#c4b5fd' }}>{item.action}</div>
        </div>
      ))}
    </div>
  );
}

type WeeklyReportProps = {
  report: WeeklyReport;
};

function WeeklyReportView({ report }: WeeklyReportProps) {
  const avgTimeText = report.current.avgTimeSec == null ? '—' : `${report.current.avgTimeSec.toFixed(1)}s`;
  const accDelta = formatDelta(report.delta.acc, '%');
  const qDelta = formatDelta(report.delta.questions, '題');
  const sDelta = formatDelta(report.delta.sessions, '場');
  const strongest = report.current.strongest;
  const weakest = report.current.weakest;

  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px', marginBottom: 14, textAlign: 'left' }}>
      <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 6 }}>{report.range.startLabel} - {report.range.endLabel}</div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{report.headline}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <MiniCard label="本週場次" value={`${report.current.sessions}`} />
        <MiniCard label="本週題數" value={`${report.current.totalQ}`} />
        <MiniCard label="本週正確率" value={`${report.current.acc}%`} />
        <MiniCard label="平均作答" value={avgTimeText} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <DeltaPill label="正確率" value={accDelta} />
        <DeltaPill label="題量" value={qDelta} />
        <DeltaPill label="場次" value={sDelta} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Tag text={strongest ? `強項 ${strongest.icon}${strongest.label} ${strongest.acc}%` : '強項資料不足'} color="rgba(34,197,94,0.2)" />
        <Tag text={weakest ? `弱項 ${weakest.icon}${weakest.label} ${weakest.acc}%` : '弱項資料不足'} color="rgba(239,68,68,0.2)" />
      </div>
    </div>
  );
}

type PracticeTaskListProps = {
  tasks: PracticeTask[];
};

function PracticeTaskList({ tasks }: PracticeTaskListProps) {
  if (!tasks.length) return <Empty text="目前尚無任務建議。" />;
  return (
    <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
      {tasks.map((task, i) => (
        <div key={task.id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px', textAlign: 'left' }}>
          <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 2 }}>任務 {i + 1}</div>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{task.title}</div>
          <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 6 }}>{task.summary}</div>
          <div style={{ fontSize: 11, color: '#93c5fd', marginBottom: 8 }}>目標：{task.goal}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(task.focusOps || []).slice(0, 4).map((op) => (
              <span key={`${task.id}-${op}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {opIconTyped(op)} {opNameTyped(op)}
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
type HistoryTabProps = {
  sessions: DashboardSession[];
};

function HistoryTab({ sessions }: HistoryTabProps) {
  if (sessions.length === 0) return <Empty text="尚無遊戲記錄。" />;
  const sorted = [...sessions].reverse(); // newest first

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 8 }}>共 {sessions.length} 場（最新在前）</div>
      {sorted.map((s, i) => {
        const correct = Number(s.tC) || 0;
        const wrong = Number(s.tW) || 0;
        const acc = correct + wrong > 0 ? Math.round(correct / (correct + wrong) * 100) : 0;
        const dt = new Date(Number(s.startTime) || 0);
        return (
          <div key={s.id || i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', marginBottom: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                {s.starterName || '—'} {s.timedMode ? '⏱️' : '⚔️'} {s.completed ? '✅通關' : `💀第${s.defeated || 0}關`}
              </div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>{dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span>正確率 <b style={{ color: acc >= 70 ? '#22c55e' : '#f59e0b' }}>{acc}%</b></span>
              <span>答對 <b style={{ color: '#22c55e' }}>{correct}</b></span>
              <span>答錯 <b style={{ color: '#ef4444' }}>{wrong}</b></span>
              <span>連擊 <b style={{ color: '#f97316' }}>{s.maxStreak || 0}</b></span>
              <span>Lv.<b>{s.finalLevel || 1}</b></span>
            </div>
            {/* Mini op breakdown */}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {CORE_OPS.map((op) => {
                const od = s.opStats?.[op];
                if (!od || od.attempted === 0) return null;
                const oa = Math.round(od.correct / od.attempted * 100);
                return <span key={op} style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 6, color: oa >= 70 ? '#22c55e' : oa >= 50 ? '#f59e0b' : '#ef4444' }}>{opIconTyped(op)} {oa}%</span>;
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
type SettingsTabProps = {
  pinInput: string;
  setPinInput: (value: string) => void;
  pinMsg: string;
  setPinMsg: (value: string) => void;
  sessions: DashboardSession[];
  refresh: () => void;
};

function SettingsTab({ pinInput, setPinInput, pinMsg, setPinMsg, sessions, refresh }: SettingsTabProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const handlePinChange = () => {
    if (pinInput.length < 4) { setPinMsg('PIN 至少 4 位數'); return; }
    savePinTyped(pinInput);
    setPinMsg('✅ PIN 已更新');
    setPinInput('');
  };

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearSessionsTyped();
    refresh();
    setConfirmClear(false);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Change PIN */}
      <SectionTitle text="更改 PIN" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pinInput}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setPinInput(e.target.value); setPinMsg(''); }}
          placeholder="新 PIN"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: 'white', fontSize: 16, fontWeight: 700, padding: '8px 12px', width: 100, outline: 'none', textAlign: 'center', letterSpacing: 4 }}
        />
        <button onClick={handlePinChange} style={btnPrimary}>更新</button>
      </div>
      {pinMsg && <div style={{ fontSize: 12, color: pinMsg.startsWith('✅') ? '#22c55e' : '#ef4444', marginBottom: 12 }}>{pinMsg}</div>}

      {/* Clear data */}
      <SectionTitle text="資料管理" />
      <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 8 }}>目前共 {sessions.length} 場記錄</div>
      <button onClick={handleClear} style={{ ...btnGhost, border: '1px solid #ef4444', color: '#ef4444' }}>
        {confirmClear ? '⚠️ 確認清除所有記錄？' : '🗑️ 清除所有遊戲記錄'}
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

const PAGE_BG = 'linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)';
const wrap: CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: PAGE_BG, color: 'white', padding: 24, textAlign: 'center' };
const btnPrimary: CSSProperties = { background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, padding: '10px 20px', borderRadius: 12, cursor: 'pointer' };
const btnGhost: CSSProperties = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 10, cursor: 'pointer' };
const backBtn: CSSProperties = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 16, fontWeight: 700, width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };

type CardProps = {
  label: string;
  value: string | number;
  color: string;
};

function Card({ label, value, color }: CardProps) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}

type SectionTitleProps = {
  text: string;
};

function SectionTitle({ text }: SectionTitleProps) {
  return <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.6, marginBottom: 8, textAlign: 'left', width: '100%' }}>{text}</div>;
}

type EmptyProps = {
  text: string;
};

function Empty({ text }: EmptyProps) {
  return <div style={{ textAlign: 'center', opacity: 0.4, fontSize: 13, marginTop: 40 }}>{text}</div>;
}

type BarPoint = {
  label: string;
  value: number;
};

type BarChartProps = {
  data: BarPoint[];
};

function BarChart({ data }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginBottom: 14, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 9, color: d.value >= 70 ? '#22c55e' : d.value >= 50 ? '#f59e0b' : '#ef4444', fontWeight: 700, marginBottom: 2 }}>{d.value}%</div>
          <div style={{ width: '100%', height: `${Math.max(4, d.value / max * 60)}px`, background: d.value >= 70 ? '#22c55e' : d.value >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 4, transition: 'height 0.3s' }} />
          <div style={{ fontSize: 8, opacity: 0.3, marginTop: 2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

type MiniCardProps = {
  label: string;
  value: string;
};

function MiniCard({ label, value }: MiniCardProps) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.45 }}>{label}</div>
    </div>
  );
}

type DeltaPillProps = {
  label: string;
  value: string;
};

function DeltaPill({ label, value }: DeltaPillProps) {
  const isUp = value.startsWith('+');
  const isFlat = value === '—';
  const color = isFlat ? 'rgba(148,163,184,0.25)' : isUp ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)';
  return (
    <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 999, background: color, border: '1px solid rgba(255,255,255,0.14)' }}>
      {label} {value}
    </span>
  );
}

type TagProps = {
  text: string;
  color: string;
};

function Tag({ text, color }: TagProps) {
  return (
    <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 999, background: color, border: '1px solid rgba(255,255,255,0.14)' }}>
      {text}
    </span>
  );
}

function formatDelta(value: number | null, unit: string) {
  if (value == null || Number.isNaN(value)) return '—';
  if (value === 0) return `0${unit}`;
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value}${unit}`;
}
