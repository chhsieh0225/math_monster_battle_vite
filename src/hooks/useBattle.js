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
  MAX_MOVE_LVL,
  TIMER_SEC, PLAYER_MAX_HP,
} from '../data/constants';
import { STARTERS } from '../data/starters';

import { genQ } from '../utils/questionGenerator';
import {
  movePower,
  bestEffectiveness,
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
import { nowMs } from '../utils/time';
import {
  battleReducer,
  createInitialBattleState,
} from './battle/battleReducer';
import { effectOrchestrator } from './battle/effectOrchestrator';
import { runEnemyTurn } from './battle/enemyFlow';
import { runPlayerAnswer } from './battle/playerFlow';
import { resolvePvpStrike } from './battle/turnResolver';

// ── Constants (module-level to avoid re-allocation per render) ──
const DIFF_MODS = [0.7, 0.85, 1.0, 1.15, 1.3]; // diffLevel 0..4
const PARTNER_BY_STARTER = {
  fire: "water",
  water: "electric",
  grass: "fire",
  electric: "grass",
  lion: "water",
};

function pickPartnerStarter(mainStarter, pickIndex) {
  if (!mainStarter) return null;
  const preferId = PARTNER_BY_STARTER[mainStarter.id];
  const preferred = STARTERS.find((s) => s.id === preferId);
  if (preferred) return preferred;
  const pool = STARTERS.filter((s) => s.id !== mainStarter.id);
  if (pool.length <= 0) return null;
  return pool[pickIndex(pool.length)];
}

const TYPE_TO_SCENE = {
  fire: "fire",
  ghost: "ghost",
  steel: "steel",
  dark: "dark",
  grass: "grass",
  water: "grass",
  electric: "steel",
  light: "grass",
};

function createPvpEnemyFromStarter(starter) {
  if (!starter) return null;
  return {
    id: `pvp_${starter.id}`,
    name: starter.name,
    maxHp: PLAYER_MAX_HP,
    hp: PLAYER_MAX_HP,
    atk: 12,
    lvl: 1,
    mType: starter.type,
    sceneMType: TYPE_TO_SCENE[starter.type] || "grass",
    typeIcon: starter.typeIcon,
    typeName: starter.typeName,
    c1: starter.c1,
    c2: starter.c2,
    trait: "normal",
    traitName: "玩家",
    drops: ["🏁"],
    svgFn: starter.stages[0].svgFn,
  };
}

// ═══════════════════════════════════════════════════════════════════
export function useBattle() {
  // ──── Sub-hooks ────
  const { achUnlocked, achPopup, tryUnlock, dismissAch } = useAchievements();
  const { encData, setEncData, updateEnc, updateEncDefeated } = useEncyclopedia();
  const { initSession, markQStart, logAns, endSession } = useSessionLog();
  const { rand, randInt, chance, pickIndex, reseed } = useBattleRng();
  const UI = useBattleUIState({ rand, randInt });

  const buildNewRoster = useCallback((mode = "single") => buildRoster(pickIndex, mode), [pickIndex]);
  const [enemies, setEnemies] = useState(() => buildNewRoster("single"));

  // ──── Screen & mode ────
  const [screen, setScreenState] = useState("title");
  const [timedMode, setTimedMode] = useState(false);
  const [battleMode, setBattleMode] = useState("single");
  const [coopActiveSlot, setCoopActiveSlot] = useState("main");
  const [pvpStarter2, setPvpStarter2] = useState(null);
  const [pvpHp2, setPvpHp2] = useState(PLAYER_MAX_HP);
  const [pvpTurn, setPvpTurn] = useState("p1");
  const [pvpWinner, setPvpWinner] = useState(null);

  // ──── Player ────
  const [starter, setStarter] = useState(null);
  const [battle, dispatchBattle] = useReducer(battleReducer, undefined, createInitialBattleState);
  const {
    pHp, allySub, pHpSub, pExp, pLvl, pStg,
    round, enemy, eHp, enemySub, eHpSub,
    streak, passiveCount, charge, tC, tW, defeated, maxStreak,
    mHits, mLvls, mLvlUp,
    burnStack, frozen, staticStack, specDef, defAnim, cursed,
    diffLevel,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns,
  } = battle;

  const setBattleField = (key, value) => dispatchBattle({ type: "set_field", key, value });
  const setPHp = (value) => setBattleField("pHp", value);
  const setAllySub = (value) => setBattleField("allySub", value);
  const setPHpSub = (value) => setBattleField("pHpSub", value);
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

  const getActingStarter = (state) => {
    if (!state) return null;
    if (state.battleMode === "pvp") {
      return state.pvpTurn === "p1" ? state.starter : state.pvpStarter2;
    }
    const isCoopSubActive = (
      (state.battleMode === "coop" || state.battleMode === "double")
      && state.coopActiveSlot === "sub"
      && state.allySub
      && (state.pHpSub || 0) > 0
    );
    return isCoopSubActive ? state.allySub : state.starter;
  };

  // ──── Internal refs ────
  const runSeedRef = useRef(0);
  const asyncGateRef = useRef(0);
  const doEnemyTurnRef = useRef(() => {});
  const pendingEvolve = useRef(false);   // ← Bug #2 fix
  const eventSessionIdRef = useRef(null);
  const sessionClosedRef = useRef(false);
  const sessionStartRef = useRef(0);

  // ──── State ref — always points at latest committed values ────
  // Use useLayoutEffect so the ref is updated synchronously after DOM commit,
  // before any setTimeout/safeTo callbacks fire. This prevents Concurrent Mode
  // from polluting sr.current with intermediate render values.
  const sr = useRef({});
  const _srSnapshot = {
    enemy, enemySub, starter, allySub, eHp, eHpSub, pHp, pHpSub, pExp, pLvl, pStg,
    streak, passiveCount, charge, burnStack, frozen, staticStack, specDef, cursed,
    mHits, mLvls, selIdx, phase, round, q,
    screen, timedMode, battleMode, diffLevel,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns,
    tC, tW, maxStreak, defeated,
    coopActiveSlot,
    pvpStarter2, pvpHp2, pvpTurn, pvpWinner,
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
    if (s.battleMode === "pvp") {
      setAnswered(true);
      setFb({ correct: false, answer: s.q?.answer, steps: s.q?.steps || [] });
      setTW(w => w + 1);
      setBText(`⏰ ${s.pvpTurn === "p1" ? "玩家1" : "玩家2"} 超時，回合交換！`);
      setPvpTurn((t) => (t === "p1" ? "p2" : "p1"));
      setPhase("text");
      return;
    }
    setAnswered(true);
    setFb({ correct: false, answer: s.q?.answer, steps: s.q?.steps || [] });
    sfx.play("timeout");
    setTW(w => w + 1);
    setStreak(0); setPassiveCount(0);
    setCharge(0);
    // ── Session logging: timeout counts as wrong ──
    const answerTimeMs = logAns(s.q, false);
    _updateAbility(s.q?.op, false);
    const actingStarter = getActingStarter(s);
    appendEvent("question_answered", {
      outcome: "timeout",
      correct: false,
      selectedAnswer: null,
      expectedAnswer: s.q?.answer ?? null,
      answerTimeMs,
      op: s.q?.op ?? null,
      display: s.q?.display ?? null,
      moveIndex: s.selIdx ?? -1,
      moveName: actingStarter?.moves?.[s.selIdx]?.name || null,
      moveType: actingStarter?.moves?.[s.selIdx]?.type || null,
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
    if (!e) {
      _finishGame();
      return;
    }
    const mode = sr.current.battleMode || battleMode;
    const isTeamMode = mode === "double" || mode === "coop";
    const sub = isTeamMode ? (list[idx + 1] || null) : null;
    dispatchBattle({ type: "start_battle", enemy: e, enemySub: sub, round: idx });
    frozenR.current = false;
    updateEnc(e); // ← encyclopedia: mark encountered
    if (sub) updateEnc(sub);
    const sn = SCENE_NAMES[e.sceneMType || e.mType] || "";
    setPhase("text");
    const ally = sr.current.allySub;
    if (sub) {
      if (ally) {
        setBText(`【${sn}】2v2 開戰！我方 ${starter?.name || "主將"} 與 ${ally.name} 對上 ${e.name} 與 ${sub.name}！`);
      } else {
        setBText(`【${sn}】雙打戰！${e.name}(${e.typeIcon}${e.typeName}) 與 ${sub.name}(${sub.typeIcon}${sub.typeName}) 出現了！`);
      }
    } else {
      setBText(`【${sn}】野生的 ${e.name}(${e.typeIcon}${e.typeName}) Lv.${e.lvl} 出現了！`);
    }
    setScreen("battle");
    effectOrchestrator.playBattleIntro({ safeTo, setEAnim, setPAnim });
  };

  // --- Full game reset (starterOverride used on first game when setStarter hasn't rendered yet) ---
  const startGame = (starterOverride, modeOverride = null, allyOverride = null) => {
    invalidateAsyncWork();
    runSeedRef.current += 1;
    reseed(runSeedRef.current * 2654435761);
    clearTimer();
    sessionClosedRef.current = false;
    sessionStartRef.current = nowMs();
    eventSessionIdRef.current = createEventSessionId();
    // Regenerate roster so slime variants are re-randomised each game
    const mode = modeOverride || sr.current.battleMode || battleMode;
    const leader = starterOverride || sr.current.starter;
    const rival = allyOverride || sr.current.pvpStarter2 || pvpStarter2 || pickPartnerStarter(leader, pickIndex);

    if (mode === "pvp") {
      setEnemies([]);
      setCoopActiveSlot("main");
      dispatchBattle({
        type: "reset_run",
        patch: {
          diffLevel: 2,
          allySub: null,
          pHpSub: 0,
          pHp: PLAYER_MAX_HP,
        },
      });
      setPvpStarter2(rival);
      setPvpHp2(PLAYER_MAX_HP);
      setPvpTurn("p1");
      setPvpWinner(null);
      setDmgs([]); setParts([]); setAtkEffect(null); setEffMsg(null);
      frozenR.current = false;
      abilityModelRef.current = createAbilityModel(2);
      pendingEvolve.current = false;
      appendEvent("starter_selected", {
        starterId: leader?.id || null,
        starterName: leader?.name || null,
        starterType: leader?.type || null,
        timedMode: false,
      }, { sessionId: eventSessionIdRef.current });
      initSession(leader, false);
      const enemyPvp = createPvpEnemyFromStarter(rival);
      dispatchBattle({ type: "start_battle", enemy: enemyPvp, enemySub: null, round: 0 });
      setPhase("text");
      setBText(`⚔️ 雙人對戰開始！${leader?.name || "玩家1"} vs ${rival?.name || "玩家2"}，輪到 ${leader?.name || "玩家1"}！`);
      setScreen("battle");
      effectOrchestrator.playBattleIntro({ safeTo, setEAnim, setPAnim });
      return;
    }

    const newRoster = buildNewRoster(mode);
    setEnemies(newRoster);
    setCoopActiveSlot("main");
    setPvpWinner(null);
    const isCoop = mode === "coop" || mode === "double";
    const partner = isCoop ? (allyOverride || pickPartnerStarter(leader, pickIndex)) : null;
    dispatchBattle({
      type: "reset_run",
      patch: {
        diffLevel: 2,
        allySub: partner,
        pHpSub: partner ? PLAYER_MAX_HP : 0,
        pHp: PLAYER_MAX_HP,
      },
    });
    setDmgs([]); setParts([]); setAtkEffect(null); setEffMsg(null);
    frozenR.current = false;
    abilityModelRef.current = createAbilityModel(2);
    pendingEvolve.current = false;
    // Init session log — use override on first game since setStarter is async
    const s = leader;
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
      durationMs: sessionStartRef.current > 0 ? nowMs() - sessionStartRef.current : null,
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

  const handlePlayerPartyKo = ({ target = "main", reason = "你的夥伴倒下了..." }) => {
    const s = sr.current;
    if (target === "sub") {
      setAllySub(null);
      setPHpSub(0);
      setCoopActiveSlot("main");
      if ((s.pHp || 0) <= 0) {
        _endSession(false);
        setPhase("ko");
        setBText(reason);
        setScreen("gameover");
        return "gameover";
      }
      setBText(`💫 ${s.allySub?.name || "副將"} 倒下了！`);
      setPhase("text");
      safeTo(() => {
        setPhase("menu");
        setBText("");
      }, 1100);
      return "sub_down";
    }

    if ((s.pHpSub || 0) > 0 && s.allySub) {
      const promoted = s.allySub;
      setStarter(promoted);
      setPStg(0);
      setPHp(s.pHpSub);
      setAllySub(null);
      setPHpSub(0);
      setCoopActiveSlot("main");
      setBText(`💫 ${promoted.name} 接替上場！`);
      setPhase("text");
      safeTo(() => {
        setPhase("menu");
        setBText("");
      }, 1200);
      return "promoted";
    }

    _endSession(false);
    setPhase("ko");
    setBText(reason);
    setScreen("gameover");
    return "gameover";
  };

  const runAllySupportTurn = ({ delayMs = 850, onDone } = {}) => {
    const s = sr.current;
    if ((s.battleMode !== "double" && s.battleMode !== "coop") || !s.allySub || (s.pHpSub || 0) <= 0 || !s.enemy) return false;
    if (!chance(0.45)) return false;

    safeTo(() => {
      const s2 = sr.current;
      if (!s2.allySub || (s2.pHpSub || 0) <= 0 || !s2.enemy) {
        if (onDone) onDone();
        return;
      }

      const base = 16 + Math.max(0, s2.pLvl - 1) * 2;
      const dmg = Math.min(28, Math.max(6, Math.round(base * (0.85 + rand() * 0.3))));
      const nh = Math.max(0, s2.eHp - dmg);
      setBText(`🤝 ${s2.allySub.name} 協同攻擊！`);
      setPhase("playerAtk");
      setEAnim("enemyWaterHit 0.45s ease");
      setEHp(nh);
      addD(`-${dmg}`, 140, 55, "#60a5fa");
      addP("starter", 120, 130, 3);
      sfx.play("water");

      safeTo(() => setEAnim(""), 450);
      if (nh <= 0) {
        safeTo(() => handleVictory("被雙人連攜打倒了"), 700);
        return;
      }
      if (onDone) safeTo(onDone, 700);
    }, delayMs);

    return true;
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
    if (phase !== "menu") return;
    const s = sr.current;
    const activeStarter = getActingStarter(s);
    if (!activeStarter) return;
    // Boss: sealed move check
    if (s.battleMode !== "pvp" && s.sealedMove === i) return; // silently blocked, UI shows lock
    sfx.play("select");
    setSelIdx(i);
    const move = activeStarter.moves[i];
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
      setPHpSub,
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
      handlePlayerPartyKo,
    });
  }
  useEffect(() => { doEnemyTurnRef.current = doEnemyTurn; });

  // --- Player answers a question ---
  const onAns = (choice) => {
    if (answered) return;
    setAnswered(true);
    clearTimer();
    const s = sr.current;
    if (s.battleMode === "pvp") {
      const attacker = s.pvpTurn === "p1" ? s.starter : s.pvpStarter2;
      const defender = s.pvpTurn === "p1" ? s.pvpStarter2 : s.starter;
      if (!attacker || !defender || s.selIdx == null) return;
      const move = attacker.moves[s.selIdx];
      const correct = choice === s.q.answer;
      setFb({ correct, answer: s.q.answer, steps: s.q.steps || [] });
      if (correct) setTC((c) => c + 1);
      else setTW((w) => w + 1);
      if (correct) {
        const attackerHp = s.pvpTurn === "p1" ? s.pHp : s.pvpHp2;
        const strike = resolvePvpStrike({
          move,
          moveIdx: s.selIdx,
          attackerType: attacker.type,
          defenderType: defender.type,
          attackerHp,
          attackerMaxHp: PLAYER_MAX_HP,
          random: rand,
        });
        const dmg = strike.dmg;
        if (strike.eff > 1) {
          setEffMsg({ text: "效果絕佳！", color: "#22c55e" });
          safeTo(() => setEffMsg(null), 1200);
        } else if (strike.eff < 1) {
          setEffMsg({ text: "效果不佳", color: "#94a3b8" });
          safeTo(() => setEffMsg(null), 1200);
        }
        if (s.pvpTurn === "p1") {
          const nh = Math.max(0, s.pvpHp2 - dmg);
          setPvpHp2(nh);
          setEHp(nh);
          setEAnim("enemyHit 0.45s ease");
          addD(`-${dmg}`, 140, 55, "#ef4444");
          if (strike.heal > 0) {
            setPHp((h) => Math.min(PLAYER_MAX_HP, h + strike.heal));
            addD(`+${strike.heal}`, 52, 164, "#22c55e");
          }
          safeTo(() => setEAnim(""), 500);
          if (nh <= 0) {
            setPvpWinner("p1");
            setScreen("pvp_result");
            return;
          }
        } else {
          const nh = Math.max(0, s.pHp - dmg);
          setPHp(nh);
          setPAnim("playerHit 0.45s ease");
          addD(`-${dmg}`, 60, 170, "#ef4444");
          if (strike.heal > 0) {
            const healed = Math.min(PLAYER_MAX_HP, s.pvpHp2 + strike.heal);
            setPvpHp2(healed);
            setEHp(healed);
            addD(`+${strike.heal}`, 146, 54, "#22c55e");
          }
          safeTo(() => setPAnim(""), 500);
          if (nh <= 0) {
            setPvpWinner("p2");
            setScreen("pvp_result");
            return;
          }
        }
        setBText(`✅ ${attacker.name} 的 ${move.name} 命中！${strike.passiveLabel ? ` ${strike.passiveLabel}` : ""}`);
      } else {
        setBText(`❌ ${attacker.name} 答錯，攻擊落空！`);
      }
      setPvpTurn((t) => (t === "p1" ? "p2" : "p1"));
      setPhase("text");
      return;
    }

    const actingStarter = getActingStarter(s);
    const isCoopSubActive = !!(
      (s.battleMode === "coop" || s.battleMode === "double")
      && actingStarter
      && s.allySub
      && actingStarter.id === s.allySub.id
    );
    if (!actingStarter || s.selIdx == null) return;
    const move = actingStarter.moves[s.selIdx];
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
    runPlayerAnswer({
      correct,
      move,
      starter: actingStarter,
      attackerSlot: isCoopSubActive ? "sub" : "main",
      sr,
      safeTo,
      chance,
      sfx,
      setFb,
      setTC,
      setTW,
      setStreak,
      setPassiveCount,
      setCharge,
      setMaxStreak,
      setSpecDef,
      tryUnlock,
      setMLvls,
      setMLvlUp,
      setMHits,
      setPhase,
      setPAnim,
      setAtkEffect,
      setEAnim,
      setEffMsg,
      setBossCharging,
      setBurnStack,
      setPHp,
      setPHpSub,
      setFrozen,
      frozenR,
      setStaticStack,
      setEHp,
      addD,
      doEnemyTurn,
      handleVictory,
      handleFreeze,
      setCursed,
      _endSession,
      setScreen,
      setBText,
      handlePlayerPartyKo,
      runAllySupportTurn,
    });
  };

  // --- Advance from text / victory phase ---
  const continueFromVictory = () => {
    const s = sr.current;
    if ((s.battleMode === "double" || s.battleMode === "coop") && s.enemySub) {
      setScreen("battle");
      dispatchBattle({ type: "promote_enemy_sub" });
      setBText(`💥 ${s.enemySub.name} 補位上場！`);
      setPhase("text");
      return;
    }
    const nx = s.round + 1;
    if (nx >= enemies.length) {
      _finishGame();
    } else {
      setPHp(h => Math.min(h + 10, PLAYER_MAX_HP));
      if ((s.battleMode === "double" || s.battleMode === "coop") && s.allySub && (s.pHpSub || 0) > 0) {
        setPHpSub(h => Math.min(h + 8, PLAYER_MAX_HP));
      }
      startBattle(nx);
    }
  };

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
        setScreen("evolve");
        return;
      }
      continueFromVictory();
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
    continueFromVictory();
  };

  const toggleCoopActive = useCallback(() => {
    const s = sr.current;
    const canSwitch = (
      (s.battleMode === "coop" || s.battleMode === "double")
      && s.allySub
      && (s.pHpSub || 0) > 0
    );
    if (!canSwitch) return;
    setCoopActiveSlot((prev) => (prev === "main" ? "sub" : "main"));
  }, []);

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════
  return {
    // ── State (read by render shell) ──
    screen, timedMode, battleMode, enemies,
    starter, allySub, pHp, pHpSub, pExp, pLvl, pStg,
    coopActiveSlot,
    pvpStarter2, pvpHp2, pvpTurn, pvpWinner,
    round, enemy, eHp, enemySub, eHpSub,
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
    setTimedMode, setBattleMode, setScreen, setStarter, setPvpStarter2,
    startGame, selectMove, onAns, advance, continueAfterEvolve,
    quitGame, togglePause, toggleCoopActive,

    // ── Helpers exposed for render ──
    getPow, dualEff,
    rmD, rmP,
    // ── SFX ──
    sfx,
  };
}
