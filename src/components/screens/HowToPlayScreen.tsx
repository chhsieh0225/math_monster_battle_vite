import { useMemo, useState } from 'react';

import { MAX_MOVE_LVL, POWER_CAPS } from '../../data/constants.ts';
import { DROP_TABLES } from '../../data/dropTables.ts';
import { BATTLE_ITEM_ORDER, ITEM_CATALOG } from '../../data/itemCatalog.ts';
import { SKILL_SETS } from '../../data/skillSets.ts';
import { SPRITE_IMGS } from '../../data/sprites.ts';
import { STARTERS } from '../../data/starters.ts';
import { useI18n } from '../../i18n';
import { localizeStarterList } from '../../utils/contentLocalization.ts';

import './HowToPlayScreen.css';

type HowToPlayScreenProps = {
  onBack: () => void;
};

const STARTER_IMAGE_BY_ID: Record<string, string> = {
  fire: SPRITE_IMGS.player_fire0,
  water: SPRITE_IMGS.player_water0,
  grass: SPRITE_IMGS.player_grass0,
  electric: SPRITE_IMGS.player_electric0,
  wolf: SPRITE_IMGS.player_wolf0,
  tiger: SPRITE_IMGS.player_tiger0,
  lion: SPRITE_IMGS.player_lion0,
};

const SHOWCASE_ROW_1 = ['fire', 'water', 'grass', 'electric'] as const;
const SHOWCASE_ROW_2 = ['wolf', 'tiger', 'lion'] as const;

const SLOT_ROLE_KEY_BY_IDX = [
  'howto.skill.role.idx0',
  'howto.skill.role.idx1',
  'howto.skill.role.idx2',
  'howto.skill.role.idx3',
] as const;

type StarterShowcaseEntry = {
  id: string;
  name: string;
  src: string;
};

function formatRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}~${max}`;
}

function clampDifficulty(value: unknown): number {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Math.max(1, Math.min(5, Math.round(num)));
}

function formatDifficultyStars(value: number): string {
  return `${'★'.repeat(value)}${'☆'.repeat(Math.max(0, 5 - value))}`;
}

function isStarterShowcaseEntry(value: StarterShowcaseEntry | undefined): value is StarterShowcaseEntry {
  return Boolean(value);
}

export default function HowToPlayScreen({ onBack }: HowToPlayScreenProps) {
  const { t, locale } = useI18n();

  const goalTips = [
    t('howto.goal.1', 'Answer math questions to attack and clear all enemies.'),
    t('howto.goal.2', 'Three correct answers in a row charge your ultimate move.'),
    t('howto.goal.3', 'Wrong answers are okay. Keep your streak and rhythm steady.'),
  ];
  const battleFlowTips = [
    t('howto.battle.1', 'Tap one of 4 skills to get a question.'),
    t('howto.battle.2', 'Answer correctly to deal damage and trigger effects.'),
    t('howto.battle.3', 'Different elements counter different enemy types.'),
  ];
  const modeTips = [
    t('howto.mode.1', 'Normal: no timer, best for learning.'),
    t('howto.mode.2', 'Timed: each question has a time limit.'),
    t('howto.mode.3', 'Co-op/PvP: play with friends for teamwork or duels.'),
  ];
  const localizedStarters = useMemo(
    () => localizeStarterList(STARTERS, locale),
    [locale],
  );
  const [selectedStarterId, setSelectedStarterId] = useState<string>('fire');
  const starterShowcase = useMemo<StarterShowcaseEntry[]>(
    () => localizedStarters
      .filter((starter) => typeof starter.id === 'string' && Boolean(STARTER_IMAGE_BY_ID[starter.id]))
      .map((starter) => ({
        id: String(starter.id),
        name: String(starter.name || starter.id || ''),
        src: STARTER_IMAGE_BY_ID[String(starter.id)],
      })),
    [localizedStarters],
  );
  const starterShowcaseMap = useMemo(
    () => new Map(starterShowcase.map((starter) => [starter.id, starter])),
    [starterShowcase],
  );
  const starterRow1 = useMemo(
    () => SHOWCASE_ROW_1.map((id) => starterShowcaseMap.get(id)).filter(isStarterShowcaseEntry),
    [starterShowcaseMap],
  );
  const starterRow2 = useMemo(
    () => SHOWCASE_ROW_2.map((id) => starterShowcaseMap.get(id)).filter(isStarterShowcaseEntry),
    [starterShowcaseMap],
  );
  const selectedStarter = useMemo(
    () => localizedStarters.find((starter) => String(starter.id || '') === selectedStarterId) || localizedStarters[0] || null,
    [localizedStarters, selectedStarterId],
  );
  const selectedStarterDifficulty = clampDifficulty(selectedStarter?.difficulty);
  const selectedStarterTopic = selectedStarter
    ? t(selectedStarter.mathTopicKey || 'selection.topic.generic', selectedStarter.mathTopicFallback || t('selection.topic.generic', 'General Math'))
    : t('selection.topic.generic', 'General Math');
  const selectedGradeRange = Array.isArray(selectedStarter?.gradeRange)
    ? selectedStarter?.gradeRange
    : null;
  const selectedGradeText = selectedGradeRange
    ? (
      selectedGradeRange[0] === selectedGradeRange[1]
        ? t('selection.difficulty.gradeSingle', 'Suitable for grade {grade} ({topic})', {
          grade: selectedGradeRange[0],
          topic: selectedStarterTopic,
        })
        : t('selection.difficulty.gradeRange', 'Suitable for grades {from}-{to} ({topic})', {
          from: selectedGradeRange[0],
          to: selectedGradeRange[1],
          topic: selectedStarterTopic,
        })
    )
    : selectedStarterTopic;
  const selectedStarterDesc = selectedStarter
    ? t(`selection.${String(selectedStarter.id)}.desc`, selectedStarter.mathTopicFallback || selectedStarterTopic)
    : '';
  const slotSummaries = useMemo(
    () => [0, 1, 2, 3].map((idx) => {
      const defs = Object.values(SKILL_SETS).map((set) => set[idx]).filter(Boolean);
      const baseValues = defs.map((move) => Number(move.basePower || 0));
      const growthValues = defs.map((move) => Number(move.growth || 0));
      const baseMin = Math.min(...baseValues);
      const baseMax = Math.max(...baseValues);
      const growthMin = Math.min(...growthValues);
      const growthMax = Math.max(...growthValues);
      const cap = POWER_CAPS[idx] || 0;
      return {
        idx,
        baseMin,
        baseMax,
        growthMin,
        growthMax,
        cap,
      };
    }),
    [],
  );
  const dropEmojiPool = useMemo(
    () => Array.from(new Set(Object.values(DROP_TABLES).flat().filter(Boolean))),
    [],
  );

  return (
    <main className="howto-screen">
      <header className="howto-header">
        <button
          className="howto-back-btn touch-btn"
          onClick={onBack}
          aria-label={t('a11y.common.backToTitle', 'Back to title')}
        >
          ←
        </button>
        <div>
          <h1 className="howto-title">📘 {t('howto.title', 'How to Play')}</h1>
          <p className="howto-subtitle">{t('howto.subtitle', 'Quick guide for new players and parents')}</p>
        </div>
      </header>

      <section className="howto-card">
        <h2 className="howto-card-title">🧩 {t('howto.section.starters', 'Starter Showcase')}</h2>
        <p className="howto-card-desc">
          {t('howto.starters.note', 'Each starter represents one math topic. Choose one that matches the learner level.')}
        </p>
        <p className="howto-card-desc howto-card-desc-subtle">
          {t('howto.starters.tapHint', 'Tap a character to view skills, difficulty, attribute, and description.')}
        </p>
        <div className="howto-starter-row howto-starter-row-four">
          {starterRow1.map((starter) => (
            <button
              type="button"
              className={`howto-starter-card touch-btn${selectedStarterId === starter.id ? ' is-active' : ''}`}
              key={starter.id}
              onClick={() => setSelectedStarterId(starter.id)}
              aria-label={t('howto.starters.pick', 'View {name} details', { name: starter.name })}
            >
              <img
                src={starter.src}
                alt={starter.name}
                className="howto-starter-img"
                loading="lazy"
              />
              <div className="howto-starter-name">{starter.name}</div>
            </button>
          ))}
        </div>
        <div className="howto-starter-row howto-starter-row-three">
          {starterRow2.map((starter) => (
            <button
              type="button"
              className={`howto-starter-card touch-btn${selectedStarterId === starter.id ? ' is-active' : ''}`}
              key={starter.id}
              onClick={() => setSelectedStarterId(starter.id)}
              aria-label={t('howto.starters.pick', 'View {name} details', { name: starter.name })}
            >
              <img
                src={starter.src}
                alt={starter.name}
                className="howto-starter-img"
                loading="lazy"
              />
              <div className="howto-starter-name">{starter.name}</div>
            </button>
          ))}
        </div>
        {selectedStarter && (
          <article className="howto-starter-detail">
            <div className="howto-starter-detail-name">
              {selectedStarter.typeIcon || '🧩'} {selectedStarter.name}
              <span className="howto-starter-type">
                {t('howto.starter.type', 'Attribute')}：{selectedStarter.typeName || selectedStarter.type || '-'}
              </span>
            </div>
            <div className="howto-starter-detail-meta">
              {selectedStarterDifficulty > 0
                ? `${t('howto.starter.difficulty', 'Difficulty')}：${formatDifficultyStars(selectedStarterDifficulty)}`
                : ''}
              {selectedStarterDifficulty > 0 ? ' · ' : ''}
              {selectedGradeText}
            </div>
            <div className="howto-starter-detail-desc">{selectedStarterDesc}</div>
            <ul className="howto-starter-move-list">
              {(selectedStarter.moves || []).map((move, idx) => (
                <li key={`${selectedStarter.id}-move-${idx}`}>
                  <b>{move.icon} {move.name}</b>
                  {' '}
                  <span>{move.desc}</span>
                </li>
              ))}
            </ul>
          </article>
        )}
      </section>

      <section className="howto-card">
        <h2 className="howto-card-title">🎯 {t('howto.section.goal', 'Goal')}</h2>
        <ul className="howto-list">
          {goalTips.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="howto-card">
        <h2 className="howto-card-title">⚔️ {t('howto.section.battle', 'Battle Flow')}</h2>
        <ul className="howto-list">
          {battleFlowTips.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="howto-card">
        <h2 className="howto-card-title">🧭 {t('howto.section.modes', 'Modes')}</h2>
        <ul className="howto-list">
          {modeTips.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="howto-card">
        <h2 className="howto-card-title">🧠 {t('howto.section.skills', 'Skill IDs and Power')}</h2>
        <p className="howto-card-desc">
          {t('howto.skill.formula', 'Damage power formula: min(basePower + (moveLevel - 1) × growth, slotCap). Move level max is {max}.', { max: MAX_MOVE_LVL })}
        </p>
        <div className="howto-skill-grid">
          {slotSummaries.map((slot) => (
            <article key={slot.idx} className="howto-skill-card">
              <div className="howto-skill-id">
                {t('howto.skill.idPattern', 'Skill ID{id} / idx{idx}', { id: slot.idx + 1, idx: slot.idx })}
              </div>
              <div className="howto-skill-role">
                {t(SLOT_ROLE_KEY_BY_IDX[slot.idx], `Slot ${slot.idx + 1}`)}
              </div>
              <div className="howto-skill-power">
                {t('howto.skill.powerLine', 'Base {base} · Growth {growth}/Lv · Cap {cap}', {
                  base: formatRange(slot.baseMin, slot.baseMax),
                  growth: `+${formatRange(slot.growthMin, slot.growthMax)}`,
                  cap: slot.cap,
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="howto-card">
        <h2 className="howto-card-title">💥 {t('howto.section.ultimate', 'Ultimate (idx3)')}</h2>
        <ul className="howto-list">
          <li>{t('howto.ultimate.1', 'Ultimate is skill ID4 (idx3).')}</li>
          <li>{t('howto.ultimate.2', 'Requires 3 charge stacks to unlock (single/co-op/PvP all apply).')}</li>
          <li>{t('howto.ultimate.3', 'It has highest base power/cap and often includes dual-type damage behavior.')}</li>
          <li>{t('howto.ultimate.4', 'Most ultimates are risky: wrong answers may trigger self-damage.')}</li>
        </ul>
      </section>

      <section className="howto-card">
        <h2 className="howto-card-title">🎁 {t('howto.section.drops', 'Drops and Items')}</h2>
        <p className="howto-card-desc">
          {t('howto.drop.convert', 'Drops are automatically converted to usable items and collection milestones.')}
        </p>
        <div className="howto-item-grid">
          {BATTLE_ITEM_ORDER.map((itemId) => {
            const item = ITEM_CATALOG[itemId];
            const itemName = t(item.nameKey, item.nameFallback);
            const itemDesc = t(item.descKey, item.descFallback);
            return (
              <article className="howto-item-card" key={item.id}>
                <div className="howto-item-title">{item.icon} {itemName}</div>
                <div className="howto-item-desc">{itemDesc}</div>
                <div className="howto-item-source-row">
                  {item.sourceDrops.map((drop) => (
                    <span key={`${item.id}-${drop}`} className="howto-drop-badge">{drop}</span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <div className="howto-drop-cloud">
          {dropEmojiPool.map((drop) => (
            <span key={`pool-${drop}`} className="howto-drop-badge">{drop}</span>
          ))}
        </div>
        <ul className="howto-list">
          <li>{t('howto.drop.pityDragon', 'Dragon-table legendary pity: guaranteed after 7 misses.')}</li>
          <li>{t('howto.drop.pityBoss', 'Boss-table legendary pity: guaranteed after 6 misses.')}</li>
          <li>{t('howto.drop.collectionNote', 'Some rare icons mainly contribute to collection progress and title unlocks.')}</li>
        </ul>
      </section>

      <section className="howto-card howto-card-tip">
        <h2 className="howto-card-title">💡 {t('howto.section.tips', 'Tips')}</h2>
        <p className="howto-tip-text">
          {t('howto.tip.primary', 'If your child feels frustrated, switch to easier starters first, then move up by difficulty stars.')}
        </p>
      </section>
    </main>
  );
}
