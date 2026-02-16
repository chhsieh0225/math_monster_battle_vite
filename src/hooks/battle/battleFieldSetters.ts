type FieldKey =
  | 'pHp'
  | 'allySub'
  | 'pHpSub'
  | 'pExp'
  | 'pLvl'
  | 'pStg'
  | 'eHp'
  | 'streak'
  | 'passiveCount'
  | 'charge'
  | 'tC'
  | 'tW'
  | 'defeated'
  | 'maxStreak'
  | 'mHits'
  | 'mLvls'
  | 'mLvlUp'
  | 'burnStack'
  | 'frozen'
  | 'staticStack'
  | 'specDef'
  | 'defAnim'
  | 'cursed'
  | 'diffLevel'
  | 'bossPhase'
  | 'bossTurn'
  | 'bossCharging'
  | 'sealedMove'
  | 'sealedTurns';

type DispatchBattle = (action: {
  type: 'set_field';
  key: FieldKey;
  value: unknown;
}) => void;

type FieldSetter = (value: unknown) => void;

type BattleFieldSetters = {
  setBattleField: (key: FieldKey, value: unknown) => void;
  setPHp: FieldSetter;
  setAllySub: FieldSetter;
  setPHpSub: FieldSetter;
  setPExp: FieldSetter;
  setPLvl: FieldSetter;
  setPStg: FieldSetter;
  setEHp: FieldSetter;
  setStreak: FieldSetter;
  setPassiveCount: FieldSetter;
  setCharge: FieldSetter;
  setTC: FieldSetter;
  setTW: FieldSetter;
  setDefeated: FieldSetter;
  setMaxStreak: FieldSetter;
  setMHits: FieldSetter;
  setMLvls: FieldSetter;
  setMLvlUp: FieldSetter;
  setBurnStack: FieldSetter;
  setFrozen: FieldSetter;
  setStaticStack: FieldSetter;
  setSpecDef: FieldSetter;
  setDefAnim: FieldSetter;
  setCursed: FieldSetter;
  setDiffLevel: FieldSetter;
  setBossPhase: FieldSetter;
  setBossTurn: FieldSetter;
  setBossCharging: FieldSetter;
  setSealedMove: FieldSetter;
  setSealedTurns: FieldSetter;
};

function createFieldSetter(
  setBattleField: (key: FieldKey, value: unknown) => void,
  key: FieldKey,
): FieldSetter {
  return (value) => setBattleField(key, value);
}

export function createBattleFieldSetters(dispatchBattle: DispatchBattle): BattleFieldSetters {
  const setBattleField = (key: FieldKey, value: unknown): void => {
    dispatchBattle({ type: 'set_field', key, value });
  };

  return {
    setBattleField,
    setPHp: createFieldSetter(setBattleField, 'pHp'),
    setAllySub: createFieldSetter(setBattleField, 'allySub'),
    setPHpSub: createFieldSetter(setBattleField, 'pHpSub'),
    setPExp: createFieldSetter(setBattleField, 'pExp'),
    setPLvl: createFieldSetter(setBattleField, 'pLvl'),
    setPStg: createFieldSetter(setBattleField, 'pStg'),
    setEHp: createFieldSetter(setBattleField, 'eHp'),
    setStreak: createFieldSetter(setBattleField, 'streak'),
    setPassiveCount: createFieldSetter(setBattleField, 'passiveCount'),
    setCharge: createFieldSetter(setBattleField, 'charge'),
    setTC: createFieldSetter(setBattleField, 'tC'),
    setTW: createFieldSetter(setBattleField, 'tW'),
    setDefeated: createFieldSetter(setBattleField, 'defeated'),
    setMaxStreak: createFieldSetter(setBattleField, 'maxStreak'),
    setMHits: createFieldSetter(setBattleField, 'mHits'),
    setMLvls: createFieldSetter(setBattleField, 'mLvls'),
    setMLvlUp: createFieldSetter(setBattleField, 'mLvlUp'),
    setBurnStack: createFieldSetter(setBattleField, 'burnStack'),
    setFrozen: createFieldSetter(setBattleField, 'frozen'),
    setStaticStack: createFieldSetter(setBattleField, 'staticStack'),
    setSpecDef: createFieldSetter(setBattleField, 'specDef'),
    setDefAnim: createFieldSetter(setBattleField, 'defAnim'),
    setCursed: createFieldSetter(setBattleField, 'cursed'),
    setDiffLevel: createFieldSetter(setBattleField, 'diffLevel'),
    setBossPhase: createFieldSetter(setBattleField, 'bossPhase'),
    setBossTurn: createFieldSetter(setBattleField, 'bossTurn'),
    setBossCharging: createFieldSetter(setBattleField, 'bossCharging'),
    setSealedMove: createFieldSetter(setBattleField, 'sealedMove'),
    setSealedTurns: createFieldSetter(setBattleField, 'sealedTurns'),
  };
}
