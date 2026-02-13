import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// Data
import { MONSTERS, getEff } from './data/monsters';
import { STARTERS } from './data/starters';
import { SCENES, SCENE_NAMES } from './data/scenes';
import { POWER_CAPS, HITS_PER_LVL, TIMER_SEC, PLAYER_MAX_HP, EFX } from './data/constants';

// Utils
import { genQ } from './utils/questionGenerator';
import { useTimer } from './hooks/useTimer';

// UI Components
import MonsterSprite from './components/ui/MonsterSprite';
import HPBar from './components/ui/HPBar';
import XPBar from './components/ui/XPBar';
import DamagePopup from './components/ui/DamagePopup';
import Particle from './components/ui/Particle';
import TextBox from './components/ui/TextBox';

// Effects
import { FireEffect, ElecEffect, WaterEffect, GrassEffect, DarkEffect } from './components/effects';

// Screens
import TitleScreen from './components/screens/TitleScreen';
import SelectionScreen from './components/screens/SelectionScreen';
import LeaderboardScreen from './components/screens/LeaderboardScreen';
import EvolveScreen from './components/screens/EvolveScreen';
import GameOverScreen from './components/screens/GameOverScreen';

// ─── GameShell: orientation lock wrapper ───
// 偵測是否為觸控裝置（手機/平板）
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function GameShell() {
  const [showRotateHint, setShowRotateHint] = useState(false);

  useEffect(() => {
    try { screen.orientation.lock("portrait-primary").catch(() => {}); } catch (e) {}

    const chk = () => {
      // 只在觸控裝置（手機/平板）上顯示旋轉提示
      const isLandscape = window.innerWidth > window.innerHeight * 1.05;
      setShowRotateHint(isLandscape && isTouchDevice());
    };
    chk();
    const ochk = () => setTimeout(chk, 350);
    window.addEventListener("resize", chk);
    window.addEventListener("orientationchange", ochk);
    return () => { window.removeEventListener("resize", chk); window.removeEventListener("orientationchange", ochk); };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0f172a", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, height: "100%", position: "relative", background: "#000", boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}>
        <App />
        {showRotateHint && (
          <div
            onClick={() => setShowRotateHint(false)}
            style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#0f172a,#1e1b4b,#312e81)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", zIndex: 9999, cursor: "pointer" }}
          >
            <div style={{ fontSize: 56, marginBottom: 20, animation: "float 3s ease-in-out infinite" }}>📱</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>請將手機轉為直立方向</div>
            <div style={{ fontSize: 13, opacity: 0.5 }}>本遊戲僅支援直向模式</div>
            <div style={{ fontSize: 12, opacity: 0.35, marginTop: 24 }}>點擊任意處繼續遊戲</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App: main game component ───
function App() {
  // --- Screen & mode state ---
  const [screen, setScreen] = useState("title");
  const [timedMode, setTimedMode] = useState(false);

  // --- Enemy roster (generated once) ---
  const [enemies] = useState(() => {
    const order = [0, 1, 0, 2, 0, 1, 3, 2, 3, 4];
    return order.map((idx, i) => {
      const b = MONSTERS[idx];
      const sc = 1 + i * 0.12;
      const isEvolved = b.evolveLvl && (i + 1) >= b.evolveLvl;
      return {
        ...b,
        name: isEvolved && b.evolvedName ? b.evolvedName : b.name,
        svgFn: isEvolved && b.evolvedSvgFn ? b.evolvedSvgFn : b.svgFn,
        hp: Math.round(b.hp * sc), maxHp: Math.round(b.hp * sc),
        atk: Math.round(b.atk * sc), lvl: i + 1, isEvolved,
      };
    });
  });

  // --- Battle state ---
  const [round, setRound] = useState(0);
  const [enemy, setEnemy] = useState(null);
  const [eHp, setEHp] = useState(0);
  const [pHp, setPHp] = useState(PLAYER_MAX_HP);
  const [pExp, setPExp] = useState(0);
  const [pLvl, setPLvl] = useState(1);
  const [pStg, setPStg] = useState(0);
  const [streak, setStreak] = useState(0);
  const [charge, setCharge] = useState(0);
  const [tC, setTC] = useState(0);
  const [tW, setTW] = useState(0);
  const [defeated, setDefeated] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [mHits, setMHits] = useState([0, 0, 0, 0]);
  const [mLvls, setMLvls] = useState([1, 1, 1, 1]);
  const [mLvlUp, setMLvlUp] = useState(null);

  // --- Phase & UI state ---
  const [phase, setPhase] = useState("menu");
  const [selIdx, setSelIdx] = useState(null);
  const [q, setQ] = useState(null);
  const [fb, setFb] = useState(null);
  const [bText, setBText] = useState("");
  const [dmgs, setDmgs] = useState([]);
  const [parts, setParts] = useState([]);
  const [eAnim, setEAnim] = useState("");
  const [pAnim, setPAnim] = useState("");
  const [answered, setAnswered] = useState(false);
  const [atkEffect, setAtkEffect] = useState(null);
  const [effMsg, setEffMsg] = useState(null);

  // --- Status effects ---
  const [burnStack, setBurnStack] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const frozenR = useRef(false);
  const [specDef, setSpecDef] = useState(false);
  const [defAnim, setDefAnim] = useState(null);

  // --- Starter ---
  const [starter, setStarter] = useState(null);

  // --- IDs ---
  const did = useRef(0);
  const pid = useRef(0);
  const turnRef = useRef(0);

  // --- Computed ---
  const expNext = pLvl * 30;
  const getPow = (i) => starter ? Math.min(starter.moves[i].basePower + (mLvls[i] - 1) * 2, POWER_CAPS[i]) : 0;

  // --- Damage/particle helpers ---
  const addD = (v, x, y, c) => { const id = did.current++; setDmgs(f => [...f, { id, value: v, x, y, color: c }]); };
  const rmD = id => setDmgs(f => f.filter(v => v.id !== id));
  const addP = (type, x, y, n = 5) => {
    const es = EFX[type] || ["✨"];
    const np = [];
    for (let i = 0; i < n; i++) np.push({ id: pid.current++, emoji: es[Math.floor(Math.random() * es.length)], x: x + Math.random() * 40 - 20, y: y + Math.random() * 20 - 10 });
    setParts(p => [...p, ...np]);
  };
  const rmP = id => setParts(f => f.filter(v => v.id !== id));

  // --- Safe timeout (cancelled on turn change) ---
  const safeTo = (fn, ms) => { const g = turnRef.current; setTimeout(() => { if (g === turnRef.current) fn(); }, ms); };

  // --- Timer ---
  const onTimeout = useCallback(() => {
    setAnswered(true);
    setFb({ correct: false, answer: q?.answer });
    setTW(w => w + 1);
    setStreak(0);
    setCharge(0);
    setBText("⏰ 時間到！來不及出招！");
    setPhase("text");
    safeTo(() => enemyTurn(), 1200);
  }, [q]);

  const { timerLeft, paused, startTimer, clearTimer, pauseTimer, resumeTimer } = useTimer(TIMER_SEC, onTimeout);
  const [gamePaused, setGamePaused] = useState(false);

  const togglePause = useCallback(() => {
    if (gamePaused) {
      resumeTimer();
      setGamePaused(false);
    } else {
      pauseTimer();
      setGamePaused(true);
    }
  }, [gamePaused, pauseTimer, resumeTimer]);

  // Cleanup timer when leaving question phase
  useEffect(() => { if (phase !== "question") clearTimer(); }, [phase, clearTimer]);

  // --- Battle flow ---
  const startBattle = (idx) => {
    const e = enemies[idx];
    setEnemy(e); setEHp(e.maxHp);
    setBurnStack(0); setFrozen(false); frozenR.current = false;
    setSpecDef(false); setDefAnim(null);
    setRound(idx);
    const sn = SCENE_NAMES[e.mType] || "";
    setPhase("text");
    setBText(`【${sn}】野生的 ${e.name} Lv.${e.lvl} 出現了！`);
    setScreen("battle");
    setEAnim("slideInBattle 0.6s ease");
    setPAnim("slideInPlayer 0.6s ease");
    safeTo(() => { setEAnim(""); setPAnim(""); }, 700);
  };

  const startGame = () => {
    turnRef.current++;
    clearTimer();
    setPHp(PLAYER_MAX_HP); setPExp(0); setPLvl(1); setPStg(0);
    setStreak(0); setCharge(0); setTC(0); setTW(0); setDefeated(0); setMaxStreak(0);
    setMHits([0, 0, 0, 0]); setMLvls([1, 1, 1, 1]); setMLvlUp(null);
    setDmgs([]); setParts([]); setAtkEffect(null); setEffMsg(null);
    setBurnStack(0); setFrozen(false); frozenR.current = false;
    setSpecDef(false); setDefAnim(null);
    setScreen("battle");
    startBattle(0);
  };

  const quitGame = () => { clearTimer(); setScreen("gameover"); };

  const handleVictory = (verb = "被打倒了") => {
    setBurnStack(0); setFrozen(false); frozenR.current = false;
    const xp = enemy.lvl * 15;
    setPExp(prev => {
      const ne = prev + xp;
      if (ne >= expNext) {
        setPLvl(l => {
          const nl = l + 1;
          if (pStg < 2 && nl % 3 === 0) {
            safeTo(() => { setPStg(s => Math.min(s + 1, 2)); setScreen("evolve"); }, 1500);
            setPHp(PLAYER_MAX_HP);
            setMLvls(prev => prev.map(v => v + 1));
          } else {
            setPHp(h => Math.min(h + 20, PLAYER_MAX_HP));
          }
          return nl;
        });
        return ne - expNext;
      }
      return ne;
    });
    setDefeated(d => d + 1);
    const drop = enemy.drops[Math.floor(Math.random() * enemy.drops.length)];
    setBText(`${enemy.name} ${verb}！獲得 ${xp} 經驗值 ${drop}`);
    setPhase("victory");
  };

  const handleFreeze = () => {
    frozenR.current = false; setFrozen(false);
    setBText(`❄️ ${enemy.name} 被凍住了，無法攻擊！`);
    setPhase("text");
    safeTo(() => { setPhase("menu"); setBText(""); }, 1500);
  };

  const selectMove = (i) => {
    if (phase !== "menu" || !starter) return;
    setSelIdx(i);
    setQ(genQ(starter.moves[i]));
    setFb(null); setAnswered(false);
    setPhase("question");
    if (timedMode) startTimer();
  };

  const onAns = (choice) => {
    if (answered || !starter) return;
    setAnswered(true); clearTimer();
    const move = starter.moves[selIdx];
    const correct = choice === q.answer;

    if (correct) {
      setFb({ correct: true }); setTC(c => c + 1);
      const ns = streak + 1; setStreak(ns); setCharge(c => Math.min(c + 1, 3));
      if (ns > maxStreak) setMaxStreak(ns);
      if (ns >= 8 && !specDef) setSpecDef(true);
      const nh = [...mHits]; nh[selIdx]++;
      const cl = mLvls[selIdx]; let didLvl = false;
      if (nh[selIdx] >= HITS_PER_LVL * cl) {
        const np = move.basePower + cl * 2;
        if (np <= POWER_CAPS[selIdx]) {
          const nl = [...mLvls]; nl[selIdx]++; setMLvls(nl);
          didLvl = true; nh[selIdx] = 0;
          setMLvlUp(selIdx); safeTo(() => setMLvlUp(null), 2000);
        }
      }
      setMHits(nh);
      safeTo(() => {
        setPhase("playerAtk"); setPAnim("attackLunge 0.6s ease");
        const hitAnims = { fire: "enemyFireHit 0.6s ease", electric: "enemyElecHit 0.6s ease", water: "enemyWaterHit 0.7s ease", grass: "enemyGrassHit 0.6s ease", dark: "enemyDarkHit 0.8s ease" };
        const efxDelay = { fire: 300, electric: 200, water: 350, grass: 280, dark: 400 };
        safeTo(() => {
          setPAnim("none");
          setAtkEffect({ type: move.type, idx: selIdx, lvl: mLvls[selIdx] });
          safeTo(() => {
            let dmg = didLvl ? move.basePower + mLvls[selIdx] * 2 : getPow(selIdx);
            if (ns >= 5) dmg = Math.round(dmg * 1.8); else if (ns >= 3) dmg = Math.round(dmg * 1.5);
            dmg = Math.round(dmg * (1 + pStg * 0.15));
            const eff = getEff(move.type, enemy.mType);
            dmg = Math.round(dmg * eff);
            if (eff > 1) { setEffMsg({ text: "效果絕佳！", color: "#22c55e" }); safeTo(() => setEffMsg(null), 1500); }
            else if (eff < 1) { setEffMsg({ text: "效果不好...", color: "#94a3b8" }); safeTo(() => setEffMsg(null), 1500); }
            let afterHp = Math.max(0, eHp - dmg);
            let newBurn = burnStack;
            if (starter.type === "fire" && afterHp > 0) { newBurn = Math.min(burnStack + 1, 5); setBurnStack(newBurn); const bd = newBurn * 2; afterHp = Math.max(0, afterHp - bd); safeTo(() => addD(`🔥-${bd}`, 155, 50, "#f97316"), 500); }
            if (starter.type === "grass") { const heal = Math.round(2 + mLvls[selIdx]); setPHp(h => Math.min(h + heal, PLAYER_MAX_HP)); safeTo(() => addD(`+${heal}`, 50, 165, "#22c55e"), 500); }
            let willFreeze = false;
            if (starter.type === "water" && afterHp > 0) { const fc = 0.25 + mLvls[selIdx] * 0.03; if (Math.random() < fc) { willFreeze = true; setFrozen(true); frozenR.current = true; safeTo(() => addD("❄️凍結", 155, 50, "#38bdf8"), 600); } }
            setEHp(afterHp);
            setEAnim(hitAnims[move.type] || "enemyHit 0.5s ease");
            const dmgColor = { fire: "#ef4444", electric: "#fbbf24", water: "#3b82f6", grass: "#22c55e", dark: "#a855f7" }[move.type] || "#ef4444";
            addD(`-${dmg}`, 140, 55, dmgColor);
            safeTo(() => { setEAnim(""); setAtkEffect(null); }, 800);
            if (afterHp <= 0) { safeTo(() => handleVictory(), 900); }
            else if (willFreeze) { safeTo(() => handleFreeze(), 900); }
            else safeTo(() => enemyTurn(), 900);
          }, efxDelay[move.type] || 300);
        }, 400);
      }, 600);
    } else {
      setFb({ correct: false, answer: q.answer }); setTW(w => w + 1); setStreak(0); setCharge(0);
      safeTo(() => {
        if (move.risky) {
          const sd = Math.round(getPow(selIdx) * 0.4);
          const nh2 = Math.max(0, pHp - sd);
          setPHp(nh2); setPAnim("playerHit 0.5s ease");
          addD(`-${sd}`, 40, 170, "#ef4444");
          safeTo(() => setPAnim("none"), 500);
          setBText(`${move.name} 失控了！自己受到 ${sd} 傷害！`);
          setPhase("text");
          safeTo(() => {
            if (nh2 <= 0) { setPhase("ko"); setBText("你的夥伴倒下了..."); setScreen("gameover"); }
            else if (frozenR.current) { handleFreeze(); }
            else enemyTurn();
          }, 1500);
        } else {
          let mt = "攻擊落空了！";
          if (burnStack > 0) {
            const bd = burnStack * 2;
            const nh3 = Math.max(0, eHp - bd);
            setEHp(nh3); addD(`🔥-${bd}`, 155, 50, "#f97316");
            mt += ` 灼燒-${bd}！`;
            if (nh3 <= 0) { setBText(mt); setPhase("text"); safeTo(() => handleVictory("被灼燒打倒了"), 1200); return; }
          }
          setBText(mt); setPhase("text");
          if (frozenR.current) { safeTo(() => handleFreeze(), 1200); }
          else safeTo(() => enemyTurn(), 1200);
        }
      }, 1000);
    }
  };

  const enemyTurn = () => {
    if (!enemy || !starter) return;
    setBText(`${enemy.name} 發動攻擊！`); setPhase("enemyAtk");
    setEAnim("enemyAttackLunge 0.6s ease");
    safeTo(() => {
      setEAnim("");
      if (specDef) {
        const st = starter.type; setSpecDef(false); setStreak(0); setDefAnim(st);
        if (st === "fire") {
          setBText("🛡️ 防護罩擋下了攻擊！"); addD("🛡️BLOCK", 60, 170, "#fbbf24"); addP("starter", 50, 170, 6);
          safeTo(() => { setDefAnim(null); setPhase("menu"); setBText(""); }, 1800);
        } else if (st === "water") {
          setPAnim("dodgeSlide 0.9s ease");
          setBText("💨 完美閃避！"); addD("MISS!", 60, 170, "#38bdf8");
          safeTo(() => { setPAnim("none"); setDefAnim(null); setPhase("menu"); setBText(""); }, 1800);
        } else {
          const dmg = Math.round(enemy.atk * (0.8 + Math.random() * 0.4));
          const refDmg = Math.round(dmg * 1.2);
          const nh = Math.max(0, eHp - refDmg); setEHp(nh);
          setBText("🌿 反彈攻擊！"); addD("🛡️BLOCK", 60, 170, "#22c55e");
          safeTo(() => { addD(`-${refDmg}`, 155, 50, "#22c55e"); setEAnim("enemyGrassHit 0.6s ease"); addP("starter", 155, 80, 5); }, 500);
          safeTo(() => { setEAnim(""); setDefAnim(null); if (nh <= 0) { safeTo(() => handleVictory("被反彈攻擊打倒了"), 500); } else { setPhase("menu"); setBText(""); } }, 1800);
        }
        return;
      }
      const dmg = Math.round(enemy.atk * (0.8 + Math.random() * 0.4));
      const defEff = getEff(enemy.mType, starter.type);
      const finalDmg = Math.round(dmg * defEff);
      const nh = Math.max(0, pHp - finalDmg);
      setPHp(nh); setPAnim("playerHit 0.5s ease");
      addD(`-${finalDmg}`, 60, 170, "#ef4444"); addP("enemy", 80, 190, 4);
      if (defEff > 1) { setEffMsg({ text: "敵人招式很有效！", color: "#ef4444" }); safeTo(() => setEffMsg(null), 1500); }
      else if (defEff < 1) { setEffMsg({ text: "敵人招式效果不佳", color: "#64748b" }); safeTo(() => setEffMsg(null), 1500); }
      safeTo(() => setPAnim("none"), 500);
      if (nh <= 0) safeTo(() => { setPhase("ko"); setBText("你的夥伴倒下了..."); setScreen("gameover"); }, 800);
      else safeTo(() => { setPhase("menu"); setBText(""); }, 800);
    }, 500);
  };

  const advance = () => {
    if (phase === "text") { setPhase("menu"); setBText(""); }
    else if (phase === "victory") {
      const nx = round + 1;
      if (nx >= enemies.length) { setScreen("gameover"); }
      else { setPHp(h => Math.min(h + 10, PLAYER_MAX_HP)); startBattle(nx); }
    }
  };

  // ─── RENDER ───

  if (screen === "title") return (
    <TitleScreen
      onStartNormal={() => { setTimedMode(false); setScreen("selection"); }}
      onStartTimed={() => { setTimedMode(true); setScreen("selection"); }}
      onLeaderboard={() => setScreen("leaderboard")}
    />
  );

  if (screen === "leaderboard") return (
    <LeaderboardScreen totalEnemies={enemies.length} onBack={() => setScreen("title")} />
  );

  if (screen === "selection") return (
    <SelectionScreen
      onSelect={(s) => { setStarter(s); startGame(); }}
      onBack={() => setScreen("title")}
    />
  );

  if (screen === "evolve") return (
    <EvolveScreen
      starter={starter} stageIdx={pStg}
      onContinue={() => { setScreen("battle"); setPhase("menu"); setBText(""); }}
    />
  );

  if (screen === "gameover") return (
    <GameOverScreen
      defeated={defeated} totalEnemies={enemies.length}
      tC={tC} tW={tW} pLvl={pLvl} timedMode={timedMode} maxStreak={maxStreak}
      starter={starter} mLvls={mLvls} getPow={getPow}
      onRestart={() => starter && startGame()}
      onLeaderboard={() => setScreen("leaderboard")}
      onHome={() => setScreen("title")}
    />
  );

  if (!enemy || !starter) return null;

  const st = starter.stages[pStg];
  const eSvg = enemy.svgFn(enemy.c1, enemy.c2);
  const pSvg = st.svgFn(starter.c1, starter.c2);
  const chargeReady = charge >= 3;
  const scene = SCENES[enemy.mType] || SCENES.grass;

  // ─── Battle Screen ───
  const canTapAdvance = phase === "text" || phase === "victory";
  return (
    <div onClick={canTapAdvance ? advance : undefined} style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", cursor: canTapAdvance ? "pointer" : "default" }}>
      {/* 暫停遮罩 */}
      {gamePaused && <div onClick={togglePause} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", zIndex: 9000, cursor: "pointer", backdropFilter: "blur(4px)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏸️</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>遊戲暫停</div>
        <div style={{ fontSize: 13, opacity: 0.5 }}>點擊任意處繼續</div>
      </div>}
      {dmgs.map(d => <DamagePopup key={d.id} value={d.value} x={d.x} y={d.y} color={d.color} onDone={() => rmD(d.id)} />)}
      {parts.map(p => <Particle key={p.id} emoji={p.emoji} x={p.x} y={p.y} onDone={() => rmP(p.id)} />)}
      {mLvlUp !== null && starter && <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,rgba(251,191,36,0.9),rgba(245,158,11,0.9))", color: "white", padding: "6px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 200, animation: "popIn 0.3s ease", boxShadow: "0 4px 16px rgba(245,158,11,0.4)", whiteSpace: "nowrap" }}>{starter.moves[mLvlUp].icon} {starter.moves[mLvlUp].name} 升級到 Lv.{mLvls[mLvlUp]}！威力 → {getPow(mLvlUp)}</div>}

      {/* Attack effects */}
      {atkEffect && atkEffect.type === "fire" && <FireEffect idx={atkEffect.idx} lvl={atkEffect.lvl} onDone={() => setAtkEffect(null)} />}
      {atkEffect && atkEffect.type === "electric" && <ElecEffect idx={atkEffect.idx} lvl={atkEffect.lvl} onDone={() => setAtkEffect(null)} />}
      {atkEffect && atkEffect.type === "water" && <WaterEffect idx={atkEffect.idx} lvl={atkEffect.lvl} onDone={() => setAtkEffect(null)} />}
      {atkEffect && atkEffect.type === "grass" && <GrassEffect idx={atkEffect.idx} lvl={atkEffect.lvl} onDone={() => setAtkEffect(null)} />}
      {atkEffect && atkEffect.type === "dark" && <DarkEffect idx={atkEffect.idx} lvl={atkEffect.lvl} onDone={() => setAtkEffect(null)} />}

      {/* Special Defense animations */}
      {defAnim === "fire" && <div style={{ position: "absolute", left: "6%", bottom: "14%", width: 160, height: 160, zIndex: 50, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle,rgba(251,191,36,0.5),rgba(245,158,11,0.15),transparent 70%)", animation: "shieldPulse 1.2s ease forwards" }} />
        <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "3px solid rgba(251,191,36,0.6)", animation: "shieldPulse 1.2s ease 0.1s forwards", opacity: 0 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 48, animation: "popIn 0.3s ease", filter: "drop-shadow(0 0 12px rgba(251,191,36,0.8))" }}>🛡️</div>
      </div>}
      {defAnim === "water" && <div style={{ position: "absolute", left: "6%", bottom: "14%", width: 130, height: 130, zIndex: 50, pointerEvents: "none" }}>
        {[0, 1, 2].map(i => <div key={i} style={{ position: "absolute", inset: 0, background: "radial-gradient(circle,rgba(56,189,248,0.35),transparent 70%)", borderRadius: "50%", animation: `shieldPulse 0.8s ease ${i * 0.15}s forwards`, opacity: 0 }} />)}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 40, animation: "popIn 0.3s ease", filter: "drop-shadow(0 0 10px rgba(56,189,248,0.8))" }}>💨</div>
      </div>}
      {defAnim === "grass" && <div style={{ position: "absolute", left: "6%", bottom: "14%", width: 160, height: 160, zIndex: 50, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,197,94,0.45),rgba(22,163,74,0.12),transparent 70%)", animation: "vineCounter 1.4s ease forwards" }} />
        <div style={{ position: "absolute", inset: -5, borderRadius: "50%", border: "3px solid rgba(34,197,94,0.5)", animation: "vineCounter 1.4s ease 0.1s forwards", opacity: 0 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 44, animation: "popIn 0.3s ease", filter: "drop-shadow(0 0 10px rgba(34,197,94,0.8))" }}>🌿</div>
      </div>}
      {defAnim && <div style={{ position: "absolute", inset: 0, zIndex: 45, pointerEvents: "none", animation: defAnim === "fire" ? "shieldFlash 0.8s ease" : defAnim === "water" ? "dodgeFlash 0.8s ease" : "counterFlash 0.8s ease" }} />}

      {/* Type effectiveness popup */}
      {effMsg && <div style={{ position: "absolute", top: "38%", left: "50%", transform: "translateX(-50%)", background: effMsg.color === "#22c55e" ? "linear-gradient(135deg,rgba(34,197,94,0.95),rgba(22,163,74,0.95))" : "linear-gradient(135deg,rgba(100,116,139,0.9),rgba(71,85,105,0.9))", color: "white", padding: "6px 20px", borderRadius: 20, fontSize: 14, fontWeight: 800, zIndex: 200, animation: "popIn 0.3s ease", boxShadow: `0 4px 16px ${effMsg.color}44`, letterSpacing: 1 }}>{effMsg.text}</div>}

      {/* Battle arena */}
      <div style={{ flex: 1, position: "relative", minHeight: 0, background: "#111", transition: "background 1s ease" }}>
        {scene.bgImg && <div className="scene-bg" style={{ backgroundImage: `url(${scene.bgImg})` }} />}
        <div style={{ position: "absolute", inset: 0, background: scene.sky, opacity: 0.25, zIndex: 1, transition: "background 1s ease" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: scene.ground, transition: "background 1s ease", zIndex: 2 }} />
        <div style={{ position: "absolute", right: "5%", top: "8%", width: "55%", height: 12, background: scene.platform2, borderRadius: "50%", filter: "blur(2px)", transition: "background 0.8s ease", zIndex: 3 }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>{scene.deco && scene.deco()}</div>
        <div style={{ position: "absolute", top: 10, left: 10, right: "42%", zIndex: 10 }}>
          <HPBar cur={eHp} max={enemy.maxHp} color={enemy.c1} label={`${enemy.typeIcon}${enemy.name} Lv.${enemy.lvl}`} />
          <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
            {burnStack > 0 && <div style={{ background: "rgba(239,68,68,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>🔥灼燒 x{burnStack}</div>}
            {frozen && <div style={{ background: "rgba(56,189,248,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>❄️凍結</div>}
          </div>
        </div>
        <div style={{ position: "absolute", right: "10%", top: enemy && (enemy.mType === "ghost" || enemy.id === "boss") ? "12%" : enemy && enemy.mType === "steel" ? "16%" : "26%", zIndex: 5, animation: eAnim || (enemy && enemy.id === "boss" ? "bossFloat 2.5s ease-in-out infinite, bossPulse 4s ease infinite" : "float 3s ease-in-out infinite") }}>
          <MonsterSprite svgStr={eSvg} size={enemy && enemy.id === "boss" ? 230 : enemy.id === "fire" || enemy.id === "dragon" || (enemy.id === "slime" && enemy.isEvolved) ? 180 : enemy.isEvolved ? 155 : 120} />
        </div>
        {!eAnim && <div style={{ position: "absolute", right: enemy && enemy.id === "boss" ? "12%" : "14%", top: enemy && enemy.id === "boss" ? "52%" : enemy && enemy.mType === "ghost" ? "40%" : enemy && enemy.mType === "steel" ? "46%" : "54%", width: enemy && enemy.id === "boss" ? 120 : enemy && (enemy.id === "fire" || enemy.id === "dragon" || (enemy.id === "slime" && enemy.isEvolved)) ? 100 : 80, height: 12, background: "radial-gradient(ellipse,rgba(0,0,0,0.6),transparent)", borderRadius: "50%", zIndex: 4, animation: "shadowPulse 3s ease-in-out infinite" }} />}
        <div style={{ position: "absolute", left: "2%", bottom: "12%", width: "50%", height: 10, background: scene.platform1, borderRadius: "50%", filter: "blur(2px)", transition: "background 0.8s ease", zIndex: 3 }} />
        <div style={{ position: "absolute", bottom: 10, right: 10, left: "42%", zIndex: 10 }}>
          <HPBar cur={pHp} max={PLAYER_MAX_HP} color="#6366f1" label={`${st.name} Lv.${pLvl}`} />
          <XPBar exp={pExp} max={expNext} />
        </div>
        <div style={{ position: "absolute", left: "6%", bottom: "14%", transform: "scaleX(-1)", zIndex: 5, animation: pAnim || "floatFlip 3s ease-in-out infinite" }}>
          <MonsterSprite svgStr={pSvg} size={pStg >= 2 ? 200 : pStg >= 1 ? 170 : 155} />
        </div>
        {!pAnim && <div style={{ position: "absolute", left: "10%", bottom: "12%", width: pStg >= 2 ? 100 : pStg >= 1 ? 85 : 70, height: 10, background: "radial-gradient(ellipse,rgba(0,0,0,0.55),transparent)", borderRadius: "50%", zIndex: 4, animation: "shadowPulse 3s ease-in-out infinite" }} />}
        {streak >= 2 && <div style={{ position: "absolute", top: 10, right: 10, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", padding: "3px 10px", borderRadius: 16, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease", zIndex: 20 }}>🔥 {streak} 連擊！</div>}
        {timedMode && streak < 2 && <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(239,68,68,0.7)", color: "white", padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, zIndex: 20, backdropFilter: "blur(4px)" }}>⏱️ 計時</div>}
        <div style={{ position: "absolute", bottom: 50, left: 10, display: "flex", gap: 4, zIndex: 20, background: "rgba(0,0,0,0.3)", padding: "3px 8px", borderRadius: 10, backdropFilter: "blur(4px)" }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 11, height: 11, borderRadius: 6, background: i < charge ? "#f59e0b" : "rgba(0,0,0,0.15)", border: "2px solid rgba(255,255,255,0.4)", transition: "all 0.3s", animation: i < charge ? "chargeGlow 1.5s ease infinite" : "none" }} />)}
          {chargeReady && <span style={{ fontSize: 9, color: "#b45309", fontWeight: 700, marginLeft: 2, animation: "popIn 0.3s ease" }}>MAX!</span>}
        </div>
        {specDef && <div style={{ position: "absolute", bottom: 70, left: 10, zIndex: 20, background: starter && starter.type === "fire" ? "linear-gradient(135deg,rgba(251,191,36,0.9),rgba(245,158,11,0.9))" : starter && starter.type === "water" ? "linear-gradient(135deg,rgba(56,189,248,0.9),rgba(14,165,233,0.9))" : "linear-gradient(135deg,rgba(34,197,94,0.9),rgba(22,163,74,0.9))", color: "white", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease, specDefReady 2s ease infinite", boxShadow: starter && starter.type === "fire" ? "0 2px 12px rgba(251,191,36,0.4)" : starter && starter.type === "water" ? "0 2px 12px rgba(56,189,248,0.4)" : "0 2px 12px rgba(34,197,94,0.4)" }}>{starter && starter.type === "fire" ? "🛡️防護罩" : starter && starter.type === "water" ? "💨完美閃避" : "🌿反彈"} 準備！</div>}
      </div>

      {/* Bottom panel */}
      <div style={{ background: "linear-gradient(to top,#0f172a,#1e293b)", borderTop: "3px solid rgba(255,255,255,0.1)", flexShrink: 0, minHeight: phase === "question" ? 210 : 170, position: "relative" }}>
        {phase === "menu" && starter && <div style={{ padding: 10 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {starter.moves.map((m, i) => {
            const locked = m.risky && !chargeReady;
            const lv = mLvls[i]; const pw = getPow(i);
            const atCap = m.basePower + lv * 2 > POWER_CAPS[i];
            const eff = enemy ? getEff(m.type, enemy.mType) : 1;
            return <button key={i} onClick={() => !locked && selectMove(i)} style={{ background: locked ? "rgba(255,255,255,0.03)" : eff > 1 ? `linear-gradient(135deg,${m.bg},rgba(34,197,94,0.08))` : eff < 1 ? `linear-gradient(135deg,${m.bg},rgba(148,163,184,0.08))` : m.bg, border: `2px solid ${locked ? "rgba(255,255,255,0.08)" : eff > 1 ? "#22c55e66" : m.color + "44"}`, borderRadius: 12, padding: "10px 10px", textAlign: "left", opacity: locked ? 0.4 : 1, cursor: locked ? "default" : "pointer", transition: "all 0.2s", animation: `fadeSlide 0.3s ease ${i * 0.05}s both`, position: "relative", overflow: "hidden" }}>
              {lv > 1 && <div style={{ position: "absolute", top: 4, right: eff !== 1 ? 44 : 6, background: atCap ? "linear-gradient(135deg,#f59e0b,#ef4444)" : m.color, color: "white", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 8, fontFamily: "'Press Start 2P',monospace" }}>Lv{lv}</div>}
              {eff > 1 && <div style={{ position: "absolute", top: 4, right: 6, background: "#22c55e", color: "white", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 8 }}>效果↑</div>}
              {eff < 1 && <div style={{ position: "absolute", top: 4, right: 6, background: "#64748b", color: "white", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 8 }}>效果↓</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}><span style={{ fontSize: 20 }}>{m.icon}</span><span style={{ fontSize: 15, fontWeight: 700, color: locked ? "#64748b" : m.color }}>{m.name}</span></div>
              <div style={{ fontSize: 12, color: locked ? "#475569" : "#64748b" }}>{m.desc} · 威力 <b style={{ color: lv > 1 ? m.color : "inherit" }}>{pw}</b>{eff > 1 ? " ×1.5" : eff < 1 ? " ×0.6" : ""}{m.risky && !chargeReady && " 🔒"}{m.risky && chargeReady && " ⚡蓄力完成！"}{!m.risky && !atCap && lv > 1 && " ↑"}{atCap && " ✦MAX"}</div>
              {!m.risky && !atCap && <div style={{ height: 3, background: "rgba(0,0,0,0.1)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}><div style={{ width: `${(mHits[i] % (HITS_PER_LVL * mLvls[i])) / (HITS_PER_LVL * mLvls[i]) * 100}%`, height: "100%", background: m.color, borderRadius: 2, transition: "width 0.3s" }} /></div>}
            </button>;
          })}
        </div><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}><button onClick={togglePause} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, padding: "5px 14px", borderRadius: 16, cursor: "pointer" }}>⏸️ 暫停</button><button onClick={quitGame} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, padding: "5px 14px", borderRadius: 16, cursor: "pointer" }}>🏳️ 逃跑</button></div></div>}

        {phase === "question" && q && <div style={{ padding: "10px 14px", animation: "fadeSlide 0.25s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><span style={{ fontSize: 18 }}>{starter && starter.moves[selIdx].icon}</span><span style={{ fontSize: 16, fontWeight: 700, color: "white" }}>{starter && starter.moves[selIdx].name}！</span><span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{timedMode ? "⏱️ 限時回答！" : "回答正確才能命中"}</span></div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 16px", textAlign: "center", marginBottom: 8, border: "1px solid rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
            {timedMode && !answered && <div style={{ position: "absolute", bottom: 0, left: 0, height: 4, background: timerLeft <= 1.5 ? "#ef4444" : timerLeft <= 3 ? "#f59e0b" : "#22c55e", width: `${(timerLeft / TIMER_SEC) * 100}%`, borderRadius: 2, transition: "width 0.05s linear,background 0.3s", animation: timerLeft <= 1.5 ? "timerPulse 0.4s ease infinite" : "none" }} />}
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{q.op === "×" ? "乘法題" : q.op === "÷" ? "除法題" : q.op === "+" ? "加法題" : "減法題"}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "white", letterSpacing: 2 }}>{q.display} = ?</div>
            {timedMode && !answered && <div style={{ fontSize: 11, fontWeight: 700, color: timerLeft <= 1.5 ? "#ef4444" : timerLeft <= 3 ? "#f59e0b" : "rgba(255,255,255,0.4)", marginTop: 2, fontFamily: "'Press Start 2P',monospace", transition: "color 0.3s" }}>{timerLeft.toFixed(1)}s</div>}
          </div>
          {fb && <div style={{ textAlign: "center", marginBottom: 4, fontSize: 16, fontWeight: 700, color: fb.correct ? "#22c55e" : "#ef4444", animation: "popIn 0.2s ease" }}>{fb.correct ? "✅ 命中！" : `❌ 答案是 ${fb.answer}`}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {q.choices.map((c, i) => {
              let bg = "rgba(255,255,255,0.08)", bd = "rgba(255,255,255,0.15)", co = "white";
              if (fb) { if (c === q.answer) { bg = "rgba(34,197,94,0.2)"; bd = "#22c55e"; co = "#22c55e"; } else { bg = "rgba(255,255,255,0.03)"; co = "rgba(255,255,255,0.3)"; } }
              return <button key={i} onClick={() => onAns(c)} disabled={answered} style={{ background: bg, border: `2px solid ${bd}`, borderRadius: 10, padding: "12px 8px", fontSize: 26, fontWeight: 700, color: co, transition: "all 0.2s" }}>{c}</button>;
            })}
          </div>
        </div>}

        {(phase === "text" || phase === "playerAtk" || phase === "enemyAtk" || phase === "victory" || phase === "ko") && <TextBox text={bText} onClick={advance} />}
      </div>
    </div>
  );
}

export default GameShell;
