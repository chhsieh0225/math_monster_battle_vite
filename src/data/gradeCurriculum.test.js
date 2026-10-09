import assert from 'node:assert/strict';
import test from 'node:test';
import { GRADES, GRADE_OPERAND_CAPS, alignOpToGrade, alignOpsToGrade, isStarterRecommended } from './gradeCurriculum.ts';
import { STARTERS } from './starters.ts';
import { PVP_SELECTABLE_ROSTER as PVP_ROSTER } from './pvpRoster.ts';
import { genQ } from '../utils/questionGenerator.ts';
import { alignMoveToGrade, alignOptionsToGrade } from '../hooks/battle/useGenBattleQuestion.ts';
import { DIFF_MODS } from '../hooks/battle/partnerStarter.ts';

test('operations a grade has not learned map to the closest earlier skill', () => {
  assert.equal(alignOpToGrade('×', 1), '+');
  assert.equal(alignOpToGrade('÷', 1), '-');
  assert.equal(alignOpToGrade('÷', 2), 'unknown2', 'grade 2 meets division as a missing factor');
  assert.equal(alignOpToGrade('÷', 3), '÷');
  assert.equal(alignOpToGrade('mixed4', 3), 'mixed3');
  assert.equal(alignOpToGrade('frac_diff', 3), 'frac_same');
  assert.equal(alignOpToGrade('frac_muldiv', 5), 'frac_diff');
  assert.equal(alignOpToGrade('dec_div', 4), 'dec_add');
  assert.deepEqual(alignOpsToGrade(['×', '÷'], 1), ['+', '-']);
  for (const op of Object.keys(GRADE_OPERAND_CAPS[6])) assert.equal(alignOpToGrade(op, 6), op);
  for (const grade of GRADES) {
    for (const op of ['+', '-', '×', '÷', 'mixed2', 'mixed3', 'mixed4', 'unknown1', 'unknown2', 'unknown3', 'unknown4',
      'frac_cmp', 'frac_same', 'frac_diff', 'frac_muldiv', 'dec_add', 'dec_frac', 'dec_mul', 'dec_div']) {
      assert.ok(Object.hasOwn(GRADE_OPERAND_CAPS[grade], alignOpToGrade(op, grade)), `${op} at grade ${grade}`);
    }
  }
});

function numbers(text) {
  return [...String(text).matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

test('every monster asks grade-1 and grade-2 children only what they have learned', () => {
  const moves = [...STARTERS, ...PVP_ROSTER].flatMap((starter) => starter.moves || []);
  for (const grade of [1, 2]) {
    for (const move of moves) {
      const aligned = alignMoveToGrade(move, grade);
      const options = alignOptionsToGrade({}, grade);
      for (let i = 0; i < 40; i += 1) {
        const q = genQ({ range: move.range, ops: aligned.ops }, DIFF_MODS[4], options);
        const caps = GRADE_OPERAND_CAPS[grade];
        assert.ok(Object.hasOwn(caps, q.op), `${move.name} → ${q.op} at grade ${grade}`);
        assert.ok(!q.display.includes('÷'), `no ÷ sign before grade 3: ${q.display}`);
        if (grade === 1) assert.ok(!q.display.includes('×'), q.display);
        if (q.op === '+' || q.op === '-') {
          for (const n of numbers(q.display)) assert.ok(n <= caps[q.op], `${q.display} at grade ${grade}`);
        }
        if (q.op === '×') for (const n of numbers(q.display)) assert.ok(n <= 9, q.display);
      }
    }
  }
});

test('grade 3 keeps multiplication and division inside the 九九 table at the hardest level', () => {
  const options = alignOptionsToGrade({}, 3);
  for (let i = 0; i < 200; i += 1) {
    const mul = genQ({ range: [4, 12], ops: ['×'] }, DIFF_MODS[4], options);
    for (const n of numbers(mul.display)) assert.ok(n <= 9, mul.display);
    const div = genQ({ range: [3, 12], ops: ['÷'] }, DIFF_MODS[4], options);
    const [, divisor] = numbers(div.display);
    assert.ok(divisor <= 9 && div.answer <= 9, div.display);
  }
});

test('challenge operation limits are translated to the grade too', () => {
  const options = alignOptionsToGrade({ allowedOps: ['mixed4', 'unknown4'] }, 2);
  assert.deepEqual(options.allowedOps, ['mixed2', 'unknown2']);
  assert.equal(alignOptionsToGrade({ allowedOps: ['×'] }, null).maxOperandByOp, undefined, 'no grade, no caps');
});

test('starters made for the grade are recommended', () => {
  const grass = STARTERS.find((s) => s.id === 'grass');
  assert.equal(isStarterRecommended(grass.gradeRange, 1), true);
  assert.equal(isStarterRecommended(grass.gradeRange, 4), false);
  assert.equal(isStarterRecommended(grass.gradeRange, null), false);
  for (const grade of GRADES) {
    assert.ok(STARTERS.some((s) => isStarterRecommended(s.gradeRange, grade)), `grade ${grade} has a recommended monster`);
  }
});

test('grade-2 missing-factor explanations never show the ÷ sign', () => {
  const options = alignOptionsToGrade({}, 2);
  for (let i = 0; i < 100; i += 1) {
    const q = genQ({ range: [2, 9], ops: ['unknown2'] }, 1, options);
    assert.ok(!q.display.includes('÷') && q.steps.every((step) => !step.includes('÷')), q.steps.join(' | '));
  }
});
