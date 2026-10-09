import assert from 'node:assert/strict';
import test from 'node:test';
import { SPRING_QUESTION_COUNT, SpringSession, pickSpringTargets, springRewards } from './reviewSpring.ts';
import { createLearningProgress, learningSkillKey, recordLearningAnswer } from './learningProgress.ts';
import { STARTERS } from '../data/starters.ts';
import { getExpedition } from '../data/worldMap.ts';
import { SPRING_FLOOR, buildExpeditionLanes, buildExpeditionPlan } from './expeditionPlanner.ts';
import { arriveAtMap, chooseExpeditionRoute, createExpeditionRun, expeditionBattleCount, isSerialExpeditionRun } from './expeditionRun.ts';

function seeded(seed) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
}

function progressWithMistake() {
  let progress = createLearningProgress();
  const question = { op: '×', display: '7 × 8', learning: {
    skillKey: learningSkillKey('×', [2, 9]), op: '×', range: [2, 9], level: 2, sequence: 1, isRecovery: false,
  } };
  progress = recordLearningAnswer(progress, question, false).progress;
  return progress;
}

test('the spring reviews past mistakes first, then the monster moves', () => {
  const fire = STARTERS.find((s) => s.id === 'fire');
  const targets = pickSpringTargets(progressWithMistake(), fire.moves);
  assert.equal(targets.length, SPRING_QUESTION_COUNT);
  assert.deepEqual(targets[0], { op: '×', range: [2, 9], reason: 'mistake' });
  assert.ok(targets.slice(1).every((target) => target.reason === 'practice'));
  assert.equal(new Set(targets.map((tg) => `${tg.op}${tg.range}`)).size, 3, 'three different skills');
  assert.equal(pickSpringTargets(createLearningProgress(), []).length, 0);
});

test('a spring visit records each answer in the learning record', () => {
  let saved = null;
  let clock = 0;
  const session = new SpringSession({
    progress: progressWithMistake(), moves: [], grade: 3, rand: seeded(4),
    save: (progress) => { saved = progress; }, now: () => (clock += 1000),
  });
  // Pass two other answers so the mistake is due, as in battle.
  const q1 = session.question(0);
  assert.equal(q1.springReason, 'mistake');
  assert.ok(q1.learning, 'persistent visits carry learning metadata');
  const right = q1.choices.indexOf(q1.answer);
  const result = session.answer(q1, right);
  assert.equal(result.correct, true);
  assert.equal(result.answerTimeMs, 1000);
  assert.ok(saved && saved.answered === 2, 'the answer is saved to the learning record');
  assert.equal(session.claimFinish(), true);
  assert.equal(session.claimFinish(), false, 'leaving twice pays once');
});

test('grade alignment applies at the spring too', () => {
  const session = new SpringSession({ progress: null, moves: STARTERS.find((s) => s.id === 'water').moves, grade: 1, rand: seeded(9) });
  for (let i = 0; i < session.targets.length; i += 1) {
    const q = session.question(i);
    assert.ok(['+', '-'].includes(q.op), `${q.display} for grade 1`);
    assert.equal(q.learning, undefined, 'timed / non-persistent visits only practise');
  }
});

test('rewards scale with correct answers', () => {
  assert.deepEqual(springRewards(0, 100, 5), { heal: 0, exp: 0 });
  assert.deepEqual(springRewards(2, 100, 5), { heal: 30, exp: 40 });
  assert.deepEqual(springRewards(9, 100, 5), springRewards(3, 100, 5), 'capped at the question count');
});

test('every expedition offers exactly one spring midway, and choosing it skips a battle', () => {
  const expedition = getExpedition('hydra');
  const pick = (n) => Math.floor(seeded(2)() * n);
  const plan = buildExpeditionPlan(expedition, pick);
  const springFloors = plan.floors.filter((floor) => floor.options.some((o) => o.kind === 'spring')).map((f) => f.floor);
  assert.deepEqual(springFloors, [SPRING_FLOOR]);
  let run = createExpeditionRun(plan, buildExpeditionLanes(plan, expedition, pick));
  for (let floor = 1; floor <= SPRING_FLOOR; floor += 1) {
    const lane = floor === SPRING_FLOOR ? plan.floors[floor].options.findIndex((o) => o.kind === 'spring') : 0;
    run = chooseExpeditionRoute(arriveAtMap(run), lane);
  }
  assert.equal(expeditionBattleCount(run), 9);
  assert.ok(isSerialExpeditionRun({ ...run, lanes: run.lanes }), 'spring routes survive save validation');
});
