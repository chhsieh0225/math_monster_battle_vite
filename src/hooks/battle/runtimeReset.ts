type DamageListSetter = (value: []) => void;
type NullableSetter = (value: null) => void;

type MutableFlagRef = {
  current: boolean;
};

type MutableModelRef<TModel> = {
  current: TModel;
};

type RunResetRuntimeStateArgs<TModel> = {
  setDmgs: DamageListSetter;
  setParts: DamageListSetter;
  setAtkEffect: NullableSetter;
  setEffMsg: NullableSetter;
  frozenRef: MutableFlagRef;
  abilityModelRef: MutableModelRef<TModel>;
  createAbilityModel: (baselineLevel: number) => TModel;
  abilityBaselineLevel?: number;
  pendingEvolveRef: MutableFlagRef;
};

export function runResetRuntimeState<TModel>({
  setDmgs,
  setParts,
  setAtkEffect,
  setEffMsg,
  frozenRef,
  abilityModelRef,
  createAbilityModel,
  abilityBaselineLevel = 2,
  pendingEvolveRef,
}: RunResetRuntimeStateArgs<TModel>): void {
  setDmgs([]);
  setParts([]);
  setAtkEffect(null);
  setEffMsg(null);
  frozenRef.current = false;
  abilityModelRef.current = createAbilityModel(abilityBaselineLevel);
  pendingEvolveRef.current = false;
}
