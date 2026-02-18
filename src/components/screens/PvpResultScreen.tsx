import type { CSSProperties } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import type { StarterLite, StarterStage } from '../../types/game';
import { useI18n } from '../../i18n';
import './PvpResultScreen.css';

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

type OrbitCssVars = CSSProperties & {
  '--orbit': string;
  '--spin-dur': string;
  '--spin-del': string;
};

type OrbitDotCssVars = CSSProperties & {
  '--dot-size': string;
  '--dot-color': string;
  '--dot-glow': string;
};

type RootCssVars = CSSProperties & {
  '--winner-c1': string;
  '--winner-c2': string;
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
  const { t } = useI18n();
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
  const winnerName = winnerStage?.name || winnerStarter?.name || t("pvpResult.defaultWinner", "Player");
  const loserName = loserStage?.name || loserStarter?.name || t("pvpResult.defaultLoser", "Opponent");
  const winnerIcon = winnerStarter?.typeIcon || "🏆";
  const winnerC1 = winnerStarter?.c1 || "#6366f1";
  const winnerC2 = winnerStarter?.c2 || "#a855f7";
  const ECOLORS = ["#818cf8", "#a855f7", "#fbbf24", "#22c55e", "#60a5fa", "#f472b6", "#fb923c", "#34d399"];

  return (
    <div
      className="pvp-result-screen"
      style={{
        '--winner-c1': winnerC1,
        '--winner-c2': winnerC2,
      } as RootCssVars}
    >
      <div className="pvp-result-flash" />
      {[0, 0.3, 0.6].map((dl, i) => (
        <div
          key={`br_${i}`}
          className={`pvp-result-burst pvp-result-burst-${i}`}
        />
      ))}
      {Array.from({ length: 10 }, (_, i) => {
        const orbitStyle: OrbitCssVars = {
          '--orbit': `${45 + i * 7}px`,
          '--spin-dur': `${2.2 + i * 0.25}s`,
          '--spin-del': `${i * 0.12}s`,
        };
        const color = ECOLORS[i % ECOLORS.length];
        const dotStyle: OrbitDotCssVars = {
          '--dot-size': `${4 + (i % 3) * 2}px`,
          '--dot-color': color,
          '--dot-glow': `${6 + i * 2}px`,
        };

        return (
          <div key={`op_${i}`} className="pvp-result-orbit" style={orbitStyle}>
            <div className="pvp-result-orbit-dot" style={dotStyle} />
          </div>
        );
      })}
      <div className="pvp-result-front">
        <div className="pvp-result-title">
          {t("pvpResult.title", "🏆 Winner")}
        </div>
        <div className="pvp-result-winner-name">
          {winnerIcon} {winnerName}
        </div>
        <div className="pvp-result-winner-sprite-wrap">
          <div className="pvp-result-winner-sprite-glow">
            <MonsterSprite svgStr={winnerStage?.svgFn?.(winnerStarter?.c1 || "#6366f1", winnerStarter?.c2 || "#a855f7") || ""} size={180} ariaLabel={`${t("pvpResult.title", "🏆 Winner")} ${winnerName}`} />
          </div>
        </div>
      </div>

      {loserStage && (
        <div className="pvp-result-loser-wrap">
          <div className="pvp-result-loser-label">{t("pvpResult.opponent", "Opponent")}</div>
          <div className="pvp-result-loser-row">
            <MonsterSprite svgStr={loserStage.svgFn(loserStarter?.c1 || "#64748b", loserStarter?.c2 || "#475569")} size={58} ariaLabel={`${t("pvpResult.opponent", "Opponent")} ${loserName}`} />
            <div className="pvp-result-loser-name">{loserStarter?.typeIcon} {loserName}</div>
          </div>
        </div>
      )}

      <div className="pvp-result-line">
        {t("pvpResult.resultLine", "{winner} defeated {loser}", { winner: winnerName, loser: loserName })}
      </div>
      <div className="pvp-result-subline">{t("pvpResult.localMode", "Local 2-player mode")}</div>
      <div className="pvp-result-actions">
        <button className="touch-btn pvp-result-btn-rematch" onClick={onRematch} aria-label={t("a11y.common.rematch", "Play rematch")}>
          {t("pvpResult.rematch", "🔄 Rematch")}
        </button>
        <button className="touch-btn pvp-result-btn-home" onClick={onHome} aria-label={t("a11y.common.goHome", "Back to title")}>
          {t("pvpResult.home", "🏠 Home")}
        </button>
      </div>
    </div>
  );
}
