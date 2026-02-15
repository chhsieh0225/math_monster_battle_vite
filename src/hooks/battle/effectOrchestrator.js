export const effectOrchestrator = {
  playBattleIntro({ safeTo, setEAnim, setPAnim }) {
    setEAnim("slideInBattle 0.6s ease");
    setPAnim("slideInPlayer 0.6s ease");
    safeTo(() => {
      setEAnim("");
      setPAnim("");
    }, 700);
  },

  runEnemyLunge({ safeTo, setEAnim, onStrike, strikeDelay = 500 }) {
    setEAnim("enemyAttackLunge 0.6s ease");
    safeTo(() => {
      setEAnim("");
      if (onStrike) onStrike();
    }, strikeDelay);
  },

  runPlayerLunge({ safeTo, setPAnim, onReady, startDelay = 600, settleDelay = 400 }) {
    safeTo(() => {
      setPAnim("attackLunge 0.6s ease");
      safeTo(() => {
        setPAnim("");
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
  }) {
    if (onHit) safeTo(onHit, hitDelay);
    if (onClear) safeTo(onClear, clearDelay);
    if (onNext) safeTo(onNext, nextDelay);
  },
};
