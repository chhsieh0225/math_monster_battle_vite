import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { BattleMode, StarterVm } from '../../types/battle';
import type { InventoryData, ItemId } from '../../types/game';
import type { TurnState } from './turnHelpers.ts';
import { ITEM_CATALOG } from '../../data/itemCatalog.ts';
import { consumeInventory, saveInventory } from '../../utils/inventoryStore.ts';
import { getStarterLevelMaxHp } from '../../utils/playerHp';

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;

type EffectMessage = {
  text: string;
  color: string;
} | null;

type ActiveStarterResolver = (state: TurnState | null | undefined) => StarterVm | null;

type SfxApi = {
  play: (id: string) => void;
};

type UseBattleItemActionsArgs = {
  phase: string;
  battleMode: BattleMode;
  coopActiveSlot: 'main' | 'sub';
  allySub: StarterVm | null;
  pHpSub: number;
  pHp: number;
  pLvl: number;
  pStg: number;
  inventory: InventoryData;
  specDef: boolean;
  starter: StarterVm | null;
  sr: MutableRefObject<TurnState | null | undefined>;
  getActingStarter: ActiveStarterResolver;
  getPlayerMaxHp: (stageIdx?: number, levelOverride?: number) => number;
  setPHpSub: Dispatch<SetStateAction<number>>;
  setPHp: Dispatch<SetStateAction<number>>;
  setBText: Dispatch<SetStateAction<string>>;
  setEffMsg: Dispatch<SetStateAction<EffectMessage>>;
  setSpecDef: (value: boolean) => void;
  setDefAnim: (value: string | null) => void;
  safeTo: (fn: () => void, ms: number) => void;
  setInventory: Dispatch<SetStateAction<InventoryData>>;
  t: Translator;
  sfx: SfxApi;
};

export function useBattleItemActions({
  phase,
  battleMode,
  coopActiveSlot,
  allySub,
  pHpSub,
  pHp,
  pLvl,
  pStg,
  inventory,
  specDef,
  starter,
  sr,
  getActingStarter,
  getPlayerMaxHp,
  setPHpSub,
  setPHp,
  setBText,
  setEffMsg,
  setSpecDef,
  setDefAnim,
  safeTo,
  setInventory,
  t,
  sfx,
}: UseBattleItemActionsArgs) {
  return useCallback((itemId: ItemId) => {
    if (phase !== 'menu') return;

    const itemDef = ITEM_CATALOG[itemId];
    const activeStarterType = getActingStarter(sr.current)?.type || starter?.type || 'grass';
    const specDefItemName = activeStarterType === 'fire'
      ? t('battle.specDef.fire', '🛡️ Shield')
      : activeStarterType === 'water'
        ? t('battle.specDef.water', '💨 Perfect Dodge')
        : activeStarterType === 'ice'
          ? t('battle.specDef.ice', '🧊 Ice Shift')
        : activeStarterType === 'electric'
          ? t('battle.specDef.electric', '⚡ Paralysis')
          : activeStarterType === 'light'
            ? t('battle.specDef.light', '✨ Lion Roar')
            : t('battle.specDef.grass', '🌿 Reflect');
    const itemName = itemId === 'shield'
      ? specDefItemName
      : t(itemDef.nameKey, itemDef.nameFallback);
    const spendItem = (): boolean => {
      const result = consumeInventory(inventory, itemId, 1);
      if (!result.consumed) return false;
      setInventory(result.inventory);
      saveInventory(result.inventory);
      return true;
    };

    if (battleMode === 'pvp') {
      setEffMsg({
        text: t('battle.item.use.disabledPvp', '{item} is disabled in PvP.', { item: itemName }),
        color: '#ef4444',
      });
      return;
    }

    if (itemId === 'potion') {
      const isCoopSubActive = (battleMode === 'coop' || battleMode === 'double')
        && coopActiveSlot === 'sub'
        && Boolean(allySub)
        && pHpSub > 0;
      const currentHp = isCoopSubActive ? pHpSub : pHp;
      const maxHp = isCoopSubActive && allySub
        ? getStarterLevelMaxHp(allySub, pLvl, pStg)
        : getPlayerMaxHp(pStg, pLvl);

      if (currentHp >= maxHp) {
        setEffMsg({
          text: t('battle.item.use.potion.full', '{item} failed: HP already full.', { item: itemName }),
          color: '#f97316',
        });
        return;
      }
      if (!spendItem()) {
        setEffMsg({
          text: t('battle.item.use.none', 'No {item} left.', { item: itemName }),
          color: '#ef4444',
        });
        return;
      }

      const heal = Math.max(12, Math.round(maxHp * 0.32));
      const restored = Math.max(1, Math.min(maxHp, currentHp + heal) - currentHp);
      if (isCoopSubActive) {
        setPHpSub((prev) => Math.min(maxHp, prev + restored));
      } else {
        setPHp((prev) => Math.min(maxHp, prev + restored));
      }
      setBText(t('battle.item.use.potion.heal', '{item} restored {hp} HP!', {
        item: itemName,
        hp: restored,
      }));
      setEffMsg({
        text: t('battle.item.use.potion.heal', '{item} restored {hp} HP!', {
          item: itemName,
          hp: restored,
        }),
        color: '#22c55e',
      });
      sfx.play('heal');
      return;
    }

    if (itemId === 'candy') {
      const isCoopSubActive = (battleMode === 'coop' || battleMode === 'double')
        && coopActiveSlot === 'sub'
        && Boolean(allySub)
        && pHpSub > 0;
      const currentHp = isCoopSubActive ? pHpSub : pHp;
      const maxHp = isCoopSubActive && allySub
        ? getStarterLevelMaxHp(allySub, pLvl, pStg)
        : getPlayerMaxHp(pStg, pLvl);

      if (currentHp >= maxHp) {
        setEffMsg({
          text: t('battle.item.use.candy.full', '{item} failed: HP already full.', { item: itemName }),
          color: '#f97316',
        });
        return;
      }
      if (!spendItem()) {
        setEffMsg({
          text: t('battle.item.use.none', 'No {item} left.', { item: itemName }),
          color: '#ef4444',
        });
        return;
      }

      const heal = Math.max(6, Math.round(maxHp * 0.14));
      const restored = Math.max(1, Math.min(maxHp, currentHp + heal) - currentHp);
      if (isCoopSubActive) {
        setPHpSub((prev) => Math.min(maxHp, prev + restored));
      } else {
        setPHp((prev) => Math.min(maxHp, prev + restored));
      }
      setBText(t('battle.item.use.candy.heal', '{item} restored {hp} HP!', {
        item: itemName,
        hp: restored,
      }));
      setEffMsg({
        text: t('battle.item.use.candy.heal', '{item} restored {hp} HP!', {
          item: itemName,
          hp: restored,
        }),
        color: '#22c55e',
      });
      sfx.play('heal');
      return;
    }

    if (itemId === 'shield') {
      if (specDef) {
        setEffMsg({
          text: t('battle.item.use.shield.active', 'Counter shield already active.'),
          color: '#f97316',
        });
        return;
      }
      if (!spendItem()) {
        setEffMsg({
          text: t('battle.item.use.none', 'No {item} left.', { item: itemName }),
          color: '#ef4444',
        });
        return;
      }
      setSpecDef(true);
      setDefAnim(activeStarterType);
      safeTo(() => setDefAnim(null), 280);
      setBText(t('battle.item.use.shield.ready', '{item} activated! Next hit will be blocked.', {
        item: itemName,
      }));
      setEffMsg({
        text: t('battle.item.use.shield.ready', '{item} activated! Next hit will be blocked.', {
          item: itemName,
        }),
        color: '#22c55e',
      });
      sfx.play('specDef');
      return;
    }

    setEffMsg({
      text: t('battle.item.use.none', 'No {item} left.', { item: itemName }),
      color: '#ef4444',
    });
  }, [
    phase,
    battleMode,
    coopActiveSlot,
    allySub,
    pHpSub,
    pHp,
    pLvl,
    pStg,
    inventory,
    specDef,
    starter,
    sr,
    getActingStarter,
    getPlayerMaxHp,
    setPHpSub,
    setPHp,
    setBText,
    setEffMsg,
    setSpecDef,
    setDefAnim,
    safeTo,
    setInventory,
    t,
    sfx,
  ]);
}
