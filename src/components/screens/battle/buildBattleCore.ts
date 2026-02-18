import { SCENES } from '../../../data/scenes';
import { HITS_PER_LVL, MAX_MOVE_LVL, POWER_CAPS } from '../../../data/constants';
import { getLevelMaxHp, getStarterLevelMaxHp } from '../../../utils/playerHp';
import { resolveBattleLayout, type BattleLayoutConfig } from '../../../utils/battleLayout';
import type {
  MoveVm,
  StarterVm,
  UseBattleState,
} from '../../../types/battle';

type BattleCoreState = Pick<
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

type BuildBattleCoreArgs = {
  state: BattleCoreState;
  compactUI: boolean;
  getPow: (idx: number) => number;
  dualEff: (move: MoveVm) => number;
};

type MoveRuntime = {
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

type SceneConfig = (typeof SCENES)[keyof typeof SCENES];
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
  scene: SceneConfig;
  layout: BattleLayoutConfig;
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

function hasSceneKey(value: string): value is keyof typeof SCENES {
  return value in SCENES;
}

export function buildBattleCore({
  state,
  compactUI,
  getPow,
  dualEff,
}: BuildBattleCoreArgs): BattleCore | null {
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

  const pvpActiveCharge = battleMode === 'pvp'
    ? (pvpTurn === 'p1' ? (pvpChargeP1 || 0) : (pvpChargeP2 || 0))
    : 0;
  const pvpActiveCombo = battleMode === 'pvp'
    ? (pvpTurn === 'p1' ? (pvpComboP1 || 0) : (pvpComboP2 || 0))
    : 0;
  const pvpActiveSpecDefReady = battleMode === 'pvp'
    ? (pvpTurn === 'p1' ? !!pvpSpecDefP1 : !!pvpSpecDefP2)
    : false;
  const chargeDisplay = battleMode === 'pvp' ? pvpActiveCharge : charge;
  const chargeReadyDisplay = battleMode === 'pvp' ? pvpActiveCharge >= 3 : chargeReady;

  const eSvg = enemy.svgFn();
  const eSubSvg = showEnemySub && enemySub ? enemySub.svgFn() : null;
  const allyStage = showAllySub && allySub
    ? (allySub.stages[allySub.selectedStageIdx || 0] || allySub.stages[0])
    : null;
  const pSubSvg = allyStage ? allyStage.svgFn() : null;
  const pSvg = st.svgFn();

  const mainMaxHp = getLevelMaxHp(pLvl, pStg);
  const subMaxHp = showAllySub && allySub ? getStarterLevelMaxHp(allySub, pLvl, pStg) : getLevelMaxHp(1, 0);
  const sceneKey = enemy.sceneMType || enemy.mType || 'grass';
  const scene = hasSceneKey(sceneKey) ? SCENES[sceneKey] : SCENES.grass;

  const layout = resolveBattleLayout({
    battleMode,
    hasDualUnits,
    compactUI,
    playerStageIdx: pStg,
    enemyId: enemy.id,
    enemySceneType: enemy.sceneMType || enemy.mType,
    enemyIsEvolved: enemy.isEvolved,
  });

  const pvpEnemyBarActive = battleMode !== 'pvp' || pvpTurn === 'p2';
  const mainBarActive = battleMode === 'pvp'
    ? pvpTurn === 'p1'
    : (isCoopBattle ? !coopUsingSub : true);
  const subBarActive = showAllySub && coopUsingSub;
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
    pvpActiveCharge,
    pvpActiveCombo,
    pvpActiveSpecDefReady,
    chargeDisplay,
    chargeReadyDisplay,
    eSvg,
    eSubSvg,
    pSubSvg,
    pSvg,
    mainMaxHp,
    subMaxHp,
    scene,
    layout,
    pvpEnemyBarActive,
    mainBarActive,
    subBarActive,
    moveRuntime,
    pvpEnemyBurn: pvpBurnP2 || 0,
    pvpEnemyFreeze: !!pvpFreezeP2,
    pvpEnemyParalyze: !!pvpParalyzeP2,
    pvpEnemyStatic: pvpStaticP2 || 0,
    pvpEnemyCombo: pvpComboP2 || 0,
    pvpEnemySpecDef: !!pvpSpecDefP2,
    pvpPlayerBurn: pvpBurnP1 || 0,
    pvpPlayerFreeze: !!pvpFreezeP1,
    pvpPlayerParalyze: !!pvpParalyzeP1,
    pvpPlayerStatic: pvpStaticP1 || 0,
    pvpPlayerCombo: pvpComboP1 || 0,
    pvpPlayerSpecDef: !!pvpSpecDefP1,
  };
}
