import assert from 'node:assert/strict';
import test from 'node:test';
import { getScreenMusic, getEncounterMusic } from './battleMusic.ts';

test('scene music changes with the encounter, not the rendering quality setting', () => {
  for (const [scene, track] of Object.entries({ fire: 'volcano', water: 'coast', electric: 'thunder',
    steel: 'ironclad', ghost: 'graveyard', rock: 'canyon', grass: 'battle' })) {
    for (const lowPerfMode of [true, false]) {
      assert.equal(getScreenMusic({ screen: 'battle', battleMode: 'single', lowPerfMode,
        enemy: { id: 'slime', mType: 'dark', sceneMType: scene } }), track);
    }
  }
});

test('each boss keeps its theme in either encounter slot, including sword god in heaven', () => {
  for (const id of ['boss', 'boss_hydra', 'boss_crazy_dragon', 'boss_sword_god']) {
    const boss = { id, sceneMType: 'heaven', mType: 'light' };
    const track = id === 'boss' ? 'boss_dark_king' : id;
    assert.equal(getEncounterMusic(boss), track);
    assert.equal(getEncounterMusic({ id: 'slime', sceneMType: 'water' }, boss), track);
  }
  assert.equal(getEncounterMusic({ id: 'boss_hydra' }, { id: 'boss_sword_god' }), 'boss_hydra');
});

test('PvP theme stays on P1 boss priority across turn changes; screens without music stop it', () => {
  for (const turn of ['p1', 'p2']) assert.equal(getScreenMusic({ screen: 'battle', battleMode: 'pvp', turn,
    starter: { id: 'boss_sword_god' }, pvpStarter2: { id: 'boss_hydra' } }), 'boss_sword_god');
  assert.equal(getScreenMusic({ screen: 'title', battleMode: 'single' }), 'menu');
  assert.equal(getScreenMusic({ screen: 'gameover', battleMode: 'single' }), null);
});
