/**
 * Bundle size budget gate — zero dependencies.
 *
 * Reads dist/assets/*.js and asserts each chunk stays within its budget.
 * Exit code 1 if any chunk exceeds its limit.
 *
 * Usage:  node scripts/bundle-budget.mjs
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS_DIR = 'dist/assets';

// Budget per chunk pattern (bytes). ~20% headroom over current sizes.
const CHUNK_BUDGETS = [
  { pattern: /^index-.*\.js$/,            label: 'index (main)',     budget: 420_000 },
  { pattern: /^vendor-react-.*\.js$/,     label: 'vendor-react',     budget: 230_000 },
  { pattern: /^battle-effects-.*\.js$/,   label: 'battle-effects',   budget: 110_000 },
  { pattern: /^game-data-.*\.js$/,        label: 'game-data',        budget: 100_000 },
  { pattern: /^BattleScreen-.*\.js$/,     label: 'BattleScreen',     budget:  70_000 },
];
const OTHER_JS_BUDGET = 40_000;
const TOTAL_JS_BUDGET = 1_000_000;

const files = readdirSync(ASSETS_DIR).filter(f => f.endsWith('.js'));
const violations = [];
let totalJs = 0;

for (const file of files) {
  const size = statSync(join(ASSETS_DIR, file)).size;
  totalJs += size;

  const matched = CHUNK_BUDGETS.find(b => b.pattern.test(file));
  const budget = matched ? matched.budget : OTHER_JS_BUDGET;
  const label = matched ? matched.label : file;

  if (size > budget) {
    violations.push({ label, file, size, budget });
  }
}

if (totalJs > TOTAL_JS_BUDGET) {
  violations.push({
    label: 'JS total',
    file: '(all .js)',
    size: totalJs,
    budget: TOTAL_JS_BUDGET,
  });
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

if (violations.length > 0) {
  console.error('\n❌ Bundle budget exceeded:\n');
  for (const v of violations) {
    console.error(`  ${v.label}: ${kb(v.size)} > ${kb(v.budget)}  (${v.file})`);
  }
  console.error('');
  process.exit(1);
} else {
  console.log(`\n✅ Bundle budget OK — total JS: ${kb(totalJs)} / ${kb(TOTAL_JS_BUDGET)}\n`);
  for (const file of files.sort((a, b) => {
    return statSync(join(ASSETS_DIR, b)).size - statSync(join(ASSETS_DIR, a)).size;
  })) {
    const size = statSync(join(ASSETS_DIR, file)).size;
    const matched = CHUNK_BUDGETS.find(b => b.pattern.test(file));
    const budget = matched ? matched.budget : OTHER_JS_BUDGET;
    const pct = Math.round((size / budget) * 100);
    console.log(`  ${file.padEnd(48)} ${kb(size).padStart(10)} / ${kb(budget).padStart(10)}  (${pct}%)`);
  }
  console.log('');
}
