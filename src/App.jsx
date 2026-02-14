/**
 * App.jsx — Thin render shell.
 *
 * All game state and logic live in useBattle().
 * This file is purely responsible for:
 *   1. Screen routing (title / selection / battle / evolve / gameover / leaderboard)
 *   2. Battle-screen layout & visual rendering
 *   3. Orientation-lock wrapper (GameShell)
 */
import { useState, useEffect } from 'react';
import './App.css';

// Hooks
import { useBattle } from './hooks/useBattle';

// Data
import { SCENES } from './data/scenes';
import { PLAYER_MAX_HP, TIMER_SEC, HITS_PER_LVL, MAX_MOVE_LVL, POWER_CAPS } from './data/constants';

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
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function GameShell() {
  const [showRotateHint, setShowRotateHint] = useState(false);
  useEffect(() => {
    try { screen.orientation.lock("portrait-primary").catch(() => {}); } catch (e) {}
    const chk = () => {
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
          <div onClick={() => setShowRotateHint(false)} style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#0f172a,#1e1b4b,#312e81)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", zIndex: 9999, cursor: "pointer" }}>
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

// ─── App: main game component (render only) ───
function App() {
  const B = useBattle();

  // ─── Screen routing ───
  if (B.screen === "title") return (
    <TitleScreen
      onStartNormal={() => { B.setTimedMode(false); B.setScreen("selection"); }}
      onStartTimed={() => { B.setTimedMode(true); B.setScreen("selection"); }}
      onLeaderboard={() => B.setScreen("leaderboard")}
    />
  );
  if (B.screen === "leaderboard") return (
    <LeaderboardScreen totalEnemies={B.enemies.length} onBack={() => B.setScreen("title")} />
  );
  if (B.screen === "selection") return (
    <SelectionScreen onSelect={(s) => { B.setStarter(s); B.startGame(); }} onBack={() => B.setScreen("title")} />
  );
  if (B.screen === "evolve") return (
    <EvolveScreen starter={B.starter} stageIdx={B.pStg} onContinue={() => { B.setScreen("battle"); }} />
  );
  if (B.screen === "gameover") return (
    <GameOverScreen
      defeated={B.defeated} totalEnemies={B.enemies.length}
      tC={B.tC} tW={B.tW} pLvl={B.pLvl} timedMode={B.timedMode}
      maxStreak={B.maxStreak} starter={B.starter} mLvls={B.mLvls}
      getPow={B.getPow}
      onRestart={() => B.starter && B.startGame()}
      onLeaderboard={() => B.setScreen("leaderboard")}
      onHome={() => B.setScreen("title")}
    />
  );
  if (!B.enemy || !B.starter) return null;

  // ─── Battle screen locals ───
  const st = B.starter.stages[B.pStg];
  const eSvg = B.enemy.svgFn();
  const pSvg = st.svgFn();
  const scene = SCENES[B.enemy.mType] || SCENES.grass;
  const canTapAdvance = B.phase === "text" || B.phase === "victory";

  return (
    <div onClick={canTapAdvance ? B.advance : undefined} style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", cursor: canTapAdvance ? "pointer" : "default" }}>
      {/* Pause overlay */}
      {B.gamePaused && <div onClick={B.togglePause} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", zIndex: 9000, cursor: "pointer", backdropFilter: "blur(4px)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏸️</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>遊戲暫停</div>
        <div style={{ fontSize: 13, opacity: 0.5 }}>點擊任意處繼續</div>
      </div>}

      {/* Popups & particles */}
      {B.dmgs.map(d => <DamagePopup key={d.id} value={d.value} x={d.x} y={d.y} color={d.color} onDone={() => B.rmD(d.id)} />)}
      {B.parts.map(p => <Particle key={p.id} emoji={p.emoji} x={p.x} y={p.y} onDone={() => B.rmP(p.id)} />)}

      {/* Move level-up toast */}
      {B.mLvlUp !== null && B.starter && <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,rgba(251,191,36,0.9),rgba(245,158,11,0.9))", color: "white", padding: "6px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 200, animation: "popIn 0.3s ease", boxShadow: "0 4px 16px rgba(245,158,11,0.4)", whiteSpace: "nowrap" }}>{B.starter.moves[B.mLvlUp].icon} {B.starter.moves[B.mLvlUp].name} 升級到 Lv.{B.mLvls[B.mLvlUp]}！威力 → {B.getPow(B.mLvlUp)}</div>}

      {/* Attack effects */}
      {B.atkEffect && B.atkEffect.type === "fire" && <FireEffect idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} onDone={() => {}} />}
      {B.atkEffect && B.atkEffect.type === "electric" && <ElecEffect idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} onDone={() => {}} />}
      {B.atkEffect && B.atkEffect.type === "water" && <WaterEffect idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} onDone={() => {}} />}
      {B.atkEffect && B.atkEffect.type === "grass" && <GrassEffect idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} onDone={() => {}} />}
      {B.atkEffect && B.atkEffect.type === "dark" && <DarkEffect idx={B.atkEffect.idx} lvl={B.atkEffect.lvl} onDone={() => {}} />}

      {/* Special Defense animations */}
      {B.defAnim === "fire" && <div style={{ position: "absolute", left: "6%", bottom: "14%", width: 160, height: 160, zIndex: 50, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle,rgba(251,191,36,0.5),rgba(245,158,11,0.15),transparent 70%)", animation: "shieldPulse 1.2s ease forwards" }} />
        <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "3px solid rgba(251,191,36,0.6)", animation: "shieldPulse 1.2s ease 0.1s forwards", opacity: 0 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 48, animation: "popIn 0.3s ease", filter: "drop-shadow(0 0 12px rgba(251,191,36,0.8))" }}>🛡️</div>
      </div>}
      {B.defAnim === "water" && <div style={{ position: "absolute", left: "6%", bottom: "14%", width: 130, height: 130, zIndex: 50, pointerEvents: "none" }}>
        {[0, 1, 2].map(i => <div key={i} style={{ position: "absolute", inset: 0, background: "radial-gradient(circle,rgba(56,189,248,0.35),transparent 70%)", borderRadius: "50%", animation: `shieldPulse 0.8s ease ${i * 0.15}s forwards`, opacity: 0 }} />)}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 40, animation: "popIn 0.3s ease", filter: "drop-shadow(0 0 10px rgba(56,189,248,0.8))" }}>💨</div>
      </div>}
      {B.defAnim === "grass" && <div style={{ position: "absolute", left: "6%", bottom: "14%", width: 160, height: 160, zIndex: 50, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,197,94,0.45),rgba(22,163,74,0.12),transparent 70%)", animation: "vineCounter 1.4s ease forwards" }} />
        <div style={{ position: "absolute", inset: -5, borderRadius: "50%", border: "3px solid rgba(34,197,94,0.5)", animation: "vineCounter 1.4s ease 0.1s forwards", opacity: 0 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 44, animation: "popIn 0.3s ease", filter: "drop-shadow(0 0 10px rgba(34,197,94,0.8))" }}>🌿</div>
      </div>}
      {B.defAnim && <div style={{ position: "absolute", inset: 0, zIndex: 45, pointerEvents: "none", animation: B.defAnim === "fire" ? "shieldFlash 0.8s ease" : B.defAnim === "water" ? "dodgeFlash 0.8s ease" : "counterFlash 0.8s ease" }} />}

      {/* Type effectiveness popup */}
      {B.effMsg && <div style={{ position: "absolute", top: "38%", left: "50%", transform: "translateX(-50%)", background: B.effMsg.color === "#22c55e" ? "linear-gradient(135deg,rgba(34,197,94,0.95),rgba(22,163,74,0.95))" : "linear-gradient(135deg,rgba(100,116,139,0.9),rgba(71,85,105,0.9))", color: "white", padding: "6px 20px", borderRadius: 20, fontSize: 14, fontWeight: 800, zIndex: 200, animation: "popIn 0.3s ease", boxShadow: `0 4px 16px ${B.effMsg.color}44`, letterSpacing: 1 }}>{B.effMsg.text}</div>}

      {/* ═══ Battle arena ═══ */}
      <div style={{ flex: 1, position: "relative", minHeight: 0, background: "#111", transition: "background 1s ease" }}>
        {scene.bgImg && <div className="scene-bg" style={{ backgroundImage: `url(${scene.bgImg})` }} />}
        <div style={{ position: "absolute", inset: 0, background: scene.sky, opacity: 0.25, zIndex: 1, transition: "background 1s ease" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: scene.ground, transition: "background 1s ease", zIndex: 2 }} />
        <div style={{ position: "absolute", right: "5%", top: "8%", width: "55%", height: 12, background: scene.platform2, borderRadius: "50%", filter: "blur(2px)", zIndex: 3 }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>{scene.deco && scene.deco()}</div>

        {/* Enemy info */}
        <div style={{ position: "absolute", top: 10, left: 10, right: "42%", zIndex: 10 }}>
          <HPBar cur={B.eHp} max={B.enemy.maxHp} color={B.enemy.c1} label={`${B.enemy.typeIcon}${B.enemy.name} Lv.${B.enemy.lvl}`} />
          <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
            {B.burnStack > 0 && <div style={{ background: "rgba(239,68,68,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>🔥灼燒 x{B.burnStack}</div>}
            {B.frozen && <div style={{ background: "rgba(56,189,248,0.85)", color: "white", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease" }}>❄️凍結</div>}
          </div>
        </div>

        {/* Enemy sprite */}
        <div style={{ position: "absolute", right: "10%", top: B.enemy && (B.enemy.mType === "ghost" || B.enemy.id === "boss") ? "12%" : B.enemy && B.enemy.mType === "steel" ? "16%" : "26%", zIndex: 5, animation: B.eAnim || (B.enemy && B.enemy.id === "boss" ? "bossFloat 2.5s ease-in-out infinite, bossPulse 4s ease infinite" : "float 3s ease-in-out infinite") }}>
          <MonsterSprite svgStr={eSvg} size={B.enemy && B.enemy.id === "boss" ? 230 : B.enemy.id === "fire" || B.enemy.id === "dragon" || (B.enemy.id === "slime" && B.enemy.isEvolved) ? 180 : B.enemy.isEvolved ? 155 : 120} />
        </div>
        {!B.eAnim && <div style={{ position: "absolute", right: B.enemy && B.enemy.id === "boss" ? "12%" : "14%", top: B.enemy && B.enemy.id === "boss" ? "52%" : B.enemy && B.enemy.mType === "ghost" ? "40%" : B.enemy && B.enemy.mType === "steel" ? "46%" : "54%", width: B.enemy && B.enemy.id === "boss" ? 120 : B.enemy && (B.enemy.id === "fire" || B.enemy.id === "dragon" || (B.enemy.id === "slime" && B.enemy.isEvolved)) ? 100 : 80, height: 12, background: "radial-gradient(ellipse,rgba(0,0,0,0.6),transparent)", borderRadius: "50%", zIndex: 4, animation: B.enemy && B.enemy.id === "boss" ? "bossShadowPulse 2.5s ease-in-out infinite" : "shadowPulse 3s ease-in-out infinite" }} />}

        {/* Player platform & info */}
        <div style={{ position: "absolute", left: "2%", bottom: "12%", width: "50%", height: 10, background: scene.platform1, borderRadius: "50%", filter: "blur(2px)", zIndex: 3 }} />
        <div style={{ position: "absolute", bottom: 10, right: 10, left: "42%", zIndex: 10 }}>
          <HPBar cur={B.pHp} max={PLAYER_MAX_HP} color="#6366f1" label={`${st.name} Lv.${B.pLvl}`} />
          <XPBar exp={B.pExp} max={B.expNext} />
        </div>

        {/* Player sprite */}
        <div style={{ position: "absolute", left: "6%", bottom: "14%", transform: "scaleX(-1)", zIndex: 5, animation: B.pAnim || "floatFlip 3s ease-in-out infinite" }}>
          <MonsterSprite svgStr={pSvg} size={B.pStg >= 2 ? 200 : B.pStg >= 1 ? 170 : 155} />
        </div>
        {!B.pAnim && <div style={{ position: "absolute", left: "10%", bottom: "12%", width: B.pStg >= 2 ? 100 : B.pStg >= 1 ? 85 : 70, height: 10, background: "radial-gradient(ellipse,rgba(0,0,0,0.55),transparent)", borderRadius: "50%", zIndex: 4, animation: "shadowPulse 3s ease-in-out infinite" }} />}

        {/* Streak badge */}
        {B.streak >= 2 && <div style={{ position: "absolute", top: 10, right: 10, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", padding: "3px 10px", borderRadius: 16, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease", zIndex: 20 }}>🔥 {B.streak} 連擊！</div>}
        {B.timedMode && B.streak < 2 && <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(239,68,68,0.7)", color: "white", padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, zIndex: 20, backdropFilter: "blur(4px)" }}>⏱️ 計時</div>}

        {/* Charge meter */}
        <div style={{ position: "absolute", bottom: 50, left: 10, display: "flex", gap: 4, zIndex: 20, background: "rgba(0,0,0,0.3)", padding: "3px 8px", borderRadius: 10, backdropFilter: "blur(4px)" }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 11, height: 11, borderRadius: 6, background: i < B.charge ? "#f59e0b" : "rgba(0,0,0,0.15)", border: "2px solid rgba(255,255,255,0.4)", transition: "all 0.3s", animation: i < B.charge ? "chargeGlow 1.5s ease infinite" : "none" }} />)}
          {B.chargeReady && <span style={{ fontSize: 9, color: "#b45309", fontWeight: 700, marginLeft: 2, animation: "popIn 0.3s ease" }}>MAX!</span>}
        </div>

        {/* Special defense ready badge */}
        {B.specDef && <div style={{ position: "absolute", bottom: 70, left: 10, zIndex: 20, background: B.starter.type === "fire" ? "linear-gradient(135deg,rgba(251,191,36,0.9),rgba(245,158,11,0.9))" : B.starter.type === "water" ? "linear-gradient(135deg,rgba(56,189,248,0.9),rgba(14,165,233,0.9))" : "linear-gradient(135deg,rgba(34,197,94,0.9),rgba(22,163,74,0.9))", color: "white", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, animation: "popIn 0.3s ease, specDefReady 2s ease infinite", boxShadow: B.starter.type === "fire" ? "0 2px 12px rgba(251,191,36,0.4)" : B.starter.type === "water" ? "0 2px 12px rgba(56,189,248,0.4)" : "0 2px 12px rgba(34,197,94,0.4)" }}>{B.starter.type === "fire" ? "🛡️防護罩" : B.starter.type === "water" ? "💨完美閃避" : "🌿反彈"} 準備！</div>}
      </div>

      {/* ═══ Bottom panel ═══ */}
      <div style={{ background: "linear-gradient(to top,#0f172a,#1e293b)", borderTop: "3px solid rgba(255,255,255,0.1)", flexShrink: 0, minHeight: B.phase === "question" ? 210 : 170, position: "relative" }}>

        {/* Move menu */}
        {B.phase === "menu" && B.starter && <div style={{ padding: 10 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {B.starter.moves.map((m, i) => {
            const locked = m.risky && !B.chargeReady;
            const lv = B.mLvls[i]; const pw = B.getPow(i);
            const atCap = lv >= MAX_MOVE_LVL || m.basePower + lv * m.growth > POWER_CAPS[i];
            const eff = B.dualEff(m);
            return <button key={i} onClick={() => !locked && B.selectMove(i)} style={{ background: locked ? "rgba(255,255,255,0.03)" : eff > 1 ? `linear-gradient(135deg,${m.bg},rgba(34,197,94,0.08))` : eff < 1 ? `linear-gradient(135deg,${m.bg},rgba(148,163,184,0.08))` : m.bg, border: `2px solid ${locked ? "rgba(255,255,255,0.08)" : eff > 1 ? "#22c55e66" : m.color + "44"}`, borderRadius: 12, padding: "10px 10px", textAlign: "left", opacity: locked ? 0.4 : 1, cursor: locked ? "default" : "pointer", transition: "all 0.2s", animation: `fadeSlide 0.3s ease ${i * 0.05}s both`, position: "relative", overflow: "hidden" }}>
              {lv > 1 && <div style={{ position: "absolute", top: 4, right: eff !== 1 ? 44 : 6, background: atCap ? "linear-gradient(135deg,#f59e0b,#ef4444)" : m.color, color: "white", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 8, fontFamily: "'Press Start 2P',monospace" }}>Lv{lv}</div>}
              {eff > 1 && <div style={{ position: "absolute", top: 4, right: 6, background: "#22c55e", color: "white", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 8 }}>效果↑</div>}
              {eff < 1 && <div style={{ position: "absolute", top: 4, right: 6, background: "#64748b", color: "white", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 8 }}>效果↓</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}><span style={{ fontSize: 20 }}>{m.icon}</span><span style={{ fontSize: 15, fontWeight: 700, color: locked ? "#64748b" : m.color }}>{m.name}</span></div>
              <div style={{ fontSize: 12, color: locked ? "#475569" : "#64748b" }}>{m.desc} · 威力 <b style={{ color: lv > 1 ? m.color : "inherit" }}>{pw}</b>{eff > 1 ? " ×1.5" : eff < 1 ? " ×0.6" : ""}{m.risky && !B.chargeReady && " 🔒"}{m.risky && B.chargeReady && " ⚡蓄力完成！"}{!m.risky && !atCap && lv > 1 && " ↑"}{atCap && " ✦MAX"}</div>
              {!m.risky && !atCap && <div style={{ height: 3, background: "rgba(0,0,0,0.1)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}><div style={{ width: `${(B.mHits[i] % (HITS_PER_LVL * B.mLvls[i])) / (HITS_PER_LVL * B.mLvls[i]) * 100}%`, height: "100%", background: m.color, borderRadius: 2, transition: "width 0.3s" }} /></div>}
            </button>;
          })}
        </div><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}><button onClick={B.togglePause} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, padding: "5px 14px", borderRadius: 16, cursor: "pointer" }}>⏸️ 暫停</button><button onClick={B.quitGame} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, padding: "5px 14px", borderRadius: 16, cursor: "pointer" }}>🏳️ 逃跑</button></div></div>}

        {/* Question panel */}
        {B.phase === "question" && B.q && <div style={{ padding: "10px 14px", animation: "fadeSlide 0.25s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><span style={{ fontSize: 18 }}>{B.starter.moves[B.selIdx].icon}</span><span style={{ fontSize: 16, fontWeight: 700, color: "white" }}>{B.starter.moves[B.selIdx].name}！</span><span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{B.timedMode ? "⏱️ 限時回答！" : "回答正確才能命中"}</span></div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 16px", textAlign: "center", marginBottom: 8, border: "1px solid rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
            {B.timedMode && !B.answered && <div style={{ position: "absolute", bottom: 0, left: 0, height: 4, background: B.timerLeft <= 1.5 ? "#ef4444" : B.timerLeft <= 3 ? "#f59e0b" : "#22c55e", width: `${(B.timerLeft / TIMER_SEC) * 100}%`, borderRadius: 2, transition: "width 0.05s linear,background 0.3s", animation: B.timerLeft <= 1.5 ? "timerPulse 0.4s ease infinite" : "none" }} />}
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{B.q.op === "×" ? "乘法題" : B.q.op === "÷" ? "除法題" : B.q.op === "+" ? "加法題" : "減法題"}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "white", letterSpacing: 2 }}>{B.q.display} = ?</div>
            {B.timedMode && !B.answered && <div style={{ fontSize: 11, fontWeight: 700, color: B.timerLeft <= 1.5 ? "#ef4444" : B.timerLeft <= 3 ? "#f59e0b" : "rgba(255,255,255,0.4)", marginTop: 2, fontFamily: "'Press Start 2P',monospace", transition: "color 0.3s" }}>{B.timerLeft.toFixed(1)}s</div>}
          </div>
          {B.fb && <div style={{ textAlign: "center", marginBottom: 4, fontSize: 16, fontWeight: 700, color: B.fb.correct ? "#22c55e" : "#ef4444", animation: "popIn 0.2s ease" }}>{B.fb.correct ? "✅ 命中！" : `❌ 答案是 ${B.fb.answer}`}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {B.q.choices.map((c, i) => {
              let bg = "rgba(255,255,255,0.08)", bd = "rgba(255,255,255,0.15)", co = "white";
              if (B.fb) { if (c === B.q.answer) { bg = "rgba(34,197,94,0.2)"; bd = "#22c55e"; co = "#22c55e"; } else { bg = "rgba(255,255,255,0.03)"; co = "rgba(255,255,255,0.3)"; } }
              return <button key={i} onClick={() => B.onAns(c)} disabled={B.answered} style={{ background: bg, border: `2px solid ${bd}`, borderRadius: 10, padding: "12px 8px", fontSize: 26, fontWeight: 700, color: co, transition: "all 0.2s" }}>{c}</button>;
            })}
          </div>
        </div>}

        {/* Text box */}
        {(B.phase === "text" || B.phase === "playerAtk" || B.phase === "enemyAtk" || B.phase === "victory" || B.phase === "ko") && <TextBox text={B.bText} onClick={B.advance} />}
      </div>
    </div>
  );
}

export default GameShell;
