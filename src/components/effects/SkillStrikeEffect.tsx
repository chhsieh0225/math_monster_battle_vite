import { memo, useId } from 'react';
import type { CSSProperties } from 'react';
import type { SpriteTarget } from '../../hooks/useSpriteTargets.ts';
import type { AttackEffectVm } from '../../types/battle.ts';
import { getAttackEffectHitDelay } from '../../utils/effectTiming.ts';
import { getSkillImpactSize, getSkillMastery } from '../../utils/skillPresentation.ts';
import { getSkillRecipe } from './skillRecipes.ts';

const ELEMENTS: Record<string, { tone: string; accent: string; trail: string; crest: string }> = {
  fire: { tone: '#fb923c', accent: '#fef08a',
    trail: 'M0 40 Q60 8 104 40 Q136 65 184 30 L240 40 M38 46 Q110 74 160 44 L234 40',
    crest: 'M0 34 C-38 16 -25 -14 -11 -22 Q-12 -5 -4 0 Q14 -22 6 -42 C44 -9 33 26 0 34Z' },
  water: { tone: '#38bdf8', accent: '#e0f2fe',
    trail: 'M0 40 Q40 3 80 40 T160 40 T240 40 M0 52 Q40 16 80 52 T160 52 T240 40',
    crest: 'M-40 16 Q-13 -42 18 -19 Q0 -24 -5 -2 Q19 -31 39 -7 Q18 -14 14 9 Q-8 37 -40 16Z' },
  grass: { tone: '#4ade80', accent: '#ecfccb',
    trail: 'M0 40 Q60 8 120 40 T240 40 M30 36 L61 15 L72 34 M100 38 L129 62 L145 42 M170 36 L204 14 L221 38',
    crest: 'M-34 28 Q-44 -26 26 -36 Q40 28 -34 28Z M-32 27 L24 -32 M-16 9 L-22 -11 M-3 -6 L18 -6' },
  electric: { tone: '#facc15', accent: '#fffde4',
    trail: 'M0 40 L42 26 L62 53 L90 17 L116 55 L153 24 L178 47 L204 31 L240 40 M70 46 L95 68 L147 56',
    crest: 'M7 -44 L-30 5 L-5 0 L-15 43 L32 -13 L9 -9Z' },
  dark: { tone: '#a78bfa', accent: '#f0abfc',
    trail: 'M0 40 Q78 -15 138 40 Q176 77 206 40 Q218 28 240 40 M14 50 Q84 87 149 40 Q192 11 235 40',
    crest: 'M-35 4 A36 36 0 1 1 9 35 A26 26 0 1 0 -12 -21 A18 18 0 1 1 15 9 A9 9 0 1 0 -2 -8' },
  light: { tone: '#fde68a', accent: '#ffffff',
    trail: 'M0 40 L220 40 M65 32 L220 40 L150 49 M193 21 L240 40 L193 59',
    crest: 'M0 -44 L9 -10 L40 0 L9 10 L0 44 L-9 10 L-40 0 L-9 -10Z M-27 -27 L27 27 M27 -27 L-27 27' },
  steel: { tone: '#cbd5e1', accent: '#67e8f9',
    trail: 'M0 49 L210 31 L240 40 L22 43 M58 59 L212 43 M107 22 L209 32',
    crest: 'M-42 32 Q-12 -2 37 -35 Q20 -9 -42 32Z M-28 -36 Q5 -14 32 37 Q5 10 -28 -36Z' },
  ice: { tone: '#67e8f9', accent: '#f0fdfa',
    trail: 'M0 40 L53 32 L84 43 L135 28 L169 43 L217 32 L240 40 M55 52 L93 42 L127 57 L177 43',
    crest: 'M0 -43 L27 -10 L18 28 L0 43 L-22 20 L-29 -10Z M0 -43 L0 43 M-29 -10 L27 -10 M-22 20 L0 -10 L18 28' },
};

export type SkillEffectArena = {
  width: number;
  height: number;
  enemyHudRight?: number;
  enemyHudBottom?: number;
  playerHudLeft?: number;
  playerHudInset?: number;
};

type Props = {
  effect: AttackEffectVm;
  source: SpriteTarget;
  target: SpriteTarget;
  arena: SkillEffectArena;
  lowPerf?: boolean;
};

export const SkillStrikeEffect = memo(function SkillStrikeEffect({ effect, source, target, arena, lowPerf = false }: Props) {
  const uid = `skill-${useId().replace(/[^a-z0-9_-]/gi, '')}`;
  const { tier } = getSkillMastery(effect.lvl);
  const recipe = getSkillRecipe(effect.skillId);
  const baseElement = ELEMENTS[effect.type] || ELEMENTS.dark;
  const element = { ...baseElement, tone: recipe?.tone || baseElement.tone, accent: recipe?.accent || baseElement.accent };
  const outcome = effect.impact?.outcome;
  if (outcome === 'miss' || arena.width <= 0 || arena.height <= 0) return null;
  const hit = Boolean(outcome);
  const blocked = outcome === 'blocked';
  const boss = Boolean(effect.signature);
  const ultimate = effect.idx >= 3;
  const requestedRadius = getSkillImpactSize(effect.lvl, effect.idx, boss) + (outcome === 'critical' ? 8 : 0);
  const radius = Math.min(requestedRadius, target.size && target.size > 0 ? Math.max(26, target.size * .7) : requestedRadius);
  const hasHud = arena.enemyHudRight !== undefined && arena.enemyHudBottom !== undefined
    && arena.playerHudLeft !== undefined && arena.playerHudInset !== undefined;
  const clip = hasHud ? `M0 0H${arena.width}V${arena.height}H0Z M0 0H${arena.enemyHudRight}V${arena.enemyHudBottom}H0Z M${arena.playerHudLeft} ${arena.height - arena.playerHudInset!}H${arena.width}V${arena.height}H${arena.playerHudLeft}Z` : undefined;
  const dx = target.cx - source.cx, dy = target.cy - source.cy;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const strands = lowPerf || blocked ? 1 : effect.signature === 'boss_hydra' ? 3 : tier;
  const fall = recipe?.motion === 'fall';
  const startX = fall ? Math.min(arena.width - 16, target.cx + 28) : source.cx;
  const startY = fall ? Math.max(18, target.cy - 130) : source.cy;
  const trail = recipe?.motion === 'wave' || recipe?.motion === 'lash'
    ? `M${source.cx} ${source.cy} Q${source.cx + dx * .35} ${source.cy - 65} ${source.cx + dx * .6} ${source.cy + dy * .6} T${target.cx} ${target.cy}`
    : `M${startX} ${startY} L${target.cx} ${target.cy}`;
  const style = {
    '--skill-tone': blocked ? '#cbd5e1' : element.tone,
    '--skill-accent': element.accent,
    '--skill-flight': `${getAttackEffectHitDelay(effect.type)}ms`,
    '--skill-weight': ultimate ? 5 : 2 + tier,
    '--skill-dx': `${target.cx - startX}px`, '--skill-dy': `${target.cy - startY}px`,
    width: arena.width, height: arena.height,
  } as CSSProperties;

  return <svg className={`skill-fx ${hit ? 'is-contact' : 'is-launch'} ${lowPerf ? 'is-lite' : ''} ${blocked ? 'is-blocked' : ''}`}
    style={style} viewBox={`0 0 ${arena.width} ${arena.height}`} aria-hidden="true"
    clipPath={hasHud ? `url(#${uid}-arena)` : undefined} data-impact-radius={radius}
    data-skill-tier={tier} data-skill-type={effect.type} data-skill-signature={effect.signature}
    data-skill-id={recipe ? effect.skillId : undefined} data-skill-motion={recipe?.motion}
    data-source={`${source.cx},${source.cy}`} data-target={`${target.cx},${target.cy}`}>
    <defs>
      {clip && <clipPath id={`${uid}-arena`}><path d={clip} clipRule="evenodd" /></clipPath>}
      <radialGradient id={uid}>
        <stop offset="0" stopColor={element.accent} stopOpacity=".9" />
        <stop offset=".18" stopColor={element.accent} stopOpacity=".68" />
        <stop offset=".46" stopColor={element.tone} stopOpacity=".5" />
        <stop offset="1" stopColor={element.tone} stopOpacity="0" />
      </radialGradient>
    </defs>
    {!hit && <g transform={`translate(${source.cx} ${source.cy})`}>
      <g className="skill-charge">
        <circle r={22 + tier * 5} />
        {!lowPerf && tier >= 2 && <circle r={34 + tier * 4} strokeDasharray="18 10 3 10" />}
        {!lowPerf && tier === 3 && <path d="M0 -48 L42 24 L-42 24Z" />}
      </g>
    </g>}
    {recipe ? (!lowPerf && !blocked && <g key={hit ? 'contact' : 'launch'} className="skill-signature-flight">
      <path className="skill-route" d={trail} pathLength="1" />
      {!hit && <g transform={`translate(${startX} ${startY})`}>
        <g className="skill-missile">
          <g transform={`rotate(${fall ? 20 : angle}) scale(${recipe.motion === 'rush' ? .65 : .42})`}>
            <path className="skill-glyph" d={recipe.mark} />
          </g>
        </g>
      </g>}
    </g>) : <g transform={`translate(${source.cx} ${source.cy}) rotate(${angle})`}>
      <g key={hit ? 'contact' : 'launch'} className="skill-stream">
        {Array.from({ length: strands }, (_, i) => <svg key={i} x="0" y={(ultimate ? -38 : -26) + (i - (strands - 1) / 2) * 17}
          width={distance} height={ultimate ? 76 : 52} viewBox="0 0 240 80" preserveAspectRatio="none" overflow="visible">
          <path className="skill-stream-body" d={element.trail} />
          {!lowPerf && <path className="skill-stream-edge" d={element.trail} />}
        </svg>)}
      </g>
    </g>}
    {hit && <g transform={`translate(${target.cx} ${target.cy})`}>
      <g key={effect.impact?.at} className="skill-contact">
        {blocked ? <path className="skill-block" d="M0 -35 L27 -22 L23 12 Q15 28 0 36 Q-15 28 -23 12 L-27 -22Z" /> : <>
          {!lowPerf && <circle className="skill-impact-heat" r={radius * 1.25} fill={`url(#${uid})`} />}
          <circle className="skill-impact-ring" r={radius * .72} />
          {!lowPerf && (tier >= 2 || ultimate) && <circle className="skill-impact-ring skill-ring-outer" r={radius} strokeDasharray="22 9 4 9" />}
          {recipe ? <g className="skill-signature" transform={`scale(${radius / 62})`}>
            {Array.from({ length: lowPerf ? 1 : tier }, (_, i) => <g key={i}
              opacity={i === 0 ? 1 : .28}
              transform={`translate(${i * (recipe.motion === 'slash' ? 6 : -4)} ${i * -5}) scale(${1 - i * .13})`}>
              <path className={`skill-glyph skill-mark ${i > 0 ? 'skill-echo' : ''}`} d={recipe.mark} pathLength="1"
                style={{ '--skill-beat': `${i * 34}ms` } as CSSProperties} />
            </g>)}
          </g> : <g className="skill-crest" transform={`scale(${radius / 85})`}><path d={element.crest} /></g>}
          {!lowPerf && (tier === 3 || ultimate) && <g className="skill-seal">
            <path d={`M0 ${-radius} L${radius * .86} ${radius / 2} L${-radius * .86} ${radius / 2}Z`} />
            <path d={`M0 ${radius} L${radius * .86} ${-radius / 2} L${-radius * .86} ${-radius / 2}Z`} />
          </g>}
          {!lowPerf && ultimate && !recipe && <g className="skill-finisher">
            {[0, 120, 240].map((turn) => <path key={turn} d={element.crest}
              transform={`rotate(${turn}) translate(0 ${-radius * .72}) scale(.55)`} />)}
          </g>}
          {!lowPerf && Array.from({ length: 4 + tier * 2 }, (_, i) => <g key={i} transform={`rotate(${i * 360 / (4 + tier * 2)})`}>
            <path className="skill-shard" d={`M0 ${-radius * .7} L3 ${-radius * .93} L0 ${-radius * 1.18} L-2 ${-radius * .88}Z`} />
          </g>)}
          {!lowPerf && boss && <path className="skill-boss-crown" d={`M${-radius} 0 L${-radius * .8} ${-radius * .6} L${-radius * .35} ${-radius * .3} L0 ${-radius} L${radius * .35} ${-radius * .3} L${radius * .8} ${-radius * .6} L${radius} 0`} />}
        </>}
      </g>
    </g>}
  </svg>;
});
