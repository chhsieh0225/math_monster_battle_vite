/**
 * DashboardScreen — Parent analytics dashboard.
 *
 * Shows per-operation accuracy rates, response-time trends,
 * session history, and weak-area indicators.
 * Protected by a 4-digit PIN.
 */
import { useMemo, useState } from 'react';
import type { ChangeEvent, CSSProperties, KeyboardEvent } from 'react';
import { loadSessions, clearSessions, loadPin, savePin } from '../../utils/sessionLogger.ts';
import { useI18n } from '../../i18n';
import { localizeStarterDisplayName } from '../../utils/contentLocalization';
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
  starterId?: string | null;
  starterName?: string | null;
  starterStageIdx?: number | null;
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

type DashboardTranslate = (
  key: string,
  fallback?: string,
  params?: Record<string, string | number>,
) => string;

const OPS_TYPED = OPS as DashboardOp[];
const CORE_OPS: DashboardOp[] = ['+', '-', '×', '÷'];
const loadSessionsTyped: () => DashboardSession[] = loadSessions;
const clearSessionsTyped: () => void = clearSessions;
const loadPinTyped: () => string = loadPin;
const savePinTyped: (pin: string) => void = savePin;
const buildDashboardInsightsTyped = buildDashboardInsights as (
  sessions: DashboardSession[],
  options?: { t?: DashboardTranslate },
) => DashboardInsights;
const opIconTyped = opIcon as (op: DashboardOp) => string;
const opNameTyped = opName as (
  op: DashboardOp,
  options?: { t?: DashboardTranslate },
) => string;

// ─── PIN Gate ───
type PINGateProps = {
  onUnlock: () => void;
  onBack: () => void;
};

function PINGate({ onUnlock, onBack }: PINGateProps) {
  const { t } = useI18n();
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
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{t("dashboard.pin.title", "Parent Area")}</div>
      <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 20 }}>{t("dashboard.pin.subtitle", "Please enter PIN (default 1234)")}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setInput(e.target.value); setError(false); }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') check(); }}
          aria-label={t("dashboard.a11y.pinInput", "PIN input")}
          style={{ background: 'rgba(255,255,255,0.1)', border: error ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: 'white', fontSize: 24, fontWeight: 700, padding: '8px 12px', textAlign: 'center', width: 120, outline: 'none', letterSpacing: 8 }}
        />
        <button onClick={check} aria-label={t("dashboard.a11y.pinConfirm", "Confirm PIN")} style={btnPrimary}>{t("common.confirm", "Confirm")}</button>
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{t("dashboard.pin.error", "Wrong PIN, please try again")}</div>}
      <button onClick={onBack} aria-label={t("a11y.common.backToTitle", "Back to title")} style={btnGhost}>← {t("common.back", "Back")}</button>
    </div>
  );
}

// ─── Main Dashboard ───
type DashboardScreenProps = {
  onBack: () => void;
};

export default function DashboardScreen({ onBack }: DashboardScreenProps) {
  const { t } = useI18n();
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [sessions, setSessions] = useState<DashboardSession[]>(() => loadSessionsTyped());
  const [pinInput, setPinInput] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  if (!unlocked) return <PINGate onUnlock={() => setUnlocked(true)} onBack={onBack} />;

  const refresh = () => setSessions(loadSessionsTyped());
  const tabs: Array<{ key: DashboardTab; label: string }> = [
    { key: 'overview', label: `📈 ${t("dashboard.tab.overview", "Overview")}` },
    { key: 'history', label: `📋 ${t("dashboard.tab.history", "History")}` },
    { key: 'settings', label: `⚙️ ${t("dashboard.tab.settings", "Settings")}` },
  ];

  return (
    <div style={{ ...wrap, justifyContent: 'flex-start', padding: '16px 12px', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 12 }}>
        <button className="back-touch-btn" onClick={onBack} aria-label={t("a11y.common.backToTitle", "Back to title")} style={backBtn}>←</button>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>📊 {t("dashboard.title", "Parent Dashboard")}</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, width: '100%' }}>
        {tabs.map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)} aria-label={item.label} style={{ flex: 1, background: tab === item.key ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)', border: tab === item.key ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12, fontWeight: 700, padding: '8px 0', borderRadius: 10 }}>{item.label}</button>
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
  const { t } = useI18n();
  const insights = useMemo(() => buildDashboardInsightsTyped(sessions, { t }), [sessions, t]);
  const { overview: stats, weakSuggestions, weeklyReport, practiceTasks } = insights;
  const visibleOps = OPS_TYPED.filter((op) => stats.opData[op]?.attempted > 0 || CORE_OPS.includes(op));

  return (
    <div style={{ width: '100%' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <Card label={t("dashboard.card.sessions", "Total Sessions")} value={stats.totalSessions} color="#6366f1" />
        <Card label={t("dashboard.card.questions", "Total Questions")} value={stats.totalQ} color="#8b5cf6" />
        <Card label={t("dashboard.card.acc", "Overall Accuracy")} value={`${stats.overallAcc}%`} color={stats.overallAcc >= 70 ? '#22c55e' : stats.overallAcc >= 50 ? '#f59e0b' : '#ef4444'} />
        <Card label={t("dashboard.card.avgTime", "Average Response Time")} value={stats.avgTimeS === '—' ? '—' : `${stats.avgTimeS}s`} color="#3b82f6" />
      </div>

      <SectionTitle text={t("dashboard.section.weak", "Weak Area Suggestions")} />
      <WeakSuggestions items={weakSuggestions} />

      <SectionTitle text={t("dashboard.section.weekly", "Weekly Report")} />
      <WeeklyReportView report={weeklyReport} />

      <SectionTitle text={t("dashboard.section.practice", "Practice Tasks")} />
      <PracticeTaskList tasks={practiceTasks} />

      {sessions.length === 0 && <Empty text={t("dashboard.empty.overview", "No records yet. Start playing to generate analytics.")} />}

      {/* Per-operation accuracy */}
      <SectionTitle text={t("dashboard.section.opAcc", "Accuracy by Operation")} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {visibleOps.map((op) => {
          const d = stats.opData[op] || { attempted: 0, correct: 0, totalMs: 0, acc: 0, avgTimeSec: null, avgTime: '—', weak: false };
          return (
            <div key={op} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 6px', textAlign: 'center', border: d.weak ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{opIconTyped(op)}</div>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>{opNameTyped(op, { t })}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: d.acc >= 70 ? '#22c55e' : d.acc >= 50 ? '#f59e0b' : '#ef4444' }}>{d.attempted > 0 ? `${d.acc}%` : '—'}</div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>{t("dashboard.attemptedCount", "{count} items", { count: d.attempted })}</div>
              {d.weak && <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginTop: 2 }}>⚠️ {t("dashboard.weakTag", "Needs Practice")}</div>}
            </div>
          );
        })}
      </div>

      {/* Accuracy trend (last 10 sessions as simple bar chart) */}
      {sessions.length >= 2 && <>
        <SectionTitle text={t("dashboard.section.trend", "Recent 10-Session Accuracy Trend")} />
        <BarChart data={stats.recentAcc} />
      </>}

      {/* Per-operation avg time */}
      <SectionTitle text={t("dashboard.section.opTime", "Average Time by Operation")} />
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
  const { t } = useI18n();
  if (!items.length) return <Empty text={t("dashboard.empty.weak", "No weak-area suggestions yet.")} />;
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
  const { t } = useI18n();
  const avgTimeText = report.current.avgTimeSec == null ? '—' : `${report.current.avgTimeSec.toFixed(1)}s`;
  const accDelta = formatDelta(report.delta.acc, '%');
  const qDelta = formatDelta(report.delta.questions, t("dashboard.unit.items", " items"));
  const sDelta = formatDelta(report.delta.sessions, t("dashboard.unit.sessions", " sessions"));
  const strongest = report.current.strongest;
  const weakest = report.current.weakest;

  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px', marginBottom: 14, textAlign: 'left' }}>
      <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 6 }}>{report.range.startLabel} - {report.range.endLabel}</div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{report.headline}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <MiniCard label={t("dashboard.weekly.sessions", "This Week Sessions")} value={`${report.current.sessions}`} />
        <MiniCard label={t("dashboard.weekly.questions", "This Week Questions")} value={`${report.current.totalQ}`} />
        <MiniCard label={t("dashboard.weekly.acc", "This Week Accuracy")} value={`${report.current.acc}%`} />
        <MiniCard label={t("dashboard.weekly.avgTime", "Average Time")} value={avgTimeText} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <DeltaPill label={t("dashboard.delta.acc", "Accuracy")} value={accDelta} />
        <DeltaPill label={t("dashboard.delta.questions", "Questions")} value={qDelta} />
        <DeltaPill label={t("dashboard.delta.sessions", "Sessions")} value={sDelta} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Tag text={strongest ? t("dashboard.weekly.strong", "Strong: {label} {acc}%", { label: `${strongest.icon}${strongest.label}`, acc: strongest.acc }) : t("dashboard.weekly.strongEmpty", "Strong area data unavailable")} color="rgba(34,197,94,0.2)" />
        <Tag text={weakest ? t("dashboard.weekly.weak", "Weak: {label} {acc}%", { label: `${weakest.icon}${weakest.label}`, acc: weakest.acc }) : t("dashboard.weekly.weakEmpty", "Weak area data unavailable")} color="rgba(239,68,68,0.2)" />
      </div>
    </div>
  );
}

type PracticeTaskListProps = {
  tasks: PracticeTask[];
};

function PracticeTaskList({ tasks }: PracticeTaskListProps) {
  const { t } = useI18n();
  if (!tasks.length) return <Empty text={t("dashboard.empty.practice", "No practice tasks yet.")} />;
  return (
    <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
      {tasks.map((task, i) => (
        <div key={task.id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px', textAlign: 'left' }}>
          <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 2 }}>{t("dashboard.task.index", "Task {index}", { index: i + 1 })}</div>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{task.title}</div>
          <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 6 }}>{task.summary}</div>
          <div style={{ fontSize: 11, color: '#93c5fd', marginBottom: 8 }}>{t("dashboard.task.goal", "Goal: {goal}", { goal: task.goal })}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(task.focusOps || []).slice(0, 4).map((op) => (
              <span key={`${task.id}-${op}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {opIconTyped(op)} {opNameTyped(op, { t })}
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
  const { t, locale } = useI18n();
  if (sessions.length === 0) return <Empty text={t("dashboard.empty.history", "No game records yet.")} />;
  const sorted = [...sessions].reverse(); // newest first

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 8 }}>{t("dashboard.history.total", "{count} sessions (newest first)", { count: sessions.length })}</div>
      {sorted.map((s, i) => {
        const correct = Number(s.tC) || 0;
        const wrong = Number(s.tW) || 0;
        const acc = correct + wrong > 0 ? Math.round(correct / (correct + wrong) * 100) : 0;
        const dt = new Date(Number(s.startTime) || 0);
        const starterName = String(localizeStarterDisplayName(
          s.starterName,
          s.starterId,
          locale,
          s.starterStageIdx,
        ) || '—');
        return (
          <div key={s.id || i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', marginBottom: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                {starterName} {s.timedMode ? '⏱️' : '⚔️'} {s.completed ? t("dashboard.history.clear", "✅Cleared") : t("dashboard.history.stage", "💀Stage {stage}", { stage: s.defeated || 0 })}
              </div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>{dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span>{t("dashboard.history.acc", "Accuracy")} <b style={{ color: acc >= 70 ? '#22c55e' : '#f59e0b' }}>{acc}%</b></span>
              <span>{t("dashboard.history.correct", "Correct")} <b style={{ color: '#22c55e' }}>{correct}</b></span>
              <span>{t("dashboard.history.wrong", "Wrong")} <b style={{ color: '#ef4444' }}>{wrong}</b></span>
              <span>{t("dashboard.history.streak", "Streak")} <b style={{ color: '#f97316' }}>{s.maxStreak || 0}</b></span>
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
  const { t } = useI18n();
  const [confirmClear, setConfirmClear] = useState(false);

  const handlePinChange = () => {
    if (pinInput.length < 4) { setPinMsg(t("dashboard.pin.tooShort", "PIN must be at least 4 digits")); return; }
    savePinTyped(pinInput);
    setPinMsg(t("dashboard.pin.updated", "✅ PIN updated"));
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
      <SectionTitle text={t("dashboard.settings.changePin", "Change PIN")} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pinInput}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setPinInput(e.target.value); setPinMsg(''); }}
          placeholder={t("dashboard.settings.newPin", "New PIN")}
          aria-label={t("dashboard.a11y.newPin", "New PIN")}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: 'white', fontSize: 16, fontWeight: 700, padding: '8px 12px', width: 100, outline: 'none', textAlign: 'center', letterSpacing: 4 }}
        />
        <button onClick={handlePinChange} aria-label={t("dashboard.a11y.updatePin", "Update PIN")} style={btnPrimary}>{t("dashboard.settings.update", "Update")}</button>
      </div>
      {pinMsg && <div style={{ fontSize: 12, color: pinMsg.startsWith('✅') ? '#22c55e' : '#ef4444', marginBottom: 12 }}>{pinMsg}</div>}

      {/* Clear data */}
      <SectionTitle text={t("dashboard.settings.data", "Data Management")} />
      <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 8 }}>{t("dashboard.settings.recordCount", "{count} records currently", { count: sessions.length })}</div>
      <button onClick={handleClear} aria-label={t("dashboard.a11y.clearRecords", "Clear all records")} style={{ ...btnGhost, border: '1px solid #ef4444', color: '#ef4444' }}>
        {confirmClear ? t("dashboard.settings.clearConfirm", "⚠️ Confirm clear all records?") : t("dashboard.settings.clear", "🗑️ Clear all game records")}
      </button>
      {confirmClear && <button onClick={() => setConfirmClear(false)} aria-label={t("common.cancel", "Cancel")} style={{ ...btnGhost, marginTop: 6 }}>{t("common.cancel", "Cancel")}</button>}

      <div style={{ marginTop: 20, fontSize: 10, opacity: 0.3, lineHeight: 1.8 }}>
        <div>{t("dashboard.settings.note1", "• Game data is stored locally (localStorage)")}</div>
        <div>{t("dashboard.settings.note2", "• Up to the latest 100 records are kept")}</div>
        <div>{t("dashboard.settings.note3", "• Clearing browser data will erase records")}</div>
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
