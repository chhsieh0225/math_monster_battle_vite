import { memo, type CSSProperties } from 'react';
import { BG_IMGS } from './sprites.ts';
import './scenes.css';

type CssVarStyle = CSSProperties & Record<`--${string}`, string | number>;

function withVars(style: CssVarStyle): CSSProperties {
  return style;
}

/* ─── Pre-computed random seeds (avoid Math.random() in render) ─── */
const LEAF_R = Array.from({ length: 10 }, (_, i) => ({
  left: 3 + i * 9,
  bottom: 3 + (i % 5) * 6,
  w: 5 + (i % 3) * 2,
  h: 3 + (i % 2) * 2,
  color: ["#86efac","#4ade80","#fef9c3","#bbf7d0","#a3e635","#d9f99d","#4ade80","#fef08a","#86efac","#d9f99d"][i],
  ldx: 25 + (i % 4) * 18,
  ldy: -(35 + (i % 3) * 20),
  dur: 3 + i * 0.5,
  del: i * 0.4,
}));

const FIREFLY_R = Array.from({ length: 12 }, (_, i) => ({
  top: 8 + ((i * 7) % 55),
  left: 3 + ((i * 8) % 85),
  w: 3 + (i % 3) * 2,
  color: ["#fde68a","#a5f3fc","#c4b5fd","#fde68a","#bef264","#a5f3fc",
          "#fde68a","#c4b5fd","#a5f3fc","#fde68a","#bef264","#c4b5fd"][i],
  fx: -15 + (i % 5) * 10,
  fy: -10 + (i % 4) * 8,
  op: 0.25 + (i % 4) * 0.12,
  dur: 3.5 + i * 0.45,
  del: i * 0.35,
}));

const POISON_BUBBLE_R = Array.from({ length: 12 }, (_, i) => ({
  left: 6 + ((i * 9) % 82),
  bottom: 3 + ((i * 7) % 28),
  size: 4 + (i % 3) * 2,
  hue: i % 2 === 0 ? '#84cc16' : '#22c55e',
  dur: 3.2 + i * 0.35,
  del: i * 0.28,
  driftX: -14 + (i % 5) * 7,
}));

const POISON_MIST_R = Array.from({ length: 4 }, (_, i) => ({
  left: 6 + i * 24,
  bottom: 8 + (i % 2) * 14,
  width: 110 + i * 22,
  height: 38 + (i % 3) * 8,
  alpha: 0.14 + (i % 3) * 0.04,
  dur: 5.2 + i * 1.1,
  del: i * 0.45,
}));

const SPARK_R = Array.from({ length: 4 }, (_, i) => ({
  top: 15 + ((i * 17) % 45),
  left: 10 + ((i * 20) % 70),
  w: 2 + (i % 2),
  color: ["#fbbf24","#f8fafc","#94a3b8","#e2e8f0"][i],
  dur: 1.8 + i * 0.7,
  del: i * 0.6,
}));

const SMOKE_R = Array.from({ length: 6 }, (_, i) => ({
  bottom: 2 + ((i * 9) % 50),
  left: -5 + ((i * 16) % 80),
  w: 80 + (i % 3) * 40,
  h: 30 + (i % 2) * 20,
  dx: 30 + (i % 3) * 15,
  dy: -(10 + (i % 4) * 6),
  sc: 0.8 + (i % 3) * 0.3,
  op: 0.4 + (i % 3) * 0.1,
  dur: 6 + i * 1.2,
  del: i * 0.8,
}));

const DARK_R = Array.from({ length: 8 }, (_, i)=>({
  t:5+((i*11)%60),l:((i*13)%90),w:2+(i%3),h:2+(i%2)+1,
  op:0.1+(i%4)*0.05,dur:2+i*0.4,del:i*0.3
}));

const FIRE_EMBER_R = Array.from({ length: 8 }, (_, i) => ({
  bottom: 2 + i * 3,
  left: 6 + i * 11,
  size: 3 + (i % 3) * 2,
  color: ['#f97316', '#ef4444', '#fbbf24', '#dc2626', '#fb923c', '#f59e0b', '#ea580c', '#fcd34d'][i],
  dur: 2.5 + i * 0.6,
  del: i * 0.35,
}));

const WATER_SPRAY_R = Array.from({ length: 10 }, (_, i) => ({
  top: 18 + ((i * 9) % 56),
  left: 4 + ((i * 10) % 88),
  size: 3 + (i % 3),
  op: 0.35 + (i % 4) * 0.1,
  dur: 3 + i * 0.45,
  del: i * 0.25,
}));

const ELECTRIC_SPARK_R = Array.from({ length: 12 }, (_, i) => ({
  top: 10 + ((i * 7) % 68),
  left: 6 + ((i * 9) % 84),
  width: 2 + (i % 2),
  height: 10 + (i % 3) * 4,
  op: 0.3 + (i % 4) * 0.12,
  dur: 1.6 + i * 0.2,
  del: i * 0.12,
  rot: -15 + (i % 5) * 9,
}));

const ROCK_DUST_R = Array.from({ length: 8 }, (_, i) => ({
  top: 10 + ((i * 11) % 60),
  left: (i * 13) % 85,
  size: 3 + (i % 3),
  color: ['#d4a574', '#c2956a', '#deb887', '#cdaa7d', '#c4a882', '#b8860b', '#d2b48c', '#deb887'][i],
  op: 0.3 + (i % 3) * 0.1,
  dur: 5 + i * 0.8,
  del: i * 0.5,
}));

const ROCK_PEBBLE_R = Array.from({ length: 4 }, (_, i) => ({
  top: 5 + i * 8,
  left: 15 + i * 20,
  size: 4 + (i % 2) * 2,
  color: ['#8b7355', '#a0522d', '#6b4226', '#8b6914'][i],
  dur: 3 + i * 0.7,
  del: i * 0.4,
}));

const HEAVEN_GLINT_R = Array.from({ length: 10 }, (_, i) => ({
  top: 8 + ((i * 9) % 60),
  left: 5 + ((i * 11) % 88),
  size: 2 + (i % 3),
  color: ['#ffffff', '#e0e7ff', '#bfdbfe', '#fef9c3', '#e2e8f0', '#ffffff', '#ddd6fe', '#bfdbfe', '#f8fafc', '#e2e8f0'][i],
  dur: 2.2 + i * 0.35,
  del: i * 0.22,
}));

const DARK_BAND_R = [0, 1, 2].map((i) => ({
  bottom: 10 + i * 8,
  left: 15 + i * 30,
  width: 30 + i * 10,
  alpha: 0.04 + i * 0.02,
}));

const BURNT_EMBER_R = Array.from({ length: 10 }, (_, i) => {
  const color = ['#f97316', '#ef4444', '#fbbf24', '#dc2626', '#fb923c', '#f59e0b', '#ea580c', '#fcd34d', '#b91c1c', '#f97316'][i];
  return {
    bottom: 1 + i * 3,
    left: 4 + i * 9,
    size: 3 + (i % 3) * 2,
    color,
    glow: 4 + (i % 3) * 3,
    dur: 2 + i * 0.5,
    del: i * 0.3,
  };
});

export const SCENES = {
  /* ═══ Grass — wind-blown leaf particles ═══ */
  grass:{
    bgImg:BG_IMGS.grass,
    sky:"linear-gradient(180deg,#87ceeb 0%,#a8d8ea 30%,#b4e4b4 60%,#90d890 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(34,197,94,0.08) 40%,rgba(34,197,94,0.15))",
    platform1:"rgba(34,197,94,0.25)",platform2:"rgba(34,197,94,0.2)",
    Deco:memo(()=><>
      {/* Drifting leaf particles with glow */}
      {LEAF_R.map((r, i) => (
        <div
          key={`lf${i}`}
          className="scn-leaf"
          style={withVars({
            '--bottom': `${r.bottom}%`,
            '--left': `${r.left}%`,
            '--w': `${r.w}px`,
            '--h': `${r.h}px`,
            '--color': r.color,
            '--glow': `${r.w * 2}px`,
            '--ldx': `${r.ldx}px`,
            '--ldy': `${r.ldy}px`,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      {/* Soft wind streaks */}
      <div className="scn-grass-wind scn-grass-wind-top" />
      <div className="scn-grass-wind scn-grass-wind-mid" />
    </>)
  },

  /* ═══ Fire — ember dot particles + lava glow (emoji removed) ═══ */
  fire:{
    bgImg:BG_IMGS.fire,
    sky:"linear-gradient(180deg,#7c2d12 0%,#c2410c 25%,#ea580c 50%,#92400e 80%,#451a03 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(234,88,12,0.1) 40%,rgba(154,52,18,0.25))",
    platform1:"rgba(234,88,12,0.3)",platform2:"rgba(234,88,12,0.2)",
    Deco:memo(()=><>
      {/* Rising ember dots */}
      {FIRE_EMBER_R.map((r, i) => (
        <div
          key={`e${i}`}
          className="scn-fire-ember"
          style={withVars({
            '--bottom': `${r.bottom}%`,
            '--left': `${r.left}%`,
            '--size': `${r.size}px`,
            '--color': r.color,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      {/* Lava glow pools */}
      <div className="scn-fire-lava scn-fire-lava-left" />
      <div className="scn-fire-lava scn-fire-lava-right" />
      {/* Heat haze overlay */}
      <div className="scn-fire-haze" />
    </>)
  },

  /* ═══ Water — spray droplets + tide sheen ═══ */
  water:{
    bgImg:BG_IMGS.water,
    sky:"linear-gradient(180deg,#0f4c81 0%,#1d6fa5 28%,#38bdf8 62%,#a5f3fc 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(56,189,248,0.12) 45%,rgba(14,116,144,0.22))",
    platform1:"rgba(56,189,248,0.28)",platform2:"rgba(14,116,144,0.2)",
    Deco:memo(()=><>
      {WATER_SPRAY_R.map((r, i) => (
        <div
          key={`ws${i}`}
          className="scn-water-spray"
          style={withVars({
            '--top': `${r.top}%`,
            '--left': `${r.left}%`,
            '--size': `${r.size}px`,
            '--op': `${r.op}`,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      <div className="scn-water-wave scn-water-wave-a" />
      <div className="scn-water-wave scn-water-wave-b" />
      <div className="scn-water-glow" />
    </>)
  },

  /* ═══ Electric — arc sparks + ion glow ═══ */
  electric:{
    bgImg:BG_IMGS.electric,
    sky:"linear-gradient(180deg,#111827 0%,#1e293b 24%,#312e81 54%,#2563eb 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(56,189,248,0.08) 42%,rgba(37,99,235,0.22))",
    platform1:"rgba(59,130,246,0.3)",platform2:"rgba(96,165,250,0.2)",
    Deco:memo(()=><>
      {ELECTRIC_SPARK_R.map((r, i) => (
        <div
          key={`el${i}`}
          className="scn-electric-spark"
          style={withVars({
            '--top': `${r.top}%`,
            '--left': `${r.left}%`,
            '--w': `${r.width}px`,
            '--h': `${r.height}px`,
            '--op': `${r.op}`,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
            '--rot': `${r.rot}deg`,
          })}
        />
      ))}
      <div className="scn-electric-arc scn-electric-arc-a" />
      <div className="scn-electric-arc scn-electric-arc-b" />
      <div className="scn-electric-haze" />
    </>)
  },

  /* ═══ Ghost — firefly glow particles ═══ */
  ghost:{
    bgImg:BG_IMGS.ghost,
    sky:"linear-gradient(180deg,#1e1b4b 0%,#312e81 25%,#3730a3 50%,#1e1b4b 80%,#0f0b2e 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(99,102,241,0.05) 40%,rgba(67,56,202,0.12))",
    platform1:"rgba(99,102,241,0.15)",platform2:"rgba(99,102,241,0.1)",
    Deco:memo(()=><>
      {/* Firefly particles */}
      {FIREFLY_R.map((r, i) => (
        <div
          key={`ff${i}`}
          className="scn-ghost-firefly"
          style={withVars({
            '--top': `${r.top}%`,
            '--left': `${r.left}%`,
            '--size': `${r.w}px`,
            '--color': r.color,
            '--glow': `${r.w * 3}px`,
            '--glow-spread': `${r.w}px`,
            '--fx': `${r.fx}px`,
            '--fy': `${r.fy}px`,
            '--ff-op': `${r.op}`,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      {/* Ambient mist patches */}
      <div className="scn-ghost-mist scn-ghost-mist-left" />
      <div className="scn-ghost-mist scn-ghost-mist-top" />
      {/* Faint moonlight glow */}
      <div className="scn-ghost-moon" />
    </>)
  },

  /* ═══ Poison — toxic swamp bubbles + venom mist ═══ */
  poison:{
    bgImg:BG_IMGS.poison,
    sky:"linear-gradient(180deg,#1a2e1a 0%,#1f3b24 24%,#234f2f 50%,#1b3523 78%,#102014 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(74,222,128,0.08) 40%,rgba(22,101,52,0.2))",
    platform1:"rgba(34,197,94,0.26)",platform2:"rgba(21,128,61,0.18)",
    Deco:memo(()=><>
      {POISON_BUBBLE_R.map((r, i) => (
        <div
          key={`pb${i}`}
          className="scn-poison-bubble"
          style={withVars({
            '--left': `${r.left}%`,
            '--bottom': `${r.bottom}%`,
            '--size': `${r.size}px`,
            '--color': r.hue,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
            '--dx': `${r.driftX}px`,
          })}
        />
      ))}
      {POISON_MIST_R.map((r, i) => (
        <div
          key={`pm${i}`}
          className="scn-poison-mist"
          style={withVars({
            '--left': `${r.left}%`,
            '--bottom': `${r.bottom}%`,
            '--w': `${r.width}px`,
            '--h': `${r.height}px`,
            '--alpha': `${r.alpha}`,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      <div className="scn-poison-haze-main" />
      <div className="scn-poison-haze-top" />
    </>)
  },

  /* ═══ Steel — smoke wisps + industrial lights + faint sparks ═══ */
  steel:{
    bgImg:BG_IMGS.steel,
    sky:"linear-gradient(180deg,#64748b 0%,#94a3b8 20%,#cbd5e1 45%,#94a3b8 70%,#6b7280 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(100,116,139,0.1) 40%,rgba(75,85,99,0.2))",
    platform1:"rgba(100,116,139,0.3)",platform2:"rgba(100,116,139,0.2)",
    Deco:memo(()=><>
      {/* Drifting smoke wisps */}
      {SMOKE_R.map((r, i) => (
        <div
          key={`sm${i}`}
          className="scn-steel-smoke"
          style={withVars({
            '--bottom': `${r.bottom}%`,
            '--left': `${r.left}%`,
            '--w': `${r.w}px`,
            '--h': `${r.h}px`,
            '--blur': `${5 + i}px`,
            '--sm-dx': `${r.dx}px`,
            '--sm-dy': `${r.dy}px`,
            '--sm-s': `${r.sc}`,
            '--sm-op': `${r.op}`,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      {/* Overhead industrial light cones */}
      <div className="scn-steel-cone scn-steel-cone-left" />
      <div className="scn-steel-cone scn-steel-cone-right" />
      {/* Light source dots at ceiling */}
      <div className="scn-steel-lightdot scn-steel-lightdot-left" />
      <div className="scn-steel-lightdot scn-steel-lightdot-right" />
      {/* Sparks */}
      {SPARK_R.map((r, i) => (
        <div
          key={`sp${i}`}
          className="scn-steel-spark"
          style={withVars({
            '--top': `${r.top}%`,
            '--left': `${r.left}%`,
            '--size': `${r.w + 1}px`,
            '--color': r.color,
            '--glow': `${r.w * 3}px`,
            '--glow-spread': `${r.w}px`,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      {/* Structural beam (subtle) */}
      <div className="scn-steel-beam" />
    </>)
  },

  /* ═══ Rock — dust particles + falling pebbles + canyon haze ═══ */
  rock:{
    bgImg:BG_IMGS.rock,
    sky:"linear-gradient(180deg,#d4a574 0%,#c2956a 20%,#b8860b 45%,#a0522d 70%,#6b3a2a 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(139,90,43,0.1) 40%,rgba(101,67,33,0.22))",
    platform1:"rgba(139,90,43,0.3)",platform2:"rgba(139,90,43,0.22)",
    Deco:memo(()=><>
      {/* Dust particles drifting */}
      {ROCK_DUST_R.map((r, i) => (
        <div
          key={`dust${i}`}
          className="scn-rock-dust"
          style={withVars({
            '--top': `${r.top}%`,
            '--left': `${r.left}%`,
            '--size': `${r.size}px`,
            '--color': r.color,
            '--op': `${r.op}`,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      {/* Falling pebbles */}
      {ROCK_PEBBLE_R.map((r, i) => (
        <div
          key={`peb${i}`}
          className="scn-rock-pebble"
          style={withVars({
            '--top': `${r.top}%`,
            '--left': `${r.left}%`,
            '--size': `${r.size}px`,
            '--color': r.color,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      {/* Canyon haze */}
      <div className="scn-rock-haze scn-rock-haze-left" />
      <div className="scn-rock-haze scn-rock-haze-right" />
      {/* Heat shimmer */}
      <div className="scn-rock-shimmer" />
    </>)
  },

  /* ═══ Heaven — sacred glints + gentle aurora ═══ */
  heaven:{
    bgImg:BG_IMGS.heaven,
    sky:"linear-gradient(180deg,#e0f2fe 0%,#dbeafe 28%,#ede9fe 60%,#f8fafc 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(255,255,255,0.24) 40%,rgba(148,163,184,0.18))",
    platform1:"rgba(226,232,240,0.38)",platform2:"rgba(191,219,254,0.24)",
    Deco:memo(()=><>
      {HEAVEN_GLINT_R.map((r, i) => (
        <div
          key={`hv${i}`}
          className="scn-heaven-glint"
          style={withVars({
            '--top': `${r.top}%`,
            '--left': `${r.left}%`,
            '--size': `${r.size}px`,
            '--color': r.color,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      <div className="scn-heaven-aurora" />
      <div className="scn-heaven-haze-left" />
      <div className="scn-heaven-haze-right" />
    </>)
  },
  light:{
    bgImg:BG_IMGS.heaven,
    sky:"linear-gradient(180deg,#e0f2fe 0%,#dbeafe 28%,#ede9fe 60%,#f8fafc 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(255,255,255,0.24) 40%,rgba(148,163,184,0.18))",
    platform1:"rgba(226,232,240,0.38)",platform2:"rgba(191,219,254,0.24)",
    Deco:memo(()=><>
      {HEAVEN_GLINT_R.map((r, i) => (
        <div
          key={`lt${i}`}
          className="scn-heaven-glint"
          style={withVars({
            '--top': `${r.top}%`,
            '--left': `${r.left}%`,
            '--size': `${r.size}px`,
            '--color': r.color,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      <div className="scn-heaven-aurora" />
      <div className="scn-heaven-haze-left" />
      <div className="scn-heaven-haze-right" />
    </>)
  },

  /* ═══ Dark — white sparkle dots + purple glows (already clean) ═══ */
  dark:{
    bgImg:BG_IMGS.dark,
    sky:"linear-gradient(180deg,#030712 0%,#0a0415 20%,#1a0a2e 45%,#0f0520 70%,#030712 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(88,28,135,0.06) 40%,rgba(30,10,60,0.2))",
    platform1:"rgba(88,28,135,0.2)",platform2:"rgba(88,28,135,0.15)",
    Deco:memo(()=><>
      {DARK_R.map((r, i) => (
        <div
          key={`d${i}`}
          className="scn-dark-spark"
          style={withVars({
            '--top': `${r.t}%`,
            '--left': `${r.l}%`,
            '--w': `${r.w}px`,
            '--h': `${r.h}px`,
            '--op': `${r.op}`,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      <div className="scn-dark-glow-main" />
      <div className="scn-dark-glow-sub" />
      {DARK_BAND_R.map((r, i) => (
        <div
          key={`p${i}`}
          className="scn-dark-band"
          style={withVars({
            '--bottom': `${r.bottom}%`,
            '--left': `${r.left}%`,
            '--w': `${r.width}px`,
            '--alpha': `${r.alpha}`,
          })}
        />
      ))}
    </>)
  },

  /* ═══ Burnt Warplace — scorched battlefield with lightning + lava cracks ═══ */
  burnt_warplace:{
    bgImg:BG_IMGS.burnt_warplace,
    sky:"linear-gradient(180deg,#3b0a0a 0%,#7c1d1d 20%,#991b1b 40%,#7f1d1d 65%,#450a0a 100%)",
    ground:"linear-gradient(180deg,transparent,rgba(234,88,12,0.08) 40%,rgba(127,29,29,0.2))",
    platform1:"rgba(220,38,38,0.25)",platform2:"rgba(154,52,18,0.2)",
    Deco:memo(()=><>
      {/* Rising embers from lava cracks */}
      {BURNT_EMBER_R.map((r, i) => (
        <div
          key={`be${i}`}
          className="scn-burnt-ember"
          style={withVars({
            '--bottom': `${r.bottom}%`,
            '--left': `${r.left}%`,
            '--size': `${r.size}px`,
            '--color': r.color,
            '--glow': `${r.glow}px`,
            '--dur': `${r.dur}s`,
            '--del': `${r.del}s`,
          })}
        />
      ))}
      {/* Lightning flash overlay */}
      <div className="scn-burnt-lightning" />
      {/* Lava glow pools */}
      <div className="scn-burnt-lava scn-burnt-lava-left" />
      <div className="scn-burnt-lava scn-burnt-lava-right" />
      <div className="scn-burnt-lava scn-burnt-lava-mid" />
      {/* Dark ash haze */}
      <div className="scn-burnt-haze" />
      {/* Red sky throb */}
      <div className="scn-burnt-throb" />
    </>)
  }
};

export const SCENE_NAMES = {
  grass:"🌿 綠意草原",
  fire:"🌋 炎熱火山",
  water:"💧 湛藍海岸",
  electric:"⚡ 雷電荒原",
  ghost:"🌙 幽暗墓地",
  steel:"⚙️ 鋼鐵要塞",
  light:"☁️ 天界聖域",
  dark:"💀 暗黑深淵",
  poison:"☠️ 毒沼禁域",
  rock:"🪨 岩石峽谷",
  heaven:"☁️ 天界聖域",
  burnt_warplace:"🔥 焦土戰場"
};
