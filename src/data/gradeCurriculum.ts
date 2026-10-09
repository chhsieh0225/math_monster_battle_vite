/**
 * Grade alignment (Taiwan 108 curriculum, conservative reading).
 *
 * Each grade lists the operations it has taught and the largest operand the
 * question generator may use for them, after difficulty scaling. An operation
 * missing from a grade is replaced by the closest operation that grade knows,
 * so any monster can be played at any grade without leaving the syllabus.
 *
 * Notes on the boundaries:
 * - Grade 2 learns the 九九 table; the ÷ sign starts in grade 3, so grade 2
 *   meets division as a missing factor (? × 3 = 12).
 * - Fractions (same denominator) start in grade 3, unlike denominators in 5.
 * - Fraction ×/÷ together and decimal ÷ are treated as grade 6.
 */
export type Grade = 1 | 2 | 3 | 4 | 5 | 6;

export const GRADES: readonly Grade[] = [1, 2, 3, 4, 5, 6];

export const GRADE_OPERAND_CAPS: Record<Grade, Readonly<Record<string, number>>> = {
  1: { '+': 20, '-': 20, unknown1: 10 },
  2: { '+': 100, '-': 100, '×': 9, mixed2: 30, unknown1: 30, unknown2: 9 },
  3: {
    '+': 999, '-': 999, '×': 9, '÷': 9, mixed2: 99, mixed3: 9,
    unknown1: 99, unknown2: 9, frac_cmp: 10, frac_same: 10,
  },
  4: {
    '+': 9999, '-': 9999, '×': 12, '÷': 12, mixed2: 999, mixed3: 12, mixed4: 9,
    unknown1: 999, unknown2: 12, unknown3: 50, frac_cmp: 12, frac_same: 12, dec_add: 12,
  },
  5: {
    '+': 9999, '-': 9999, '×': 12, '÷': 12, mixed2: 999, mixed3: 12, mixed4: 12,
    unknown1: 999, unknown2: 12, unknown3: 50, frac_cmp: 12, frac_same: 12, frac_diff: 12,
    dec_add: 12, dec_frac: 12, dec_mul: 12,
  },
  6: {
    '+': 9999, '-': 9999, '×': 12, '÷': 12, mixed2: 999, mixed3: 12, mixed4: 12,
    unknown1: 999, unknown2: 12, unknown3: 50, unknown4: 12, frac_cmp: 12, frac_same: 12,
    frac_diff: 12, frac_muldiv: 12, dec_add: 12, dec_frac: 12, dec_mul: 12, dec_div: 12,
  },
};

/** Closest earlier skill for an operation a grade has not taught yet, best first. */
const FALLBACKS: Readonly<Record<string, readonly string[]>> = {
  '+': [],
  '-': ['+'],
  '×': ['+'],
  '÷': ['unknown2', '-'],
  mixed2: ['+'],
  mixed3: ['mixed2', '×', '+'],
  mixed4: ['mixed3', 'mixed2', '+'],
  unknown1: ['-'],
  unknown2: ['unknown1', '×', '-'],
  unknown3: ['unknown2', 'unknown1', '+'],
  unknown4: ['unknown3', 'unknown2', 'unknown1', '+'],
  frac_cmp: ['-'],
  frac_same: ['frac_cmp', '+'],
  frac_diff: ['frac_same', 'frac_cmp', '+'],
  frac_muldiv: ['frac_diff', 'frac_same', '×', '+'],
  dec_add: ['+'],
  dec_frac: ['frac_cmp', 'dec_add', '+'],
  dec_mul: ['dec_add', '×', '+'],
  dec_div: ['dec_mul', 'dec_add', '÷', '+'],
};

export function isGrade(value: unknown): value is Grade {
  return typeof value === 'number' && (GRADES as readonly number[]).includes(value);
}

export function isOpTaught(op: string, grade: Grade): boolean {
  return Object.hasOwn(GRADE_OPERAND_CAPS[grade], op);
}

/** The operation a child of this grade practises in place of `op`. */
export function alignOpToGrade(op: string, grade: Grade): string {
  if (isOpTaught(op, grade)) return op;
  return (FALLBACKS[op] ?? []).find((candidate) => isOpTaught(candidate, grade)) ?? '+';
}

export function alignOpsToGrade(ops: readonly string[], grade: Grade): string[] {
  const aligned = [...new Set(ops.map((op) => alignOpToGrade(op, grade)))];
  return aligned.length > 0 ? aligned : ['+'];
}

export function gradeOperandCaps(grade: Grade): Readonly<Record<string, number>> {
  return GRADE_OPERAND_CAPS[grade];
}

/** Starters whose designed grade band includes this grade are recommended. */
export function isStarterRecommended(gradeRange: readonly number[] | undefined, grade: Grade | null): boolean {
  if (!grade || !Array.isArray(gradeRange) || gradeRange.length < 2) return false;
  return grade >= gradeRange[0] && grade <= gradeRange[1];
}
