import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TYPE_EMOJI } from './elementEmoji.ts';

describe('TYPE_EMOJI', () => {
  it('maps all collection damage types to emojis', () => {
    const expectedTypes = [
      'fire', 'water', 'electric', 'grass', 'steel',
      'ice', 'light', 'dark', 'ghost', 'rock', 'poison', 'dream', 'all',
    ];
    for (const t of expectedTypes) {
      assert.ok(TYPE_EMOJI[t], `missing emoji for ${t}`);
      assert.ok(TYPE_EMOJI[t].length > 0);
    }
  });

  it('returns undefined for unknown types', () => {
    assert.equal(TYPE_EMOJI['banana'], undefined);
  });
});
