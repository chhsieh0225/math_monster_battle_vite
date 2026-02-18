import assert from 'node:assert/strict';
import test from 'node:test';

import { BALANCE_CONFIG } from '../data/balanceConfig.ts';
import { applyCampaignPlanToRoster, buildCampaignRunPlan } from './campaignPlanner.ts';

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

test('buildCampaignRunPlan creates route nodes with deterministic branch path', () => {
  const planLeft = buildCampaignRunPlan(pickFirst);
  const planRight = buildCampaignRunPlan(pickSecond);

  const expectedLength = BALANCE_CONFIG.stage.campaign.branchChoices.length;
  assert.equal(planLeft.nodes.length, expectedLength);
  assert.equal(planRight.nodes.length, expectedLength);
  assert.equal(planLeft.nodes[planLeft.nodes.length - 1].tier, 'boss');
  assert.notEqual(planLeft.pathKey, planRight.pathKey);
});

test('applyCampaignPlanToRoster applies tier/event scaling and node metadata', () => {
  const plan = buildCampaignRunPlan(pickFirst);
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

