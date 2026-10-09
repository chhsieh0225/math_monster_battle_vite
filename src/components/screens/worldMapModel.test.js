import assert from 'node:assert/strict';
import test from 'node:test';
import { getExpedition } from '../../data/worldMap.ts';
import { buildExpeditionLanes, buildExpeditionPlan } from '../../utils/expeditionPlanner.ts';
import { arriveAtMap, chooseExpeditionRoute, createExpeditionRun } from '../../utils/expeditionRun.ts';
import { createWorldProgress, recordExpeditionClear } from '../../utils/worldProgress.ts';
import { buildExpeditionCards, defaultExpeditionId, formatMultiplier, routeChoices, traveledRegions } from './worldMapModel.ts';

const pick = () => 0;

test('expedition cards show order, lock reasons and the next challenge', () => {
  let progress = createWorldProgress();
  let cards = buildExpeditionCards(progress);
  assert.deepEqual(cards.map((card) => card.id), ['hydra', 'sword_god', 'crazy_dragon', 'dark_king']);
  assert.deepEqual(cards.map((card) => card.unlocked), [true, false, false, false]);
  assert.equal(cards[1].requiresBossId, 'boss_hydra');
  assert.equal(defaultExpeditionId(progress), 'hydra');
  progress = recordExpeditionClear(progress, 'hydra');
  cards = buildExpeditionCards(progress);
  assert.equal(cards[1].unlocked, true);
  assert.equal(cards[0].clears, 1);
  assert.equal(defaultExpeditionId(progress), 'sword_god', 'the newest uncleared expedition is suggested');
});

test('route choices describe each lane and the traveled path follows choices', () => {
  const expedition = getExpedition('hydra');
  const plan = buildExpeditionPlan(expedition, pick);
  let run = createExpeditionRun(plan, buildExpeditionLanes(plan, expedition, pick));
  assert.deepEqual(routeChoices(run, 'fire'), [], 'no choices until the player is on the map');
  run = arriveAtMap(run);
  const choices = routeChoices(run, 'fire');
  assert.equal(choices.length, 2);
  choices.forEach((choice, lane) => {
    assert.equal(choice.enemy, run.lanes[lane][1]);
    assert.equal(choice.option, plan.floors[1].options[lane]);
    assert.ok(['advantage', 'disadvantage', 'neutral'].includes(choice.matchup.verdict));
  });
  run = chooseExpeditionRoute(run, 1);
  assert.deepEqual(traveledRegions(run), ['grass', plan.floors[1].options[1].region]);
  assert.equal(formatMultiplier(0.6000000001), '0.6');
  assert.equal(formatMultiplier(1.5), '1.5');
});
