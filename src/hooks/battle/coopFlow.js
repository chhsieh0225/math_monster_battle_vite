import { getStarterStageIdx } from '../../utils/playerHp.js';

export function buildNextEvolvedAlly(allySub) {
  if (!allySub) return null;
  const allyStage = getStarterStageIdx(allySub);
  const nextAllyStage = Math.min(allyStage + 1, 2);
  const allyStageData = allySub.stages?.[nextAllyStage] || allySub.stages?.[0];
  return {
    ...allySub,
    selectedStageIdx: nextAllyStage,
    name: allyStageData?.name || allySub.name,
  };
}
