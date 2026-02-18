import { memo, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import type {
  FeedbackVm,
  MoveVm,
  QuestionVm,
  StarterVm,
  TimerSubscribe,
} from '../../../types/battle';

const NOOP_SUBSCRIBE: TimerSubscribe = () => () => {};
const ZERO_SNAPSHOT = (): number => 0;

type TranslatorParams = Record<string, string | number>;
type Translator = (key: string, fallback?: string, params?: TranslatorParams) => string;
type BattleCssVars = CSSProperties & Record<`--${string}`, string | number | undefined>;

type QuestionTimerHudProps = {
  timerSec: number;
  subscribe?: TimerSubscribe;
  getSnapshot?: () => number;
};

function QuestionTimerHud({ timerSec, subscribe, getSnapshot }: QuestionTimerHudProps) {
  const timerLeft = useSyncExternalStore(
    subscribe || NOOP_SUBSCRIBE,
    getSnapshot || ZERO_SNAPSHOT,
    getSnapshot || ZERO_SNAPSHOT,
  );
  const left = Math.max(0, Math.min(timerSec, timerLeft));
  const tone = left <= 1.5 ? '#ef4444' : left <= 3 ? '#f59e0b' : '#22c55e';
  const timerBarStyle: BattleCssVars = {
    '--battle-timer-width': `${left / timerSec * 100}%`,
    '--battle-timer-tone': tone,
    '--battle-timer-pulse': left <= 1.5 ? 'timerPulse 0.4s ease infinite' : 'none',
  };
  const timerTextStyle: BattleCssVars = {
    '--battle-timer-text-tone': left <= 1.5 ? '#ef4444' : left <= 3 ? '#f59e0b' : 'rgba(255,255,255,0.4)',
  };

  return (
    <>
      <div className="battle-timer-bar" style={timerBarStyle} />
      <div className="battle-timer-text" style={timerTextStyle}>
        {left.toFixed(1)}s
      </div>
    </>
  );
}

type BattleQuestionPanelProps = {
  t: Translator;
  question: QuestionVm;
  feedback: FeedbackVm | null;
  activeStarter: StarterVm;
  selectedMove: MoveVm;
  questionTypeLabel: string;
  timedMode: boolean;
  answered: boolean;
  questionTimerSec: number;
  timerSubscribe?: TimerSubscribe;
  getTimerSnapshot?: () => number;
  onAnswer: (choice: number) => void;
};

export const BattleQuestionPanel = memo(function BattleQuestionPanel({
  t,
  question,
  feedback,
  activeStarter,
  selectedMove,
  questionTypeLabel,
  timedMode,
  answered,
  questionTimerSec,
  timerSubscribe,
  getTimerSnapshot,
  onAnswer,
}: BattleQuestionPanelProps) {
  return (
    <div className="battle-question-wrap">
      <div className="battle-question-head">
        <span className="battle-question-icon">{selectedMove.icon}</span>
        <span className="battle-question-title">{selectedMove.name}！</span>
        <span className="battle-question-sub">
          {activeStarter.typeIcon} {activeStarter.name}
        </span>
        <span className="battle-question-note">
          {timedMode ? t('battle.answer.timed', '⏱️ Timed Answer!') : t('battle.answer.hit', 'Answer correctly to hit')}
        </span>
      </div>

      <div className="battle-question-card">
        {timedMode && !answered && (
          <QuestionTimerHud
            timerSec={questionTimerSec}
            subscribe={timerSubscribe}
            getSnapshot={getTimerSnapshot}
          />
        )}
        <div className="battle-question-type">{questionTypeLabel}</div>
        <div className="question-expression battle-question-expression">
          {question.display}
          {question.op && question.op.startsWith('unknown') ? '' : ' = ?'}
        </div>
      </div>

      {feedback && (
        <div className={`battle-feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`}>
          {feedback.correct
            ? t('battle.feedback.hit', '✅ Hit!')
            : t('battle.feedback.answer', '❌ Answer is {answer}', { answer: feedback.answer ?? '?' })}
        </div>
      )}

      {feedback && (feedback.steps?.length || 0) > 0 && (
        <div className="battle-feedback-steps">
          <div className="battle-feedback-steps-title">📝 {t('battle.feedback.steps', 'Solution Steps:')}</div>
          {(feedback.steps ?? []).map((step: string, i: number) => (
            <div key={i} className="battle-feedback-step-row">
              {(feedback.steps?.length || 0) > 1 && (
                <span className="battle-feedback-step-index">
                  {t('battle.feedback.step', 'Step {index}.', { index: i + 1 })}
                </span>
              )}
              {step}
            </div>
          ))}
        </div>
      )}

      <div className="battle-answer-grid">
        {question.choices.map((choice: number, i: number) => {
          let answerState = '';
          if (feedback) answerState = choice === question.answer ? 'is-correct' : 'is-dim';
          return (
            <button
              className={`answer-btn battle-answer-btn ${answerState}`}
              key={i}
              onClick={() => onAnswer(choice)}
              disabled={answered}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
});
