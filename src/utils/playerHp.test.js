import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getStarterStageIdx,
  getStageMaxHp,
  getLevelMaxHp,
  getStarterMaxHp,
  getStarterLevelMaxHp,
} from './playerHp.ts';

describe('getStarterStageIdx', () => {
  it('returns 0 for null/undefined starter', () => {
    assert.equal(getStarterStageIdx(null), 0);
    assert.equal(getStarterStageIdx(undefined), 0);
  });

  it('returns selectedStageIdx clamped to 0-2', () => {
    assert.equal(getStarterStageIdx({ selectedStageIdx: 1 }), 1);
    assert.equal(getStarterStageIdx({ selectedStageIdx: 2 }), 2);
    assert.equal(getStarterStageIdx({ selectedStageIdx: -1 }), 0);
    assert.equal(getStarterStageIdx({ selectedStageIdx: 5 }), 2);
  });

  it('uses fallback when selectedStageIdx is null', () => {
    assert.equal(getStarterStageIdx({ selectedStageIdx: null }, 2), 2);
  });
});

describe('getStageMaxHp', () => {
  it('returns base HP for stage 0', () => {
    const hp0 = getStageMaxHp(0);
    assert.ok(hp0 >= 100, 'base HP should be at least 100');
  });

  it('increases HP with stage', () => {
    assert.ok(getStageMaxHp(1) > getStageMaxHp(0));
    assert.ok(getStageMaxHp(2) > getStageMaxHp(1));
  });
});

describe('getLevelMaxHp', () => {
  it('returns higher HP at higher levels', () => {
    assert.ok(getLevelMaxHp(5, 0) > getLevelMaxHp(1, 0));
  });

  it('returns higher HP at higher stages', () => {
    assert.ok(getLevelMaxHp(1, 2) > getLevelMaxHp(1, 0));
  });
});

describe('getStarterMaxHp', () => {
  it('returns base HP for null starter', () => {
    assert.equal(getStarterMaxHp(null), getStageMaxHp(0));
  });

  it('returns stage-scaled HP for valid starter', () => {
    assert.equal(getStarterMaxHp({ selectedStageIdx: 2 }), getStageMaxHp(2));
  });
});

describe('getStarterLevelMaxHp', () => {
  it('combines starter stage and level', () => {
    const hp = getStarterLevelMaxHp({ selectedStageIdx: 1 }, 5);
    assert.equal(hp, getLevelMaxHp(5, 1));
  });

  it('uses fallback for null starter', () => {
    const hp = getStarterLevelMaxHp(null, 3, 2);
    assert.equal(hp, getLevelMaxHp(3, 2));
  });
});
