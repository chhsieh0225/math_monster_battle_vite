type SafeTo = (fn: () => void, ms: number) => void;
type TextSetter = (value: string) => void;

type BattleIntroArgs = {
  safeTo: SafeTo;
  setEAnim: TextSetter;
  setPAnim: TextSetter;
};

type EnemyLungeArgs = {
  safeTo: SafeTo;
  setEAnim: TextSetter;
  onStrike?: () => void;
  strikeDelay?: number;
};

type PlayerLungeArgs = {
  safeTo: SafeTo;
  setPAnim: TextSetter;
  onReady?: () => void;
  startDelay?: number;
  settleDelay?: number;
};

type AttackEffectTimelineArgs = {
  safeTo: SafeTo;
  onHit?: () => void;
  onClear?: () => void;
  onNext?: () => void;
  hitDelay: number;
  clearDelay: number;
  nextDelay: number;
};

export const effectOrchestrator = {
  playBattleIntro({ safeTo, setEAnim, setPAnim }: BattleIntroArgs): void {
    setEAnim('slideInBattle 0.6s ease');
    setPAnim('slideInPlayer 0.6s ease');
    safeTo(() => {
      setEAnim('');
      setPAnim('');
    }, 700);
  },

  runEnemyLunge({ safeTo, setEAnim, onStrike, strikeDelay = 500 }: EnemyLungeArgs): void {
    setEAnim('enemyAttackLunge 0.6s ease');
    safeTo(() => {
      setEAnim('');
      if (onStrike) onStrike();
    }, strikeDelay);
  },

  runPlayerLunge({
    safeTo,
    setPAnim,
    onReady,
    startDelay = 600,
    settleDelay = 400,
  }: PlayerLungeArgs): void {
    safeTo(() => {
      setPAnim('attackLunge 0.6s ease');
      safeTo(() => {
        setPAnim('');
        if (onReady) onReady();
      }, settleDelay);
    }, startDelay);
  },

  runAttackEffectTimeline({
    safeTo,
    onHit,
    onClear,
    onNext,
    hitDelay,
    clearDelay,
    nextDelay,
  }: AttackEffectTimelineArgs): void {
    if (onHit) safeTo(onHit, hitDelay);
    if (onClear) safeTo(onClear, clearDelay);
    if (onNext) safeTo(onNext, nextDelay);
  },
};
