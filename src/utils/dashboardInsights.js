const DAY_MS = 24 * 60 * 60 * 1000;

export const OPS = [
  '+', '-', '×', '÷',
  'mixed2', 'mixed3', 'mixed4',
  'unknown1', 'unknown2', 'unknown3', 'unknown4',
];

const OP_GROUPS_BASE = [
  { id: 'add', icon: '➕', ops: ['+'] },
  { id: 'sub', icon: '➖', ops: ['-'] },
  { id: 'mul', icon: '✖️', ops: ['×'] },
  { id: 'div', icon: '➗', ops: ['÷'] },
  { id: 'unknown', icon: '🦁', ops: ['unknown1', 'unknown2', 'unknown3', 'unknown4'] },
  { id: 'mixed', icon: '⚡', ops: ['mixed2', 'mixed3', 'mixed4'] },
];

const GROUP_LABEL_FALLBACKS = {
  add: 'Addition',
  sub: 'Subtraction',
  mul: 'Multiplication',
  div: 'Division',
  unknown: 'Unknown',
  mixed: 'Mixed Ops',
};

const GROUP_LABEL_KEYS = {
  add: 'dashboard.op.group.add',
  sub: 'dashboard.op.group.sub',
  mul: 'dashboard.op.group.mul',
  div: 'dashboard.op.group.div',
  unknown: 'dashboard.op.group.unknown',
  mixed: 'dashboard.op.group.mixed',
};

export const OP_GROUPS = OP_GROUPS_BASE.map((group) => ({
  ...group,
  label: GROUP_LABEL_FALLBACKS[group.id] || group.id,
}));

const OP_ICONS = {
  '+': '➕',
  '-': '➖',
  '×': '✖️',
  '÷': '➗',
  mixed2: '⚡',
  mixed3: '⚡',
  mixed4: '⚡',
  unknown1: '🦁',
  unknown2: '🦁',
  unknown3: '🦁',
  unknown4: '🦁',
};

const OP_NAME_FALLBACKS = {
  '+': 'Addition',
  '-': 'Subtraction',
  '×': 'Multiplication',
  '÷': 'Division',
  mixed2: 'Add/Sub Mix',
  mixed3: 'Mul/Add Mix',
  mixed4: 'Four Ops Mix',
  unknown1: 'Unknown Add/Sub',
  unknown2: 'Unknown Mul/Div',
  unknown3: 'Unknown Large Number',
  unknown4: 'Unknown Mixed',
};

const OP_NAME_KEYS = {
  '+': 'dashboard.op.name.add',
  '-': 'dashboard.op.name.sub',
  '×': 'dashboard.op.name.mul',
  '÷': 'dashboard.op.name.div',
  mixed2: 'dashboard.op.name.mixed2',
  mixed3: 'dashboard.op.name.mixed3',
  mixed4: 'dashboard.op.name.mixed4',
  unknown1: 'dashboard.op.name.unknown1',
  unknown2: 'dashboard.op.name.unknown2',
  unknown3: 'dashboard.op.name.unknown3',
  unknown4: 'dashboard.op.name.unknown4',
};

const WEAK_ACTIONS = {
  add: 'Start with single-digit and carry problems. Aim for 2 runs/day and 85% accuracy.',
  sub: 'Split into complement and borrowing drills. Do at least 10 subtraction questions per run.',
  mul: 'Solidify multiplication tables first, then move to two-digit multiplication.',
  div: 'Practice exact division first, then remainder judgement and quotient checks.',
  unknown: 'Write equations first, verify by substitution, then scale from unknown1/2 to large numbers.',
  mixed: 'Mark operation order per question: multiply/divide before add/subtract.',
  default: 'Use segmented practice and increase pace gradually while keeping accuracy.',
};

const WEAK_ACTION_KEYS = {
  add: 'dashboard.weak.action.add',
  sub: 'dashboard.weak.action.sub',
  mul: 'dashboard.weak.action.mul',
  div: 'dashboard.weak.action.div',
  unknown: 'dashboard.weak.action.unknown',
  mixed: 'dashboard.weak.action.mixed',
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toFixed1(v) {
  return Number((Math.round(v * 10) / 10).toFixed(1));
}

function formatTemplate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key) => String(params[key] ?? ''));
}

function createTranslator(options = {}) {
  const t = typeof options.t === 'function' ? options.t : null;
  return (key, fallback, params) => {
    if (t) {
      const translated = t(key, fallback, params);
      if (typeof translated === 'string' && translated.length > 0) {
        return translated;
      }
    }
    return formatTemplate(fallback, params);
  };
}

function resolveGroupLabel(groupId, translate, fallbackLabel) {
  const key = GROUP_LABEL_KEYS[groupId] || 'dashboard.op.group.unknown';
  const fallback = fallbackLabel || GROUP_LABEL_FALLBACKS[groupId] || groupId;
  return translate(key, fallback);
}

function createOpAgg() {
  const agg = {};
  for (const op of OPS) agg[op] = { a: 0, c: 0, ms: 0 };
  return agg;
}

function getSessionTs(session) {
  return toNum(session?.startTime);
}

function isWithin(ts, from, to) {
  return ts >= from && ts < to;
}

function groupByDateCount(sessions) {
  const dates = new Set();
  for (const s of sessions) {
    const ts = getSessionTs(s);
    if (!ts) continue;
    dates.add(new Date(ts).toISOString().slice(0, 10));
  }
  return dates.size;
}

function aggregateOpStats(sessions) {
  const agg = createOpAgg();
  for (const s of sessions) {
    if (!s?.opStats) continue;
    for (const op of OPS) {
      const d = s.opStats[op];
      if (!d) continue;
      agg[op].a += toNum(d.attempted);
      agg[op].c += toNum(d.correct);
      agg[op].ms += toNum(d.totalMs);
    }
  }
  return agg;
}

function deriveOpData(opAgg) {
  const opData = {};
  for (const op of OPS) {
    const d = opAgg[op] || { a: 0, c: 0, ms: 0 };
    const attempted = toNum(d.a);
    const correct = toNum(d.c);
    const totalMs = toNum(d.ms);
    const acc = attempted > 0 ? Math.round(correct / attempted * 100) : 0;
    const avgTimeSec = attempted > 0 ? toFixed1(totalMs / attempted / 1000) : null;

    opData[op] = {
      attempted,
      correct,
      totalMs,
      acc,
      avgTimeSec,
      avgTime: avgTimeSec == null ? '—' : avgTimeSec.toFixed(1),
      weak: attempted >= 5 && acc < 60,
    };
  }
  return opData;
}

function deriveGroupData(opData, options = {}) {
  const translate = createTranslator(options);
  return OP_GROUPS.map((g) => {
    let attempted = 0;
    let correct = 0;
    let totalMs = 0;
    for (const op of g.ops) {
      const d = opData[op];
      if (!d) continue;
      attempted += toNum(d.attempted);
      correct += toNum(d.correct);
      totalMs += toNum(d.totalMs);
    }
    const acc = attempted > 0 ? Math.round(correct / attempted * 100) : 0;
    const avgTimeSec = attempted > 0 ? toFixed1(totalMs / attempted / 1000) : null;

    const reliability = Math.min(1, attempted / 18);
    const accGap = Math.max(0, 72 - acc);
    const speedGap = Math.max(0, (avgTimeSec ?? 0) - 7);
    const weaknessScore = attempted > 0 ? toFixed1((accGap * 1.6 + speedGap * 6) * reliability) : 0;

    return {
      ...g,
      label: resolveGroupLabel(g.id, translate, g.label),
      attempted,
      correct,
      totalMs,
      acc,
      avgTimeSec,
      weaknessScore,
    };
  });
}

function findExtremes(groupData) {
  const candidates = groupData.filter((g) => g.attempted >= 5);
  if (!candidates.length) {
    return { strongest: null, weakest: null };
  }

  const strongest = [...candidates].sort((a, b) => {
    if (b.acc !== a.acc) return b.acc - a.acc;
    return b.attempted - a.attempted;
  })[0] || null;

  const weakest = [...candidates].sort((a, b) => {
    if (a.acc !== b.acc) return a.acc - b.acc;
    return b.attempted - a.attempted;
  })[0] || null;

  return { strongest, weakest };
}

function summarizePeriod(sessions, options = {}) {
  let totalC = 0;
  let totalW = 0;
  for (const s of sessions) {
    totalC += toNum(s?.tC);
    totalW += toNum(s?.tW);
  }
  const totalQ = totalC + totalW;
  const opAgg = aggregateOpStats(sessions);
  const opData = deriveOpData(opAgg);

  let totalMs = 0;
  let attempted = 0;
  for (const op of OPS) {
    totalMs += toNum(opData[op]?.totalMs);
    attempted += toNum(opData[op]?.attempted);
  }

  const acc = totalQ > 0 ? Math.round(totalC / totalQ * 100) : 0;
  const avgTimeSec = attempted > 0 ? toFixed1(totalMs / attempted / 1000) : null;
  const groupData = deriveGroupData(opData, options);
  const { strongest, weakest } = findExtremes(groupData);

  return {
    sessions: sessions.length,
    activeDays: groupByDateCount(sessions),
    totalQ,
    totalC,
    totalW,
    acc,
    avgTimeSec,
    groupData,
    strongest,
    weakest,
  };
}

export function opIcon(op) {
  return OP_ICONS[op] || op;
}

export function opName(op, options = {}) {
  const translate = createTranslator(options);
  const key = OP_NAME_KEYS[op];
  const fallback = OP_NAME_FALLBACKS[op] || op;
  if (!key) return fallback;
  return translate(key, fallback);
}

export function computeOverviewStats(sessions, options = {}) {
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  let totalC = 0;
  let totalW = 0;
  for (const s of safeSessions) {
    totalC += toNum(s?.tC);
    totalW += toNum(s?.tW);
  }

  const totalQ = totalC + totalW;
  const opAgg = aggregateOpStats(safeSessions);
  const opData = deriveOpData(opAgg);

  let totalMs = 0;
  for (const op of OPS) totalMs += toNum(opData[op].totalMs);

  const overallAcc = totalQ > 0 ? Math.round(totalC / totalQ * 100) : 0;
  const avgTimeS = totalQ > 0 ? (totalMs / totalQ / 1000).toFixed(1) : '—';

  const recent = safeSessions.slice(-10);
  const recentAcc = recent.map((s, i) => {
    const c = toNum(s?.tC);
    const w = toNum(s?.tW);
    const total = c + w;
    return {
      label: `#${safeSessions.length - recent.length + i + 1}`,
      value: total > 0 ? Math.round(c / total * 100) : 0,
    };
  });

  return {
    totalSessions: safeSessions.length,
    totalQ,
    overallAcc,
    avgTimeS,
    opData,
    recentAcc,
    groupData: deriveGroupData(opData, options),
  };
}

export function buildWeaknessSuggestions(overview, options = {}) {
  const translate = createTranslator(options);
  const stats = overview || computeOverviewStats([], options);
  const minAttempts = toNum(options.minAttempts) || 6;
  const maxItems = toNum(options.maxItems) || 3;

  const weakGroups = (stats.groupData || [])
    .filter((g) => g.attempted >= minAttempts)
    .filter((g) => g.acc < 72 || (g.avgTimeSec != null && g.avgTimeSec > 8.5))
    .sort((a, b) => {
      if (b.weaknessScore !== a.weaknessScore) return b.weaknessScore - a.weaknessScore;
      if (a.acc !== b.acc) return a.acc - b.acc;
      return b.attempted - a.attempted;
    })
    .slice(0, maxItems)
    .map((g) => {
      const label = resolveGroupLabel(g.id, translate, g.label);
      const actionKey = WEAK_ACTION_KEYS[g.id] || 'dashboard.weak.action.default';
      const actionFallback = WEAK_ACTIONS[g.id] || WEAK_ACTIONS.default;

      return {
        id: `weak-${g.id}`,
        groupId: g.id,
        icon: g.icon,
        label,
        title: translate('dashboard.weak.title', '{icon} {label} needs practice', { icon: g.icon, label }),
        summary: translate('dashboard.weak.summary', 'Accuracy {acc}% · Avg {avg}s · {attempted} questions', {
          acc: g.acc,
          avg: (g.avgTimeSec ?? 0).toFixed(1),
          attempted: g.attempted,
        }),
        action: translate(actionKey, actionFallback),
        focusOps: g.ops,
        score: g.weaknessScore,
      };
    });

  if (weakGroups.length > 0) return weakGroups;

  if (stats.totalQ === 0) {
    return [{
      id: 'weak-bootstrap',
      groupId: 'warmup',
      icon: '🧭',
      label: translate('dashboard.weak.bootstrap.label', 'Warmup'),
      title: translate('dashboard.weak.bootstrap.title', 'No data yet, build a baseline first'),
      summary: translate('dashboard.weak.bootstrap.summary', 'Complete 2-3 sessions first and the dashboard will generate weakness suggestions.'),
      action: translate('dashboard.weak.bootstrap.action', 'Start with one add/sub run and one mul/div run for enough sample data.'),
      focusOps: ['+', '-', '×', '÷'],
      score: 0,
    }];
  }

  return [{
    id: 'weak-keep',
    groupId: 'maintain',
    icon: '✅',
    label: translate('dashboard.weak.maintain.label', 'Maintain'),
    title: translate('dashboard.weak.maintain.title', 'No obvious weak area detected'),
    summary: translate('dashboard.weak.maintain.summary', 'Performance is stable. Keep your schedule and gradually increase volume.'),
    action: translate('dashboard.weak.maintain.action', 'Play 3-4 sessions weekly and increase mixed/unknown question volume.'),
    focusOps: ['mixed2', 'mixed3', 'mixed4', 'unknown1', 'unknown2'],
    score: 0,
  }];
}

export function buildWeeklyReport(sessions, options = {}) {
  const translate = createTranslator(options);
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const now = toNum(options.now) || Date.now();
  const thisWeekStart = now - DAY_MS * 7;
  const prevWeekStart = now - DAY_MS * 14;

  const thisWeekSessions = safeSessions.filter((s) => {
    const ts = getSessionTs(s);
    return isWithin(ts, thisWeekStart, now + 1);
  });

  const prevWeekSessions = safeSessions.filter((s) => {
    const ts = getSessionTs(s);
    return isWithin(ts, prevWeekStart, thisWeekStart);
  });

  const current = summarizePeriod(thisWeekSessions, options);
  const previous = summarizePeriod(prevWeekSessions, options);

  const accDelta = previous.totalQ > 0 ? current.acc - previous.acc : null;
  const questionDelta = current.totalQ - previous.totalQ;
  const sessionDelta = current.sessions - previous.sessions;

  const range = {
    start: thisWeekStart,
    end: now,
    startLabel: new Date(thisWeekStart).toLocaleDateString(),
    endLabel: new Date(now).toLocaleDateString(),
  };

  let headline = translate('dashboard.weekly.headline.bootstrap', 'Finish 2 sessions this week to establish your weekly baseline.');
  if (current.sessions > 0) {
    headline = translate('dashboard.weekly.headline.summary', '{sessions} sessions, {questions} questions this week, {acc}% accuracy.', {
      sessions: current.sessions,
      questions: current.totalQ,
      acc: current.acc,
    });
  }
  if (accDelta != null) {
    if (accDelta >= 5) {
      headline = `${headline} ${translate('dashboard.weekly.headline.accUp', 'Accuracy improved clearly versus last week.')}`;
    } else if (accDelta <= -5) {
      headline = `${headline} ${translate('dashboard.weekly.headline.accDown', 'Accuracy dropped versus last week. Patch weak areas first.')}`;
    }
  }

  return {
    range,
    current,
    previous,
    delta: {
      acc: accDelta,
      questions: questionDelta,
      sessions: sessionDelta,
    },
    headline,
  };
}

function makeConsistencyTask(weeklyReport, translate) {
  const c = weeklyReport.current;
  if (c.sessions < 4) {
    return {
      id: 'task-consistency',
      title: translate('dashboard.task.consistency.title', '📅 Consistency Task'),
      summary: translate('dashboard.task.consistency.summary', '{sessions} sessions so far this week. Push to 4+.', { sessions: c.sessions }),
      goal: translate('dashboard.task.consistency.goal', 'Complete at least 4 battles in the next 7 days.'),
      focusOps: ['+', '-', '×', '÷'],
      level: 'base',
    };
  }

  if (c.totalQ < 100) {
    return {
      id: 'task-volume',
      title: translate('dashboard.task.volume.title', '🧱 Volume Task'),
      summary: translate('dashboard.task.volume.summary', '{questions} questions this week. Target 100.', { questions: c.totalQ }),
      goal: translate('dashboard.task.volume.goal', 'Add 40+ questions in the next 7 days.'),
      focusOps: ['mixed2', 'mixed3', 'mixed4'],
      level: 'base',
    };
  }

  return {
    id: 'task-maintain',
    title: translate('dashboard.task.maintain.title', '🛡️ Rhythm Task'),
    summary: translate('dashboard.task.maintain.summary', 'Practice volume is enough. Focus on stable quality.'),
    goal: translate('dashboard.task.maintain.goal', 'Finish 1 session/day for 3 days with at least 75% accuracy each.'),
    focusOps: ['unknown1', 'unknown2', 'mixed4'],
    level: 'base',
  };
}

function makeSpeedOrChallengeTask(overview, weeklyReport, translate) {
  const avg = overview.avgTimeS === '—' ? null : toNum(overview.avgTimeS);
  if (avg != null && avg > 8.5) {
    return {
      id: 'task-speed',
      title: translate('dashboard.task.speed.title', '⏱️ Speed Task'),
      summary: translate('dashboard.task.speed.summary', 'Average response time is {avg}s and can be faster.', { avg: avg.toFixed(1) }),
      goal: translate('dashboard.task.speed.goal', 'Do 2 speed runs and reduce average to under 8 seconds.'),
      focusOps: ['+', '-', '×', '÷'],
      level: 'speed',
    };
  }

  const strongest = weeklyReport.current.strongest;
  if (strongest) {
    return {
      id: `task-challenge-${strongest.id}`,
      title: translate('dashboard.task.challenge.title', '{icon} Strength Challenge', { icon: strongest.icon }),
      summary: translate('dashboard.task.challenge.summary', '{label} is your current strength ({acc}%).', {
        label: strongest.label,
        acc: strongest.acc,
      }),
      goal: translate('dashboard.task.challenge.goal', 'Run 2 harder {label} sessions while keeping 80%+ accuracy.', { label: strongest.label }),
      focusOps: strongest.ops,
      level: 'challenge',
    };
  }

  return {
    id: 'task-warmup',
    title: translate('dashboard.task.warmup.title', '🎯 Foundation Warmup'),
    summary: translate('dashboard.task.warmup.summary', 'Data is still limited. Build a stable answering rhythm first.'),
    goal: translate('dashboard.task.warmup.goal', 'Complete 2 basic add/sub/mul/div runs to settle timing.'),
    focusOps: ['+', '-', '×', '÷'],
    level: 'warmup',
  };
}

function getFoundationTasks(translate) {
  return [
    {
      id: 'task-foundation-addsub',
      title: translate('dashboard.task.foundation.addsub.title', '🧮 Number Sense Task'),
      summary: translate('dashboard.task.foundation.addsub.summary', 'Build addition/subtraction intuition before complex mixes.'),
      goal: translate('dashboard.task.foundation.addsub.goal', 'Complete 1 focused addition run + 1 subtraction run.'),
      focusOps: ['+', '-'],
      level: 'foundation',
    },
    {
      id: 'task-foundation-muldiv',
      title: translate('dashboard.task.foundation.muldiv.title', '🧠 Mul/Div Stability Task'),
      summary: translate('dashboard.task.foundation.muldiv.summary', 'Mul/div is core to mixed questions. Raise baseline accuracy first.'),
      goal: translate('dashboard.task.foundation.muldiv.goal', 'Complete 2 mul/div runs at 70%+ accuracy.'),
      focusOps: ['×', '÷'],
      level: 'foundation',
    },
  ];
}

export function buildPracticeRecommendations(overview, weeklyReport, weakSuggestions, options = {}) {
  const translate = createTranslator(options);
  const maxItems = toNum(options.maxItems) || 3;
  const tasks = [];

  const weak = (weakSuggestions || [])
    .filter((w) => w.groupId !== 'maintain' && w.groupId !== 'warmup')
    .slice(0, 2);

  for (const w of weak) {
    tasks.push({
      id: `task-fix-${w.groupId}`,
      title: translate('dashboard.task.fix.title', '{icon} Patch {label} Task', { icon: w.icon, label: w.label }),
      summary: w.summary,
      goal: translate('dashboard.task.fix.goal', 'Schedule 2 focused {label} runs and reach 75% accuracy first.', { label: w.label }),
      focusOps: w.focusOps,
      level: 'focus',
    });
  }

  tasks.push(makeConsistencyTask(weeklyReport, translate));
  tasks.push(makeSpeedOrChallengeTask(overview, weeklyReport, translate));

  const uniq = [];
  const seen = new Set();
  for (const t of tasks) {
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    uniq.push(t);
    if (uniq.length >= maxItems) break;
  }

  for (const t of getFoundationTasks(translate)) {
    if (uniq.length >= maxItems) break;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    uniq.push(t);
  }

  return uniq;
}

export function buildDashboardInsights(sessions, options = {}) {
  const overview = computeOverviewStats(sessions, options);
  const weakSuggestions = buildWeaknessSuggestions(overview, options);
  const weeklyReport = buildWeeklyReport(sessions, options);
  const practiceTasks = buildPracticeRecommendations(overview, weeklyReport, weakSuggestions, options);

  return {
    overview,
    weakSuggestions,
    weeklyReport,
    practiceTasks,
  };
}
