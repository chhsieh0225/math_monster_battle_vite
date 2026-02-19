import { useI18n } from '../../i18n';
import './HowToPlayScreen.css';

type HowToPlayScreenProps = {
  onBack: () => void;
};

export default function HowToPlayScreen({ onBack }: HowToPlayScreenProps) {
  const { t } = useI18n();

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

      <section className="howto-card howto-card-tip">
        <h2 className="howto-card-title">💡 {t('howto.section.tips', 'Tips')}</h2>
        <p className="howto-tip-text">
          {t('howto.tip.primary', 'If your child feels frustrated, switch to easier starters first, then move up by difficulty stars.')}
        </p>
      </section>
    </main>
  );
}
