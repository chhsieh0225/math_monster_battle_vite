import type { CSSProperties } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import type { StarterLite, StarterStage } from '../../types/game';

type PvpStarter = StarterLite & {
  typeIcon?: string;
  stages: StarterStage[];
};

type PvpResultScreenProps = {
  p1Starter: PvpStarter | null;
  p2Starter: PvpStarter | null;
  p1StageIdx?: number;
  p2StageIdx?: number;
  winner: "p1" | "p2";
  onRematch: () => void;
  onHome: () => void;
};

export default function PvpResultScreen({
  p1Starter,
  p2Starter,
  p1StageIdx = 0,
  p2StageIdx = 0,
  winner,
  onRematch,
  onHome,
}: PvpResultScreenProps) {
  const clampIdx = (starter: PvpStarter | null, idx: number) => {
    const total = starter?.stages?.length || 1;
    const maxIdx = Math.max(0, total - 1);
    const raw = Number.isFinite(idx) ? idx : 0;
    return Math.max(0, Math.min(maxIdx, raw));
  };

  const winnerStarter = winner === "p1" ? p1Starter : p2Starter;
  const loserStarter = winner === "p1" ? p2Starter : p1Starter;
  const winnerIdx = clampIdx(winnerStarter, winner === "p1" ? p1StageIdx : p2StageIdx);
  const loserIdx = clampIdx(loserStarter, winner === "p1" ? p2StageIdx : p1StageIdx);
  const winnerStage = winnerStarter?.stages?.[winnerIdx] || winnerStarter?.stages?.[0];
  const loserStage = loserStarter?.stages?.[loserIdx] || loserStarter?.stages?.[0];
  const winnerName = winnerStage?.name || winnerStarter?.name || "玩家";
  const loserName = loserStage?.name || loserStarter?.name || "對手";
  const winnerIcon = winnerStarter?.typeIcon || "🏆";
  const winnerC1 = winnerStarter?.c1 || "#6366f1";
  const winnerC2 = winnerStarter?.c2 || "#a855f7";
  const ECOLORS = ["#818cf8", "#a855f7", "#fbbf24", "#22c55e", "#60a5fa", "#f472b6", "#fb923c", "#34d399"];

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      background: "linear-gradient(270deg,#0f0520,#1e1b4b,#312e81,#1e1b4b,#0f0520)",
      backgroundSize: "400% 400%",
      animation: "bgShimmer 6s ease infinite",
      padding: "24px 20px",
      textAlign: "center",
      gap: 10,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "white", animation: "evolveFlash 1.8s ease forwards", zIndex: 2, pointerEvents: "none" }} />
      {[0, 0.3, 0.6].map((dl, i) => (
        <div
          key={`br_${i}`}
          style={{
            position: "absolute",
            left: "50%",
            top: "40%",
            width: 60,
            height: 60,
            marginLeft: -30,
            marginTop: -30,
            borderRadius: "50%",
            border: "3px solid",
            borderColor: ["rgba(99,102,241,0.6)", "rgba(168,85,247,0.5)", "rgba(251,191,36,0.4)"][i],
            animation: `colorBurst 1.8s ease ${dl}s forwards`,
            pointerEvents: "none",
            zIndex: 4,
          }}
        />
      ))}
      {Array.from({ length: 10 }, (_, i) => {
        const orbitStyle = {
          position: "absolute",
          left: "50%",
          top: "40%",
          width: 0,
          height: 0,
          animation: `evolveSpin ${2.2 + i * 0.25}s linear ${i * 0.12}s infinite`,
          zIndex: 3,
          "--orbit": `${45 + i * 7}px`,
        } as CSSProperties;

        return (
          <div key={`op_${i}`} style={orbitStyle}>
            <div style={{ width: 4 + i % 3 * 2, height: 4 + i % 3 * 2, borderRadius: "50%", background: ECOLORS[i % ECOLORS.length], boxShadow: `0 0 ${6 + i * 2}px ${ECOLORS[i % ECOLORS.length]}`, opacity: 0.85 }} />
          </div>
        );
      })}
      <div style={{ position: "relative", zIndex: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 800, opacity: 0.9, marginBottom: 6, animation: "fadeSlide 0.4s ease both" }}>
          🏆 勝利者
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 2, marginBottom: 8, color: winnerC1, textShadow: `0 0 20px ${winnerC1}66` }}>
          {winnerIcon} {winnerName}
        </div>
        <div style={{ animation: "growIn 1.2s ease 0.15s both", marginBottom: 8 }}>
          <div style={{ animation: "evolveGlow 2s ease 1s infinite" }}>
            <MonsterSprite svgStr={winnerStage?.svgFn?.(winnerStarter?.c1 || "#6366f1", winnerStarter?.c2 || "#a855f7") || ""} size={180} ariaLabel={`勝利者 ${winnerName}`} />
          </div>
        </div>
      </div>

      {loserStage && (
        <div style={{ position: "relative", zIndex: 6, opacity: 0.62, marginBottom: 4 }}>
          <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 2 }}>對手</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <MonsterSprite svgStr={loserStage.svgFn(loserStarter?.c1 || "#64748b", loserStarter?.c2 || "#475569")} size={58} ariaLabel={`對手 ${loserName}`} />
            <div style={{ fontSize: 13 }}>{loserStarter?.typeIcon} {loserName}</div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 15, opacity: 0.95, zIndex: 6 }}>
        {winnerName} 擊敗了 {loserName}
      </div>
      <div style={{ fontSize: 11, opacity: 0.45, zIndex: 6 }}>同機雙人模式</div>
      <div style={{ display: "flex", gap: 10, marginTop: 8, zIndex: 6 }}>
        <button className="touch-btn" onClick={onRematch} aria-label="再戰一場" style={{
          background: `linear-gradient(135deg,${winnerC1},${winnerC2})`,
          border: "none",
          color: "white",
          fontSize: 14,
          fontWeight: 700,
          padding: "12px 24px",
          borderRadius: 14,
          cursor: "pointer",
        }}>🔄 再戰</button>
        <button className="touch-btn" onClick={onHome} aria-label="返回主畫面" style={{
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "white",
          fontSize: 14,
          fontWeight: 600,
          padding: "12px 20px",
          borderRadius: 14,
          cursor: "pointer",
        }}>🏠 首頁</button>
      </div>
    </div>
  );
}
