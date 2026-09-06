import type { CSSProperties, ReactNode } from 'react';
import type { SkillMotif, SkillRecipe } from './skillRecipes.ts';

type Props = {
  recipe: SkillRecipe;
  hit: boolean;
  tier: number;
  idx: number;
  lowPerf: boolean;
  uid: string;
  radius: number;
  source: { cx: number; cy: number };
  target: { cx: number; cy: number };
};

// Shapes face right; stage transforms aim them without mirroring the actor or HUD.
const FORMS: Partial<Record<SkillMotif, string>> = {
  flame: 'M40 0Q16-30-8-12L-42-23-23-3-54 5-22 12-34 28Q2 12 17 21Q37 19 40 0Z',
  meteor: 'M28 0Q28-25 3-26L-65-44-35-14-72-9-22 10-42 24 2 25Q25 27 28 0Z',
  frost: 'M42 0 9-19-32-12-45 0-32 12 9 19Z M42 0-45 0M9-19-7 0 9 19',
  sword: 'M43 0 24-8-24-4-24-14-30-14-30-4-45-3-45 3-30 4-30 14-24 14-24 4 24 8Z M-20 0 32 0',
  leaf: 'M38-21Q-30-32-38 22Q23 35 38-21ZM-33 20 32-18M-5 4-13-15M8-4 26 8',
  wing: 'M38 10 8-22-10-6-42-35-29-8-48-13-32 5-51 17-10 14 9 31Z',
  fang: 'M-39-30-22 28-6-20 6-20 22 28 39-30Q0-12-39-30ZM-30 32 0 17 30 32',
  thorn: 'M38 0 5-13-6-37-14-16-35-22-22-4-38 16-9 10 3 31 12 9Z',
  stone: 'M35-6 17-26-17-22-36 2-18 26 22 20ZM17-26 0-3-18 26M0-3 35-6',
  candy: 'M-24-20 24-20 24 20-24 20ZM-24-11-43-23-40 23-24 11M24-11 43-23 40 23 24 11M-18-20 5 20M0-20 23 20',
  wisp: 'M38 0Q18-30-6-18L-42-30-24-8-43 4-22 10-32 29 0 20Q24 26 38 0ZM14-8 20-2M14 8 20 2',
  butterfly: 'M0 0Q-45-50-36-7Q-24 15 0 0Q45-50 36-7Q24 15 0 0M0 0Q-40 5-21 30Q-8 38 0 0Q40 5 21 30Q8 38 0 0',
};
const WAVE = 'M-45 42Q-38-5-3-39Q32-68 43-28Q37-11 16-19Q35-32 18-39Q-2-35-3-10Q-1 17 41 36L45 43Z';
const BOLT = 'M-12-110 16-70-4-73 17-29-2-34 7 10-20-40-3-35-25-82-6-73Z';
const COIL = 'M-52 38Q-68-28-30-42Q-4-42-8-16Q-22 4-40-8Q-43-21-28-23Q-19-22-28-15';
const burstAngles = [0, 72, 144, 216, 288];
const beat = (i: number, step = 40): CSSProperties => ({ '--sc-delay': `${i * step}ms` }) as CSSProperties;

function Shape({ motif, uid, mark }: { motif: SkillMotif; uid: string; mark: string }) {
  if (motif === 'bubble' || motif === 'spark' || motif === 'spore') {
    return <>
      <circle className="sc-glass" r={motif === 'spore' ? 14 : 25} fill={`url(#${uid}-body)`} />
      <path className="sc-shine" d={motif === 'spark' ? 'M-35-8-15-18-4 5 8-12 34 8M-8 28 4 13 17 26' : 'M-16-4Q-15-17-3-18M16 7 12 15'} />
    </>;
  }
  return <path className="sc-solid" d={FORMS[motif] || mark} fill={`url(#${uid}-body)`} />;
}

export function SkillChoreography({ recipe, hit, tier, idx, lowPerf, uid, radius, source, target }: Props) {
  const { motion, motif, mark } = recipe;
  const dx = target.cx - source.cx, dy = target.cy - source.cy;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const scale = radius / 62;
  const detail = lowPerf ? 0 : tier - 1;
  const shape = <Shape motif={motif} uid={uid} mark={mark} />;
  const atTarget = (children: ReactNode) => <g transform={`translate(${target.cx} ${target.cy}) scale(${scale})`}>{children}</g>;
  const alongRoute = (children: ReactNode) => <g transform={`translate(${source.cx} ${source.cy}) rotate(${angle})`}>{children}</g>;
  const rays = (count: number, form = shape) => Array.from({ length: count }, (_, i) => <g key={i} transform={`rotate(${i * 360 / count})`}>
    <g className="sc-scatter" style={beat(i, 12)}><g transform="translate(37 0) scale(.3)">{form}</g></g>
  </g>);
  const ring = <ellipse className="sc-ground" cy="35" rx="58" ry="16" />;
  let scene: ReactNode;

  if (motion === 'shot' || motion === 'rush') {
    const rush = motion === 'rush';
    const count = motif === 'bubble' ? 3 + detail : 1 + detail;
    scene = hit ? atTarget(<>
      <g className="sc-bloom"><circle r="40" fill={`url(#${uid})`} />{rays(lowPerf ? 3 : 5 + detail)}</g>
      <g className={rush ? 'sc-cut' : 'sc-pop'}>{rush ? <path className="sc-solid" d={mark} fill={`url(#${uid}-body)`} /> : shape}</g>
      {motif === 'bubble' && <circle className="sc-pop-ring" r="36" />}
    </>) : <g transform={`translate(${source.cx} ${source.cy})`}>
      <g className="sc-projectile">
        <g transform={`rotate(${angle}) scale(${scale * (rush ? 1.2 : .72)})`}>
          {Array.from({ length: count }, (_, i) => <g key={i} transform={`translate(${-i * 23} ${i % 2 ? -16 : i ? 16 : 0}) scale(${1 - i * .12})`} opacity={1 - i * .17}>
            <g className="sc-flicker">{shape}</g>
          </g>)}
          {rush && <path className="sc-wake" d="M28-15Q-20-42-92-15L-38-6-115 4-36 10-87 26Q-18 43 28 15" fill={`url(#${uid}-body)`} />}
        </g>
      </g>
    </g>;
  } else if (motion === 'slash') {
    // Parallel wolf blades and crossing wolf blades use different timing and axes.
    const angles = motif === 'blade' ? idx === 1 ? [-18, -18] : idx === 2 ? [-24, 66] : [-28] : [0];
    scene = atTarget(<>
      {!hit ? <g className="sc-aim"><path className="sc-edge" d="M-46 28Q-5-42 48-30" /><path className="sc-edge" d="M-40 40 40-40" /></g> : <>
        {angles.map((turn, i) => <g key={i} transform={`translate(0 ${angles[0] === angles[1] ? i * 22 - 11 : 0}) rotate(${turn})`}>
          <g className="sc-cut" style={beat(i, 70)}><path className="sc-solid" d={motif === 'blade' ? 'M-58 30Q-17-32 58-32Q9 11-58 30Z' : mark} fill={`url(#${uid}-body)`} /></g>
        </g>)}
        {detail > 0 && <path className="sc-cut-echo" d={mark} />}
        {(motif === 'frost' || motif === 'leaf' || motif === 'candy') && <g className="sc-bloom">{rays(lowPerf ? 2 : 4)}</g>}
        {motif === 'fang' && <g className="sc-bite"><path className="sc-edge" d="M-43 24Q0 58 43 24" /></g>}
      </>}
    </>);
  } else if (motion === 'wave') {
    const roar = motif === 'roar' || motif === 'eclipse';
    const count = roar ? 3 : idx >= 2 ? 3 : 2;
    const front = <>{Array.from({ length: lowPerf ? Math.min(2, count) : count + detail }, (_, i) => <g key={i} transform={`translate(${-i * 25} 0) scale(${1 - i * .09})`} opacity={1 - i * .16}>
      <g className="sc-surge" style={beat(i, 24)}>
        {roar ? <path className="sc-pressure" d="M-6-52Q59 0-6 52L5 34Q36 0 5-34Z" fill={`url(#${uid}-body)`} />
          : <><path className="sc-solid" d={motif === 'mud' ? mark : WAVE} fill={`url(#${uid}-body)`} /><path className="sc-foam" d="M-35 16Q-22-34 9-45Q29-50 34-32M-20 35Q4 21 30 35" /></>}
      </g>
    </g>)}</>;
    scene = <>
      {hit ? atTarget(<g transform={`rotate(${angle})`}><g className="sc-recede">{front}</g></g>) : <g transform={`translate(${source.cx} ${source.cy})`}>
        <g className="sc-projectile"><g transform={`rotate(${angle}) scale(${scale})`}>{front}</g></g>
      </g>}
      {motif === 'eclipse' && atTarget(<g className={hit ? 'sc-eclipse-release' : 'sc-eclipse-form'}>
        <circle className="sc-corona" r="41" /><circle className="sc-eclipse" r="32" /><path className="sc-shine" d="M14-30A33 33 0 0 1 14 30" />
      </g>)}
    </>;
  } else if (motion === 'fall') {
    const lightning = motif === 'bolt';
    const count = lowPerf ? 1 : (idx >= 3 ? 3 : 1) + detail;
    scene = atTarget(<>
      {ring}
      {motif === 'sword' && <path className="sc-cloud" d="M-64-87Q-71-104-49-105Q-46-126-23-116Q-3-133 16-115Q45-125 51-107Q74-105 62-87Z" />}
      {Array.from({ length: count }, (_, i) => <g key={i} transform={`translate(${(i - (count - 1) / 2) * 25} ${i % 2 * -16})`}>
        {lightning ? <path className={hit ? 'sc-thunder' : 'sc-warning-bolt'} style={beat(i, 24)} d={BOLT} fill={`url(#${uid}-body)`} />
          : <g className={hit ? 'sc-fall-strike' : 'sc-fall-windup'} style={beat(i, 26)}><g transform={`rotate(${motif === 'meteor' ? 55 : 90}) scale(${i === 0 ? 1.15 : .8})`}>{shape}</g></g>}
      </g>)}
      {hit && <g className="sc-crater"><ellipse cy="35" rx="52" ry="14" /><path d="M-45 35-62 24M-27 43-42 54M19 44 32 57M42 37 62 29" /></g>}
      {hit && detail > 0 && <g className="sc-bloom">{rays(4)}</g>}
    </>);
  } else if (motion === 'beam') {
    const rift = motif === 'rift';
    scene = alongRoute(<g className={hit ? 'sc-beam-release' : 'sc-beam-charge'}>
      <path className="sc-breath" d={`M0-5Q${distance * .4} ${-radius * .8} ${distance} ${-radius * .55}Q${distance + radius * .3} 0 ${distance} ${radius * .55}Q${distance * .4} ${radius * .8} 0 5Z`} fill={`url(#${uid}-body)`} />
      <path className="sc-beam-core" d={`M0 0Q${distance * .45} ${-radius * .2} ${distance} 0Q${distance * .4} ${radius * .24} 0 0Z`} />
      {!rift && !lowPerf && [0, 1, 2].map(i => <g key={i} transform={`translate(${distance * (.38 + i * .25)} 0) scale(${.4 + i * .2})`}><g className="sc-flare" style={beat(i, 28)}><path className="sc-solid" d={mark} fill={`url(#${uid}-body)`} /></g></g>)}
      {rift && <g transform={`translate(${distance} 0) scale(${scale})`}><g className="sc-rift"><path className="sc-solid" d="M0-70 8-12 52 0 8 12 0 70-8 12-52 0-8-12Z" fill={`url(#${uid}-body)`} /></g></g>}
    </g>);
  } else if (motion === 'lash') {
    const serpent = motif === 'serpent';
    const chain = motif === 'chain';
    const count = serpent ? lowPerf ? 3 : 9 : lowPerf ? 2 : 3;
    scene = <>
      {!hit && alongRoute(<g className="sc-whip-windup"><path className="sc-vine" d={`M0 0Q${distance * .25} ${-radius * 1.4} ${distance * .6} 0T${distance} 0`} pathLength="1" /></g>)}
      {atTarget(<g className={hit ? 'sc-bind' : 'sc-bind-windup'}>
        {Array.from({ length: count }, (_, i) => <g key={i} transform={`rotate(${i * (serpent ? 360 / count : 60)})`}>
          {serpent ? <g className="sc-serpent" style={beat(i, 18)}><path className="sc-vine" d={COIL} /><path className="sc-solid" d="M-30-31-13-22-23-9-35-14Z" fill={`url(#${uid}-body)`} /></g>
            : <path className={chain ? 'sc-chain' : 'sc-vine'} d="M-56-32Q0-58 56-32L46 27Q0 57-46 27Z" pathLength="1" style={beat(i, 28)} />}
        </g>)}
        {chain ? <path className="sc-thunder" d="M-56-32-27-8-8-21 8 12 28-7 56 32M-35 44-21 16 0 30 23 4 40 19" />
          : !serpent && <path className="sc-thorns" d="M-48-34-39-53-31-40M47-18 62-9 45 0M-25 40-17 57-9 46" />}
      </g>)}
    </>;
  } else if (motion === 'orbit') {
    const vortex = motif === 'vortex' || motif === 'storm' || motif === 'wisp';
    scene = atTarget(<>
      {vortex ? <g className={hit ? 'sc-vortex-collapse' : 'sc-vortex-form'}>
        <ellipse className="sc-vortex-eye" rx="20" ry="13" />
        <g className="sc-vortex-spin"><path className="sc-current" d="M-55 9C-54-44 50-52 55-4C49 32-30 45-37 7C-33-18 25-27 29-1C25 20-13 21-14 3" /></g>
        {motif === 'storm' && <path className="sc-thunder" d={BOLT} fill={`url(#${uid}-body)`} />}
        {motif === 'wisp' && <g className="sc-orbit-spin"><g transform="translate(39 0) scale(.6)">{shape}</g></g>}
      </g> : <g className={hit ? 'sc-orbit-close' : 'sc-orbit-open'}>
        {Array.from({ length: lowPerf ? 3 : 4 + detail }, (_, i) => <g key={i} transform={`rotate(${i * 360 / (lowPerf ? 3 : 4 + detail)})`}>
          <g className="sc-orbit-spin" style={beat(i, 8)}><g transform={`translate(44 0) rotate(${motif === 'sword' ? 180 : 45}) scale(${motif === 'mirror' ? .56 : .65})`}>{shape}</g></g>
        </g>)}
        {!lowPerf && <ellipse className="sc-orbit-ring" rx="54" ry="38" />}
      </g>}
    </>);
  } else {
    const thunder = motif === 'bolt';
    const count = lowPerf ? 3 : 3 + detail;
    scene = atTarget(<>
      {ring}
      {motif === 'flame' && hit && <path className="sc-blast" d="M-61 34Q-52-37 0-54Q52-37 61 34L42 22Q17-30 0-33Q-27-19-42 22Z" fill={`url(#${uid}-body)`} />}
      {Array.from({ length: count }, (_, i) => <g key={i} transform={`translate(${(i - (count - 1) / 2) * 25} ${i % 2 * 12})`}>
        <g className={hit ? 'sc-erupt' : 'sc-field-windup'} style={beat(i, 26)}>
          {thunder ? <path className="sc-thunder" d={BOLT} fill={`url(#${uid}-body)`} />
            : motif === 'serpent' ? <><path className="sc-vine" d="M0 38Q-29-12 0-40Q24-47 22-19" /><path className="sc-solid" d="M10-27 30-26 23-10 11-14Z" fill={`url(#${uid}-body)`} /></>
              : <g transform={`translate(0 5) rotate(-90) scale(${motif === 'spore' ? .65 : .95})`}>{shape}</g>}
        </g>
      </g>)}
      {hit && !lowPerf && <g className="sc-crater"><ellipse cy="35" rx="62" ry="17" /></g>}
    </>);
  }

  return <g data-choreography={`${motion}:${motif}`} className={hit ? 'skill-contact sc-contact' : 'sc-launch'}>
    {scene}
    {hit && !lowPerf && tier === 3 && atTarget(<g className="sc-mastery">
      {burstAngles.map(turn => <path key={turn} transform={`rotate(${turn})`} className="sc-glint" d="M58 0 64-3 75 0 64 3Z" />)}
    </g>)}
  </g>;
}
