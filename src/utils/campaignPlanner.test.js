import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import {
  applyCampaignPlanToRoster,
  buildCampaignRunPlan,
  resolveCampaignPresetConfig,
} from './campaignPlanner.ts';

const pickFirst = () => 0;
const pickSecond = (length) => (length > 1 ? 1 : 0);

function createEnemy(round) {
  return {
    id: `dummy-${round}`,
    name: `Dummy ${round}`,
    lvl: round + 1,
    maxHp: 100,
    hp: 100,
    atk: 20,
    mType: 'fire',
    typeIcon: '🔥',
    c1: '#f97316',
    c2: '#b91c1c',
    svgFn: () => '',
  };
}

describe('buildCampaignRunPlan — normal preset', () => {
  test('creates route nodes with deterministic branch path', () => {
    const planLeft = buildCampaignRunPlan(pickFirst, 'normal');
    const planRight = buildCampaignRunPlan(pickSecond, 'normal');

    const expectedLength = BALANCE_CONFIG.stage.campaign.branchChoices.length;
    assert.equal(planLeft.nodes.length, expectedLength);
    assert.equal(planRight.nodes.length, expectedLength);
    assert.equal(planLeft.nodes[planLeft.nodes.length - 1].tier, 'boss');
    assert.notEqual(planLeft.pathKey, planRight.pathKey);
    assert.equal(planLeft.preset, 'normal');
  });

  test('applyCampaignPlanToRoster applies tier/event scaling and node metadata', () => {
    const plan = buildCampaignRunPlan(pickFirst, 'normal');
    const baseRoster = plan.nodes.map((_node, index) => createEnemy(index));
    const tuned = applyCampaignPlanToRoster(baseRoster, plan);

    assert.equal(tuned.length, baseRoster.length);
    assert.equal(tuned[0].campaignNodeIndex, 1);
    assert.equal(tuned[0].campaignNodeTotal, plan.nodes.length);
    assert.equal(typeof tuned[0].campaignPathKey, 'string');

    const eliteIndex = plan.nodes.findIndex((node) => node.tier === 'elite');
    assert.equal(eliteIndex >= 0, true);
    assert.equal(tuned[eliteIndex].maxHp > baseRoster[eliteIndex].maxHp, true);
    assert.equal(tuned[eliteIndex].atk > baseRoster[eliteIndex].atk, true);
  });
});

describe('buildCampaignRunPlan — timed preset', () => {
  test('derives branchChoices from waves.single with equal left/right (no real branching)', () => {
    const planLeft = buildCampaignRunPlan(pickFirst, 'timed');
    const planRight = buildCampaignRunPlan(pickSecond, 'timed');

    const expectedLength = BALANCE_CONFIG.stage.waves.single.length;
    assert.equal(planLeft.nodes.length, expectedLength);
    assert.equal(planRight.nodes.length, expectedLength);
    // Even though pathKeys may differ (left vs right labels), the actual waves
    // must be identical because left === right in each choice.
    for (let i = 0; i < planLeft.nodes.length; i++) {
      assert.equal(planLeft.nodes[i].wave.monsterId, planRight.nodes[i].wave.monsterId);
    }
    assert.equal(planLeft.preset, 'timed');
  });

  test('has no elite or event rounds', () => {
    const plan = buildCampaignRunPlan(pickFirst, 'timed');
    const hasElite = plan.nodes.some((n) => n.tier === 'elite');
    const hasEvent = plan.nodes.some((n) => n.eventTag !== null);
    assert.equal(hasElite, false, 'timed preset should have no elite rounds');
    assert.equal(hasEvent, false, 'timed preset should have no event rounds');
  });

  test('last wave is always boss tier', () => {
    const plan = buildCampaignRunPlan(pickFirst, 'timed');
    assert.equal(plan.nodes[plan.nodes.length - 1].tier, 'boss');
  });

  test('applyCampaignPlanToRoster applies no extra scaling for normal tier', () => {
    const plan = buildCampaignRunPlan(pickFirst, 'timed');
    const normalNode = plan.nodes.find((n) => n.tier === 'normal');
    assert.ok(normalNode, 'should have at least one normal-tier node');
    const baseRoster = plan.nodes.map((_node, index) => createEnemy(index));
    const tuned = applyCampaignPlanToRoster(baseRoster, plan);
    const normalIdx = normalNode.roundIndex;
    // normal tier + no event → scale factors are all 1.0 → HP/ATK unchanged
    assert.equal(tuned[normalIdx].maxHp, baseRoster[normalIdx].maxHp);
    assert.equal(tuned[normalIdx].atk, baseRoster[normalIdx].atk);
  });
});

describe('resolveCampaignPresetConfig', () => {
  test('normal preset disables random swap and enables starter encounters', () => {
    const config = resolveCampaignPresetConfig('normal');
    assert.equal(config.enableRandomSwap, false);
    assert.equal(config.enableStarterEncounters, true);
  });

  test('timed preset enables random swap and disables starter encounters', () => {
    const config = resolveCampaignPresetConfig('timed');
    assert.equal(config.enableRandomSwap, true);
    assert.equal(config.enableStarterEncounters, false);
  });
});

describe('both presets produce same wave count (10)', () => {
  test('normal and timed both produce 10 waves', () => {
    const normalPlan = buildCampaignRunPlan(pickFirst, 'normal');
    const timedPlan = buildCampaignRunPlan(pickFirst, 'timed');
    assert.equal(normalPlan.nodes.length, 10);
    assert.equal(timedPlan.nodes.length, 10);
  });
});
