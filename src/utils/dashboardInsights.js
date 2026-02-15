const DAY_MS = 24 * 60 * 60 * 1000;

export const OPS = [
  '+', '-', '×', '÷',
  'mixed2', 'mixed3', 'mixed4',
  'unknown1', 'unknown2', 'unknown3', 'unknown4',
];

export const OP_GROUPS = [
  { id: 'add', label: '加法', icon: '➕', ops: ['+'] },
  { id: 'sub', label: '減法', icon: '➖', ops: ['-'] },
  { id: 'mul', label: '乘法', icon: '✖️', ops: ['×'] },
  { id: 'div', label: '除法', icon: '➗', ops: ['÷'] },
  { id: 'unknown', label: '未知數', icon: '🦁', ops: ['unknown1', 'unknown2', 'unknown3', 'unknown4'] },
  { id: 'mixed', label: '混合運算', icon: '⚡', ops: ['mixed2', 'mixed3', 'mixed4'] },
];

const OP_META = {
  '+': { name: '加法', icon: '➕', groupId: 'add' },
  '-': { name: '減法', icon: '➖', groupId: 'sub' },
  '×': { name: '乘法', icon: '✖️', groupId: 'mul' },
  '÷': { name: '除法', icon: '➗', groupId: 'div' },
  mixed2: { name: '加減混合', icon: '⚡', groupId: 'mixed' },
  mixed3: { name: '乘加混合', icon: '⚡', groupId: 'mixed' },
  mixed4: { name: '四則混合', icon: '⚡', groupId: 'mixed' },
  unknown1: { name: '加減求未知', icon: '🦁', groupId: 'unknown' },
  unknown2: { name: '乘除求未知', icon: '🦁', groupId: 'unknown' },
  unknown3: { name: '大數求未知', icon: '🦁', groupId: 'unknown' },
  unknown4: { name: '混合求未知', icon: '🦁', groupId: 'unknown' },
};

const WEAK_ACTIONS = {
  add: '先做 1 位數與進位題，建議每天 2 場，目標正確率 85%。',
  sub: '先拆成補數與借位練習，建議每場至少 10 題減法。',
  mul: '先鞏固九九表，再進入雙位數乘法，避免硬背失誤。',
  div: '先練整除題型，再練餘數判斷，重點是檢查商與被除數關係。',
  unknown: '先列式再代入驗算，先練 unknown1/unknown2 再升級到大數。',
  mixed: '每題先標記運算順序，先乘除後加減，減少步驟跳漏。',
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toFixed1(v) {
  return Number((Math.round(v * 10) / 10).toFixed(1));
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

function deriveGroupData(opData) {
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

function summarizePeriod(sessions) {
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
  const groupData = deriveGroupData(opData);
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
  return OP_META[op]?.icon || op;
}

export function opName(op) {
  return OP_META[op]?.name || op;
}

export function computeOverviewStats(sessions) {
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
    groupData: deriveGroupData(opData),
  };
}

export function buildWeaknessSuggestions(overview, options = {}) {
  const stats = overview || computeOverviewStats([]);
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
    .map((g) => ({
      id: `weak-${g.id}`,
      groupId: g.id,
      icon: g.icon,
      label: g.label,
      title: `${g.icon} ${g.label}題型需加強`,
      summary: `正確率 ${g.acc}% · 平均 ${(g.avgTimeSec ?? 0).toFixed(1)} 秒 · ${g.attempted} 題`,
      action: WEAK_ACTIONS[g.id] || '建議分段練習，先慢後快，逐步拉高正確率。',
      focusOps: g.ops,
      score: g.weaknessScore,
    }));

  if (weakGroups.length > 0) return weakGroups;

  if (stats.totalQ === 0) {
    return [{
      id: 'weak-bootstrap',
      groupId: 'warmup',
      icon: '🧭',
      label: '暖身',
      title: '尚無資料，先建立基準線',
      summary: '先完成 2-3 場遊戲，儀表板就會自動產生弱點建議。',
      action: '建議先從加減與乘除各打一場，讓系統有足夠樣本。',
      focusOps: ['+', '-', '×', '÷'],
      score: 0,
    }];
  }

  return [{
    id: 'weak-keep',
    groupId: 'maintain',
    icon: '✅',
    label: '維持',
    title: '目前無明顯弱點題型',
    summary: '整體表現穩定，建議維持練習頻率並提高題量。',
    action: '每週固定 3-4 場，逐步提升混合與未知數題量。',
    focusOps: ['mixed2', 'mixed3', 'mixed4', 'unknown1', 'unknown2'],
    score: 0,
  }];
}

export function buildWeeklyReport(sessions, options = {}) {
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

  const current = summarizePeriod(thisWeekSessions);
  const previous = summarizePeriod(prevWeekSessions);

  const accDelta = previous.totalQ > 0 ? current.acc - previous.acc : null;
  const questionDelta = current.totalQ - previous.totalQ;
  const sessionDelta = current.sessions - previous.sessions;

  const range = {
    start: thisWeekStart,
    end: now,
    startLabel: new Date(thisWeekStart).toLocaleDateString(),
    endLabel: new Date(now).toLocaleDateString(),
  };

  let headline = '本週先完成 2 場，建立週報基準線。';
  if (current.sessions > 0) {
    headline = `本週共 ${current.sessions} 場、${current.totalQ} 題，正確率 ${current.acc}%。`;
  }
  if (accDelta != null) {
    if (accDelta >= 5) headline += ' 正確率較上週明顯提升。';
    else if (accDelta <= -5) headline += ' 正確率較上週下滑，建議先補弱項。';
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

function makeConsistencyTask(weeklyReport) {
  const c = weeklyReport.current;
  if (c.sessions < 4) {
    return {
      id: 'task-consistency',
      title: '📅 穩定出勤任務',
      summary: `本週目前 ${c.sessions} 場，先提升到 4 場以上。`,
      goal: '接下來 7 天至少完成 4 場戰鬥。',
      focusOps: ['+', '-', '×', '÷'],
      level: 'base',
    };
  }

  if (c.totalQ < 100) {
    return {
      id: 'task-volume',
      title: '🧱 題量補足任務',
      summary: `本週累積 ${c.totalQ} 題，建議補到 100 題。`,
      goal: '接下來 7 天再完成 40 題以上。',
      focusOps: ['mixed2', 'mixed3', 'mixed4'],
      level: 'base',
    };
  }

  return {
    id: 'task-maintain',
    title: '🛡️ 維持節奏任務',
    summary: '本週練習量已足夠，改以穩定品質為主。',
    goal: '連續 3 天各完成 1 場，且每場正確率至少 75%。',
    focusOps: ['unknown1', 'unknown2', 'mixed4'],
    level: 'base',
  };
}

function makeSpeedOrChallengeTask(overview, weeklyReport) {
  const avg = overview.avgTimeS === '—' ? null : toNum(overview.avgTimeS);
  if (avg != null && avg > 8.5) {
    return {
      id: 'task-speed',
      title: '⏱️ 反應速度任務',
      summary: `平均答題 ${avg.toFixed(1)} 秒，略慢。`,
      goal: '進行 2 場快答練習，目標平均壓到 8 秒內。',
      focusOps: ['+', '-', '×', '÷'],
      level: 'speed',
    };
  }

  const strongest = weeklyReport.current.strongest;
  if (strongest) {
    return {
      id: `task-challenge-${strongest.id}`,
      title: `${strongest.icon} 強項挑戰任務`,
      summary: `${strongest.label}是本週強項（${strongest.acc}%）。`,
      goal: `加入更高難度 ${strongest.label} 題型 2 場，維持 80% 以上。`,
      focusOps: strongest.ops,
      level: 'challenge',
    };
  }

  return {
    id: 'task-warmup',
    title: '🎯 基礎暖身任務',
    summary: '資料量尚少，先建立穩定答題節奏。',
    goal: '完成 2 場基礎加減乘除練習，熟悉出題節奏。',
    focusOps: ['+', '-', '×', '÷'],
    level: 'warmup',
  };
}

const FOUNDATION_TASKS = [
  {
    id: 'task-foundation-addsub',
    title: '🧮 基礎算感任務',
    summary: '先建立加減直覺，避免後續複合題卡關。',
    goal: '完成 1 場加法 + 1 場減法專注練習。',
    focusOps: ['+', '-'],
    level: 'foundation',
  },
  {
    id: 'task-foundation-muldiv',
    title: '🧠 乘除穩定任務',
    summary: '乘除是混合題核心，先把基礎正確率拉高。',
    goal: '完成 2 場乘除練習，至少 70% 正確率。',
    focusOps: ['×', '÷'],
    level: 'foundation',
  },
];

export function buildPracticeRecommendations(overview, weeklyReport, weakSuggestions, options = {}) {
  const maxItems = toNum(options.maxItems) || 3;
  const tasks = [];

  const weak = (weakSuggestions || [])
    .filter((w) => w.groupId !== 'maintain' && w.groupId !== 'warmup')
    .slice(0, 2);

  for (const w of weak) {
    tasks.push({
      id: `task-fix-${w.groupId}`,
      title: `${w.icon} 修補${w.label}任務`,
      summary: w.summary,
      goal: `安排 2 場 ${w.label} 專注練習，先達到 75% 正確率。`,
      focusOps: w.focusOps,
      level: 'focus',
    });
  }

  tasks.push(makeConsistencyTask(weeklyReport));
  tasks.push(makeSpeedOrChallengeTask(overview, weeklyReport));

  const uniq = [];
  const seen = new Set();
  for (const t of tasks) {
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    uniq.push(t);
    if (uniq.length >= maxItems) break;
  }

  for (const t of FOUNDATION_TASKS) {
    if (uniq.length >= maxItems) break;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    uniq.push(t);
  }

  return uniq;
}

export function buildDashboardInsights(sessions, options = {}) {
  const overview = computeOverviewStats(sessions);
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
