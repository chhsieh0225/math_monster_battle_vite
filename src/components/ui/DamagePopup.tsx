import { memo, useEffect } from 'react';

type DamagePopupProps = {
  id: number;
  value: string | number;
  x: number | string;
  y: number | string;
  color: string;
  onDone: (id: number) => void;
};

const DamagePopup = memo(function DamagePopup({ id, value, x, y, color, onDone }: DamagePopupProps) {
  useEffect(() => {
    const t = setTimeout(() => onDone(id), 1000);
    return () => clearTimeout(t);
  }, [id, onDone]);
  const valueText = String(value);
  const isHeal = valueText.startsWith('+');
  const announce = isHeal ? `Heal ${valueText}` : `Damage ${valueText}`;
  return (
    <div style={{
      position: "absolute", left: x, top: y, fontSize: 24, fontWeight: 900, color,
      textShadow: `0 2px 8px ${color}88`,
      animation: "dmgPop 1s ease forwards", pointerEvents: "none", zIndex: 100,
      fontFamily: "'Press Start 2P',monospace"
    }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={announce}
    >
      {value}
    </div>
  );
});

export default DamagePopup;
