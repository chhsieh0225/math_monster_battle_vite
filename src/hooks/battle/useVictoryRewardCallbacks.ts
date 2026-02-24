import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CollectionPopupVm } from '../../types/battle';
import type { InventoryData } from '../../types/game';
import { type CollectionAddResult, type CollectionPerks } from '../../utils/collectionStore';
import { applyDropsToInventory, saveInventory } from '../../utils/inventoryStore';
import { COLLECTION_MILESTONES } from '../../data/collectionMilestones';

type Params = Record<string, string | number>;
type TranslatorFn = (key: string, fallback?: string, params?: Params) => string;

type UseVictoryRewardCallbacksArgs = {
  setInventory: Dispatch<SetStateAction<InventoryData>>;
  setCollectionPerks: Dispatch<SetStateAction<CollectionPerks>>;
  setCollectionPopup: Dispatch<SetStateAction<CollectionPopupVm | null>>;
  t: TranslatorFn;
};

export function useVictoryRewardCallbacks({
  setInventory,
  setCollectionPerks,
  setCollectionPopup,
  t,
}: UseVictoryRewardCallbacksArgs) {
  const onDropResolved = useCallback((drop: string) => {
    if (!drop) return;
    setInventory((prev) => {
      const result = applyDropsToInventory(prev, [drop]);
      if (result.changed) {
        saveInventory(result.inventory);
      }
      return result.inventory;
    });
  }, [setInventory]);

  const onCollectionUpdated = useCallback((result: CollectionAddResult) => {
    if (!result) return;
    if (result.perks) setCollectionPerks(result.perks);
    const unlockedMilestones = Array.isArray(result.newlyUnlockedMilestoneIds)
      ? result.newlyUnlockedMilestoneIds
      : [];
    const unlockedTitles = Array.isArray(result.newlyUnlockedTitles)
      ? result.newlyUnlockedTitles
      : [];
    const unlockedCount = unlockedMilestones.length + unlockedTitles.length;
    if (unlockedCount <= 0) return;
    const firstMilestone = COLLECTION_MILESTONES.find(
      (milestone) => milestone.id === unlockedMilestones[0],
    );
    const firstTitle = unlockedTitles[0];
    const localizedTitle = firstTitle
      ? t(firstTitle.nameKey, firstTitle.nameFallback)
      : '';
    const desc = firstTitle
      ? t('collection.popup.desc.title', 'Unlocked title: {title}', { title: localizedTitle })
      : unlockedCount > 1
        ? t('collection.popup.desc.multi', 'Unlocked {count} new collection rewards.', { count: unlockedCount })
        : t('collection.popup.desc.single', 'Unlocked 1 new collection reward.');
    setCollectionPopup({
      id: Date.now(),
      icon: firstMilestone?.emoji || (firstTitle ? '🏅' : '🎁'),
      title: t('collection.popup.title', 'Collection Milestone!'),
      desc,
    });
  }, [setCollectionPerks, setCollectionPopup, t]);

  return { onDropResolved, onCollectionUpdated };
}
