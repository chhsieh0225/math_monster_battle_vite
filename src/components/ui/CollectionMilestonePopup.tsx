import { useEffect } from 'react';
import { useI18n } from '../../i18n';
import type { CollectionPopupVm } from '../../types/battle';

type CollectionMilestonePopupProps = {
  popup: CollectionPopupVm | null;
  onDone: () => void;
};

export default function CollectionMilestonePopup({ popup, onDone }: CollectionMilestonePopupProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!popup) return;
    const t2 = setTimeout(onDone, 4200);
    return () => {
      clearTimeout(t2);
    };
  }, [popup, onDone]);

  if (!popup) return null;
  const liveLabel = t('collection.popup.announce', '{title}. {desc}', {
    title: popup.title,
    desc: popup.desc,
  });
  return (
    <div
      className="battle-collection-popup"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={liveLabel}
    >
      <div className="battle-collection-popup-head">
        📦 {popup.title}
      </div>
      <div className="battle-collection-popup-body">
        <span className="battle-collection-popup-icon">{popup.icon}</span>
        <span className="battle-collection-popup-desc">{popup.desc}</span>
      </div>
    </div>
  );
}
