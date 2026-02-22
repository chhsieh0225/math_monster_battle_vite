import { HITS_PER_LVL, MAX_MOVE_LVL, POWER_CAPS } from '../../../data/constants.ts';
import { getLevelMaxHp, getStarterLevelMaxHp } from '../../../utils/playerHp.ts';
import { resolveBattleLayout, type BattleLayoutConfig } from '../../../utils/battleLayout.ts';
import type { ComponentType } from 'react';
import type {
  MoveVm,
  StarterVm,
  UseBattleState,
} from '../../../types/battle';

type BattleCoreStaticState = Pick<
  UseBattleState,
  | 'starter'
  | 'enemy'
  | 'pLvl'
  | 'pStg'
  | 'battleMode'
  | 'enemySub'
  | 'allySub'
  | 'pHpSub'
  | 'coopActiveSlot'
  | 'pvpTurn'
  | 'pvpStarter2'
>;

type BattleCoreRuntimeState = Pick<
  UseBattleState,
  | 'battleMode'
  | 'pvpTurn'
  | 'pvpState'
  | 'pvpChargeP1'
  | 'pvpChargeP2'
  | 'pvpComboP1'
  | 'pvpComboP2'
  | 'pvpSpecDefP1'
  | 'pvpSpecDefP2'
  | 'pvpBurnP1'
  | 'pvpBurnP2'
  | 'pvpFreezeP1'
  | 'pvpFreezeP2'
  | 'pvpParalyzeP1'
  | 'pvpParalyzeP2'
  | 'pvpStaticP1'
  | 'pvpStaticP2'
  | 'charge'
  | 'chargeReady'
  | 'sealedMove'
  | 'mLvls'
  | 'mHits'
>;

type BattleCoreState = BattleCoreStaticState & BattleCoreRuntimeState;

type BuildBattleCoreArgs = {
  state: BattleCoreState;
  compactUI: boolean;
  getPow: (idx: number) => number;
  dualEff: (move: MoveVm) => number;
  scenes: Record<string, SceneLike>;
};

export type BuildBattleStaticCoreArgs = {
  state: BattleCoreStaticState;
  compactUI: boolean;
  scenes: Record<string, SceneLike>;
};

export type BuildBattleRuntimeCoreArgs = {
  state: BattleCoreRuntimeState;
  activeStarter: StarterVm | null;
  getPow: (idx: number) => number;
  dualEff: (move: MoveVm) => number;
};

export type MoveRuntime = {
  m: MoveVm;
  i: number;
  sealed: boolean;
  locked: boolean;
  lv: number;
  pw: number;
  atCap: boolean;
  eff: number;
  moveProgressPct: number;
};

export type SceneLike = {
  bgImg?: string;
  sky: string;
  ground: string;
  platform1: string;
  platform2: string;
  Deco?: ComponentType;
};
type SceneConfig = SceneLike;
type StarterStage = StarterVm['stages'][number];

export type BattleCore = {
  starter: StarterVm;
  enemy: NonNullable<UseBattleState['enemy']>;
  st: StarterStage;
  isCoopBattle: boolean;
  showEnemySub: boolean;
  showAllySub: boolean;
  hasDualUnits: boolean;
  coopCanSwitch: boolean;
  coopUsingSub: boolean;
  activeStarter: StarterVm | null;
  pvpActiveCharge: number;
  pvpActiveCombo: number;
  pvpActiveSpecDefReady: boolean;
  chargeDisplay: number;
  chargeReadyDisplay: boolean;
  eSvg: string;
  eSubSvg: string | null;
  pSubSvg: string | null;
  pSvg: string;
  mainMaxHp: number;
  subMaxHp: number;
  sceneKey: string;
  scene: SceneConfig;
  layout: BattleLayoutConfig;
  /** Size for ally sub if promoted to the active main role in co-op. */
  allyMainRoleSize: number;
  /** Size for main starter when demoted to sub role in co-op. */
  starterSubRoleSize: number;
  pvpEnemyBarActive: boolean;
  mainBarActive: boolean;
  subBarActive: boolean;
  moveRuntime: MoveRuntime[];
  pvpEnemyBurn: number;
  pvpEnemyFreeze: boolean;
  pvpEnemyParalyze: boolean;
  pvpEnemyStatic: number;
  pvpEnemyCombo: number;
  pvpEnemySpecDef: boolean;
  pvpPlayerBurn: number;
  pvpPlayerFreeze: boolean;
  pvpPlayerParalyze: boolean;
  pvpPlayerStatic: number;
  pvpPlayerCombo: number;
  pvpPlayerSpecDef: boolean;
};

type BattleCoreRuntimeKey =
  | 'pvpActiveCharge'
  | 'pvpActiveCombo'
  | 'pvpActiveSpecDefReady'
  | 'chargeDisplay'
  | 'chargeReadyDisplay'
  | 'moveRuntime'
  | 'pvpEnemyBurn'
  | 'pvpEnemyFreeze'
  | 'pvpEnemyParalyze'
  | 'pvpEnemyStatic'
  | 'pvpEnemyCombo'
  | 'pvpEnemySpecDef'
  | 'pvpPlayerBurn'
  | 'pvpPlayerFreeze'
  | 'pvpPlayerParalyze'
  | 'pvpPlayerStatic'
  | 'pvpPlayerCombo'
  | 'pvpPlayerSpecDef';

export type BattleCoreRuntime = Pick<BattleCore, BattleCoreRuntimeKey>;
export type BattleCoreStatic = Omit<BattleCore, BattleCoreRuntimeKey>;

export function buildBattleStaticCore({
  state,
  compactUI,
  scenes,
}: BuildBattleStaticCoreArgs): BattleCoreStatic | null {
  const {
    starter,
    enemy,
    pLvl,
    pStg,
    battleMode,
    enemySub,
    allySub,
    pHpSub,
    coopActiveSlot,
    pvpTurn,
    pvpStarter2,
  } = state;

  if (!starter || !enemy) return null;
  const st = starter.stages[pStg] || starter.stages[0];
  if (!st) return null;

  const isCoopBattle = battleMode === 'coop' || battleMode === 'double';
  const showEnemySub = isCoopBattle && Boolean(enemySub);
  const showAllySub = isCoopBattle && Boolean(allySub);
  const hasDualUnits = showEnemySub || showAllySub;
  const coopCanSwitch = showAllySub && pHpSub > 0;
  const coopUsingSub = coopCanSwitch && coopActiveSlot === 'sub';
  const activeStarter = battleMode === 'pvp'
    ? (pvpTurn === 'p1' ? starter : pvpStarter2)
    : (coopUsingSub ? allySub : starter);

  const eSvg = enemy.svgFn();
  const eSubSvg = showEnemySub && enemySub ? enemySub.svgFn() : null;
  const allyStage = showAllySub && allySub
    ? (allySub.stages[allySub.selectedStageIdx || 0] || allySub.stages[0])
    : null;
  const pSubSvg = allyStage ? allyStage.svgFn() : null;
  const pSvg = st.svgFn();

  const mainMaxHp = getLevelMaxHp(pLvl, pStg);
  const subMaxHp = showAllySub && allySub ? getStarterLevelMaxHp(allySub, pLvl, pStg) : getLevelMaxHp(1, 0);
  const requestedSceneKey = enemy.sceneMType || enemy.mType || 'grass';
  const fallbackSceneKey = Object.keys(scenes)[0] || 'grass';
  const sceneKey = scenes[requestedSceneKey]
    ? requestedSceneKey
    : scenes.grass
      ? 'grass'
      : fallbackSceneKey;
  const scene = scenes[sceneKey] || scenes.grass || Object.values(scenes)[0];
  if (!scene) return null;

  // Derive SVG export key for player sprite: convention is `player${id}${stage}SVG`.
  const playerSpriteKey = `player${starter.id}${pStg}SVG`;
  // Enemy carries activeSpriteKey from roster builder.
  const enemySpriteKey = (enemy as { activeSpriteKey?: string }).activeSpriteKey || enemy.spriteKey;
  // Sub ally sprite key (same convention as player).
  const subStageIdx = allySub?.selectedStageIdx ?? 0;
  const subSpriteKey = allySub ? `player${allySub.id}${subStageIdx}SVG` : undefined;

  const layout = resolveBattleLayout({
    battleMode,
    hasDualUnits,
    compactUI,
    playerStageIdx: pStg,
    playerStarterId: starter.id,
    enemyId: enemy.id,
    enemySceneType: enemy.sceneMType || enemy.mType,
    enemyIsEvolved: enemy.isEvolved,
    playerSpriteKey,
    enemySpriteKey,
    subStarterId: allySub?.id,
    subSpriteKey,
  });
  let allyMainRoleSize = layout.subPlayerSize;
  let starterSubRoleSize = layout.mainPlayerSize;
  if (showAllySub && allySub) {
    const allyAsMainLayout = resolveBattleLayout({
      battleMode,
      hasDualUnits,
      compactUI,
      playerStageIdx: subStageIdx,
      playerStarterId: allySub.id,
      enemyId: enemy.id,
      enemySceneType: enemy.sceneMType || enemy.mType,
      enemyIsEvolved: enemy.isEvolved,
      playerSpriteKey: subSpriteKey,
      enemySpriteKey,
      subStarterId: starter.id,
      subSpriteKey: playerSpriteKey,
    });
    allyMainRoleSize = allyAsMainLayout.mainPlayerSize;

    const starterAsSubLayout = resolveBattleLayout({
      battleMode,
      hasDualUnits,
      compactUI,
      playerStageIdx: pStg,
      playerStarterId: starter.id,
      enemyId: enemy.id,
      enemySceneType: enemy.sceneMType || enemy.mType,
      enemyIsEvolved: enemy.isEvolved,
      playerSpriteKey,
      enemySpriteKey,
      subStarterId: starter.id,
      subSpriteKey: playerSpriteKey,
    });
    starterSubRoleSize = starterAsSubLayout.subPlayerSize;
  }

  const pvpEnemyBarActive = battleMode !== 'pvp' || pvpTurn === 'p2';
  const mainBarActive = battleMode === 'pvp'
    ? pvpTurn === 'p1'
    : (isCoopBattle ? !coopUsingSub : true);
  const subBarActive = showAllySub && coopUsingSub;

  return {
    starter,
    enemy,
    st,
    isCoopBattle,
    showEnemySub,
    showAllySub,
    hasDualUnits,
    coopCanSwitch,
    coopUsingSub,
    activeStarter,
    eSvg,
    eSubSvg,
    pSubSvg,
    pSvg,
    mainMaxHp,
    subMaxHp,
    sceneKey,
    scene,
    layout,
    allyMainRoleSize,
    starterSubRoleSize,
    pvpEnemyBarActive,
    mainBarActive,
    subBarActive,
  };
}

export function buildBattleRuntimeCore({
  state,
  activeStarter,
  getPow,
  dualEff,
}: BuildBattleRuntimeCoreArgs): BattleCoreRuntime {
  const {
    battleMode,
    pvpTurn,
    pvpState,
    pvpChargeP1,
    pvpChargeP2,
    pvpComboP1,
    pvpComboP2,
    pvpSpecDefP1,
    pvpSpecDefP2,
    pvpBurnP1,
    pvpBurnP2,
    pvpFreezeP1,
    pvpFreezeP2,
    pvpParalyzeP1,
    pvpParalyzeP2,
    pvpStaticP1,
    pvpStaticP2,
    charge,
    chargeReady,
    sealedMove,
    mLvls,
    mHits,
  } = state;
  const pvpTurnResolved = pvpState?.turn || pvpTurn;
  const pvpP1 = pvpState?.p1;
  const pvpP2 = pvpState?.p2;

  const pvpActiveCharge = battleMode === 'pvp'
    ? (pvpTurnResolved === 'p1'
      ? ((pvpP1?.charge ?? pvpChargeP1) || 0)
      : ((pvpP2?.charge ?? pvpChargeP2) || 0))
    : 0;
  const pvpActiveCombo = battleMode === 'pvp'
    ? (pvpTurnResolved === 'p1'
      ? ((pvpP1?.combo ?? pvpComboP1) || 0)
      : ((pvpP2?.combo ?? pvpComboP2) || 0))
    : 0;
  const pvpActiveSpecDefReady = battleMode === 'pvp'
    ? (pvpTurnResolved === 'p1'
      ? !!(pvpP1?.specDef ?? pvpSpecDefP1)
      : !!(pvpP2?.specDef ?? pvpSpecDefP2))
    : false;
  const chargeDisplay = battleMode === 'pvp' ? pvpActiveCharge : charge;
  const chargeReadyDisplay = battleMode === 'pvp' ? pvpActiveCharge >= 3 : chargeReady;
  const moveRuntime = (activeStarter?.moves || []).map((m, i) => {
    const sealed = battleMode === 'pvp' ? false : sealedMove === i;
    const pvpLocked = battleMode === 'pvp' ? (Boolean(m.risky) && !chargeReadyDisplay) : false;
    const locked = battleMode === 'pvp' ? pvpLocked : ((Boolean(m.risky) && !chargeReady) || sealed);
    const lv = mLvls[i];
    const pw = battleMode === 'pvp' ? m.basePower : getPow(i);
    const atCap = lv >= MAX_MOVE_LVL || m.basePower + lv * m.growth > POWER_CAPS[i];
    const eff = battleMode === 'pvp' ? 1 : dualEff(m);
    const progressBase = HITS_PER_LVL * mLvls[i];
    const moveProgressPct = progressBase > 0 ? (mHits[i] % progressBase) / progressBase * 100 : 0;
    return { m, i, sealed, locked, lv, pw, atCap, eff, moveProgressPct };
  });

  return {
    pvpActiveCharge,
    pvpActiveCombo,
    pvpActiveSpecDefReady,
    chargeDisplay,
    chargeReadyDisplay,
    moveRuntime,
    pvpEnemyBurn: (pvpP2?.burn ?? pvpBurnP2) || 0,
    pvpEnemyFreeze: !!(pvpP2?.freeze ?? pvpFreezeP2),
    pvpEnemyParalyze: !!(pvpP2?.paralyze ?? pvpParalyzeP2),
    pvpEnemyStatic: (pvpP2?.static ?? pvpStaticP2) || 0,
    pvpEnemyCombo: (pvpP2?.combo ?? pvpComboP2) || 0,
    pvpEnemySpecDef: !!(pvpP2?.specDef ?? pvpSpecDefP2),
    pvpPlayerBurn: (pvpP1?.burn ?? pvpBurnP1) || 0,
    pvpPlayerFreeze: !!(pvpP1?.freeze ?? pvpFreezeP1),
    pvpPlayerParalyze: !!(pvpP1?.paralyze ?? pvpParalyzeP1),
    pvpPlayerStatic: (pvpP1?.static ?? pvpStaticP1) || 0,
    pvpPlayerCombo: (pvpP1?.combo ?? pvpComboP1) || 0,
    pvpPlayerSpecDef: !!(pvpP1?.specDef ?? pvpSpecDefP1),
  };
}

export function buildBattleCore({
  state,
  compactUI,
  getPow,
  dualEff,
  scenes,
}: BuildBattleCoreArgs): BattleCore | null {
  const staticCore = buildBattleStaticCore({
    state,
    compactUI,
    scenes,
  });
  if (!staticCore) return null;

  const runtimeCore = buildBattleRuntimeCore({
    state,
    activeStarter: staticCore.activeStarter,
    getPow,
    dualEff,
  });

  return {
    ...staticCore,
    ...runtimeCore,
  };
}
