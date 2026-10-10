import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';

import MonsterPortrait from '../ui/MonsterPortrait';
import { getSpriteProfileKey } from '../../data/sprites.ts';
import { useI18n } from '../../i18n';
import { SCENE_NAMES } from '../../data/scenes';
import { MONSTER_CONFIGS } from '../../data/monsterConfigs.ts';
import { getMonsterSprite } from '../../data/monsters.ts';
import {
  EXPEDITIONS,
  EXPEDITION_FLOORS,
  REGION_IDS,
  WORLD_MAP_ART,
  WORLD_REGIONS,
  getExpedition,
  type ExpeditionId,
  type RegionId,
} from '../../data/worldMap.ts';
import { isEnglishLocale, localizeSceneName } from '../../utils/contentLocalization.ts';
import { isSpringOption, nextExpeditionFloor, type ExpeditionRun } from '../../utils/expeditionRun.ts';
import { isRegionDiscovered, isSecretFound, type WorldProgress } from '../../utils/worldProgress.ts';
import { SECRET_REVEAL_ZOOM, WORLD_SECRETS, findSecretNear, getSecret, type SecretId } from '../../data/worldSecrets.ts';
import { ITEM_CATALOG } from '../../data/itemCatalog.ts';
import type { Grade } from '../../data/gradeCurriculum.ts';
import type { ItemId } from '../../types/game';
import { createSecretQuestion } from '../../utils/secretLock.ts';
import type { GeneratedQuestion } from '../../utils/questionGenerator.ts';
import { needsEqualPrompt, renderMathText } from '../ui/MathText';
import { useMapZoom } from './useMapZoom.ts';
import { useMapTiles } from './useMapTiles.ts';
import type { StarterVm } from '../../types/battle';
import {
  buildExpeditionCards,
  defaultExpeditionId,
  formatMultiplier,
  routeChoices,
  traveledRegions,
  type RouteChoiceVm,
} from './worldMapModel.ts';
import './WorldMapScreen.css';

const BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
const MAP_SRC = `${BASE_URL}${WORLD_MAP_ART.src}`;
const BOSS_REGIONS = new Set<RegionId>(EXPEDITIONS.map((expedition) => expedition.region));

type WorldMapScreenProps = {
  progress: WorldProgress;
  run: ExpeditionRun | null;
  starter: StarterVm | null;
  stageIdx: number;
  pHp: number;
  maxHp: number;
  pLvl: number;
  onStartExpedition: (id: ExpeditionId) => void;
  onChooseRoute: (lane: number) => void;
  onBack: () => void;
  onPause: () => void;
  grade?: Grade | null;
  onDiscoverSecret?: (id: SecretId) => void;
};

function regionEmoji(region: RegionId): string {
  return (SCENE_NAMES as Record<string, string>)[WORLD_REGIONS[region].scene]?.split(' ')[0] || '📍';
}

function bossInfo(bossId: string, locale: string) {
  const config = MONSTER_CONFIGS.find((item) => item.id === bossId);
  const sprite = getMonsterSprite(bossId);
  return {
    name: (isEnglishLocale(locale) ? config?.nameEn : config?.name) || bossId,
    svg: sprite && config ? sprite(config.c1, config.c2) : '',
    spriteKey: config?.spriteKey,
  };
}

export default function WorldMapScreen({
  progress,
  run,
  starter,
  stageIdx,
  pHp,
  maxHp,
  pLvl,
  onStartExpedition,
  onChooseRoute,
  onBack,
  onPause,
  grade = null,
  onDiscoverSecret,
}: WorldMapScreenProps) {
  const { t, locale } = useI18n();
  const routeMode = Boolean(run?.atMap);
  const cards = useMemo(() => buildExpeditionCards(progress), [progress]);
  const [selectedId, setSelectedId] = useState<ExpeditionId>(() => run?.expeditionId ?? defaultExpeditionId(progress));
  const choices = useMemo(() => routeChoices(run, starter?.type), [run, starter?.type]);
  const [selectedLane, setSelectedLane] = useState(0);
  const traveled = useMemo(() => (routeMode ? traveledRegions(run) : []), [routeMode, run]);
  const currentRegion = traveled.at(-1) ?? null;
  const floorNumber = run ? nextExpeditionFloor(run) + 1 : 1;
  const activeExpedition = getExpedition(routeMode ? run?.expeditionId : selectedId);
  const selectedChoice = choices[selectedLane] ?? choices[0] ?? null;

  const regionName = (region: RegionId) => localizeSceneName(
    WORLD_REGIONS[region].scene,
    (SCENE_NAMES as Record<string, string>)[WORLD_REGIONS[region].scene] || region,
    locale,
  );

  // Keep the focus (chosen route, or the selected boss) in view on narrow screens.
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const firstScrollRef = useRef(true);
  const { zoom, zoomIn, zoomOut, reset: resetZoom } = useMapZoom(viewportRef);
  // View mode hides the choice panel so the whole illustration can be enjoyed.
  const [viewOnly, setViewOnly] = useState(false);
  // Sharper tiles of the painting for whatever part is on screen at this zoom.
  const sharp = useMapTiles(viewportRef, BASE_URL, [zoom, viewOnly]);
  const focusRegion: RegionId | null = routeMode
    ? selectedChoice?.option.region ?? currentRegion
    : activeExpedition?.region ?? null;
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const map = viewport?.firstElementChild as HTMLElement | null;
    if (!viewport || !map || !focusRegion) return;
    const focusX = (WORLD_REGIONS[focusRegion].x / 100) * map.offsetWidth;
    const anchorX = routeMode && currentRegion
      ? ((WORLD_REGIONS[currentRegion].x / 100) * map.offsetWidth + focusX) / 2
      : focusX;
    const left = Math.max(0, anchorX - viewport.clientWidth / 2);
    const top = Math.max(0, (WORLD_REGIONS[focusRegion].y / 100) * map.offsetHeight - viewport.clientHeight / 2);
    if (typeof viewport.scrollTo === 'function') {
      viewport.scrollTo({ left, top, behavior: firstScrollRef.current ? 'auto' : 'smooth' });
    } else {
      viewport.scrollLeft = left;
      viewport.scrollTop = top;
    }
    firstScrollRef.current = false;
  }, [focusRegion, routeMode, currentRegion]);

  const starterSvg = starter?.stages?.[stageIdx]?.svgFn
    ? starter.stages[stageIdx].svgFn(starter.c1, starter.c2)
    : '';
  const starterProfileKey = starter?.stages?.[stageIdx]?.svgFn ? getSpriteProfileKey(starter.stages[stageIdx].svgFn) : undefined;
  const tokenRegion: RegionId = routeMode ? currentRegion ?? 'grass' : 'grass';
  const hpPct = Math.max(0, Math.min(100, (pHp / Math.max(1, maxHp)) * 100));

  const optionLaneByRegion = new Map<RegionId, number>(choices.map((choice) => [choice.option.region, choice.lane]));
  const springRegions = new Set<RegionId>(choices.filter((choice) => isSpringOption(choice.option)).map((choice) => choice.option.region));
  const point = (region: RegionId) => `${WORLD_REGIONS[region].x},${WORLD_REGIONS[region].y}`;

  const renderMarker = (region: RegionId) => {
    const lane = optionLaneByRegion.get(region);
    const isOption = lane !== undefined;
    const isSelectedOption = isOption && lane === selectedChoice?.lane;
    const bossCard = cards.find((card) => card.region === region);
    const isBoss = BOSS_REGIONS.has(region);
    const discovered = isRegionDiscovered(progress, region) || traveled.includes(region) || isOption || region === 'grass';
    const isSelectedBoss = !routeMode && activeExpedition?.region === region;
    const locked = Boolean(isBoss && bossCard && !bossCard.unlocked);
    const cleared = Boolean(bossCard && bossCard.clears > 0);
    const showLabel = isOption || isSelectedBoss || (routeMode && region === currentRegion);
    const className = [
      'wm-marker',
      discovered ? 'is-known' : 'is-unknown',
      isBoss ? 'is-boss' : '',
      locked ? 'is-locked' : '',
      isOption ? 'is-option' : '',
      isSelectedOption || isSelectedBoss ? 'is-selected' : '',
      traveled.includes(region) ? 'is-traveled' : '',
    ].filter(Boolean).join(' ');
    const label = discovered ? regionName(region) : t('world.region.unknown', 'Unexplored');
    const interactive = (routeMode && isOption) || (!routeMode && isBoss && bossCard);
    const onClick = () => {
      if (routeMode && lane !== undefined) setSelectedLane(lane);
      else if (!routeMode && bossCard) setSelectedId(bossCard.id);
    };
    const content = (
      <>
        <span className="wm-marker-dot" aria-hidden="true">
          {isOption && springRegions.has(region) ? '⛲' : discovered ? regionEmoji(region) : '?'}
          {isBoss && <span className="wm-marker-badge">{locked ? '🔒' : cleared ? '⭐' : '👑'}</span>}
          {isOption && <span className="wm-marker-lane">{String.fromCharCode(65 + (lane ?? 0))}</span>}
        </span>
        {showLabel && <span className="wm-marker-label">{label}</span>}
      </>
    );
    const style = { left: `${WORLD_REGIONS[region].x}%`, top: `${WORLD_REGIONS[region].y}%` };
    return interactive ? (
      <button
        key={region}
        type="button"
        className={className}
        style={style}
        onClick={onClick}
        aria-label={label}
        aria-pressed={isSelectedOption || isSelectedBoss}
      >
        {content}
      </button>
    ) : (
      <div key={region} className={className} style={style} aria-hidden={!showLabel}>
        {content}
      </div>
    );
  };

  const renderChoice = (choice: RouteChoiceVm) => {
    const { option, enemy, matchup, lane } = choice;
    const selected = lane === selectedChoice?.lane;
    if (isSpringOption(option)) {
      return (
        <button
          key={lane}
          type="button"
          className={`wm-choice is-spring${selected ? ' is-selected' : ''}`}
          onClick={() => setSelectedLane(lane)}
          aria-pressed={selected}
        >
          <span className="wm-choice-head">
            {choices.length > 1 && <span className="wm-choice-lane">{String.fromCharCode(65 + lane)}</span>}
            <span className="wm-choice-region">⛲ {t('world.spring.name', 'Review Spring')}</span>
          </span>
          <span className="wm-choice-detail">{t('world.spring.desc', 'No battle: 3 review questions from your past mistakes. Right answers restore HP and give EXP.')}</span>
          <span className="wm-chip wm-chip-event-healing_spring">{t('world.spring.chip', '💧 Rest + review')}</span>
        </button>
      );
    }
    const verdictLabel = matchup.verdict === 'advantage'
      ? t('world.matchup.advantage', '👍 Good matchup')
      : matchup.verdict === 'disadvantage'
        ? t('world.matchup.disadvantage', '⚠️ Bad matchup')
        : t('world.matchup.neutral', '➖ Even matchup');
    return (
      <button
        key={lane}
        type="button"
        className={`wm-choice is-${matchup.verdict}${selected ? ' is-selected' : ''}${option.tier === 'boss' ? ' is-boss' : ''}`}
        onClick={() => setSelectedLane(lane)}
        aria-pressed={selected}
      >
        <span className="wm-choice-head">
          {choices.length > 1 && <span className="wm-choice-lane">{String.fromCharCode(65 + lane)}</span>}
          <span className="wm-choice-region">{regionName(option.region)}</span>
        </span>
        {enemy && (
          <span className="wm-choice-enemy">
            <span className="wm-choice-sprite">
              <MonsterPortrait profileKey={enemy.activeSpriteKey ?? enemy.spriteKey} svgStr={enemy.svgFn(enemy.c1, enemy.c2)} size={52} ariaLabel={enemy.name} />
            </span>
            <span className="wm-choice-enemy-text">
              <span className="wm-choice-enemy-name">{enemy.name}</span>
              <span className="wm-choice-enemy-meta">
                {enemy.typeIcon}{enemy.typeIcon2 || ''} Lv.{enemy.lvl}
              </span>
            </span>
          </span>
        )}
        <span className={`wm-chip wm-chip-${matchup.verdict}`}>{verdictLabel}</span>
        <span className="wm-choice-detail">
          {t('world.matchup.detail', 'You deal ×{atk} · It deals ×{def}', {
            atk: formatMultiplier(matchup.attack),
            def: formatMultiplier(matchup.defense),
          })}
        </span>
        {option.tier === 'elite' && (
          <span className="wm-chip wm-chip-elite">{t('world.tier.elite', '⚔️ Elite: tougher, EXP ×1.5 + extra drop')}</span>
        )}
        {option.tier === 'boss' && (
          <span className="wm-chip wm-chip-boss">{t('world.tier.boss', '👑 Boss battle')}</span>
        )}
        {option.event && (
          <span className={`wm-chip wm-chip-event-${option.event}`}>
            {t(`world.event.${option.event}`, option.event)}
          </span>
        )}
      </button>
    );
  };

  const selectedCard = cards.find((card) => card.id === selectedId) ?? cards[0];

  // ── Hidden spots: shimmer when zoomed in, open with a small math lock ──
  const secretsFound = WORLD_SECRETS.filter((secret) => isSecretFound(progress, secret.id)).length;
  const [openSecret, setOpenSecret] = useState<SecretId | null>(null);
  const [lockQuestion, setLockQuestion] = useState<GeneratedQuestion | null>(null);
  const [lockPicked, setLockPicked] = useState<number | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const openLock = (id: SecretId) => {
    setOpenSecret(id);
    setLockPicked(null);
    const found = isSecretFound(progress, id);
    setUnlocked(found);
    setLockQuestion(found ? null : createSecretQuestion(grade, Math.random, t));
  };
  const answerLock = (choiceIndex: number) => {
    if (!lockQuestion || lockPicked !== null || !openSecret) return;
    setLockPicked(choiceIndex);
    if (lockQuestion.choices[choiceIndex] === lockQuestion.answer) {
      setUnlocked(true);
      onDiscoverSecret?.(openSecret);
    }
  };
  const retryLock = () => {
    setLockPicked(null);
    setLockQuestion(createSecretQuestion(grade, Math.random, t));
  };
  const rewardText = (reward: Partial<Record<ItemId, number>>) => Object.entries(reward)
    .map(([item, amount]) => `${ITEM_CATALOG[item as ItemId].icon} ${t(ITEM_CATALOG[item as ItemId].nameKey, ITEM_CATALOG[item as ItemId].nameFallback)} ×${amount}`)
    .join('、');
  const secret = getSecret(openSecret);
  const visibleSecrets = WORLD_SECRETS.filter((item) => zoom >= SECRET_REVEAL_ZOOM || isSecretFound(progress, item.id));
  // A near miss on the painting still counts: open the closest visible spot within reach.
  const onMapTap = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement | null)?.closest('button')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const hit = findSecretNear(
      { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 },
      { width: rect.width, height: rect.height },
      visibleSecrets,
    );
    if (hit) openLock(hit.id);
  };

  return (
    <div className={`wm-screen${routeMode ? ' is-route' : ' is-select'}`}>
      <header className="wm-header">
        <button
          type="button"
          className="wm-back-btn"
          onClick={routeMode ? onPause : onBack}
          aria-label={routeMode ? t('world.route.pause', '💾 Save & quit') : t('world.back', 'Back')}
        >
          {routeMode ? '💾' : '←'}
        </button>
        <div className="wm-heading">
          <h1 className="wm-title">
            {routeMode
              ? t(floorNumber >= EXPEDITION_FLOORS ? 'world.route.bossTitle' : 'world.route.title',
                floorNumber >= EXPEDITION_FLOORS ? 'Floor {floor}/{total}: the boss is ahead!' : 'Floor {floor}/{total}: choose your path',
                { floor: floorNumber, total: EXPEDITION_FLOORS })
              : t('world.title', 'World Map')}
          </h1>
          <div className="wm-subtitle">
            {routeMode && activeExpedition
              ? t('world.route.goal', 'Goal: {boss}', { boss: bossInfo(activeExpedition.bossId, locale).name })
              : t('world.subtitle.select', 'Pick an expedition and defeat its guardian')}
          </div>
        </div>
        <div className="wm-secret-count" title={t('world.secret.count', 'Hidden spots found')}>
          🗝️ {secretsFound}/{WORLD_SECRETS.length}
        </div>
        {routeMode && (
          <div className="wm-hp" aria-label={`HP ${Math.ceil(pHp)}/${maxHp}`}>
            <span className="wm-hp-text">Lv.{pLvl} · HP {Math.ceil(pHp)}/{maxHp}</span>
            <span className="wm-hp-track"><span className="wm-hp-fill" style={{ width: `${hpPct}%` }} /></span>
          </div>
        )}
      </header>

      <div className="wm-stage">
      <div className={`wm-viewport${zoom > 1 ? ' is-zoomed' : ''}`} ref={viewportRef}>
        <div
          className="wm-map"
          style={{ aspectRatio: `${WORLD_MAP_ART.width} / ${WORLD_MAP_ART.height}`, height: `${zoom * 100}%` }}
          onClick={onMapTap}
        >
          <img className="wm-map-art" src={MAP_SRC} alt="" draggable={false} decoding="async" />
          {sharp.tiles.map((tile) => (
            <img
              key={tile.key}
              className="wm-map-tile"
              src={tile.src}
              alt=""
              draggable={false}
              decoding="async"
              onLoad={(event) => event.currentTarget.classList.add('is-loaded')}
              style={{
                left: `${tile.left * 100}%`,
                top: `${tile.top * 100}%`,
                // A hair of overlap hides sub-pixel seams between neighbours.
                width: `${tile.width * 100 + 0.04}%`,
                height: `${tile.height * 100 + 0.06}%`,
              }}
            />
          ))}
          <svg className="wm-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {traveled.length > 1 && (
              <polyline className="wm-line-traveled" points={traveled.map(point).join(' ')} />
            )}
            {routeMode && currentRegion && choices.map((choice) => (
              <line
                key={choice.lane}
                className={`wm-line-option${choice.lane === selectedChoice?.lane ? ' is-selected' : ''}`}
                x1={WORLD_REGIONS[currentRegion].x}
                y1={WORLD_REGIONS[currentRegion].y}
                x2={WORLD_REGIONS[choice.option.region].x}
                y2={WORLD_REGIONS[choice.option.region].y}
              />
            ))}
          </svg>
          {REGION_IDS.map(renderMarker)}
          {starterSvg && (
            <div
              className="wm-token"
              style={{ left: `${WORLD_REGIONS[tokenRegion].x}%`, top: `${WORLD_REGIONS[tokenRegion].y}%` }}
              aria-label={t('world.you', 'You are here')}
            >
              <MonsterPortrait profileKey={starterProfileKey} svgStr={starterSvg} size={46} ariaLabel={starter?.name || ''} />
            </div>
          )}
          {visibleSecrets.map((item) => {
            const found = isSecretFound(progress, item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`wm-secret${found ? ' is-found' : ' is-hidden'}`}
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
                onClick={() => openLock(item.id)}
                aria-label={found ? t(`world.secret.${item.id}.name`, item.id) : t('world.secret.shimmer', 'Something shimmers here')}
              >
                <span className="wm-secret-glyph" aria-hidden="true">{found ? item.icon : '✨'}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="wm-zoom" role="group" aria-label={t('world.zoom.label', 'Map zoom')}>
        {zoom === 1 && secretsFound < WORLD_SECRETS.length && (
          <span className="wm-zoom-hint">{t('world.zoom.hint', 'Zoom in to find hidden spots!')}</span>
        )}
        <button type="button" onClick={zoomIn} disabled={zoom >= 3} aria-label={t('world.zoom.in', 'Zoom in')}>＋</button>
        <button type="button" onClick={zoomOut} disabled={zoom <= 1} aria-label={t('world.zoom.out', 'Zoom out')}>－</button>
        <button type="button" onClick={() => { setViewOnly((value) => !value); if (viewOnly) resetZoom(); }}
          aria-pressed={viewOnly} aria-label={viewOnly ? t('world.view.exit', 'Back to choosing') : t('world.view.enter', 'Admire the map')}>
          {viewOnly ? '✕' : '🖼️'}
        </button>
      </div>
      </div>

      {!viewOnly && (
      <section className="wm-panel">
        {routeMode ? (
          <>
            <div className={`wm-choices${choices.length === 1 ? ' is-single' : ''}`}>
              {choices.map(renderChoice)}
            </div>
            <button
              type="button"
              className="wm-go-btn"
              disabled={!selectedChoice}
              onClick={() => selectedChoice && onChooseRoute(selectedChoice.lane)}
            >
              {!selectedChoice
                ? '…'
                : isSpringOption(selectedChoice.option)
                  ? t('world.spring.go', 'Go to the Review Spring')
                  : t('world.route.go', 'Go to {region}', { region: regionName(selectedChoice.option.region) })}
            </button>
          </>
        ) : (
          <>
            <div className="wm-expeditions" role="list">
              {cards.map((card) => {
                const boss = bossInfo(card.bossId, locale);
                const selected = card.id === selectedCard?.id;
                const status = !card.unlocked
                  ? t('world.expedition.locked', '🔒 Defeat {boss} to unlock', {
                    boss: card.requiresBossId ? bossInfo(card.requiresBossId, locale).name : '',
                  })
                  : card.clears > 0
                    ? t('world.expedition.cleared', '⭐ Cleared {count}×', { count: card.clears })
                    : card.bestFloor > 0
                      ? t('world.expedition.best', 'Best: floor {floor}/10', { floor: card.bestFloor })
                      : t('world.expedition.new', '✨ New challenge');
                return (
                  <button
                    key={card.id}
                    type="button"
                    role="listitem"
                    className={`wm-exp-card${selected ? ' is-selected' : ''}${card.unlocked ? '' : ' is-locked'}${card.clears > 0 ? ' is-cleared' : ''}`}
                    onClick={() => setSelectedId(card.id)}
                    aria-pressed={selected}
                  >
                    <span className="wm-exp-sprite">
                      {boss.svg && <MonsterPortrait profileKey={boss.spriteKey} svgStr={boss.svg} size={54} ariaLabel={boss.name} />}
                    </span>
                    <span className="wm-exp-text">
                      <span className="wm-exp-chapter">{t('world.expedition.chapter', 'Chapter {n}', { n: card.order })}</span>
                      <span className="wm-exp-name">{card.unlocked ? boss.name : '？？？'}</span>
                      <span className="wm-exp-region">{regionName(card.region)}</span>
                      <span className="wm-exp-status">{status}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="wm-go-btn"
              disabled={!selectedCard?.unlocked || !starter}
              onClick={() => selectedCard?.unlocked && onStartExpedition(selectedCard.id)}
            >
              {selectedCard?.unlocked
                ? t('world.expedition.start', 'Set out!')
                : t('world.expedition.lockedShort', '🔒 Locked')}
            </button>
          </>
        )}
      </section>
      )}

      {secret && (
        <div className="wm-secret-modal" role="dialog" aria-modal="true" aria-label={t(`world.secret.${secret.id}.name`, secret.id)}>
          <div className="wm-secret-card">
            <div className="wm-secret-title">{unlocked ? secret.icon : '🔐'} {t(`world.secret.${secret.id}.name`, secret.id)}</div>
            <p className="wm-secret-text">{t(`world.secret.${secret.id}.story`, '')}</p>
            {!unlocked && lockQuestion && (
              <>
                <p className="wm-secret-lock">{t('world.secret.lock', 'A number lock guards it. Solve it to open!')}</p>
                <div className="wm-secret-question">
                  {renderMathText(lockQuestion.display)}
                  {needsEqualPrompt(lockQuestion.display, lockQuestion.op) ? ' = ?' : ''}
                </div>
                <div className="wm-secret-choices">
                  {lockQuestion.choices.map((choice, i) => {
                    const state = lockPicked === null ? '' : choice === lockQuestion.answer ? ' is-correct' : lockPicked === i ? ' is-wrong' : '';
                    return (
                      <button key={i} type="button" className={`wm-secret-choice${state}`} disabled={lockPicked !== null}
                        onClick={() => answerLock(i)}>
                        {renderMathText(lockQuestion.choiceLabels?.[i] ?? choice)}
                      </button>
                    );
                  })}
                </div>
                {lockPicked !== null && (
                  <button type="button" className="wm-secret-btn" onClick={retryLock}>
                    {t('world.secret.retry', 'Try another lock')}
                  </button>
                )}
              </>
            )}
            {unlocked && (
              <p className="wm-secret-reward">
                {lockPicked !== null
                  ? t('world.secret.found', '🎉 Found it! You got {reward}', { reward: rewardText(secret.reward) })
                  : t('world.secret.already', 'You already found this spot.')}
              </p>
            )}
            <button type="button" className="wm-secret-btn is-close" onClick={() => setOpenSecret(null)}>
              {t('world.secret.close', 'Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
