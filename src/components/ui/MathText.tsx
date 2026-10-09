/** Fraction tokens are styled by the screen that renders them (BattleScreen.css, PlacementScreen.css); no CSS import keeps this testable in Node. */
import type { ReactNode } from 'react';

const FRACTION_TOKEN_RE = /(-?\d+)\s*\/\s*(-?\d+)/g;

/** Render "3/4" tokens as stacked fractions; other text passes through. */
export function renderMathText(value: string | number): ReactNode {
  const text = String(value ?? '');
  if (!text.includes('/')) return text;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  FRACTION_TOKEN_RE.lastIndex = 0;

  while ((match = FRACTION_TOKEN_RE.exec(text)) !== null) {
    const idx = match.index;
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
    const numerator = match[1];
    const denominator = match[2];
    parts.push(
      <span
        key={`frac-${idx}-${numerator}-${denominator}`}
        className="battle-math-frac"
        aria-label={`${numerator}/${denominator}`}
      >
        <span className="battle-math-frac-top">{numerator}</span>
        <span className="battle-math-frac-line" />
        <span className="battle-math-frac-bottom">{denominator}</span>
      </span>,
    );
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/** Plain expressions end in "= ?"; equations, unknowns and comparisons already carry their own prompt. */
export function needsEqualPrompt(display: string, op?: string): boolean {
  return !(display.includes('=') || display.includes('?')
    || Boolean(op && (op.startsWith('unknown') || op === 'frac_cmp')));
}
