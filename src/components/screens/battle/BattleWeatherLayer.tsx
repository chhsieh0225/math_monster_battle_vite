import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { seedRange } from '../../../utils/prng.ts';

export type BattleWeatherType = 'none' | 'rain' | 'storm' | 'snow' | 'fog' | 'dust';

type BattleWeatherLayerProps = {
  sceneType: string;
  seed: string;
  enabled: boolean;
};

type WeatherCssVars = CSSProperties & Record<`--${string}`, string | number>;

const WEATHER_BY_SCENE: Record<string, BattleWeatherType> = {
  grass: 'rain',
  water: 'rain',
  steel: 'rain',
  electric: 'storm',
  dark: 'storm',
  poison: 'fog',
  ghost: 'fog',
  heaven: 'snow',
  light: 'snow',
  rock: 'dust',
  fire: 'dust',
  burnt_warplace: 'storm',
};

function resolveWeather(sceneType: string): BattleWeatherType {
  return WEATHER_BY_SCENE[sceneType] || 'rain';
}

type RainDropVm = {
  key: string;
  style: WeatherCssVars;
};

type SnowFlakeVm = {
  key: string;
  style: WeatherCssVars;
};

type FogBandVm = {
  key: string;
  style: WeatherCssVars;
};

type DustVm = {
  key: string;
  style: WeatherCssVars;
};

function buildRain(seed: string, dense: boolean): RainDropVm[] {
  const count = dense ? 55 : 40;
  return Array.from({ length: count }, (_, i) => {
    const x = seedRange(`weather-rain-x-${seed}-${i}`, 1, 98);
    const h = seedRange(`weather-rain-h-${seed}-${i}`, 18, dense ? 34 : 28);
    const duration = seedRange(`weather-rain-d-${seed}-${i}`, dense ? 0.38 : 0.45, dense ? 0.72 : 0.88);
    const delay = seedRange(`weather-rain-delay-${seed}-${i}`, 0, 1.4);
    const opacity = seedRange(`weather-rain-op-${seed}-${i}`, dense ? 0.5 : 0.4, dense ? 0.88 : 0.78);
    return {
      key: `rain-${i}`,
      style: {
        '--wx': `${x}%`,
        '--wh': `${h}px`,
        '--wd': `${duration.toFixed(3)}s`,
        '--wdelay': `${delay.toFixed(3)}s`,
        '--wop': opacity.toFixed(3),
      },
    };
  });
}

function buildSnow(seed: string): SnowFlakeVm[] {
  const count = 36;
  return Array.from({ length: count }, (_, i) => {
    const x = seedRange(`weather-snow-x-${seed}-${i}`, 2, 98);
    const size = seedRange(`weather-snow-s-${seed}-${i}`, 3, 9);
    const sway = seedRange(`weather-snow-sway-${seed}-${i}`, 8, 24);
    const duration = seedRange(`weather-snow-d-${seed}-${i}`, 3.2, 6.2);
    const delay = seedRange(`weather-snow-delay-${seed}-${i}`, 0, 2.4);
    const opacity = seedRange(`weather-snow-op-${seed}-${i}`, 0.5, 0.92);
    return {
      key: `snow-${i}`,
      style: {
        '--wx': `${x}%`,
        '--ws': `${size.toFixed(2)}px`,
        '--wsway': `${sway.toFixed(2)}px`,
        '--wd': `${duration.toFixed(3)}s`,
        '--wdelay': `${delay.toFixed(3)}s`,
        '--wop': opacity.toFixed(3),
      },
    };
  });
}

function buildFog(seed: string): FogBandVm[] {
  return Array.from({ length: 5 }, (_, i) => {
    const top = seedRange(`weather-fog-top-${seed}-${i}`, 6 + i * 10, 22 + i * 12);
    const left = seedRange(`weather-fog-left-${seed}-${i}`, -26, 72);
    const width = seedRange(`weather-fog-w-${seed}-${i}`, 42, 72);
    const height = seedRange(`weather-fog-h-${seed}-${i}`, 14, 28);
    const opacity = seedRange(`weather-fog-op-${seed}-${i}`, 0.22, 0.42);
    const duration = seedRange(`weather-fog-d-${seed}-${i}`, 8, 15);
    const delay = seedRange(`weather-fog-delay-${seed}-${i}`, 0, 2.4);
    return {
      key: `fog-${i}`,
      style: {
        '--wtop': `${top.toFixed(2)}%`,
        '--wleft': `${left.toFixed(2)}%`,
        '--ww': `${width.toFixed(2)}%`,
        '--wh': `${height.toFixed(2)}%`,
        '--wop': opacity.toFixed(3),
        '--wd': `${duration.toFixed(3)}s`,
        '--wdelay': `${delay.toFixed(3)}s`,
      },
    };
  });
}

function buildDust(seed: string): DustVm[] {
  const count = 32;
  return Array.from({ length: count }, (_, i) => {
    const top = seedRange(`weather-dust-top-${seed}-${i}`, 10, 85);
    const size = seedRange(`weather-dust-s-${seed}-${i}`, 2.4, 6.5);
    const duration = seedRange(`weather-dust-d-${seed}-${i}`, 3.2, 6);
    const delay = seedRange(`weather-dust-delay-${seed}-${i}`, 0, 2.6);
    const driftY = seedRange(`weather-dust-y-${seed}-${i}`, -12, 12);
    const opacity = seedRange(`weather-dust-op-${seed}-${i}`, 0.35, 0.68);
    return {
      key: `dust-${i}`,
      style: {
        '--wtop': `${top.toFixed(2)}%`,
        '--ws': `${size.toFixed(2)}px`,
        '--wd': `${duration.toFixed(3)}s`,
        '--wdelay': `${delay.toFixed(3)}s`,
        '--wdy': `${driftY.toFixed(2)}px`,
        '--wop': opacity.toFixed(3),
      },
    };
  });
}

export const BattleWeatherLayer = memo(function BattleWeatherLayer({
  sceneType,
  seed,
  enabled,
}: BattleWeatherLayerProps) {
  const weather = resolveWeather(sceneType);
  const weatherActive = enabled && weather !== 'none';

  const rainDrops = useMemo(
    () => (!weatherActive || (weather !== 'rain' && weather !== 'storm') ? [] : buildRain(seed, weather === 'storm')),
    [weatherActive, weather, seed],
  );
  const snowFlakes = useMemo(() => (!weatherActive || weather !== 'snow' ? [] : buildSnow(seed)), [weatherActive, weather, seed]);
  const fogBands = useMemo(
    () => (!weatherActive || (weather !== 'fog' && weather !== 'storm') ? [] : buildFog(seed)),
    [weatherActive, weather, seed],
  );
  const dustParticles = useMemo(() => (!weatherActive || weather !== 'dust' ? [] : buildDust(seed)), [weatherActive, weather, seed]);
  const lightningDelay1 = useMemo(() => seedRange(`weather-storm-lightning-a-${seed}`, 3.2, 6.8), [seed]);
  const lightningDelay2 = useMemo(() => seedRange(`weather-storm-lightning-b-${seed}`, 6.4, 11.8), [seed]);
  const lightningStyle1: WeatherCssVars = { '--wdelay': `${lightningDelay1.toFixed(3)}s` };
  const lightningStyle2: WeatherCssVars = { '--wdelay': `${lightningDelay2.toFixed(3)}s` };

  if (!weatherActive) return null;

  return (
    <div className={`battle-weather-layer weather-${weather}`} aria-hidden="true">
      {(weather === 'rain' || weather === 'storm') && rainDrops.map((drop) => (
        <div key={drop.key} className="battle-weather-rain-drop" style={drop.style} />
      ))}

      {weather === 'snow' && snowFlakes.map((flake) => (
        <div key={flake.key} className="battle-weather-snow-flake" style={flake.style} />
      ))}

      {(weather === 'fog' || weather === 'storm') && fogBands.map((fog) => (
        <div key={fog.key} className="battle-weather-fog-band" style={fog.style} />
      ))}

      {weather === 'dust' && (
        <>
          <div className="battle-weather-dust-haze" />
          {dustParticles.map((dust) => (
            <div key={dust.key} className="battle-weather-dust-dot" style={dust.style} />
          ))}
        </>
      )}

      {weather === 'storm' && (
        <>
          <div className="battle-weather-lightning" style={lightningStyle1} />
          <div className="battle-weather-lightning battle-weather-lightning-secondary" style={lightningStyle2} />
        </>
      )}
    </div>
  );
});
