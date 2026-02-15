import type { MouseEvent } from 'react';

type TextBoxProps = {
  text: string;
  onClick?: () => void;
};

export default function TextBox({ text, onClick }: TextBoxProps) {
  return (
    <div onClick={(e: MouseEvent<HTMLDivElement>) => { e.stopPropagation(); onClick && onClick(); }} style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      background: "linear-gradient(to top,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
      borderTop: "3px solid rgba(255,255,255,0.15)",
      padding: "16px 20px", minHeight: 70,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      cursor: "pointer", zIndex: 50
    }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "white", lineHeight: 1.6, animation: "fadeSlide 0.3s ease" }}>{text}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", flexShrink: 0, marginLeft: 12 }}>▼</div>
    </div>
  );
}
