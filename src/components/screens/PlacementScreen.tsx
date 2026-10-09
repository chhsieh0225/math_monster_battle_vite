import { useMemo, useRef, useState } from 'react';

import { useI18n } from '../../i18n';
import { GRADES, isStarterRecommended, type Grade } from '../../data/gradeCurriculum.ts';
import { STARTERS } from '../../data/starters.ts';
import { genQ, type GeneratedQuestion } from '../../utils/questionGenerator.ts';
import { buildPlacementPlan, scorePlacement, type PlacementAnswer } from '../../utils/placementQuiz.ts';
import { createPlayerProfile, type PlayerProfile } from '../../utils/playerProfile.ts';
import { localizeStarterDisplayName } from '../../utils/contentLocalization.ts';
import { needsEqualPrompt, renderMathText } from '../ui/MathText';
import './PlacementScreen.css';

type PlacementScreenProps = {
  currentGrade: Grade | null;
  onDone: (profile: PlayerProfile) => void;
  onCancel: () => void;
};

type Step = 'grade' | 'intro' | 'quiz' | 'result';

export default function PlacementScreen({ currentGrade, onDone, onCancel }: PlacementScreenProps) {
  const { t, locale } = useI18n();
  const [step, setStep] = useState<Step>('grade');
  const [selfGrade, setSelfGrade] = useState<Grade>(currentGrade ?? 3);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const lockRef = useRef(false);

  const plan = useMemo(() => buildPlacementPlan(selfGrade), [selfGrade]);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);

  const startQuiz = () => {
    setQuestions(plan.map((item) => genQ(item.move, 1, { t })));
    setAnswers([]);
    setIndex(0);
    setPicked(null);
    lockRef.current = false;
    setStep('quiz');
  };

  const finish = (method: 'quiz' | 'self', finalAnswers: PlacementAnswer[]) => {
    const grade = method === 'quiz' ? scorePlacement(selfGrade, finalAnswers) : selfGrade;
    setProfile(createPlayerProfile({
      grade,
      selfGrade,
      method,
      quiz: method === 'quiz'
        ? { correct: finalAnswers.filter((answer) => answer.correct).length, total: finalAnswers.length }
        : null,
    }));
    setStep('result');
  };

  const answer = (choiceIndex: number | null) => {
    if (lockRef.current) return;
    lockRef.current = true;
    const question = questions[index];
    const correct = choiceIndex !== null && question.choices[choiceIndex] === question.answer;
    const next = [...answers, { grade: plan[index].grade, correct }];
    setPicked(choiceIndex ?? -1);
    setAnswers(next);
    window.setTimeout(() => {
      lockRef.current = false;
      setPicked(null);
      if (index + 1 >= questions.length) finish('quiz', next);
      else setIndex(index + 1);
    }, correct ? 550 : 1100);
  };

  const recommended = profile
    ? STARTERS.filter((starter) => isStarterRecommended(starter.gradeRange, profile.grade))
      .map((starter) => localizeStarterDisplayName(starter.name, starter.id, locale))
    : [];

  return (
    <main className="placement-screen">
      <header className="placement-header">
        <button type="button" className="placement-back" onClick={onCancel} aria-label={t('placement.back', 'Back')}>←</button>
        <h1 className="placement-title">🎓 {t('placement.title', 'Find your level')}</h1>
      </header>

      {step === 'grade' && (
        <section className="placement-card">
          <p className="placement-lead">{t('placement.askGrade', 'Which grade are you in?')}</p>
          <p className="placement-sub">{t('placement.askGradeSub', 'A parent can help choose.')}</p>
          <div className="placement-grades">
            {GRADES.map((grade) => (
              <button
                key={grade}
                type="button"
                className={`placement-grade${grade === selfGrade ? ' is-selected' : ''}`}
                onClick={() => { setSelfGrade(grade); setStep('intro'); }}
              >
                {t('placement.gradeN', 'Grade {n}', { n: grade })}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'intro' && (
        <section className="placement-card">
          <p className="placement-lead">
            {t('placement.introLead', "Let's try {count} quick questions so the battles feel just right!", { count: plan.length })}
          </p>
          <p className="placement-sub">{t('placement.introSub', "It's not a test. If you haven't learned something yet, just tap \"Not yet\".")}</p>
          <button type="button" className="placement-primary" onClick={startQuiz}>
            {t('placement.start', 'Start')}
          </button>
          <button type="button" className="placement-secondary" onClick={() => finish('self', [])}>
            {t('placement.skip', 'Skip and use grade {n}', { n: selfGrade })}
          </button>
        </section>
      )}

      {step === 'quiz' && questions[index] && (
        <section className="placement-card" aria-live="polite">
          <div className="placement-progress">
            {plan.map((_, i) => (
              <span key={i} className={`placement-dot${i < index ? ' is-done' : i === index ? ' is-now' : ''}`} />
            ))}
          </div>
          <div className="placement-question">
            {renderMathText(questions[index].display)}
            {needsEqualPrompt(questions[index].display, questions[index].op) ? ' = ?' : ''}
          </div>
          <div className="placement-choices">
            {questions[index].choices.map((choice, i) => {
              const isAnswer = choice === questions[index].answer;
              const state = picked === null ? '' : isAnswer ? ' is-correct' : picked === i ? ' is-wrong' : '';
              return (
                <button
                  key={`${index}-${i}`}
                  type="button"
                  className={`placement-choice${state}`}
                  onClick={() => answer(i)}
                  disabled={picked !== null}
                >
                  {renderMathText(questions[index].choiceLabels?.[i] ?? choice)}
                </button>
              );
            })}
          </div>
          <button type="button" className="placement-notyet" onClick={() => answer(null)} disabled={picked !== null}>
            {t('placement.notYet', "Not yet learned")}
          </button>
        </section>
      )}

      {step === 'result' && profile && (
        <section className="placement-card">
          <p className="placement-lead">
            {t('placement.result', 'Questions will match grade {n}!', { n: profile.grade })}
          </p>
          {profile.quiz && (
            <p className="placement-sub">
              {t('placement.score', '{correct} of {total} correct', { correct: profile.quiz.correct, total: profile.quiz.total })}
              {profile.grade !== profile.selfGrade && (' · ' + (profile.grade < profile.selfGrade
                ? t('placement.adjustedDown', 'We start a little easier and level up as you win.')
                : t('placement.adjustedUp', 'You are ahead, so we start a bit harder!')))}
            </p>
          )}
          <p className="placement-sub">{t('placement.anyMonster', 'Any monster works: its attacks use questions from your grade.')}</p>
          {recommended.length > 0 && (
            <p className="placement-sub">
              {t('placement.recommended', 'Monsters made for your grade: {names}', { names: recommended.join('、') })}
            </p>
          )}
          <button type="button" className="placement-primary" onClick={() => onDone(profile)}>
            {t('placement.go', "Let's go!")}
          </button>
        </section>
      )}
    </main>
  );
}
