import { useState } from 'react';

import { useI18n } from '../../i18n';
import type { Grade } from '../../data/gradeCurriculum.ts';
import type { SpringResult, StarterVm } from '../../types/battle';
import { loadLearningProgress, saveLearningProgress } from '../../utils/learningProgress.ts';
import {
  SPRING_QUESTION_COUNT,
  SpringSession,
  springRewards,
  type SpringQuestion,
} from '../../utils/reviewSpring.ts';
import { needsEqualPrompt, renderMathText } from '../ui/MathText';
import './ReviewSpringScreen.css';

type ReviewSpringScreenProps = {
  starter: StarterVm | null;
  grade: Grade | null;
  /** Normal single play keeps learning records; timed play only practises. */
  persistentLearning: boolean;
  pHp: number;
  maxHp: number;
  pLvl: number;
  onFinish: (result: SpringResult) => void;
};

type Answer = SpringResult['answers'][number];

export default function ReviewSpringScreen({
  starter, grade, persistentLearning, pHp, maxHp, pLvl, onFinish,
}: ReviewSpringScreenProps) {
  const { t } = useI18n();
  // One spring visit; its methods are only called from event handlers after mount.
  const [session] = useState(() => new SpringSession({
    progress: persistentLearning ? loadLearningProgress() : null,
    moves: starter?.moves ?? [],
    grade,
    rand: Math.random,
    save: (progress) => { saveLearningProgress(progress); },
    t,
  }));
  const { targets } = session;

  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<SpringQuestion | null>(() => session.question(0));
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const finished = answers.length >= Math.min(SPRING_QUESTION_COUNT, targets.length) && picked === null;
  const correctCount = answers.filter((answer) => answer.correct).length;
  const reward = springRewards(correctCount, maxHp, pLvl);
  const perCorrect = springRewards(1, maxHp, pLvl);

  const answer = (choiceIndex: number) => {
    if (!question || picked !== null) return;
    const result = session.answer(question, choiceIndex);
    setPicked(choiceIndex);
    setAnswers((prev) => [...prev, result]);
  };

  const next = () => {
    const nextIndex = index + 1;
    setPicked(null);
    if (nextIndex >= Math.min(SPRING_QUESTION_COUNT, targets.length)) {
      setQuestion(null);
      return;
    }
    setIndex(nextIndex);
    setQuestion(session.question(nextIndex));
  };

  const leave = () => {
    if (session.claimFinish()) onFinish({ answers });
  };

  const isCorrect = picked !== null && question?.choices?.[picked] === question?.answer;
  const reasonLabel = question?.springReason === 'mistake'
    ? t('spring.reason.mistake', 'A type you missed before. Try it fresh!')
    : question?.springReason === 'weak'
      ? t('spring.reason.weak', 'A skill that needs a little more practice.')
      : t('spring.reason.practice', 'Practice from your monster\'s moves.');

  return (
    <main className="spring-screen">
      <header className="spring-header">
        <div className="spring-icon" aria-hidden="true">⛲</div>
        <div>
          <h1 className="spring-title">{t('spring.title', 'Review Spring')}</h1>
          <div className="spring-sub">
            {t('spring.sub', 'Each right answer restores {hp} HP and gives {exp} EXP', { hp: perCorrect.heal, exp: perCorrect.exp })}
          </div>
        </div>
        <div className="spring-hp">HP {Math.ceil(pHp)}/{maxHp}</div>
      </header>

      {!finished && question && (
        <section className="spring-card" aria-live="polite">
          <div className="spring-progress">
            {t('spring.progress', 'Question {n} / {total}', { n: index + 1, total: Math.min(SPRING_QUESTION_COUNT, targets.length) })}
          </div>
          <div className="spring-reason">{reasonLabel}</div>
          <div className="spring-question">
            {renderMathText(question.display)}
            {needsEqualPrompt(question.display, question.op) ? ' = ?' : ''}
          </div>
          <div className="spring-choices">
            {(question.choices ?? []).map((choice, i) => {
              const state = picked === null ? '' : choice === question.answer ? ' is-correct' : picked === i ? ' is-wrong' : '';
              return (
                <button key={`${index}-${i}`} type="button" className={`spring-choice${state}`}
                  onClick={() => answer(i)} disabled={picked !== null}>
                  {renderMathText(question.choiceLabels?.[i] ?? choice)}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className={`spring-feedback${isCorrect ? ' is-correct' : ' is-wrong'}`}>
              {isCorrect
                ? t('spring.correct', '✨ Correct! The spring sparkles.')
                : (
                  <>
                    <div>{t('spring.wrong', 'Answer: {answer}', { answer: question.answerLabel ?? String(question.answer) })}</div>
                    {(question.steps ?? []).slice(0, 4).map((step, i) => (
                      <div key={i} className="spring-step">{renderMathText(step)}</div>
                    ))}
                  </>
                )}
              <button type="button" className="spring-next" onClick={next}>
                {t('spring.next', 'Next')}
              </button>
            </div>
          )}
        </section>
      )}

      {finished && (
        <section className="spring-card spring-summary">
          <div className="spring-summary-score">
            {t('spring.summary', '{correct} of {total} right', { correct: correctCount, total: answers.length })}
          </div>
          <div className="spring-summary-reward">
            {t('spring.reward', '💧 +{hp} HP · ⭐ +{exp} EXP', { hp: Math.min(reward.heal, Math.max(0, maxHp - Math.ceil(pHp))), exp: reward.exp })}
          </div>
          <button type="button" className="spring-leave" onClick={leave}>
            {t('spring.leave', 'Back to the map')}
          </button>
        </section>
      )}
    </main>
  );
}
