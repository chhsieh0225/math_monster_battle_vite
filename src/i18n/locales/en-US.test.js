import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const CJK_RE = /[\u3400-\u9fff]/;
const ALLOWED_KEYS = new Set([
  // Keep this allowlist explicit in case we intentionally add non-English content later.
]);

test('en-US locale entries do not contain CJK characters', () => {
  const source = readFileSync(new URL('./en-US.ts', import.meta.url), 'utf8');
  const matches = [...source.matchAll(/"([^"]+)":\s*"([^"]*)"/g)];
  const entries = matches.map((match) => [match[1], match[2]]);
  assert.ok(entries.length > 0, 'en-US locale should not be empty');

  for (const [key, value] of entries) {
    if (ALLOWED_KEYS.has(key)) continue;
    assert.equal(
      CJK_RE.test(String(value)),
      false,
      `en-US key "${key}" contains unexpected CJK content: ${value}`,
    );
  }
});
