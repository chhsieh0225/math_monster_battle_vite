import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createPilotState, getPilotMotion, getPilotPosePosition, PILOT_ART, PILOT_POSES, PILOT_PHASE_MS, pilotReducer } from './visualPilotModel.ts';

const question = { display: '3+4', answer: 7, choices: [6, 7, 8, 9], op: '+', steps: [] };
const next = (state) => pilotReducer(state, { type: 'advance', cycle: state.cycle, phase: state.phase });
const answer = (value = 7, damage = 42) => pilotReducer(pilotReducer(createPilotState(), { type: 'question', question }), { type: 'answer', answer: value, damage });

test('correct answers stage windup before applying damage at impact, then allow retaliation', () => {
  let s = answer();
  assert.equal(s.phase, 'playerWindup');
  assert.equal(s.enemyHp, 180);
  s = next(s);
  assert.equal(s.phase, 'playerImpact');
  assert.equal(s.enemyHp, 138);
  s = next(s);
  assert.equal(s.phase, 'playerRecover');
  s = next(s);
  assert.equal(s.phase, 'enemyWindup');
  assert.equal(s.playerHp, 100);
  s = next(s);
  assert.equal(s.phase, 'enemyImpact');
  assert.equal(s.playerHp, 82);
  assert.equal(next(next(s)).phase, 'ready');
});

test('wrong answers do not make the player attack or damage the dragon', () => {
  const s = answer(6);
  assert.equal(s.phase, 'enemyWindup');
  assert.equal(s.correct, false);
  assert.equal(s.enemyHp, 180);
  assert.equal(next(s).playerHp, 82);
});

test('invalid and duplicate answer events cannot trigger extra actions', () => {
  const q = pilotReducer(createPilotState(), { type: 'question', question });
  assert.equal(pilotReducer(q, { type: 'answer', answer: 10, damage: 42 }), q);
  const s = answer();
  assert.equal(pilotReducer(s, { type: 'answer', answer: 7, damage: 999 }), s);
  assert.equal(pilotReducer(s, { type: 'preview', actor: 'enemy' }), s);
  assert.equal(pilotReducer(s, { type: 'question', question }), s);
});

for (const actor of ['player', 'enemy']) {
  test(`${actor} preview shows both action and reaction without changing HP`, () => {
    let s = pilotReducer(createPilotState(), { type: 'preview', actor });
    assert.equal(getPilotMotion(s.phase, actor), 'windup');
    s = next(s);
    assert.equal(getPilotMotion(s.phase, actor), 'strike');
    assert.equal(getPilotMotion(s.phase, actor === 'player' ? 'enemy' : 'player'), 'hurt');
    s = next(next(s));
    assert.equal(s.phase, 'ready');
    assert.equal(s.playerHp, 100);
    assert.equal(s.enemyHp, 180);
  });
}

test('lethal player hit waits for recovery and never schedules retaliation', () => {
  let s = answer(7, 999);
  s = next(s);
  assert.equal(s.enemyHp, 0);
  assert.equal(s.phase, 'playerImpact');
  s = next(next(s));
  assert.equal(s.phase, 'victory');
  assert.equal(s.playerHp, 100);
  assert.equal(next(s), s);
});

test('lethal enemy hit clamps HP and waits for recovery', () => {
  let s = { ...answer(6), playerHp: 8 };
  s = next(s);
  assert.equal(s.playerHp, 0);
  assert.equal(s.phase, 'enemyImpact');
  assert.equal(next(next(s)).phase, 'defeat');
});

test('preview after a completed trial returns to that result without reviving it', () => {
  let s = { ...createPilotState(), phase: 'victory', enemyHp: 0 };
  s = pilotReducer(s, { type: 'preview', actor: 'player' });
  s = next(next(next(s)));
  assert.equal(s.phase, 'victory');
  assert.equal(s.enemyHp, 0);
});

test('reset and phase tokens reject old delayed callbacks, including same-phase restarts', () => {
  const first = answer();
  const stale = { type: 'advance', phase: first.phase, cycle: first.cycle };
  const reset = pilotReducer(first, { type: 'reset' });
  const current = pilotReducer(reset, { type: 'preview', actor: 'player' });
  assert.notEqual(first.cycle, current.cycle);
  assert.equal(pilotReducer(current, stale), current);
  const impact = next(current);
  assert.equal(pilotReducer(impact, { ...stale, cycle: current.cycle }), impact);
});

test('all timed phases terminate and have bounded durations', () => {
  for (const duration of Object.values(PILOT_PHASE_MS)) assert.ok(duration >= 100 && duration <= 600);
  for (const correct of [true, false]) {
    let s = answer(correct ? 7 : 6);
    let steps = 0;
    while (PILOT_PHASE_MS[s.phase] && steps++ < 10) s = next(s);
    assert.equal(s.phase, 'ready');
    assert.ok(steps <= 6);
  }
});

test('non-finite damage cannot poison the trial state', () => {
  for (const damage of [NaN, Infinity, -1]) {
    assert.equal(next(answer(7, damage)).enemyHp, 179);
  }
});

test('question and finished phases use idle poses rather than lingering attack poses', () => {
  for (const phase of ['ready', 'question', 'victory', 'defeat']) {
    assert.equal(getPilotMotion(phase, 'player'), 'idle');
    assert.equal(getPilotMotion(phase, 'enemy'), 'idle');
  }
});

for (const { file } of Object.values(PILOT_ART)) {
  test(`${file} is a bounded RGBA atlas with eight 512x384 cells`, () => {
    const bytes = readFileSync(new URL(`../../../public/sprites/visual-pilot/${file}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8X');
    assert.ok(bytes[20] & 0x10, 'real alpha must be present');
    assert.equal(bytes.readUIntLE(24, 3) + 1, 2048);
    assert.equal(bytes.readUIntLE(27, 3) + 1, 768);
    assert.ok(bytes.length < 400_000);
  });
}

const motionCss = readFileSync(new URL('./VisualPilot.css', import.meta.url), 'utf8');
const cssTracks = new Map([...motionCss.matchAll(/@keyframes\s+(\w+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)]
  .map(([, name, body]) => [name, [...body.matchAll(/([\d%,\s]+)\{([^{}]*)\}/g)].flatMap(([, offsets, styles]) =>
    offsets.trim().split(',').map((offset) => ({
      offset: Number.parseFloat(offset),
      styles: Object.fromEntries(styles.split(';').filter(Boolean).map((declaration) => declaration.trim().split(':'))),
    })))]));
const edge = (name, offset, property) => {
  const value = cssTracks.get(name)?.find((frame) => frame.offset === offset)?.styles[property];
  assert.ok(value, `${name} needs ${property} at ${offset}%`);
  return value;
};

test('smoothing preserves the original impact deadlines and action durations', () => {
  assert.deepEqual(PILOT_PHASE_MS, {
    playerWindup: 340, playerImpact: 180, playerRecover: 460,
    enemyWindup: 520, enemyImpact: 200, enemyRecover: 480,
  });
});

test('body and shadow tracks join without a position, rotation or scale snap', () => {
  for (const [before, after] of [
    ['pilotBrace', 'pilotStrike'], ['pilotStrike', 'pilotLand'],
    ['pilotLand', 'pilotBrace'], ['pilotRecoil', 'pilotRegain'],
    ['pilotRegain', 'pilotBrace'], ['pilotLand', 'pilotRecoil'],
    ['pilotShadowBrace', 'pilotShadowStrike'], ['pilotShadowStrike', 'pilotShadowLand'],
    ['pilotShadowLand', 'pilotShadowBrace'],
  ]) assert.equal(edge(before, 100, 'transform'), edge(after, 0, 'transform'), `${before} -> ${after}`);
  for (const [before, after] of [
    ['pilotShadowBrace', 'pilotShadowStrike'], ['pilotShadowStrike', 'pilotShadowLand'],
    ['pilotShadowLand', 'pilotShadowBrace'],
  ]) assert.equal(edge(before, 100, 'opacity'), edge(after, 0, 'opacity'));
});

test('pose sequences are continuous across beat boundaries and return to neutral', () => {
  for (const [before, after] of [
    ['pilotWindup', 'pilotStrikePose'], ['pilotStrikePose', 'pilotRecover'],
    ['pilotWindup', 'pilotDragonStrikePose'], ['pilotDragonStrikePose', 'pilotDragonRecover'],
    ['pilotDragonRecover', 'pilotWindup'],
    ['pilotHurtPose', 'pilotSettle'], ['pilotRecover', 'pilotWindup'], ['pilotSettle', 'pilotWindup'],
  ]) assert.equal(edge(before, 100, 'background-position'), edge(after, 0, 'background-position'));
  for (const name of ['pilotRecover', 'pilotSettle']) assert.equal(edge(name, 100, 'background-position'), '0 0');
});

test('dragon keeps its mouth-open drawing until the breath finishes', () => {
  for (const frame of cssTracks.get('pilotDragonStrikePose')) assert.equal(frame.styles['background-position'], '100% 0');
  assert.match(motionCss, /\.pilot-fighter\.is-enemy\[data-motion=strike\] \.pilot-atlas\{animation-name:pilotDragonStrikePose\}/);
});

test('flame envelope never shortens the blast after impact damage has already applied', () => {
  for (const frame of cssTracks.get('pilotFlame')) assert.equal(frame.styles.transform, undefined);
  for (const frame of cssTracks.get('pilotFlameSkin')) assert.match(frame.styles.transform, /^scaleY\(/);
  assert.ok(Number(edge('pilotFlame', 0, 'opacity')) > 0);
});

test('idle breathing loops continuously without flipping poses, and new motion layers can pause', () => {
  assert.equal(edge('pilotBreathe', 0, 'transform'), edge('pilotBreathe', 100, 'transform'));
  assert.notEqual(edge('pilotBreathe', 0, 'transform'), edge('pilotBreathe', 50, 'transform'));
  assert.doesNotMatch(motionCss.match(/\.pilot-atlas\{([^{}]*)\}/)?.[1] ?? '', /animation:/);
  assert.match(motionCss, /\.pilot-body,\.pilot-breathing\{transform-origin:var\(--pilot-foot-x,50%\) 95\.833333%\}/);
  assert.match(motionCss, /\.pilot-body,\.pilot-breathing,\.pilot-atlas,\.pilot-ground-shadow,\.pilot-fx g,\.pilot-fx path,\.pilot-fx ellipse\{animation-play-state:var\(--pilot-play-state\)!important\}/);
  const reducedMotion = motionCss.slice(motionCss.indexOf('@media(prefers-reduced-motion:reduce)'));
  assert.match(reducedMotion, /\.pilot-breathing.*animation:none!important/);
  assert.match(reducedMotion, /\.pilot-ground-shadow.*animation:none!important/);
});

test('pose inspection addresses exactly eight cells and rejects invalid frame numbers', () => {
  assert.equal(PILOT_POSES.length, 8);
  const positions = PILOT_POSES.map((_, index) => getPilotPosePosition(index));
  assert.equal(new Set(positions).size, 8);
  assert.equal(positions[0], '0% 0%');
  assert.equal(positions[3], '100% 0%');
  assert.equal(positions[4], '0% 100%');
  assert.equal(positions[7], '100% 100%');
  for (const invalid of [-1, 8, 100, 1.5, NaN, Infinity]) assert.equal(getPilotPosePosition(invalid), positions[0]);
});

test('inspection overrides presentation without removing the paused animations', () => {
  const inspectionRules = [...motionCss.matchAll(/[^{}]*\[data-inspecting=true\][^{}]*\{([^{}]*)\}/g)].map(([, body]) => body);
  assert.equal(inspectionRules.length, 2);
  assert.match(inspectionRules[0], /transform:none!important/);
  assert.match(inspectionRules[1], /background-position:var\(--pilot-inspect-position\)!important/);
  for (const rule of inspectionRules) assert.doesNotMatch(rule, /animation(?:-name)?:/);
});

test('v2 atlas registration matches the shipped bytes and reserves gutters for every pose', () => {
  const report = JSON.parse(readFileSync(new URL('../../../public/sprites/visual-pilot/registration-v2.json', import.meta.url), 'utf8'));
  assert.deepEqual(report.cell, [512, 384]);
  assert.deepEqual(report.grid, [4, 2]);
  assert.equal(report.baseline, 368);
  assert.equal(report.poses.length, 8);
  for (const art of Object.values(PILOT_ART)) {
    const record = Object.values(report.assets).find((entry) => entry.file === art.file);
    assert.ok(record);
    assert.equal(record.footX, art.footX);
    const bytes = readFileSync(new URL(`../../../public/sprites/visual-pilot/${art.file}`, import.meta.url));
    assert.equal(record.sha256, createHash('sha256').update(bytes).digest('hex'));
    assert.equal(record.bytes, bytes.length);
    assert.equal(record.frames.length, 8);
    for (const [index, frame] of record.frames.entries()) {
      assert.equal(frame.index, index);
      assert.ok(Math.abs(frame.offset[0] + frame.sourceFootX * record.uniformScale - art.footX) <= .5);
      assert.equal(frame.offset[1] + frame.size[1], report.baseline);
      const [left, top, right, bottom] = frame.visibleBounds;
      assert.ok(left >= 12 && top >= 12 && right <= 500 && bottom <= report.baseline);
    }
  }
});
