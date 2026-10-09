/** Display names for question operations (shared by the dashboard and the battle menu). */
export const OP_NAME_FALLBACKS: Record<string, string> = {
  '+': 'Addition',
  '-': 'Subtraction',
  '×': 'Multiplication',
  '÷': 'Division',
  dec_add: 'Decimal Add/Sub',
  dec_frac: 'Decimal/Fraction Convert',
  dec_mul: 'Decimal Multiplication',
  dec_div: 'Decimal Division',
  mixed2: 'Add/Sub Mix',
  mixed3: 'Mul/Add Mix',
  mixed4: 'Four Ops Mix',
  unknown1: 'Unknown Add/Sub',
  unknown2: 'Unknown Mul/Div',
  unknown3: 'Unknown Large Number',
  unknown4: 'Unknown Mixed',
  frac_cmp: 'Fraction Compare',
  frac_same: 'Same Denominator',
  frac_diff: 'Different Denominator',
  frac_muldiv: 'Fraction Mul/Div',
};

export const OP_NAME_KEYS: Record<string, string> = {
  '+': 'dashboard.op.name.add',
  '-': 'dashboard.op.name.sub',
  '×': 'dashboard.op.name.mul',
  '÷': 'dashboard.op.name.div',
  dec_add: 'dashboard.op.name.decAdd',
  dec_frac: 'dashboard.op.name.decFrac',
  dec_mul: 'dashboard.op.name.decMul',
  dec_div: 'dashboard.op.name.decDiv',
  mixed2: 'dashboard.op.name.mixed2',
  mixed3: 'dashboard.op.name.mixed3',
  mixed4: 'dashboard.op.name.mixed4',
  unknown1: 'dashboard.op.name.unknown1',
  unknown2: 'dashboard.op.name.unknown2',
  unknown3: 'dashboard.op.name.unknown3',
  unknown4: 'dashboard.op.name.unknown4',
  frac_cmp: 'dashboard.op.name.fracCmp',
  frac_same: 'dashboard.op.name.fracSame',
  frac_diff: 'dashboard.op.name.fracDiff',
  frac_muldiv: 'dashboard.op.name.fracMulDiv',
};

export function opDisplayName(op: string, t: (key: string, fallback?: string) => string): string {
  return t(OP_NAME_KEYS[op] ?? `dashboard.op.name.${op}`, OP_NAME_FALLBACKS[op] ?? op);
}
