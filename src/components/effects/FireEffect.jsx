import { seedRange } from '../../utils/prng';

const FLAME = "M10,28 C10,28 2,18 2,12 C2,5 5.5,0 10,0 C14.5,0 18,5 18,12 C18,18 10,28 10,28Z";

const DEF_TARGET = { top: "calc(26% + 60px)", right: "calc(10% + 60px)", flyRight: 25, flyTop: 37 };

export default function FireEffect({ idx = 0, lvl = 1, target = DEF_TARGET }) {
  const fxLvl = Math.max(1, Math.min(12, lvl));
  const dur = 680 + idx * 120 + fxLvl * 24;
  const glow = 5 + fxLvl * 1.8;
  const T = target;
  const rr = (slot, i, min, max) => seedRange(`fire-${idx}-${fxLvl}-${slot}-${i}`, min, max);
  const uid = `${idx}-${fxLvl}-${Math.round((T.flyRight || 0) * 10)}-${Math.round((T.flyTop || 0) * 10)}`;

  if (idx === 0) {
    const n = 1 + Math.floor(fxLvl / 2);
    const sz = 32 + fxLvl * 4;
    const impactSparkN = 2 + Math.floor(fxLvl / 2);
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 80 }}>
        <div
          style={{
            position: "absolute",
            left: "11%",
            bottom: "34%",
            width: `${52 + fxLvl * 3}px`,
            height: `${52 + fxLvl * 3}px`,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(254,240,138,0.5), rgba(249,115,22,0.2) 45%, transparent 75%)",
            opacity: 0,
            animation: `fireExpand ${0.22 + fxLvl * 0.014}s ease-out both`,
          }}
        />

        {Array.from({ length: n }, (_, i) => {
          const startLeft = 10 + i * 5 + rr("fb-left", i, -1.4, 2.8);
          const startBottom = 36 + i * 4 + rr("fb-bottom", i, -1.8, 2.2);
          const launchDelay = 0.06 + i * 0.045 + rr("fb-delay", i, 0, 0.07);
          const launchDur = dur / 1000 * 0.52 + rr("fb-dur", i, 0, 0.18);
          const turn = rr("fb-rot", i, -16, 16);
          const gradId = `fb-${uid}-${i}`;
          return (
            <svg
              key={i}
              width={sz}
              height={sz + 6}
              viewBox="0 0 20 30"
              style={{
                position: "absolute",
                left: `${startLeft}%`,
                bottom: `${startBottom}%`,
                "--fly-x": `${100 - T.flyRight - startLeft}vw`,
                "--fly-y": `${T.flyTop - (100 - startBottom)}vh`,
                filter: `drop-shadow(0 0 ${glow}px #fbbf24) drop-shadow(0 0 ${glow + 5}px #ea580c)`,
                animation: `flameFly ${launchDur}s cubic-bezier(.18,.78,.24,1) ${launchDelay}s forwards`,
                opacity: 0,
                transform: `rotate(${turn}deg)`,
              }}
            >
              <defs>
                <radialGradient id={gradId} cx="50%" cy="38%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="42%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#ea580c" />
                </radialGradient>
              </defs>
              <path d={FLAME} fill={`url(#${gradId})`} />
            </svg>
          );
        })}

        {Array.from({ length: 2 + fxLvl }, (_, i) => (
          <svg
            key={`trail-${i}`}
            width="14"
            height="14"
            viewBox="0 0 14 14"
            style={{
              position: "absolute",
              left: `${14 + i * 6 + rr("trail-left", i, -1.5, 2.2)}%`,
              bottom: `${38 - i * 2 + rr("trail-bottom", i, -2.2, 1.6)}%`,
              opacity: 0,
              filter: "drop-shadow(0 0 3px #fbbf24)",
              animation: `sparkle ${0.42 + rr("trail-dur", i, 0, 0.16)}s ease ${0.05 + i * 0.055 + rr("trail-delay", i, 0, 0.04)}s both`,
            }}
          >
            <circle cx="7" cy="7" r={2.2 + fxLvl * 0.35} fill="#fbbf24" opacity="0.68" />
          </svg>
        ))}

        {Array.from({ length: impactSparkN }, (_, i) => (
          <svg
            key={`impact-${i}`}
            width="18"
            height="18"
            viewBox="0 0 18 18"
            style={{
              position: "absolute",
              right: `calc(${T.right} + ${rr("impact-r", i, -18, 18)}px)`,
              top: `calc(${T.top} + ${rr("impact-t", i, -14, 16)}px)`,
              opacity: 0,
              animation: `sparkle ${0.35 + rr("impact-dur", i, 0, 0.2)}s ease ${0.23 + i * 0.045}s both`,
              filter: "drop-shadow(0 0 6px #fb923c)",
            }}
          >
            <circle cx="9" cy="9" r={2.4 + rr("impact-size", i, 0, 1.8)} fill={i % 2 === 0 ? "#fbbf24" : "#fb923c"} opacity="0.75" />
          </svg>
        ))}
      </div>
    );
  }

  if (idx === 1) {
    const n = Math.min(9, 2 + fxLvl);
    const sz = 28 + fxLvl * 3;
    const pulseN = 2 + Math.floor(fxLvl / 3);
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 80 }}>
        {Array.from({ length: n }, (_, i) => {
          const wave = i % 3;
          const rank = Math.floor(i / 3);
          const startLeft = 6 + i * 4 + rr("rush-left", i, -2, 2.4);
          const startBottom = 34 + i * 2.6 + rr("rush-bottom", i, -2, 1.8);
          const delay = 0.04 + wave * 0.08 + rank * 0.055 + rr("rush-delay", i, 0, 0.03);
          const runDur = dur / 1000 * 0.45 + wave * 0.07 + rr("rush-dur", i, 0, 0.14);
          const turn = rr("rush-rot", i, -20, 20);
          const gradId = `fr-${uid}-${i}`;
          return (
            <svg
              key={i}
              width={sz}
              height={sz + 6}
              viewBox="0 0 20 30"
              style={{
                position: "absolute",
                left: `${startLeft}%`,
                bottom: `${startBottom}%`,
                "--fly-x": `${100 - T.flyRight - startLeft}vw`,
                "--fly-y": `${T.flyTop - (100 - startBottom)}vh`,
                filter: `drop-shadow(0 0 ${glow}px #fbbf24) drop-shadow(0 0 ${glow + 3}px #ea580c)`,
                animation: `flameFly ${runDur}s cubic-bezier(.15,.86,.26,1) ${delay}s forwards`,
                opacity: 0,
                transform: `rotate(${turn}deg)`,
              }}
            >
              <defs>
                <radialGradient id={gradId} cx="50%" cy="38%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="52%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#dc2626" />
                </radialGradient>
              </defs>
              <path d={FLAME} fill={`url(#${gradId})`} />
            </svg>
          );
        })}

        {Array.from({ length: 3 + fxLvl }, (_, i) => (
          <svg
            key={`ghost-${i}`}
            width="18"
            height="22"
            viewBox="0 0 20 30"
            style={{
              position: "absolute",
              left: `${10 + i * 4.6 + rr("ghost-left", i, -1.8, 1.8)}%`,
              bottom: `${38 - i * 2.2 + rr("ghost-bottom", i, -2.2, 1.6)}%`,
              opacity: 0,
              filter: "drop-shadow(0 0 3px #f97316)",
              animation: `sparkle ${0.38 + rr("ghost-dur", i, 0, 0.12)}s ease ${0.03 + i * 0.03 + rr("ghost-delay", i, 0, 0.03)}s both`,
            }}
          >
            <path d={FLAME} fill="#f97316" opacity="0.32" transform="scale(0.55)" />
          </svg>
        ))}

        {Array.from({ length: pulseN }, (_, i) => (
          <div
            key={`rush-pulse-${i}`}
            style={{
              position: "absolute",
              right: `calc(${T.right} - ${18 + i * 12}px)`,
              top: `calc(${T.top} - ${14 + i * 4}px)`,
              width: `${120 + fxLvl * 10}px`,
              height: `${8 + rr("rush-h", i, 0, 4)}px`,
              borderRadius: 999,
              background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(251,146,60,0.68), rgba(239,68,68,0.48), rgba(255,255,255,0))",
              opacity: 0,
              filter: `blur(${0.5 + rr("rush-blur", i, 0, 0.8)}px)`,
              animation: `windSweep ${0.52 + rr("rush-wave-dur", i, 0, 0.18)}s ease ${0.19 + i * 0.06}s forwards`,
            }}
          />
        ))}
      </div>
    );
  }

  if (idx === 2) {
    const rayN = 8 + Math.floor(fxLvl * 1.2);
    const coreR = 22 + fxLvl * 4;
    const expCoreId = `exp-core-${uid}`;
    const expFilterId = `exp-filter-${uid}`;
    const expSeed = Math.max(1, Math.floor(rr("exp-seed", 0, 2, 80)));
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 80 }}>
        <div
          style={{
            position: "absolute",
            right: T.right,
            top: T.top,
            transform: "translate(50%,-30%)",
            width: `${84 + fxLvl * 5}px`,
            height: `${84 + fxLvl * 5}px`,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(254,240,138,0.26), rgba(251,146,60,0.16) 48%, transparent 74%)",
            opacity: 0,
            animation: `fireExpand ${0.3 + fxLvl * 0.02}s ease-out both`,
          }}
        />

        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          style={{
            position: "absolute",
            right: T.right,
            top: T.top,
            transform: "translate(50%,-30%)",
            filter: `drop-shadow(0 0 ${glow + 7}px #ea580c) drop-shadow(0 0 ${glow + 12}px #fbbf24)`,
          }}
        >
          <defs>
            <radialGradient id={expCoreId} cx="50%" cy="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.94" />
              <stop offset="35%" stopColor="#fbbf24" stopOpacity="0.74" />
              <stop offset="65%" stopColor="#ea580c" stopOpacity="0.48" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>
            <filter id={expFilterId} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" seed={expSeed} result="noise">
                <animate attributeName="baseFrequency" values="0.82;0.48;0.2" dur={`${dur / 1000 * 0.9}s`} fill="freeze" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="warp">
                <animate attributeName="scale" values={`0;${7 + fxLvl * 1.6};${2 + fxLvl * 0.6}`} dur={`${dur / 1000 * 0.9}s`} fill="freeze" />
              </feDisplacementMap>
              <feGaussianBlur in="warp" stdDeviation="0" result="soft">
                <animate attributeName="stdDeviation" values="0;0.55;0.24" dur={`${dur / 1000 * 0.9}s`} fill="freeze" />
              </feGaussianBlur>
              <feColorMatrix in="soft" type="matrix" values="1.05 0 0 0 0 0 0.92 0 0 0 0 0 0.8 0 0 0 0 0 1 0" />
            </filter>
          </defs>
          <circle
            cx="90"
            cy="90"
            r={coreR}
            fill={`url(#${expCoreId})`}
            filter={`url(#${expFilterId})`}
            style={{ animation: `fireExpand ${dur / 1000}s cubic-bezier(.16,.8,.2,1) forwards` }}
          />
        </svg>

        {Array.from({ length: rayN }, (_, i) => {
          const angle = i / rayN * 360;
          const len = 24 + fxLvl * 6 + rr("ray-len", i, 0, 14);
          const w = 4 + fxLvl * 0.45;
          const rayDelay = 0.06 + rr("ray-delay", i, 0, 0.14) + (i % 3) * 0.03;
          const rayDur = 0.33 + rr("ray-dur", i, 0, 0.28);
          const rayId = `ray-${uid}-${i}`;
          return (
            <svg
              key={i}
              width={w + 4}
              height={len}
              viewBox={`0 0 ${w + 4} ${len}`}
              style={{
                position: "absolute",
                right: `calc(${T.right} + ${Math.cos(angle * Math.PI / 180) * 6}px)`,
                top: `calc(${T.top} + ${Math.sin(angle * Math.PI / 180) * 6}px)`,
                transformOrigin: "center bottom",
                transform: `rotate(${angle}deg)`,
                opacity: 0,
                filter: `drop-shadow(0 0 ${glow}px #fbbf24)`,
                animation: `sparkle ${rayDur}s ease ${rayDelay}s both`,
              }}
            >
              <defs>
                <linearGradient id={rayId} x1="50%" y1="100%" x2="50%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect x="1" y="0" width={w} height={len} rx={w / 2} fill={`url(#${rayId})`} />
            </svg>
          );
        })}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(251,191,36,${0.14 + fxLvl * 0.02}), rgba(249,115,22,${0.1 + fxLvl * 0.015}) 33%, transparent 58%)`,
            animation: `darkScreenFlash ${dur / 1000}s ease`,
          }}
        />
      </div>
    );
  }

  const D = 0.3;
  const meteorN = Math.min(10, 3 + fxLvl);
  const shockN = Math.min(6, 2 + Math.floor(fxLvl / 2));
  const emberN = Math.min(16, 7 + fxLvl * 2);
  const ashN = Math.min(10, 4 + fxLvl);
  const darkImpactId = `dark-impact-${uid}`;
  const darkImpactFilterId = `dark-impact-filter-${uid}`;
  const darkSeed = Math.max(1, Math.floor(rr("dark-seed", 0, 3, 90)));

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 80 }}>
      {Array.from({ length: meteorN }, (_, i) => {
        const startLeft = 10 + i * 7 + rr("meteor-left", i, -3, 4);
        const startTop = 7 + rr("meteor-top", i, -2, 8);
        const meteorScale = 0.86 + rr("meteor-scale", i, 0, 0.42);
        const wave = i % 3;
        const lane = Math.floor(i / 3);
        const delay = wave * 0.085 + lane * 0.052 + rr("meteor-delay", i, 0, 0.035);
        return (
          <svg
            key={`m${i}`}
            width="34"
            height="42"
            viewBox="0 0 20 30"
            style={{
              position: "absolute",
              left: `${startLeft}%`,
              top: `${startTop}%`,
              "--fly-x": `${100 - T.flyRight - startLeft}vw`,
              "--fly-y": `${T.flyTop - startTop}vh`,
              opacity: 0,
              transform: `scale(${meteorScale}) rotate(${rr("meteor-rot", i, -22, 22)}deg)`,
              filter: `drop-shadow(0 0 ${glow + 3}px #fbbf24) drop-shadow(0 0 ${glow + 9}px #ea580c)`,
              animation: `flameFly ${0.56 + fxLvl * 0.045 + rr("meteor-dur", i, 0, 0.16)}s cubic-bezier(.18,.82,.34,1) ${delay}s forwards`,
            }}
          >
            <defs>
              <radialGradient id={`fmtr-${uid}-${i}`} cx="45%" cy="30%">
                <stop offset="0%" stopColor="#f5d0fe" />
                <stop offset="25%" stopColor="#9d8ec3" />
                <stop offset="58%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#991b1b" />
              </radialGradient>
            </defs>
            <path d={FLAME} fill={`url(#fmtr-${uid}-${i})`} />
          </svg>
        );
      })}

      <svg
        width="190"
        height="190"
        viewBox="0 0 190 190"
        style={{
          position: "absolute",
          right: T.right,
          top: T.top,
          transform: "translate(50%,-30%)",
          filter: `drop-shadow(0 0 ${glow + 7}px rgba(141,125,180,0.5)) drop-shadow(0 0 ${glow + 15}px #ea580c)`,
        }}
      >
        <defs>
          <radialGradient id={darkImpactId} cx="50%" cy="50%">
            <stop offset="0%" stopColor="#f5d0fe" stopOpacity="0.95" />
            <stop offset="22%" stopColor="#9d8ec3" stopOpacity="0.64" />
            <stop offset="48%" stopColor="#f97316" stopOpacity="0.76" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
          </radialGradient>
          <filter id={darkImpactFilterId} x="-70%" y="-70%" width="240%" height="240%" colorInterpolationFilters="sRGB">
            <feTurbulence type="turbulence" baseFrequency="0.75" numOctaves="3" seed={darkSeed} result="noise">
              <animate attributeName="baseFrequency" values="0.75;0.42;0.14" dur={`${dur / 1000}s`} fill="freeze" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="B" result="warp">
              <animate attributeName="scale" values={`0;${10 + fxLvl * 1.7};${2 + fxLvl * 0.45}`} dur={`${dur / 1000}s`} fill="freeze" />
            </feDisplacementMap>
            <feGaussianBlur in="warp" stdDeviation="0" result="soft">
              <animate attributeName="stdDeviation" values="0;0.68;0.25" dur={`${dur / 1000}s`} fill="freeze" />
            </feGaussianBlur>
            <feColorMatrix in="soft" type="matrix" values="1.1 0 0 0 0 0 0.88 0 0 0 0 0 1.25 0 0 0 0 0 1 0" />
          </filter>
        </defs>
        <circle
          cx="95"
          cy="95"
          r={26 + fxLvl * 4}
          fill={`url(#${darkImpactId})`}
          filter={`url(#${darkImpactFilterId})`}
          style={{ animation: `fireExpand ${dur / 1000}s ease ${D}s forwards` }}
        />
      </svg>

      {Array.from({ length: shockN }, (_, i) => (
        <svg
          key={`h${i}`}
          width="220"
          height="120"
          viewBox="0 0 220 120"
          style={{
            position: "absolute",
            right: `calc(${T.right} - 28px)`,
            top: `calc(${T.top} - 22px)`,
            opacity: 0,
            filter: `drop-shadow(0 0 ${glow + 2}px rgba(141,125,180,0.28))`,
            animation: `fireExpand ${0.6 + i * 0.1 + rr("shock-dur", i, 0, 0.08)}s ease ${D + 0.07 + i * 0.095}s forwards`,
          }}
        >
          <ellipse
            cx="110"
            cy="60"
            rx={62 + i * 24}
            ry={18 + i * 6}
            fill="none"
            stroke={i % 2 === 0 ? "rgba(141,125,180,0.46)" : "rgba(251,113,133,0.5)"}
            strokeWidth={4 - i * 0.65}
          />
        </svg>
      ))}

      {Array.from({ length: 2 + fxLvl }, (_, i) => (
        <div
          key={`w${i}`}
          style={{
            position: "absolute",
            right: `calc(${T.right} - ${30 + i * 8}px)`,
            top: `calc(${T.top} + ${rr("wind-top", i, -9, 13)}px)`,
            width: `${120 + fxLvl * 16}px`,
            height: `${7 + rr("wind-h", i, 0, 4)}px`,
            borderRadius: 999,
            background: "linear-gradient(90deg,rgba(255,255,255,0),rgba(141,125,180,0.4),rgba(251,146,60,0.76),rgba(127,29,29,0.48),rgba(255,255,255,0))",
            opacity: 0,
            filter: `blur(${0.4 + rr("wind-blur", i, 0, 0.7)}px)`,
            animation: `windSweep ${0.5 + rr("wind-anim", i, 0, 0.24)}s ease ${D + 0.1 + i * 0.038}s forwards`,
          }}
        />
      ))}

      {Array.from({ length: emberN }, (_, i) => {
        const angle = i / emberN * 360;
        const dist = 35 + rr("ember-dist", i, 0, 55);
        return (
          <svg
            key={`e${i}`}
            width="28"
            height="34"
            viewBox="0 0 20 30"
            style={{
              position: "absolute",
              right: T.right,
              top: T.top,
              opacity: 0,
              filter: `drop-shadow(0 0 ${glow}px #fbbf24)`,
              "--lx": `${Math.cos(angle * Math.PI / 180) * dist}px`,
              "--ly": `${Math.sin(angle * Math.PI / 180) * dist}px`,
              animation: `leafSpin ${0.46 + rr("ember-anim", i, 0, 0.34)}s ease ${D + 0.12 + i * 0.03}s forwards`,
            }}
          >
            <path d={FLAME} fill={i % 4 === 0 ? "#b7a3d2" : i % 4 === 1 ? "#fbbf24" : i % 4 === 2 ? "#fb923c" : "#ef4444"} opacity="0.74" />
          </svg>
        );
      })}

      {Array.from({ length: ashN }, (_, i) => (
        <div
          key={`a${i}`}
          style={{
            position: "absolute",
            right: `calc(${T.right} + ${rr("ash-r", i, -10, 10)}px)`,
            top: `calc(${T.top} + ${rr("ash-t", i, -8, 8)}px)`,
            width: `${22 + rr("ash-sz", i, 0, 16)}px`,
            height: `${12 + rr("ash-sz2", i, 0, 10)}px`,
            borderRadius: "50%",
            background: "radial-gradient(ellipse,rgba(96,84,128,0.34),rgba(30,27,75,0.14),transparent 72%)",
            opacity: 0,
            "--lx": `${rr("ash-lx", i, -45, 45)}px`,
            "--ly": `${rr("ash-ly", i, -60, 20)}px`,
            animation: `leafSpin ${0.78 + rr("ash-anim", i, 0, 0.46)}s ease ${D + 0.06 + i * 0.046}s forwards`,
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at calc(100% - ${T.right}) ${T.top}, rgba(141,125,180,${0.07 + fxLvl * 0.018}), rgba(249,115,22,${0.08 + fxLvl * 0.02}) 32%, rgba(127,29,29,${0.05 + fxLvl * 0.015}) 52%, transparent 74%)`,
          animation: `ultGlow ${dur / 1000 * 1.15}s ease ${D}s`,
        }}
      />
    </div>
  );
}
