/**
 * useBattle — Core game-state hook.
 *
 * Owns every piece of mutable state that was previously crammed into App.jsx.
 * Returns a flat object of state values + action callbacks that the render
 * shell (App.jsx) can destructure.
 *
 * Design notes
 * ────────────
 * • A `stateRef` (sr) is kept in sync with the latest render so that
 *   setTimeout chains inside safeTo() always read *current* state,
 *   eliminating the stale-closure family of bugs.
 * • Async callbacks are guarded by an explicit gate token, invalidated on
 *   run/screen/battle transitions to prevent stale timers from mutating state.
 * • Evolution no longer races with advance() — a `pendingEvolve` ref
 *   gates the screen transition so it only fires when the user taps.
 * • Damage math is delegated to utils/damageCalc.js (pure, testable).
 * • Achievements, Encyclopedia, and SessionLog are extracted into sub-hooks
 *   (useAchievements, useEncyclopedia, useSessionLog) to keep this file focused.
 */
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useReducer } from 'react';

import { SCENE_NAMES } from '../data/scenes';
import {
  MAX_MOVE_LVL, POWER_CAPS, HITS_PER_LVL,
  TIMER_SEC, PLAYER_MAX_HP,
} from '../data/constants';

import { genQ } from '../utils/questionGenerator';
import {
  movePower, bestAttackType, bestEffectiveness,
  freezeChance,
} from '../utils/damageCalc';
import { useTimer } from './useTimer';
import { useAchievements } from './useAchievements';
import { useEncyclopedia } from './useEncyclopedia';
import { useSessionLog } from './useSessionLog';
import { useBattleRng } from './useBattleRng';
import { useBattleUIState } from './useBattleUIState';
import { ENC_TOTAL } from '../data/encyclopedia';
import sfx from '../utils/sfx';
import { buildRoster } from '../utils/rosterBuilder';
import {
  createAbilityModel,
  getDifficultyLevelForOps,
  resolveLevelProgress,
  updateAbilityModel,
} from '../utils/battleEngine';
import { appendEvent, createEventSessionId } from '../utils/eventLogger';
import {
  getAttackEffectClearDelay,
  getAttackEffectHitDelay,
  getAttackEffectNextStepDelay,
} from '../utils/effectTiming';
import { battleReducer, createInitialBattleState } from './battle/battleReducer';
import { effectOrchestrator } from './battle/effectOrchestrator';
import { runEnemyTurn } from './battle/enemyFlow';
import {
  resolvePlayerStrike,
  resolveRiskySelfDamage,
} from './battle/turnResolver';

// ── Constants (module-level to avoid re-allocation per render) ──
const DIFF_MODS = [0.7, 0.85, 1.0, 1.15, 1.3]; // diffLevel 0..4
const HIT_ANIMS = {
  fire: "enemyFireHit 0.6s ease", electric: "enemyElecHit 0.6s ease",
  water: "enemyWaterHit 0.7s ease", grass: "enemyGrassHit 0.6s ease",
  dark: "enemyDarkHit 0.8s ease", light: "enemyFireHit 0.6s ease",
};

// ═══════════════════════════════════════════════════════════════════
export function useBattle() {
  // ──── Sub-hooks ────
  const { achUnlocked, achPopup, tryUnlock, dismissAch } = useAchievements();
  const { encData, setEncData, updateEnc, updateEncDefeated } = useEncyclopedia();
  const { initSession, markQStart, logAns, endSession } = useSessionLog();
  const { rand, randInt, chance, pickIndex, reseed } = useBattleRng();
  const UI = useBattleUIState({ rand, randInt });

  const buildNewRoster = useCallback(() => buildRoster(pickIndex), [pickIndex]);
  const [enemies, setEnemies] = useState(buildNewRoster);

  // ──── Screen & mode ────
  const [screen, setScreenState] = useState("title");
  const [timedMode, setTimedMode] = useState(false);

  // ──── Player ────
  const [starter, setStarter] = useState(null);
  const [battle, dispatchBattle] = useReducer(battleReducer, undefined, createInitialBattleState);
  const {
    pHp, pExp, pLvl, pStg,
    round, enemy, eHp,
    streak, passiveCount, charge, tC, tW, defeated, maxStreak,
    mHits, mLvls, mLvlUp,
    burnStack, frozen, staticStack, specDef, defAnim, cursed,
    diffLevel,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns,
  } = battle;

  const setBattleField = (key, value) => dispatchBattle({ type: "set_field", key, value });
  const setPHp = (value) => setBattleField("pHp", value);
  const setPExp = (value) => setBattleField("pExp", value);
  const setPLvl = (value) => setBattleField("pLvl", value);
  const setPStg = (value) => setBattleField("pStg", value);
  const setEHp = (value) => setBattleField("eHp", value);
  const setStreak = (value) => setBattleField("streak", value);
  const setPassiveCount = (value) => setBattleField("passiveCount", value);
  const setCharge = (value) => setBattleField("charge", value);
  const setTC = (value) => setBattleField("tC", value);
  const setTW = (value) => setBattleField("tW", value);
  const setDefeated = (value) => setBattleField("defeated", value);
  const setMaxStreak = (value) => setBattleField("maxStreak", value);
  const setMHits = (value) => setBattleField("mHits", value);
  const setMLvls = (value) => setBattleField("mLvls", value);
  const setMLvlUp = (value) => setBattleField("mLvlUp", value);
  const setBurnStack = (value) => setBattleField("burnStack", value);
  const setFrozen = (value) => setBattleField("frozen", value);
  const setStaticStack = (value) => setBattleField("staticStack", value);
  const setSpecDef = (value) => setBattleField("specDef", value);
  const setDefAnim = (value) => setBattleField("defAnim", value);
  const setCursed = (value) => setBattleField("cursed", value);
  const setDiffLevel = (value) => setBattleField("diffLevel", value);
  const setBossPhase = (value) => setBattleField("bossPhase", value);
  const setBossTurn = (value) => setBattleField("bossTurn", value);
  const setBossCharging = (value) => setBattleField("bossCharging", value);
  const setSealedMove = (value) => setBattleField("sealedMove", value);
  const setSealedTurns = (value) => setBattleField("sealedTurns", value);

  // ──── Phase & UI ────
  const {
    phase, setPhase,
    selIdx, setSelIdx,
    q, setQ,
    fb, setFb,
    bText, setBText,
    answered, setAnswered,
    dmgs, setDmgs,
    parts, setParts,
    eAnim, setEAnim,
    pAnim, setPAnim,
    atkEffect, setAtkEffect,
    effMsg, setEffMsg,
    addD, rmD,
    addP, rmP,
  } = UI;

  // ──── Status refs ────
  const frozenR = useRef(false);

  // ──── Learning model 2.0: per-question-type adaptive difficulty ────
  const abilityModelRef = useRef(createAbilityModel(2));

  const _updateAbility = (op, correct) => {
    if (!op) return;
    const { nextModel, nextLevel } = updateAbilityModel({
      model: abilityModelRef.current,
      op,
      correct,
    });
    abilityModelRef.current = nextModel;
    setDiffLevel(nextLevel);
  };

  const _getMoveDiffLevel = (move) => (
    getDifficultyLevelForOps(abilityModelRef.current, move?.ops, 2)
  );

  // ──── Internal refs ────
  const runSeedRef = useRef(0);
  const asyncGateRef = useRef(0);
  const doEnemyTurnRef = useRef(() => {});
  const pendingEvolve = useRef(false);   // ← Bug #2 fix
  const evolveRound = useRef(0);        // round to resume after evolve screen
  const eventSessionIdRef = useRef(null);
  const sessionClosedRef = useRef(false);
  const sessionStartRef = useRef(0);

  // ──── State ref — always points at latest committed values ────
  // Use useLayoutEffect so the ref is updated synchronously after DOM commit,
  // before any setTimeout/safeTo callbacks fire. This prevents Concurrent Mode
  // from polluting sr.current with intermediate render values.
  const sr = useRef({});
  const _srSnapshot = {
    enemy, starter, eHp, pHp, pExp, pLvl, pStg,
    streak, passiveCount, charge, burnStack, frozen, staticStack, specDef, cursed,
    mHits, mLvls, selIdx, phase, round, q,
    screen, timedMode, diffLevel,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns,
    tC, tW, maxStreak, defeated,
  };
  useLayoutEffect(() => { sr.current = _srSnapshot; });

  // ──── Computed ────
  const expNext = pLvl * 30;
  const chargeReady = charge >= 3;

  const getPow = useCallback(
    (i) => starter ? movePower(starter.moves[i], mLvls[i], i) : 0,
    [starter, mLvls],
  );

  const dualEff = useCallback(
    (move) => bestEffectiveness(move, enemy),
    [enemy],
  );

  // ──── Safe timeout (cancelled on async-gate change or unmount) ────
  const activeTimers = useRef(new Set());
  const invalidateAsyncWork = useCallback(() => {
    asyncGateRef.current += 1;
    activeTimers.current.forEach(clearTimeout);
    activeTimers.current.clear();
  }, []);

  const safeTo = useCallback((fn, ms) => {
    const g = asyncGateRef.current;
    const id = setTimeout(() => {
      activeTimers.current.delete(id);
      if (g === asyncGateRef.current) fn();
    }, ms);
    activeTimers.current.add(id);
  }, []);
  // Cleanup all pending timers on unmount
  useEffect(() => () => { activeTimers.current.forEach(clearTimeout); activeTimers.current.clear(); }, []);

  // ═══════════════════════════════════════════════════════════════
  //  TIMER
  // ═══════════════════════════════════════════════════════════════
  const onTimeout = () => {
    const s = sr.current;
    setAnswered(true);
    setFb({ correct: false, answer: s.q?.answer, steps: s.q?.steps || [] });
    sfx.play("timeout");
    setTW(w => w + 1);
    setStreak(0); setPassiveCount(0);
    setCharge(0);
    // ── Session logging: timeout counts as wrong ──
    const answerTimeMs = logAns(s.q, false);
    _updateAbility(s.q?.op, false);
    appendEvent("question_answered", {
      outcome: "timeout",
      correct: false,
      selectedAnswer: null,
      expectedAnswer: s.q?.answer ?? null,
      answerTimeMs,
      op: s.q?.op ?? null,
      display: s.q?.display ?? null,
      moveIndex: s.selIdx ?? -1,
      moveName: s.starter?.moves?.[s.selIdx]?.name || null,
      moveType: s.starter?.moves?.[s.selIdx]?.type || null,
      timedMode: !!s.timedMode,
      diffLevel: s.diffLevel ?? null,
      round: s.round ?? 0,
    }, { sessionId: eventSessionIdRef.current });
    setBText("⏰ 時間到！來不及出招！");
    setPhase("text");
    // Read enemy from stateRef so we never hit a stale closure
    safeTo(() => doEnemyTurnRef.current(), 1500);
  };

  const {
    paused: _PAUSED,
    startTimer, clearTimer, pauseTimer, resumeTimer,
    subscribeTimerLeft, getTimerLeft,
  } = useTimer(TIMER_SEC, onTimeout);

  const setScreen = useCallback((nextScreen) => {
    const prevScreen = sr.current.screen;
    if (prevScreen === "battle" && nextScreen !== "battle") {
      clearTimer();
      invalidateAsyncWork();
    }
    setScreenState(nextScreen);
  }, [clearTimer, invalidateAsyncWork]);

  const [gamePaused, setGamePaused] = useState(false);

  const togglePause = useCallback(() => {
    if (gamePaused) { resumeTimer(); setGamePaused(false); }
    else { pauseTimer(); setGamePaused(true); }
  }, [gamePaused, pauseTimer, resumeTimer]);

  // Cleanup timer when leaving question phase
  useEffect(() => { if (phase !== "question") clearTimer(); }, [phase, clearTimer]);

  // ═══════════════════════════════════════════════════════════════
  //  BATTLE FLOW
  // ═══════════════════════════════════════════════════════════════

  // --- Start a battle against enemies[idx], optionally from a fresh roster ---
  const startBattle = (idx, roster) => {
    invalidateAsyncWork();
    clearTimer();
    const list = roster || enemies;
    const e = list[idx];
    dispatchBattle({ type: "start_battle", enemy: e, round: idx });
    frozenR.current = false;
    updateEnc(e); // ← encyclopedia: mark encountered
    const sn = SCENE_NAMES[e.sceneMType || e.mType] || "";
    setPhase("text");
    setBText(`【${sn}】野生的 ${e.name}(${e.typeIcon}${e.typeName}) Lv.${e.lvl} 出現了！`);
    setScreen("battle");
    effectOrchestrator.playBattleIntro({ safeTo, setEAnim, setPAnim });
  };

  // --- Full game reset (starterOverride used on first game when setStarter hasn't rendered yet) ---
  const startGame = (starterOverride) => {
    invalidateAsyncWork();
    runSeedRef.current += 1;
    reseed(runSeedRef.current * 2654435761);
    clearTimer();
    sessionClosedRef.current = false;
    sessionStartRef.current = Date.now();
    eventSessionIdRef.current = createEventSessionId();
    // Regenerate roster so slime variants are re-randomised each game
    const newRoster = buildNewRoster();
    setEnemies(newRoster);
    dispatchBattle({ type: "reset_run", patch: { diffLevel: 2 } });
    setDmgs([]); setParts([]); setAtkEffect(null); setEffMsg(null);
    frozenR.current = false;
    abilityModelRef.current = createAbilityModel(2);
    pendingEvolve.current = false;
    // Init session log — use override on first game since setStarter is async
    const s = starterOverride || sr.current.starter;
    appendEvent("starter_selected", {
      starterId: s?.id || null,
      starterName: s?.name || null,
      starterType: s?.type || null,
      timedMode: !!sr.current.timedMode,
    }, { sessionId: eventSessionIdRef.current });
    initSession(s, sr.current.timedMode);
    setScreen("battle");
    startBattle(0, newRoster);
  };

  // ── Finalize and persist session log ──
  const _endSession = (isCompleted, reasonOverride = null) => {
    if (sessionClosedRef.current) return;
    sessionClosedRef.current = true;
    const s = sr.current;
    const reason = reasonOverride || (isCompleted ? "clear" : "player_ko");
    const result = isCompleted ? "win" : reason === "quit" ? "quit" : "lose";
    appendEvent("battle_result", {
      result,
      reason,
      defeated: s.defeated || 0,
      finalLevel: s.pLvl || 1,
      maxStreak: s.maxStreak || 0,
      pHp: s.pHp || 0,
      tC: s.tC || 0,
      tW: s.tW || 0,
      timedMode: !!s.timedMode,
      durationMs: sessionStartRef.current > 0 ? Date.now() - sessionStartRef.current : null,
    }, { sessionId: eventSessionIdRef.current });
    endSession({
      defeated: s.defeated || 0,
      finalLevel: s.pLvl || 1,
      maxStreak: s.maxStreak || 0,
      pHp: s.pHp || 0,
      completed: !!isCompleted,
    });
  };

  const quitGame = () => {
    clearTimer();
    if (!sessionClosedRef.current) {
      const s = sr.current;
      appendEvent("game_exit", {
        reason: "quit_button",
        screen: s.screen || null,
        phase: s.phase || null,
        round: s.round || 0,
        defeated: s.defeated || 0,
        pHp: s.pHp || 0,
      }, { sessionId: eventSessionIdRef.current });
    }
    _endSession(false, "quit");
    setScreen("gameover");
  };

  // --- Handle a defeated enemy ---
  const handleVictory = (verb = "被打倒了") => {
    const s = sr.current;
    setBurnStack(0); setStaticStack(0); setFrozen(false); frozenR.current = false;
    setCursed(false);
    setBossPhase(0); setBossTurn(0); setBossCharging(false);
    setSealedMove(-1); setSealedTurns(0);
    const xp = s.enemy.lvl * 15;
    const progress = resolveLevelProgress({
      currentExp: s.pExp,
      currentLevel: s.pLvl,
      currentStage: s.pStg,
      gainExp: xp,
    });
    if (progress.evolveCount > 0) {
      pendingEvolve.current = true;
      sfx.play("evolve");
    }
    setPExp(progress.nextExp);
    if (progress.nextLevel !== s.pLvl) {
      setPLvl(progress.nextLevel);
      if (progress.hpBonus > 0) setPHp(h => Math.min(h + progress.hpBonus, PLAYER_MAX_HP));
    }
    setDefeated(d => d + 1);
    updateEncDefeated(s.enemy); // ← encyclopedia: mark defeated
    // ── Achievement checks on victory ──
    tryUnlock("first_win");
    if (s.enemy.id === "boss") tryUnlock("boss_kill");
    if (s.pHp <= 5) tryUnlock("low_hp");
    const drop = s.enemy.drops[randInt(0, s.enemy.drops.length - 1)];
    setBText(`${s.enemy.name} ${verb}！獲得 ${xp} 經驗值 ${drop}`);
    setPhase("victory"); sfx.play("victory");
  };

  // --- Frozen enemy skips turn ---
  const handleFreeze = () => {
    const s = sr.current;
    frozenR.current = false; setFrozen(false);
    setBText(`❄️ ${s.enemy.name} 被凍住了，無法攻擊！`);
    setPhase("text");
    safeTo(() => { setPhase("menu"); setBText(""); }, 1500);
  };

  // --- Player selects a move ---
  const selectMove = (i) => {
    if (phase !== "menu" || !starter) return;
    // Boss: sealed move check
    if (sr.current.sealedMove === i) return; // silently blocked, UI shows lock
    sfx.play("select");
    setSelIdx(i);
    const move = starter.moves[i];
    const lv = _getMoveDiffLevel(move);
    const diffMod = DIFF_MODS[lv] ?? DIFF_MODS[2];
    setDiffLevel(lv);
    setQ(genQ(move, diffMod));
    setFb(null);
    setAnswered(false);
    setPhase("question");
    markQStart(); // ← log question start time
    // Timed mode always uses standard question timer.
    if (timedMode) startTimer();
  };

  // --- Enemy turn logic (reads from stateRef) ---
  function doEnemyTurn() {
    runEnemyTurn({
      sr,
      safeTo,
      rand,
      randInt,
      chance,
      sfx,
      setSealedTurns,
      setSealedMove,
      setBossPhase,
      setBossTurn,
      setBossCharging,
      setBText,
      setPhase,
      setEAnim,
      setPAnim,
      setPHp,
      setSpecDef,
      setDefAnim,
      setEHp,
      setEffMsg,
      setCursed,
      addD,
      addP,
      _endSession,
      setScreen,
      handleVictory,
    });
  }
  useEffect(() => { doEnemyTurnRef.current = doEnemyTurn; });

  // --- Player answers a question ---
  const onAns = (choice) => {
    if (answered || !starter) return;
    setAnswered(true);
    clearTimer();
    const s = sr.current;
    const move = starter.moves[s.selIdx];
    const correct = choice === s.q.answer;

    // ── Session logging ──
    const answerTimeMs = logAns(s.q, correct);
    appendEvent("question_answered", {
      outcome: "submitted",
      correct,
      selectedAnswer: choice,
      expectedAnswer: s.q?.answer ?? null,
      answerTimeMs,
      op: s.q?.op ?? null,
      display: s.q?.display ?? null,
      moveIndex: s.selIdx ?? -1,
      moveName: move?.name || null,
      moveType: move?.type || null,
      timedMode: !!s.timedMode,
      diffLevel: s.diffLevel ?? null,
      round: s.round ?? 0,
    }, { sessionId: eventSessionIdRef.current });
    _updateAbility(s.q?.op, correct);

    if (correct) {
      setFb({ correct: true }); setTC(c => c + 1);
      const ns = s.streak + 1;
      sfx.play(ns >= 5 ? "crit" : "hit");
      setStreak(ns); setCharge(c => Math.min(c + 1, 3));
      if (ns > s.maxStreak) setMaxStreak(ns);

      // ── Passive counter: triggers specDef every 8 consecutive correct answers ──
      const np = s.passiveCount + 1;
      if (np >= 8) {
        setPassiveCount(0);
        if (!s.specDef) { setSpecDef(true); tryUnlock("spec_def"); sfx.play("specDef"); }
      } else {
        setPassiveCount(np);
      }

      // ── Achievement: streak milestones ──
      if (ns >= 5) tryUnlock("streak_5");
      if (ns >= 10) tryUnlock("streak_10");

      // Move hit tracking & level-up check
      const nh = [...s.mHits]; nh[s.selIdx]++;
      const cl = s.mLvls[s.selIdx];
      let didLvl = false;
      if (nh[s.selIdx] >= HITS_PER_LVL * cl && cl < MAX_MOVE_LVL) {
        const np = move.basePower + cl * move.growth;
        if (np <= POWER_CAPS[s.selIdx]) {
          const nl = [...s.mLvls]; nl[s.selIdx]++; setMLvls(nl);
          didLvl = true; nh[s.selIdx] = 0;
          setMLvlUp(s.selIdx); safeTo(() => setMLvlUp(null), 2000); sfx.play("levelUp");
          if (nl[s.selIdx] >= MAX_MOVE_LVL) tryUnlock("move_max");
          if (nl.every(v => v >= MAX_MOVE_LVL)) tryUnlock("all_moves_max");
        }
      }
      setMHits(nh);

      // Animation chain
      setPhase("playerAtk");
      effectOrchestrator.runPlayerLunge({
        safeTo,
        setPAnim,
        onReady: () => {
          const s2 = sr.current;
          const dmgType = bestAttackType(move, s2.enemy);
          const vfxType = move.risky && move.type2 ? move.type2 : dmgType;
          const effectMeta = {
            idx: s2.selIdx,
            lvl: s2.mLvls[s2.selIdx],
          };
          const effectTimeline = {
            hitDelay: getAttackEffectHitDelay(vfxType),
            clearDelay: getAttackEffectClearDelay(effectMeta),
            nextDelay: getAttackEffectNextStepDelay(effectMeta),
          };
          setAtkEffect({ type: vfxType, idx: effectMeta.idx, lvl: effectMeta.lvl });
          sfx.play(vfxType); // type-specific attack sound

          safeTo(() => {
            const s3 = sr.current;
            const strike = resolvePlayerStrike({
              move,
              enemy: s3.enemy,
              moveIdx: s3.selIdx,
              moveLvl: s3.mLvls[s3.selIdx],
              didLevel: didLvl,
              maxPower: POWER_CAPS[s3.selIdx],
              streak: ns,
              stageBonus: s3.pStg,
              cursed: s3.cursed,
              starterType: starter.type,
              playerHp: s3.pHp,
              bossPhase: s3.bossPhase,
            });
            const { eff, isFortress, wasCursed } = strike;
            let { dmg } = strike;
            // ── Phantom trait: 25% chance to dodge player attack ──
            const isPhantom = s3.enemy.trait === "phantom" && chance(0.25);
            if (isPhantom) {
              setEAnim("dodgeSlide 0.9s ease");
              setEffMsg({ text: "👻 幻影閃避！", color: "#c084fc" }); safeTo(() => setEffMsg(null), 1500);
              addD("MISS!", 155, 50, "#c084fc");
              safeTo(() => { setEAnim(""); setAtkEffect(null); }, effectTimeline.clearDelay);
              safeTo(() => doEnemyTurn(), effectTimeline.nextDelay);
              return; // skip all damage
            }
            if (wasCursed) setCursed(false);

            if (wasCursed) { setEffMsg({ text: "💀 詛咒弱化了攻擊...", color: "#a855f7" }); safeTo(() => setEffMsg(null), 1500); }
            else if (isFortress) { setEffMsg({ text: "🛡️ 鐵壁減傷！", color: "#94a3b8" }); safeTo(() => setEffMsg(null), 1500); }
            else if (starter.type === "light" && s3.pHp < PLAYER_MAX_HP * 0.5) { setEffMsg({ text: "🦁 勇氣之心！ATK↑", color: "#f59e0b" }); safeTo(() => setEffMsg(null), 1500); }
            else if (eff > 1) { setEffMsg({ text: "效果絕佳！", color: "#22c55e" }); safeTo(() => setEffMsg(null), 1500); }
            else if (eff < 1) { setEffMsg({ text: "效果不好...", color: "#94a3b8" }); safeTo(() => setEffMsg(null), 1500); }

            // Boss: interrupt charging on correct answer
            if (s3.bossCharging) {
              setBossCharging(false);
              safeTo(() => addD("💥打斷蓄力！", 155, 30, "#fbbf24"), 400);
            }

            let afterHp = Math.max(0, s3.eHp - dmg);

            // Fire: burn
            let newBurn = s3.burnStack;
            if (starter.type === "fire" && afterHp > 0) {
              newBurn = Math.min(s3.burnStack + 1, 5); setBurnStack(newBurn);
              const bd = newBurn * 2;
              afterHp = Math.max(0, afterHp - bd);
              safeTo(() => addD(`🔥-${bd}`, 155, 50, "#f97316"), 500);
            }
            // Grass: heal
            if (starter.type === "grass") {
              const heal = 2 * s3.mLvls[s3.selIdx];
              setPHp(h => Math.min(h + heal, PLAYER_MAX_HP)); sfx.play("heal");
              safeTo(() => addD(`+${heal}`, 50, 165, "#22c55e"), 500);
            }
            // Water: freeze
            let willFreeze = false;
            if (starter.type === "water" && afterHp > 0) {
              if (chance(freezeChance(s3.mLvls[s3.selIdx]))) {
                willFreeze = true; setFrozen(true); frozenR.current = true; sfx.play("freeze");
                safeTo(() => addD("❄️凍結", 155, 50, "#38bdf8"), 600);
              }
            }
            // Electric: static charge — accumulate, discharge at 3 stacks
            if (starter.type === "electric" && afterHp > 0) {
              const newStatic = Math.min(s3.staticStack + 1, 3);
              setStaticStack(newStatic);
              if (newStatic >= 3) {
                const sd = 3 * 4; // 3 stacks × 4 damage
                afterHp = Math.max(0, afterHp - sd);
                setStaticStack(0); sfx.play("staticDischarge");
                safeTo(() => addD(`⚡-${sd}`, 155, 50, "#fbbf24"), 500);
              }
            }

            setEHp(afterHp);
            setEAnim(HIT_ANIMS[vfxType] || "enemyHit 0.5s ease");
            const dmgColor = { fire: "#ef4444", electric: "#fbbf24", water: "#3b82f6", grass: "#22c55e", dark: "#a855f7", light: "#f59e0b" }[vfxType] || "#ef4444";
            addD(`-${dmg}`, 140, 55, dmgColor);
            safeTo(() => { setEAnim(""); setAtkEffect(null); }, effectTimeline.clearDelay);

            // ── Counter trait: reflect 20% damage back to player ──
            if (s3.enemy.trait === "counter" && afterHp > 0) {
              const refDmg = Math.round(dmg * 0.2);
              if (refDmg > 0) {
                safeTo(() => {
                  const s4 = sr.current;
                  const nh4 = Math.max(0, s4.pHp - refDmg);
                  setPHp(nh4); setPAnim("playerHit 0.5s ease");
                  addD(`🛡️-${refDmg}`, 60, 170, "#60a5fa");
                  setEffMsg({ text: "🛡️ 反擊裝甲！", color: "#60a5fa" }); safeTo(() => setEffMsg(null), 1500);
                  safeTo(() => setPAnim(""), 500);
                  if (nh4 <= 0) safeTo(() => { sfx.play("ko"); _endSession(false); setPhase("ko"); setBText("你的夥伴被反擊傷害打倒了..."); setScreen("gameover"); }, 800);
                }, 600);
              }
            }

            // Achievement: one-hit KO (dealt damage >= enemy maxHp)
            if (afterHp <= 0 && dmg >= s3.enemy.maxHp) tryUnlock("one_hit");
            if (afterHp <= 0) safeTo(() => handleVictory(), effectTimeline.nextDelay);
            else if (willFreeze) safeTo(() => handleFreeze(), effectTimeline.nextDelay);
            else safeTo(() => doEnemyTurn(), effectTimeline.nextDelay);
          }, effectTimeline.hitDelay);
        },
      });
    } else {
      // Wrong answer
      setFb({ correct: false, answer: s.q.answer, steps: s.q.steps || [] }); sfx.play("wrong");
      setTW(w => w + 1); setStreak(0); setPassiveCount(0); setCharge(0);
      safeTo(() => {
        const s2 = sr.current;
        if (move.risky) {
          const sd = resolveRiskySelfDamage({
            move,
            moveLvl: s2.mLvls[s2.selIdx],
            moveIdx: s2.selIdx,
          });
          const nh2 = Math.max(0, s2.pHp - sd);
          setPHp(nh2); setPAnim("playerHit 0.5s ease");
          addD(`-${sd}`, 40, 170, "#ef4444");
          safeTo(() => setPAnim(""), 500);
          setBText(`${move.name} 失控了！自己受到 ${sd} 傷害！`);
          setPhase("text");
          safeTo(() => {
            if (nh2 <= 0) { _endSession(false); setPhase("ko"); setBText("你的夥伴倒下了..."); setScreen("gameover"); }
            else if (frozenR.current) handleFreeze();
            else doEnemyTurn();
          }, 1500);
        } else {
          let mt = "攻擊落空了！";
          if (s2.burnStack > 0) {
            const bd = s2.burnStack * 2;
            const nh3 = Math.max(0, s2.eHp - bd);
            setEHp(nh3); addD(`🔥-${bd}`, 155, 50, "#f97316");
            mt += ` 灼燒-${bd}！`;
            if (nh3 <= 0) {
              setBText(mt); setPhase("text");
              safeTo(() => handleVictory("被灼燒打倒了"), 1200);
              return;
            }
          }
          setBText(mt); setPhase("text");
          if (frozenR.current) safeTo(() => handleFreeze(), 1200);
          else safeTo(() => doEnemyTurn(), 1200);
        }
      }, 2500);
    }
  };

  // --- Advance from text / victory phase ---
  const advance = () => {
    if (phase === "text") { setPhase("menu"); setBText(""); }
    else if (phase === "victory") {
      // Bug #2 fix: if an evolution is pending, go to evolve screen
      // instead of starting next battle (eliminates timer-based race).
      if (pendingEvolve.current) {
        pendingEvolve.current = false;
        // Apply evolution state NOW (deferred from win handler so battle
        // screen kept showing the pre-evolution sprite during victory).
        setPStg(st => { if (st + 1 >= 2) tryUnlock("evolve_max"); return Math.min(st + 1, 2); });
        setPHp(PLAYER_MAX_HP);
        setMLvls(prev => prev.map(v => Math.min(v + 1, MAX_MOVE_LVL)));
        evolveRound.current = round;   // remember which round to resume from
        setScreen("evolve");
        return;
      }
      const nx = round + 1;
      if (nx >= enemies.length) {
        _finishGame();
      }
      else { setPHp(h => Math.min(h + 10, PLAYER_MAX_HP)); startBattle(nx); }
    }
  };

  // --- Shared game-completion logic (achievements + session save) ---
  const _finishGame = () => {
    const s = sr.current;
    if (s.tW === 0) tryUnlock("perfect");
    if (s.timedMode) tryUnlock("timed_clear");
    if (s.pHp >= PLAYER_MAX_HP) tryUnlock("no_damage");
    if (s.starter) {
      const sid = s.starter.id;
      if (sid === "fire") tryUnlock("fire_clear");
      else if (sid === "water") tryUnlock("water_clear");
      else if (sid === "grass") tryUnlock("grass_clear");
      else if (sid === "electric") tryUnlock("electric_clear");
      else if (sid === "lion") tryUnlock("lion_clear");
    }
    setEncData(prev => {
      if (Object.keys(prev.encountered).length >= ENC_TOTAL) tryUnlock("enc_all");
      if (Object.keys(prev.defeated).length >= ENC_TOTAL) tryUnlock("enc_defeat");
      return prev;
    });
    _endSession(true);
    setScreen("gameover");
  };

  // --- Continue from evolve screen → start next battle ---
  const continueAfterEvolve = () => {
    const nx = evolveRound.current + 1;
    if (nx >= enemies.length) {
      _finishGame();
    } else {
      startBattle(nx);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    // ── State (read by render shell) ──
    screen, timedMode, enemies,
    starter, pHp, pExp, pLvl, pStg,
    round, enemy, eHp,
    streak, passiveCount, charge, tC, tW, defeated, maxStreak,
    mHits, mLvls, mLvlUp,
    phase, selIdx, q, fb, bText, answered,
    dmgs, parts, eAnim, pAnim, atkEffect, effMsg,
    burnStack, frozen, staticStack, specDef, defAnim, cursed,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns, diffLevel,
    gamePaused, timerSubscribe: subscribeTimerLeft, getTimerLeft,
    expNext, chargeReady,

    // ── Achievements & Encyclopedia ──
    achUnlocked, achPopup, encData, dismissAch,

    // ── Actions ──
    setTimedMode, setScreen, setStarter,
    startGame, selectMove, onAns, advance, continueAfterEvolve,
    quitGame, togglePause,

    // ── Helpers exposed for render ──
    getPow, dualEff,
    rmD, rmP,
    // ── SFX ──
    sfx,
  };
}
