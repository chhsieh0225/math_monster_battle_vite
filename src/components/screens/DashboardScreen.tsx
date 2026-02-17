/**
 * DashboardScreen — Parent analytics dashboard.
 *
 * Shows per-operation accuracy rates, response-time trends,
 * session history, and weak-area indicators.
 * Protected by a 4-digit PIN.
 */
import { useMemo, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { loadSessions, clearSessions, loadPin, savePin } from '../../utils/sessionLogger.ts';
import { useI18n } from '../../i18n';
import { localizeStarterDisplayName } from '../../utils/contentLocalization';
import {
  OPS,
  buildDashboardInsights,
  opIcon,
  opName,
} from '../../utils/dashboardInsights.ts';

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

const OPS_TYPED = OPS as unknown as DashboardOp[];
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

function toneClass(acc: number): 'dash-tone-good' | 'dash-tone-mid' | 'dash-tone-bad' {
  if (acc >= 70) return 'dash-tone-good';
  if (acc >= 50) return 'dash-tone-mid';
  return 'dash-tone-bad';
}

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
    <div className="dash-wrap dash-wrap-gate">
      <div className="dash-pin-icon">🔒</div>
      <div className="dash-pin-title">{t('dashboard.pin.title', 'Parent Area')}</div>
      <div className="dash-pin-subtitle">{t('dashboard.pin.subtitle', 'Please enter PIN (default 1234)')}</div>
      <div className="dash-pin-row">
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setInput(e.target.value); setError(false); }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') check(); }}
          aria-label={t('dashboard.a11y.pinInput', 'PIN input')}
          className={`dash-pin-input ${error ? 'is-error' : ''}`}
        />
        <button onClick={check} aria-label={t('dashboard.a11y.pinConfirm', 'Confirm PIN')} className="dash-btn-primary">{t('common.confirm', 'Confirm')}</button>
      </div>
      {error && <div className="dash-pin-error">{t('dashboard.pin.error', 'Wrong PIN, please try again')}</div>}
      <button onClick={onBack} aria-label={t('a11y.common.backToTitle', 'Back to title')} className="dash-btn-ghost">← {t('common.back', 'Back')}</button>
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
    { key: 'overview', label: `📈 ${t('dashboard.tab.overview', 'Overview')}` },
    { key: 'history', label: `📋 ${t('dashboard.tab.history', 'History')}` },
    { key: 'settings', label: `⚙️ ${t('dashboard.tab.settings', 'Settings')}` },
  ];

  return (
    <div className="dash-wrap dash-wrap-main">
      {/* Header */}
      <div className="dash-header">
        <button className="back-touch-btn dash-back-btn" onClick={onBack} aria-label={t('a11y.common.backToTitle', 'Back to title')}>←</button>
        <div className="dash-header-title">📊 {t('dashboard.title', 'Parent Dashboard')}</div>
      </div>

      {/* Tab bar */}
      <div className="dash-tabbar">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            aria-label={item.label}
            className={`dash-tab-btn ${tab === item.key ? 'is-active' : ''}`}
          >
            {item.label}
          </button>
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
    <div className="dash-full-width">
      {/* Summary cards */}
      <div className="dash-grid-two">
        <Card label={t('dashboard.card.sessions', 'Total Sessions')} value={stats.totalSessions} color="#6366f1" />
        <Card label={t('dashboard.card.questions', 'Total Questions')} value={stats.totalQ} color="#8b5cf6" />
        <Card label={t('dashboard.card.acc', 'Overall Accuracy')} value={`${stats.overallAcc}%`} color={stats.overallAcc >= 70 ? '#22c55e' : stats.overallAcc >= 50 ? '#f59e0b' : '#ef4444'} />
        <Card label={t('dashboard.card.avgTime', 'Average Response Time')} value={stats.avgTimeS === '—' ? '—' : `${stats.avgTimeS}s`} color="#3b82f6" />
      </div>

      <SectionTitle text={t('dashboard.section.weak', 'Weak Area Suggestions')} />
      <WeakSuggestions items={weakSuggestions} />

      <SectionTitle text={t('dashboard.section.weekly', 'Weekly Report')} />
      <WeeklyReportView report={weeklyReport} />

      <SectionTitle text={t('dashboard.section.practice', 'Practice Tasks')} />
      <PracticeTaskList tasks={practiceTasks} />

      {sessions.length === 0 && <Empty text={t('dashboard.empty.overview', 'No records yet. Start playing to generate analytics.')} />}

      {/* Per-operation accuracy */}
      <SectionTitle text={t('dashboard.section.opAcc', 'Accuracy by Operation')} />
      <div className="dash-flex-cards">
        {visibleOps.map((op) => {
          const d = stats.opData[op] || { attempted: 0, correct: 0, totalMs: 0, acc: 0, avgTimeSec: null, avgTime: '—', weak: false };
          const tone = toneClass(d.acc);
          return (
            <div key={op} className={`dash-op-card ${d.weak ? 'is-weak' : ''}`}>
              <div className="dash-op-icon">{opIconTyped(op)}</div>
              <div className="dash-op-name">{opNameTyped(op, { t })}</div>
              <div className={`dash-op-acc ${tone}`}>{d.attempted > 0 ? `${d.acc}%` : '—'}</div>
              <div className="dash-op-count">{t('dashboard.attemptedCount', '{count} items', { count: d.attempted })}</div>
              {d.weak && <div className="dash-op-weak">⚠️ {t('dashboard.weakTag', 'Needs Practice')}</div>}
            </div>
          );
        })}
      </div>

      {/* Accuracy trend (last 10 sessions as simple bar chart) */}
      {sessions.length >= 2 && <>
        <SectionTitle text={t('dashboard.section.trend', 'Recent 10-Session Accuracy Trend')} />
        <BarChart data={stats.recentAcc} />
      </>}

      {/* Per-operation avg time */}
      <SectionTitle text={t('dashboard.section.opTime', 'Average Time by Operation')} />
      <div className="dash-flex-cards">
        {visibleOps.map((op) => {
          const d = stats.opData[op] || { attempted: 0, correct: 0, totalMs: 0, acc: 0, avgTimeSec: null, avgTime: '—', weak: false };
          return (
            <div key={op} className="dash-time-card">
              <div className="dash-time-card-icon">{opIconTyped(op)}</div>
              <div className="dash-time-card-value">{d.attempted > 0 ? `${d.avgTime}s` : '—'}</div>
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
  if (!items.length) return <Empty text={t('dashboard.empty.weak', 'No weak-area suggestions yet.')} />;
  return (
    <div className="dash-stack-list">
      {items.map((item) => (
        <div key={item.id} className="dash-text-panel">
          <div className="dash-text-panel-title">{item.title}</div>
          <div className="dash-text-panel-summary">{item.summary}</div>
          <div className="dash-text-panel-action">{item.action}</div>
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
  const qDelta = formatDelta(report.delta.questions, t('dashboard.unit.items', ' items'));
  const sDelta = formatDelta(report.delta.sessions, t('dashboard.unit.sessions', ' sessions'));
  const strongest = report.current.strongest;
  const weakest = report.current.weakest;

  return (
    <div className="dash-report-panel">
      <div className="dash-report-range">{report.range.startLabel} - {report.range.endLabel}</div>
      <div className="dash-report-headline">{report.headline}</div>
      <div className="dash-grid-two dash-report-mini-grid">
        <MiniCard label={t('dashboard.weekly.sessions', 'This Week Sessions')} value={`${report.current.sessions}`} />
        <MiniCard label={t('dashboard.weekly.questions', 'This Week Questions')} value={`${report.current.totalQ}`} />
        <MiniCard label={t('dashboard.weekly.acc', 'This Week Accuracy')} value={`${report.current.acc}%`} />
        <MiniCard label={t('dashboard.weekly.avgTime', 'Average Time')} value={avgTimeText} />
      </div>
      <div className="dash-pill-row">
        <DeltaPill label={t('dashboard.delta.acc', 'Accuracy')} value={accDelta} />
        <DeltaPill label={t('dashboard.delta.questions', 'Questions')} value={qDelta} />
        <DeltaPill label={t('dashboard.delta.sessions', 'Sessions')} value={sDelta} />
      </div>
      <div className="dash-pill-row">
        <Tag text={strongest ? t('dashboard.weekly.strong', 'Strong: {label} {acc}%', { label: `${strongest.icon}${strongest.label}`, acc: strongest.acc }) : t('dashboard.weekly.strongEmpty', 'Strong area data unavailable')} color="rgba(34,197,94,0.2)" />
        <Tag text={weakest ? t('dashboard.weekly.weak', 'Weak: {label} {acc}%', { label: `${weakest.icon}${weakest.label}`, acc: weakest.acc }) : t('dashboard.weekly.weakEmpty', 'Weak area data unavailable')} color="rgba(239,68,68,0.2)" />
      </div>
    </div>
  );
}

type PracticeTaskListProps = {
  tasks: PracticeTask[];
};

function PracticeTaskList({ tasks }: PracticeTaskListProps) {
  const { t } = useI18n();
  if (!tasks.length) return <Empty text={t('dashboard.empty.practice', 'No practice tasks yet.')} />;
  return (
    <div className="dash-stack-list">
      {tasks.map((task, i) => (
        <div key={task.id} className="dash-text-panel">
          <div className="dash-task-index">{t('dashboard.task.index', 'Task {index}', { index: i + 1 })}</div>
          <div className="dash-text-panel-title">{task.title}</div>
          <div className="dash-text-panel-summary">{task.summary}</div>
          <div className="dash-task-goal">{t('dashboard.task.goal', 'Goal: {goal}', { goal: task.goal })}</div>
          <div className="dash-pill-row">
            {(task.focusOps || []).slice(0, 4).map((op) => (
              <span key={`${task.id}-${op}`} className="dash-op-pill">
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
  if (sessions.length === 0) return <Empty text={t('dashboard.empty.history', 'No game records yet.')} />;
  const sorted = [...sessions].reverse(); // newest first

  return (
    <div className="dash-full-width">
      <div className="dash-history-total">{t('dashboard.history.total', '{count} sessions (newest first)', { count: sessions.length })}</div>
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
          <div key={s.id || i} className="dash-history-item">
            <div className="dash-history-head">
              <div className="dash-history-headline">
                {starterName} {s.timedMode ? '⏱️' : '⚔️'} {s.completed ? t('dashboard.history.clear', '✅Cleared') : t('dashboard.history.stage', '💀Stage {stage}', { stage: s.defeated || 0 })}
              </div>
              <div className="dash-history-time">{dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div className="dash-history-stats">
              <span>{t('dashboard.history.acc', 'Accuracy')} <b className={toneClass(acc)}>{acc}%</b></span>
              <span>{t('dashboard.history.correct', 'Correct')} <b className="dash-tone-good">{correct}</b></span>
              <span>{t('dashboard.history.wrong', 'Wrong')} <b className="dash-tone-bad">{wrong}</b></span>
              <span>{t('dashboard.history.streak', 'Streak')} <b className="dash-streak">{s.maxStreak || 0}</b></span>
              <span>Lv.<b>{s.finalLevel || 1}</b></span>
            </div>
            {/* Mini op breakdown */}
            <div className="dash-history-op-row">
              {CORE_OPS.map((op) => {
                const od = s.opStats?.[op];
                if (!od || od.attempted === 0) return null;
                const oa = Math.round(od.correct / od.attempted * 100);
                return <span key={op} className={`dash-history-op-pill ${toneClass(oa)}`}>{opIconTyped(op)} {oa}%</span>;
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
    if (pinInput.length < 4) { setPinMsg(t('dashboard.pin.tooShort', 'PIN must be at least 4 digits')); return; }
    savePinTyped(pinInput);
    setPinMsg(t('dashboard.pin.updated', '✅ PIN updated'));
    setPinInput('');
  };

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearSessionsTyped();
    refresh();
    setConfirmClear(false);
  };

  return (
    <div className="dash-full-width">
      {/* Change PIN */}
      <SectionTitle text={t('dashboard.settings.changePin', 'Change PIN')} />
      <div className="dash-settings-row">
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pinInput}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setPinInput(e.target.value); setPinMsg(''); }}
          placeholder={t('dashboard.settings.newPin', 'New PIN')}
          aria-label={t('dashboard.a11y.newPin', 'New PIN')}
          className="dash-settings-pin-input"
        />
        <button onClick={handlePinChange} aria-label={t('dashboard.a11y.updatePin', 'Update PIN')} className="dash-btn-primary">{t('dashboard.settings.update', 'Update')}</button>
      </div>
      {pinMsg && <div className={`dash-pin-msg ${pinMsg.startsWith('✅') ? 'is-success' : 'is-error'}`}>{pinMsg}</div>}

      {/* Clear data */}
      <SectionTitle text={t('dashboard.settings.data', 'Data Management')} />
      <div className="dash-history-total">{t('dashboard.settings.recordCount', '{count} records currently', { count: sessions.length })}</div>
      <button onClick={handleClear} aria-label={t('dashboard.a11y.clearRecords', 'Clear all records')} className="dash-btn-ghost dash-btn-danger">
        {confirmClear ? t('dashboard.settings.clearConfirm', '⚠️ Confirm clear all records?') : t('dashboard.settings.clear', '🗑️ Clear all game records')}
      </button>
      {confirmClear && <button onClick={() => setConfirmClear(false)} aria-label={t('common.cancel', 'Cancel')} className="dash-btn-ghost dash-btn-cancel">{t('common.cancel', 'Cancel')}</button>}

      <div className="dash-note-list">
        <div>{t('dashboard.settings.note1', '• Game data is stored locally (localStorage)')}</div>
        <div>{t('dashboard.settings.note2', '• Up to the latest 100 records are kept')}</div>
        <div>{t('dashboard.settings.note3', '• Clearing browser data will erase records')}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Shared UI helpers
// ═══════════════════════════════════════════════
type CardProps = {
  label: string;
  value: string | number;
  color: string;
};

function Card({ label, value, color }: CardProps) {
  return (
    <div className="dash-card">
      <div className="dash-card-value" style={{ color }}>{value}</div>
      <div className="dash-card-label">{label}</div>
    </div>
  );
}

type SectionTitleProps = {
  text: string;
};

function SectionTitle({ text }: SectionTitleProps) {
  return <div className="dash-section-title">{text}</div>;
}

type EmptyProps = {
  text: string;
};

function Empty({ text }: EmptyProps) {
  return <div className="dash-empty">{text}</div>;
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
    <div className="dash-chart">
      {data.map((d, i) => {
        const tone = toneClass(d.value);
        return (
          <div key={i} className="dash-chart-col">
            <div className={`dash-chart-value ${tone}`}>{d.value}%</div>
            <div className={`dash-chart-bar ${tone}`} style={{ height: `${Math.max(4, (d.value / max) * 60)}px` }} />
            <div className="dash-chart-label">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

type MiniCardProps = {
  label: string;
  value: string;
};

function MiniCard({ label, value }: MiniCardProps) {
  return (
    <div className="dash-mini-card">
      <div className="dash-mini-card-value">{value}</div>
      <div className="dash-mini-card-label">{label}</div>
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
  const trendClass = isFlat ? 'is-flat' : isUp ? 'is-up' : 'is-down';
  return (
    <span className={`dash-pill ${trendClass}`}>
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
    <span className="dash-pill dash-pill-tag" style={{ background: color }}>
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
