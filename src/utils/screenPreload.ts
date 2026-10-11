// The same import functions serve lazy rendering and early warmup, with no eager screen bundle.
export const loadBattleScreen = () => import('../components/screens/BattleScreen');
export const loadWorldMapScreen = () => import('../components/screens/WorldMapScreen');
