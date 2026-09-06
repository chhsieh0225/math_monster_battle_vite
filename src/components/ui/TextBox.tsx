import type { KeyboardEvent, MouseEvent } from 'react';
import { useI18n } from '../../i18n';

type TextBoxProps = {
  text: string;
  onClick?: () => void;
};

export default function TextBox({ text, onClick }: TextBoxProps) {
  const { t } = useI18n();
  const handleActivate = () => {
    if (onClick) onClick();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      e.stopPropagation();
      handleActivate();
    }
  };

  return (
    <div
      role={onClick ? "button" : "status"}
      tabIndex={onClick ? 0 : undefined}
      aria-live="polite"
      aria-label={onClick ? t("a11y.textbox.advance", "Advance dialogue") : undefined}
      onKeyDown={onKeyDown}
      onClick={(e: MouseEvent<HTMLDivElement>) => { e.stopPropagation(); handleActivate(); }}
      style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      background: "linear-gradient(to top,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
      borderTop: "3px solid rgba(255,255,255,0.15)",
      padding: "16px 20px", minHeight: 70,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      cursor: onClick ? "pointer" : "default", zIndex: 50
    }}
    >
      <div style={{ fontSize: 18, fontWeight: 600, color: "white", lineHeight: 1.6, whiteSpace: 'pre-line', animation: "fadeSlide 0.3s ease" }}>{text}</div>
      {onClick && <div aria-hidden="true" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", flexShrink: 0, marginLeft: 12 }}>▼</div>}
    </div>
  );
}
