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
 * • Evolution no longer races with advance() — a `pendingEvolve` ref
 *   gates the screen transition so it only fires when the user taps.
 * • Damage math is delegated to utils/damageCalc.js (pure, testable).
 * • Achievements, Encyclopedia, and SessionLog are extracted into sub-hooks
 *   (useAchievements, useEncyclopedia, useSessionLog) to keep this file focused.
 */
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

import { MONSTERS, SLIME_VARIANTS, getEff } from '../data/monsters';
import { SCENE_NAMES } from '../data/scenes';
import {
  MAX_MOVE_LVL, POWER_CAPS, HITS_PER_LVL,
  TIMER_SEC, PLAYER_MAX_HP, EFX,
} from '../data/constants';

import { genQ } from '../utils/questionGenerator';
import {
  movePower, bestAttackType, bestEffectiveness,
  calcAttackDamage, calcEnemyDamage, freezeChance,
} from '../utils/damageCalc';
import { useTimer } from './useTimer';
import { useAchievements } from './useAchievements';
import { useEncyclopedia } from './useEncyclopedia';
import { useSessionLog } from './useSessionLog';
import { ENC_TOTAL } from '../data/encyclopedia';
import sfx from '../utils/sfx';

// ── Constants (module-level to avoid re-allocation per render) ──
const DIFF_MODS = [0.7, 0.85, 1.0, 1.15, 1.3]; // diffLevel 0..4
const HIT_ANIMS = {
  fire: "enemyFireHit 0.6s ease", electric: "enemyElecHit 0.6s ease",
  water: "enemyWaterHit 0.7s ease", grass: "enemyGrassHit 0.6s ease",
  dark: "enemyDarkHit 0.8s ease",
};
const EFX_DELAY = { fire: 300, electric: 200, water: 350, grass: 280, dark: 400 };

// ═══════════════════════════════════════════════════════════════════
export function useBattle() {
  // ──── Sub-hooks ────
  const { achUnlocked, achPopup, tryUnlock, dismissAch } = useAchievements();
  const { encData, setEncData, updateEnc, updateEncDefeated } = useEncyclopedia();
  const { initSession, markQStart, logAns, endSession } = useSessionLog();

  // ──── Enemy roster (regenerated each game for slime variant randomisation) ────
  const buildRoster = () => {
    const order = [0, 1, 0, 2, 0, 1, 3, 2, 3, 4];
    return order.map((idx, i) => {
      const b = MONSTERS[idx];
      const sc = 1 + i * 0.12;
      const isEvolved = b.evolveLvl && (i + 1) >= b.evolveLvl;

      // Slime colour variant — random type each non-evolved encounter
      let variant = null;
      if (idx === 0 && !isEvolved) {
        variant = SLIME_VARIANTS[Math.floor(Math.random() * SLIME_VARIANTS.length)];
      }

      return {
        ...b,
        // Apply variant overrides for non-evolved slimes
        ...(variant && { id: variant.id, name: variant.name, svgFn: variant.svgFn, c1: variant.c1, c2: variant.c2, mType: variant.mType, typeIcon: variant.typeIcon, typeName: variant.typeName, drops: variant.drops }),
        name: isEvolved && b.evolvedName ? b.evolvedName : (variant ? variant.name : b.name),
        svgFn: isEvolved && b.evolvedSvgFn ? b.evolvedSvgFn : (variant ? variant.svgFn : b.svgFn),
        sceneMType: b.mType,   // scene always follows base monster species
        hp: Math.round(b.hp * sc), maxHp: Math.round(b.hp * sc),
        atk: Math.round(b.atk * sc), lvl: i + 1, isEvolved,
      };
    });
  };
  const [enemies, setEnemies] = useState(buildRoster);

  // ──── Screen & mode ────
  const [screen, setScreen] = useState("title");
  const [timedMode, setTimedMode] = useState(false);

  // ──── Player ────
  const [starter, setStarter] = useState(null);
  const [pHp, setPHp] = useState(PLAYER_MAX_HP);
  const [pExp, setPExp] = useState(0);
  const [pLvl, setPLvl] = useState(1);
  const [pStg, setPStg] = useState(0);

  // ──── Battle ────
  const [round, setRound] = useState(0);
  const [enemy, setEnemy] = useState(null);
  const [eHp, setEHp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [charge, setCharge] = useState(0);
  const [tC, setTC] = useState(0);
  const [tW, setTW] = useState(0);
  const [defeated, setDefeated] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [mHits, setMHits] = useState([0, 0, 0, 0]);
  const [mLvls, setMLvls] = useState([1, 1, 1, 1]);
  const [mLvlUp, setMLvlUp] = useState(null);

  // ──── Phase & UI ────
  const [phase, setPhase] = useState("menu");
  const [selIdx, setSelIdx] = useState(null);
  const [q, setQ] = useState(null);
  const [fb, setFb] = useState(null);
  const [bText, setBText] = useState("");
  const [answered, setAnswered] = useState(false);
  const [dmgs, setDmgs] = useState([]);
  const [parts, setParts] = useState([]);
  const [eAnim, setEAnim] = useState("");
  const [pAnim, setPAnim] = useState("");
  const [atkEffect, setAtkEffect] = useState(null);
  const [effMsg, setEffMsg] = useState(null);

  // ──── Status effects ────
  const [burnStack, setBurnStack] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const frozenR = useRef(false);
  const [staticStack, setStaticStack] = useState(0);   // electric: static charge
  const [specDef, setSpecDef] = useState(false);
  const [defAnim, setDefAnim] = useState(null);

  // ──── Adaptive difficulty ────
  const [diffLevel, setDiffLevel] = useState(2);     // start at normal (1.0)
  const recentAnsRef = useRef([]);                    // sliding window of last 6 answers (true/false)

  const _updateDiff = (correct) => {
    const win = recentAnsRef.current;
    win.push(correct);
    if (win.length > 6) win.shift();
    if (win.length >= 4) {
      const rate = win.filter(Boolean).length / win.length;
      setDiffLevel(prev => {
        if (rate >= 0.8 && prev < 4) return prev + 1;   // doing great → harder
        if (rate <= 0.35 && prev > 0) return prev - 1;   // struggling → easier
        return prev;
      });
    }
  };

  // ──── Boss mechanics ────
  const [bossPhase, setBossPhase] = useState(0);         // 0=not boss, 1/2/3
  const [bossTurn, setBossTurn] = useState(0);            // turn counter in boss fight
  const [bossCharging, setBossCharging] = useState(false);// boss is charging next big attack
  const [sealedMove, setSealedMove] = useState(-1);       // index of sealed move (-1=none)
  const [sealedTurns, setSealedTurns] = useState(0);      // remaining sealed turns

  // ──── Internal refs ────
  const did = useRef(0);
  const pid = useRef(0);
  const turnRef = useRef(0);
  const pendingEvolve = useRef(false);   // ← Bug #2 fix
  const evolveRound = useRef(0);        // round to resume after evolve screen

  // ──── State ref — always points at latest committed values ────
  // Use useLayoutEffect so the ref is updated synchronously after DOM commit,
  // before any setTimeout/safeTo callbacks fire. This prevents Concurrent Mode
  // from polluting sr.current with intermediate render values.
  const sr = useRef({});
  const _srSnapshot = {
    enemy, starter, eHp, pHp, pExp, pLvl, pStg,
    streak, charge, burnStack, frozen, staticStack, specDef,
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

  // ──── Damage / particle helpers ────
  const addD = (v, x, y, c) => {
    const id = did.current++;
    setDmgs(f => [...f, { id, value: v, x, y, color: c }]);
  };
  const rmD = (id) => setDmgs(f => f.filter(v => v.id !== id));

  const addP = (type, x, y, n = 5) => {
    const es = EFX[type] || ["✨"];
    const np = [];
    for (let i = 0; i < n; i++) {
      np.push({
        id: pid.current++,
        emoji: es[Math.floor(Math.random() * es.length)],
        x: x + Math.random() * 40 - 20,
        y: y + Math.random() * 20 - 10,
      });
    }
    setParts(p => [...p, ...np]);
  };
  const rmP = (id) => setParts(f => f.filter(v => v.id !== id));

  // ──── Safe timeout (cancelled on turn/game change) ────
  const safeTo = (fn, ms) => {
    const g = turnRef.current;
    setTimeout(() => { if (g === turnRef.current) fn(); }, ms);
  };

  // ═══════════════════════════════════════════════════════════════
  //  TIMER
  // ═══════════════════════════════════════════════════════════════
  const onTimeout = useCallback(() => {
    setAnswered(true);
    setFb({ correct: false, answer: sr.current.q?.answer, steps: sr.current.q?.steps || [] });
    sfx.play("timeout");
    setTW(w => w + 1);
    setStreak(0);
    setCharge(0);
    // ── Session logging: timeout counts as wrong ──
    logAns(sr.current.q, false);
    setBText("⏰ 時間到！來不及出招！");
    setPhase("text");
    // Read enemy from stateRef so we never hit a stale closure
    safeTo(() => doEnemyTurn(), 1500);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    timerLeft, paused,
    startTimer, clearTimer, pauseTimer, resumeTimer,
  } = useTimer(TIMER_SEC, onTimeout);

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
    const list = roster || enemies;
    const e = list[idx];
    setEnemy(e);
    setEHp(e.maxHp);
    setBurnStack(0);
    setStaticStack(0);
    setFrozen(false);
    frozenR.current = false;
    setSpecDef(false);
    setDefAnim(null);
    // Boss mechanics init
    const isBoss = e.id === "boss";
    setBossPhase(isBoss ? 1 : 0);
    setBossTurn(0);
    setBossCharging(false);
    setSealedMove(-1);
    setSealedTurns(0);
    setRound(idx);
    updateEnc(e); // ← encyclopedia: mark encountered
    const sn = SCENE_NAMES[e.sceneMType || e.mType] || "";
    setPhase("text");
    setBText(`【${sn}】野生的 ${e.name}(${e.typeIcon}${e.typeName}) Lv.${e.lvl} 出現了！`);
    setScreen("battle");
    setEAnim("slideInBattle 0.6s ease");
    setPAnim("slideInPlayer 0.6s ease");
    safeTo(() => { setEAnim(""); setPAnim(""); }, 700);
  };

  // --- Full game reset (starterOverride used on first game when setStarter hasn't rendered yet) ---
  const startGame = (starterOverride) => {
    turnRef.current++;
    clearTimer();
    // Regenerate roster so slime variants are re-randomised each game
    const newRoster = buildRoster();
    setEnemies(newRoster);
    setPHp(PLAYER_MAX_HP); setPExp(0); setPLvl(1); setPStg(0);
    setStreak(0); setCharge(0); setTC(0); setTW(0);
    setDefeated(0); setMaxStreak(0);
    setMHits([0, 0, 0, 0]); setMLvls([1, 1, 1, 1]); setMLvlUp(null);
    setDmgs([]); setParts([]); setAtkEffect(null); setEffMsg(null);
    setBurnStack(0); setStaticStack(0); setFrozen(false); frozenR.current = false;
    setSpecDef(false); setDefAnim(null);
    setBossPhase(0); setBossTurn(0); setBossCharging(false);
    setSealedMove(-1); setSealedTurns(0);
    setDiffLevel(2); recentAnsRef.current = [];
    pendingEvolve.current = false;
    // Init session log — use override on first game since setStarter is async
    const s = starterOverride || sr.current.starter;
    initSession(s, sr.current.timedMode);
    setScreen("battle");
    startBattle(0, newRoster);
  };

  // ── Finalize and persist session log ──
  const _endSession = (isCompleted) => {
    const s = sr.current;
    endSession({
      defeated: s.defeated || 0,
      finalLevel: s.pLvl || 1,
      maxStreak: s.maxStreak || 0,
      pHp: s.pHp || 0,
      completed: !!isCompleted,
    });
  };

  const quitGame = () => { clearTimer(); _endSession(false); setScreen("gameover"); };

  // --- Handle a defeated enemy ---
  const handleVictory = (verb = "被打倒了") => {
    const s = sr.current;
    setBurnStack(0); setStaticStack(0); setFrozen(false); frozenR.current = false;
    setBossPhase(0); setBossTurn(0); setBossCharging(false);
    setSealedMove(-1); setSealedTurns(0);
    const xp = s.enemy.lvl * 15;
    // Compute XP / level-up synchronously.
    // Use while loop to handle overflow that spans multiple level thresholds
    // (e.g. pLvl=2, pExp=50, xp=135 → should gain 2 levels, not 1).
    let curExp = s.pExp + xp;
    let curLvl = s.pLvl;
    let curStg = s.pStg;
    let hpBonus = 0;
    while (curExp >= curLvl * 30) {
      curExp -= curLvl * 30;
      curLvl++;
      if (curStg < 2 && curLvl % 3 === 0) {
        // Evolution — defer visual updates to advance(), only set flag here.
        pendingEvolve.current = true; sfx.play("evolve");
        curStg++;       // track locally so second evolution in same burst also works
      } else {
        hpBonus += 20;  // accumulate HP bonus for non-evolve level-ups
      }
    }
    setPExp(curExp);
    if (curLvl !== s.pLvl) {
      setPLvl(curLvl);
      if (hpBonus > 0) setPHp(h => Math.min(h + hpBonus, PLAYER_MAX_HP));
    }
    setDefeated(d => d + 1);
    updateEncDefeated(s.enemy); // ← encyclopedia: mark defeated
    // ── Achievement checks on victory ──
    tryUnlock("first_win");
    if (s.enemy.id === "boss") tryUnlock("boss_kill");
    if (s.pHp <= 5) tryUnlock("low_hp");
    const drop = s.enemy.drops[Math.floor(Math.random() * s.enemy.drops.length)];
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
    setQ(genQ(starter.moves[i], DIFF_MODS[sr.current.diffLevel]));
    setFb(null);
    setAnswered(false);
    setPhase("question");
    markQStart(); // ← log question start time
    // Boss: halve timer in boss fight (Phase 1+ roar effect)
    if (timedMode) startTimer();
  };

  // --- Helper: compute boss phase from HP ratio ---
  const _updateBossPhase = (hp, maxHp) => {
    const ratio = hp / maxHp;
    if (ratio <= 0.3) return 3;
    if (ratio <= 0.6) return 2;
    return 1;
  };

  // --- Enemy turn logic (reads from stateRef) ---
  const doEnemyTurn = () => {
    const s = sr.current;
    if (!s.enemy || !s.starter) return;
    const isBoss = s.enemy.id === "boss";

    // ── Boss: decrement sealed move turns at start of enemy turn ──
    if (isBoss && s.sealedTurns > 0) {
      const nt = s.sealedTurns - 1;
      setSealedTurns(nt);
      if (nt <= 0) setSealedMove(-1);
    }

    // ── Boss: update phase from current HP ──
    if (isBoss) {
      const newPhase = _updateBossPhase(s.eHp, s.enemy.maxHp);
      if (newPhase !== s.bossPhase) {
        setBossPhase(newPhase);
        // Phase transition announcement
        const phaseMsg = newPhase === 2 ? "💀 暗黑龍王進入狂暴狀態！攻擊力上升！"
                       : newPhase === 3 ? "💀 暗黑龍王覺醒了！背水一戰！"
                       : "";
        if (phaseMsg) {
          setBText(phaseMsg);
          setPhase("text");
          setEAnim("bossShake 0.5s ease");
          safeTo(() => setEAnim(""), 600);
          safeTo(() => doEnemyTurnInner(), 1500);
          return;
        }
      }
    }
    doEnemyTurnInner();
  };

  const doEnemyTurnInner = () => {
    const s = sr.current;
    if (!s.enemy || !s.starter) return;
    const isBoss = s.enemy.id === "boss";
    const bp = isBoss ? _updateBossPhase(s.eHp, s.enemy.maxHp) : 0;

    // ── Boss: increment turn counter ──
    let turnCount = s.bossTurn;
    if (isBoss) {
      turnCount = s.bossTurn + 1;
      setBossTurn(turnCount);
    }

    // ── Boss charging mechanic: release big attack ──
    if (isBoss && s.bossCharging) {
      setBossCharging(false);
      setBText(`💀 暗黑龍王釋放暗黑吐息！`); sfx.play("bossBoom");
      setPhase("enemyAtk");
      setEAnim("enemyAttackLunge 0.6s ease");
      safeTo(() => {
        setEAnim("");
        const s2 = sr.current;
        const bigDmg = Math.round(s2.enemy.atk * 2.2);
        const nh = Math.max(0, s2.pHp - bigDmg);
        setPHp(nh); setPAnim("playerHit 0.5s ease");
        addD(`💀-${bigDmg}`, 60, 170, "#a855f7"); addP("enemy", 80, 190, 6);
        safeTo(() => setPAnim(""), 500);
        if (nh <= 0) safeTo(() => { _endSession(false); setPhase("ko"); setBText("你的夥伴倒下了..."); setScreen("gameover"); }, 800);
        else safeTo(() => { setPhase("menu"); setBText(""); }, 800);
      }, 500);
      return;
    }

    // ── Boss: start charging every 4 turns ──
    if (isBoss && turnCount > 0 && turnCount % 4 === 0 && !s.bossCharging) {
      setBossCharging(true); sfx.play("bossCharge");
      setBText("⚠️ 暗黑龍王正在蓄力！下回合將釋放大招！");
      setPhase("text");
      setEAnim("bossShake 0.5s ease infinite");
      safeTo(() => { setPhase("menu"); setBText(""); setEAnim(""); }, 2000);
      return;
    }

    // ── Boss Phase 2+: seal a random move ──
    if (isBoss && bp >= 2 && s.sealedMove < 0 && turnCount > 0 && turnCount % 3 === 0) {
      const sealIdx = Math.floor(Math.random() * 3); // only seal moves 0-2, not ultimate
      setSealedMove(sealIdx); sfx.play("seal");
      setSealedTurns(2);
      const moveName = s.starter.moves[sealIdx]?.name || "???";
      setBText(`💀 暗黑龍王封印了你的「${moveName}」！（2回合）`);
      setPhase("text");
      safeTo(() => doEnemyAttack(bp), 1500);
      return;
    }

    doEnemyAttack(bp);
  };

  const doEnemyAttack = (bp) => {
    const s = sr.current;
    if (!s.enemy || !s.starter) return;
    setBText(`${s.enemy.name} 發動攻擊！`);
    setPhase("enemyAtk");
    setEAnim("enemyAttackLunge 0.6s ease");
    safeTo(() => {
      setEAnim("");
      const s2 = sr.current; // re-read after delay
      if (s2.specDef) {
        const st = s2.starter.type;
        setSpecDef(false); setStreak(0); setDefAnim(st);
        if (st === "fire") {
          setBText("🛡️ 防護罩擋下了攻擊！");
          addD("🛡️BLOCK", 60, 170, "#fbbf24"); addP("starter", 50, 170, 6);
          safeTo(() => { setDefAnim(null); setPhase("menu"); setBText(""); }, 1800);
        } else if (st === "water") {
          setPAnim("dodgeSlide 0.9s ease");
          setBText("💨 完美閃避！"); addD("MISS!", 60, 170, "#38bdf8");
          safeTo(() => { setPAnim(""); setDefAnim(null); setPhase("menu"); setBText(""); }, 1800);
        } else if (st === "electric") {
          setBText("⚡ 電流麻痺！敵人無法行動！"); addD("⚡麻痺", 60, 170, "#fbbf24");
          setEAnim("enemyElecHit 0.6s ease");
          addP("electric", 155, 80, 5);
          safeTo(() => {
            setEAnim(""); setDefAnim(null);
            setBText(`⚡ ${sr.current.enemy.name} 被麻痺了，無法攻擊！`);
            setPhase("text");
            safeTo(() => { setPhase("menu"); setBText(""); }, 1500);
          }, 1800);
        } else {
          const rawDmg = Math.round(s2.enemy.atk * (0.8 + Math.random() * 0.4));
          const refDmg = Math.round(rawDmg * 1.2);
          const nh = Math.max(0, sr.current.eHp - refDmg);
          setEHp(nh);
          setBText("🌿 反彈攻擊！"); addD("🛡️BLOCK", 60, 170, "#22c55e");
          safeTo(() => {
            addD(`-${refDmg}`, 155, 50, "#22c55e");
            setEAnim("enemyGrassHit 0.6s ease");
            addP("starter", 155, 80, 5);
          }, 500);
          safeTo(() => {
            setEAnim(""); setDefAnim(null);
            if (nh <= 0) { safeTo(() => handleVictory("被反彈攻擊打倒了"), 500); }
            else { setPhase("menu"); setBText(""); }
          }, 1800);
        }
        return;
      }
      // Normal enemy attack — boss phase scales damage
      const atkMult = bp >= 3 ? 2.0 : bp >= 2 ? 1.5 : 1.0;
      const scaledAtk = Math.round(s2.enemy.atk * atkMult);
      const dmg = calcEnemyDamage(scaledAtk, getEff(s2.enemy.mType, s2.starter.type));
      const defEff = getEff(s2.enemy.mType, s2.starter.type);
      const nh = Math.max(0, s2.pHp - dmg);
      setPHp(nh); setPAnim("playerHit 0.5s ease"); sfx.play("playerHit");
      addD(`-${dmg}`, 60, 170, "#ef4444"); addP("enemy", 80, 190, 4);
      if (defEff > 1) { setEffMsg({ text: "敵人招式很有效！", color: "#ef4444" }); safeTo(() => setEffMsg(null), 1500); }
      else if (defEff < 1) { setEffMsg({ text: "敵人招式效果不佳", color: "#64748b" }); safeTo(() => setEffMsg(null), 1500); }
      safeTo(() => setPAnim(""), 500);
      if (nh <= 0) safeTo(() => { sfx.play("ko"); _endSession(false); setPhase("ko"); setBText("你的夥伴倒下了..."); setScreen("gameover"); }, 800);
      else safeTo(() => { setPhase("menu"); setBText(""); }, 800);
    }, 500);
  };

  // --- Player answers a question ---
  const onAns = (choice) => {
    if (answered || !starter) return;
    setAnswered(true);
    clearTimer();
    const s = sr.current;
    const move = starter.moves[s.selIdx];
    const correct = choice === s.q.answer;

    // ── Session logging ──
    logAns(s.q, correct);
    _updateDiff(correct);

    if (correct) {
      setFb({ correct: true }); setTC(c => c + 1);
      const ns = s.streak + 1;
      sfx.play(ns >= 5 ? "crit" : "hit");
      setStreak(ns); setCharge(c => Math.min(c + 1, 3));
      if (ns > s.maxStreak) setMaxStreak(ns);
      if (ns >= 8 && !s.specDef) { setSpecDef(true); tryUnlock("spec_def"); sfx.play("specDef"); }

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
      safeTo(() => {
        setPhase("playerAtk"); setPAnim("attackLunge 0.6s ease");
        safeTo(() => {
          setPAnim("");
          const s2 = sr.current;
          const bt = bestAttackType(move, s2.enemy);
          setAtkEffect({ type: bt, idx: s2.selIdx, lvl: s2.mLvls[s2.selIdx] });
          sfx.play(bt); // type-specific attack sound

          safeTo(() => {
            const s3 = sr.current;
            const pow = didLvl
              ? Math.min(move.basePower + s3.mLvls[s3.selIdx] * move.growth, POWER_CAPS[s3.selIdx])
              : movePower(move, s3.mLvls[s3.selIdx], s3.selIdx);
            const eff = bestEffectiveness(move, s3.enemy);
            let dmg = calcAttackDamage({
              basePow: pow,
              streak: ns,
              stageBonus: s3.pStg,
              effMult: eff,
            });
            // Boss Phase 3: 背水一戰 — player gets ×1.3 bonus
            if (s3.bossPhase >= 3) dmg = Math.round(dmg * 1.3);

            if (eff > 1) { setEffMsg({ text: "效果絕佳！", color: "#22c55e" }); safeTo(() => setEffMsg(null), 1500); }
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
              if (Math.random() < freezeChance(s3.mLvls[s3.selIdx])) {
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
            setEAnim(HIT_ANIMS[bt] || "enemyHit 0.5s ease");
            const dmgColor = { fire: "#ef4444", electric: "#fbbf24", water: "#3b82f6", grass: "#22c55e", dark: "#a855f7" }[bt] || "#ef4444";
            addD(`-${dmg}`, 140, 55, dmgColor);
            safeTo(() => { setEAnim(""); setAtkEffect(null); }, 800);

            // Achievement: one-hit KO (dealt damage >= enemy maxHp)
            if (afterHp <= 0 && dmg >= s3.enemy.maxHp) tryUnlock("one_hit");
            if (afterHp <= 0) safeTo(() => handleVictory(), 900);
            else if (willFreeze) safeTo(() => handleFreeze(), 900);
            else safeTo(() => doEnemyTurn(), 900);
          }, EFX_DELAY[bt] || 300);
        }, 400);
      }, 600);
    } else {
      // Wrong answer
      setFb({ correct: false, answer: s.q.answer, steps: s.q.steps || [] }); sfx.play("wrong");
      setTW(w => w + 1); setStreak(0); setCharge(0);
      safeTo(() => {
        const s2 = sr.current;
        if (move.risky) {
          const sd = Math.round(movePower(move, s2.mLvls[s2.selIdx], s2.selIdx) * 0.4);
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
    streak, charge, tC, tW, defeated, maxStreak,
    mHits, mLvls, mLvlUp,
    phase, selIdx, q, fb, bText, answered,
    dmgs, parts, eAnim, pAnim, atkEffect, effMsg,
    burnStack, frozen, staticStack, specDef, defAnim,
    bossPhase, bossTurn, bossCharging, sealedMove, sealedTurns, diffLevel,
    gamePaused, timerLeft,
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
