import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeAtlasFiles, pruneRetiredAtlases, retiredAtlasFiles } from './prune-retired-atlases.ts';

const registry = readFileSync(new URL('../src/data/spriteAnimationAssets.ts', import.meta.url), 'utf8');
const publicAtlases = readdirSync(new URL('../public/sprites/visual-pilot/', import.meta.url));

test('builds keep exactly the 55 atlases the battle registry loads', () => {
  const active = activeAtlasFiles(registry);
  assert.equal(active.size, 55);
  const retired = retiredAtlasFiles(publicAtlases, active);
  assert.equal(publicAtlases.filter((file) => !retired.includes(file)).length, 55);
  assert.ok(retired.some((file) => file.endsWith('-v1.webp')));
  assert.ok(retired.some((file) => file.startsWith('registration-')));
  assert.ok(!retired.some((file) => active.has(file)));
});

test('pruning refuses to run without a registry or when active art is missing', () => {
  assert.throws(() => retiredAtlasFiles(['a.webp'], new Set()), /No active battle atlases/);
  assert.throws(() => retiredAtlasFiles(['a.webp'], new Set(['a.webp', 'b.webp'])), /missing from the build: b\.webp/);
  assert.deepEqual(retiredAtlasFiles(['a.webp', 'old-v1.webp', '.DS_Store'], new Set(['a.webp'])), ['old-v1.webp', '.DS_Store']);
});

test('the registry scan matches the atlases the game actually imports', async () => {
  const { SPRITE_ANIMATION_ASSETS } = await import('../src/data/spriteAnimationAssets.ts');
  assert.deepEqual([...activeAtlasFiles(registry)].sort(), Object.values(SPRITE_ANIMATION_ASSETS).map((art) => art.file).sort());
});

test('the build plugin prunes only after a successful build', t => {
  const out = mkdtempSync(join(tmpdir(), 'math-prune-'));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  const dir = join(out, 'sprites', 'visual-pilot');
  mkdirSync(dir, { recursive: true });
  const active = [...activeAtlasFiles(registry)];
  for (const file of [...active, 'old-v1.webp', 'registration-v2.json']) writeFileSync(join(dir, file), '');
  const plugin = pruneRetiredAtlases();
  plugin.configResolved({ root: fileURLToPath(new URL('..', import.meta.url)), build: { outDir: out } });

  plugin.closeBundle(new Error('syntax error'));
  assert.equal(readdirSync(dir).length, active.length + 2, 'a failed build must not be pruned');

  plugin.closeBundle();
  assert.deepEqual(readdirSync(dir).sort(), [...active].sort());
});
