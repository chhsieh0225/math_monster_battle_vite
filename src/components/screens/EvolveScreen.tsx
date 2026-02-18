import type { CSSProperties } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import type { StarterLite } from '../../types/game';
import { useI18n } from '../../i18n';
import './EvolveScreen.css';

type EvolveScreenProps = {
  starter: StarterLite | null;
  stageIdx: number;
  onContinue: () => void;
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

type SparkCssVars = CSSProperties & {
  '--left': string;
  '--top': string;
  '--size': string;
  '--dur': string;
  '--del': string;
};

export default function EvolveScreen({ starter, stageIdx, onContinue }: EvolveScreenProps) {
  const { t } = useI18n();
  const st = starter?.stages?.[stageIdx];
  const ECOLORS = ["#818cf8","#a855f7","#fbbf24","#22c55e","#60a5fa","#f472b6","#fb923c","#34d399","#c084fc","#facc15"];

  if (!starter || !st) {
    return (
      <div className="evolve-screen-fallback">
        <div className="evolve-fallback-title">{t("evolve.fallbackTitle", "Evolution data is temporarily unavailable")}</div>
        <div className="evolve-fallback-desc">{t("evolve.fallbackDesc", "Safety fallback is active. You can continue the game.")}</div>
        <button className="touch-btn evolve-continue-btn" onClick={onContinue} aria-label={t("a11y.common.continueBattle", "Continue battle")}>
          {t("evolve.continue", "Continue Battle!")}
        </button>
      </div>
    );
  }

  return (
    <div className="evolve-screen">
      <div className="evolve-flash" />
      {[0, 0.3, 0.6].map((_, i) => (
        <div key={`br${i}`} className={`evolve-burst evolve-burst-${i}`} />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
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
          <div key={`op${i}`} className="evolve-orbit" style={orbitStyle}>
            <div className="evolve-orbit-dot" style={dotStyle} />
          </div>
        );
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const sparkStyle: SparkCssVars = {
          '--left': `${12 + Math.sin(i * 1.3) * 32 + 32}%`,
          '--top': `${8 + Math.cos(i * 1.7) * 32 + 32}%`,
          '--size': `${12 + (i % 3) * 8}px`,
          '--dur': `${1.5 + i * 0.2}s`,
          '--del': `${0.3 + i * 0.25}s`,
        };
        return (
          <div key={`ss${i}`} className="evolve-spark" style={sparkStyle}>
            {i % 2 === 0 ? "✨" : "⭐"}
          </div>
        );
      })}
      <div className="evolve-front">
        <div className="evolve-title">{t("evolve.title", "Congrats! Your partner evolved!")}</div>
        <div className="evolve-emoji">{st.emoji}</div>
        <div className="evolve-sprite-wrap"><div className="evolve-sprite-glow"><MonsterSprite svgStr={st.svgFn(starter.c1,starter.c2)} size={180}/></div></div>
        <div className="evolve-name">{st.name}</div>
        <div className="evolve-buff">{t("evolve.buff", "Attack up! HP recovered!")}</div>
        <button className="touch-btn evolve-continue-btn evolve-continue-btn-animated" onClick={onContinue} aria-label={t("a11y.common.continueBattle", "Continue battle")}>
          {t("evolve.continue", "Continue Battle!")}
        </button>
      </div>
    </div>
  );
}
