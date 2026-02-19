import type { BattleAction, BattleState } from './battleReducer.ts';

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
  | 'shattered'
  | 'staticStack'
  | 'specDef'
  | 'defAnim'
  | 'cursed'
  | 'diffLevel'
  | 'bossPhase'
  | 'bossTurn'
  | 'bossCharging'
  | 'sealedMove'
  | 'sealedTurns'
  | 'shadowShieldCD'
  | 'furyRegenUsed';

type FieldValue<K extends FieldKey> = BattleState[K] | ((prev: BattleState[K]) => BattleState[K]);

type SetFieldAction<K extends FieldKey = FieldKey> = {
  type: 'set_field';
  key: K;
  value: FieldValue<K>;
};

type DispatchBattle = (action: BattleAction) => void;

type FieldSetter<K extends FieldKey> = (value: FieldValue<K>) => void;

type BattleFieldSetters = {
  setBattleField: <K extends FieldKey>(key: K, value: FieldValue<K>) => void;
  setPHp: FieldSetter<'pHp'>;
  setAllySub: FieldSetter<'allySub'>;
  setPHpSub: FieldSetter<'pHpSub'>;
  setPExp: FieldSetter<'pExp'>;
  setPLvl: FieldSetter<'pLvl'>;
  setPStg: FieldSetter<'pStg'>;
  setEHp: FieldSetter<'eHp'>;
  setStreak: FieldSetter<'streak'>;
  setPassiveCount: FieldSetter<'passiveCount'>;
  setCharge: FieldSetter<'charge'>;
  setTC: FieldSetter<'tC'>;
  setTW: FieldSetter<'tW'>;
  setDefeated: FieldSetter<'defeated'>;
  setMaxStreak: FieldSetter<'maxStreak'>;
  setMHits: FieldSetter<'mHits'>;
  setMLvls: FieldSetter<'mLvls'>;
  setMLvlUp: FieldSetter<'mLvlUp'>;
  setBurnStack: FieldSetter<'burnStack'>;
  setFrozen: FieldSetter<'frozen'>;
  setShattered: FieldSetter<'shattered'>;
  setStaticStack: FieldSetter<'staticStack'>;
  setSpecDef: FieldSetter<'specDef'>;
  setDefAnim: FieldSetter<'defAnim'>;
  setCursed: FieldSetter<'cursed'>;
  setDiffLevel: FieldSetter<'diffLevel'>;
  setBossPhase: FieldSetter<'bossPhase'>;
  setBossTurn: FieldSetter<'bossTurn'>;
  setBossCharging: FieldSetter<'bossCharging'>;
  setSealedMove: FieldSetter<'sealedMove'>;
  setSealedTurns: FieldSetter<'sealedTurns'>;
  setShadowShieldCD: FieldSetter<'shadowShieldCD'>;
  setFuryRegenUsed: FieldSetter<'furyRegenUsed'>;
};

function createFieldSetter<K extends FieldKey>(
  setBattleField: <T extends FieldKey>(key: T, value: FieldValue<T>) => void,
  key: K,
): FieldSetter<K> {
  return (value) => setBattleField(key, value);
}

export function createBattleFieldSetters(dispatchBattle: DispatchBattle): BattleFieldSetters {
  const setBattleField = <K extends FieldKey>(key: K, value: FieldValue<K>): void => {
    const action: SetFieldAction<K> = { type: 'set_field', key, value };
    dispatchBattle(action as unknown as BattleAction);
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
    setShattered: createFieldSetter(setBattleField, 'shattered'),
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
    setShadowShieldCD: createFieldSetter(setBattleField, 'shadowShieldCD'),
    setFuryRegenUsed: createFieldSetter(setBattleField, 'furyRegenUsed'),
  };
}
