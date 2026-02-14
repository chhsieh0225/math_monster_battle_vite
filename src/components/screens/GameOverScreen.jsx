import { useState, useRef } from 'react';
import { calcScore, saveScore } from '../../utils/leaderboard';

export default function GameOverScreen({ defeated, totalEnemies, tC, tW, pLvl, timedMode, maxStreak = 0, starter, mLvls, getPow, onRestart, onLeaderboard, onHome }) {
  const won = defeated >= totalEnemies;
  const finalScore = calcScore(defeated, tC, tW, pLvl, timedMode, maxStreak);
  const [lastRank, setLastRank] = useState(-1);
  const [nameSaved, setNameSaved] = useState(false);
  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem("mathMonsterBattle_name") || ""; } catch { return ""; }
  });
  const scoreSaved = useRef(false);

  const handleSaveScore = () => {
    if (scoreSaved.current) return;
    scoreSaved.current = true;
    const acc = (tC + tW > 0) ? Math.round(tC / (tC + tW) * 100) : 0;
    const nm = playerName.trim() || "???";
    try { localStorage.setItem("mathMonsterBattle_name", nm); } catch {}
    const entry = { score: finalScore, name: nm, defeated, correct: tC, wrong: tW, accuracy: acc, level: pLvl, timed: timedMode, maxStreak, completed: won, date: new Date().toISOString() };
    setLastRank(saveScore(entry));
    setNameSaved(true);
  };

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", color: "white", padding: "24px 20px", textAlign: "center",
      background: won ? "linear-gradient(180deg,#1e1b4b,#312e81,#4338ca)" : "linear-gradient(180deg,#1e1b4b,#1a0a2e,#0f0520)",
    }}>
      {/* Icon + Title */}
      <div style={{ fontSize: 56, marginBottom: 6, animation: "popIn 0.5s ease" }}>{won ? "🏆" : "💀"}</div>
      <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px" }}>
        {won ? "恭喜通關！" : "挑戰結束"}
        {timedMode && <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.25)", padding: "2px 8px", borderRadius: 10, marginLeft: 8, verticalAlign: "middle" }}>⏱️ 計時</span>}
      </h2>

      {/* Score */}
      <div style={{ marginBottom: 10, animation: "popIn 0.4s ease 0.2s both" }}>
        <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 2 }}>得分</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: "#fbbf24", fontFamily: "'Press Start 2P',monospace", textShadow: "0 0 16px rgba(251,191,36,0.35)" }}>{finalScore}</div>
        {lastRank >= 0 && lastRank < 3 && <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700, marginTop: 2 }}>{["🥇 新紀錄！第1名！", "🥈 第2名！", "🥉 第3名！"][lastRank]}</div>}
        {lastRank >= 3 && <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>排行榜第 {lastRank + 1} 名</div>}
      </div>

      {/* Name input */}
      {!nameSaved ? (
        <div style={{ marginBottom: 10, animation: "popIn 0.3s ease 0.4s both" }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
            <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="你的名字" maxLength={8}
              onKeyDown={e => { if (e.key === "Enter") handleSaveScore(); }}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "white", fontSize: 15, fontWeight: 700, padding: "8px 12px", textAlign: "center", width: 130, outline: "none" }} />
            <button onClick={handleSaveScore} style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", color: "white", fontSize: 13, fontWeight: 700, padding: "10px 18px", borderRadius: 12 }}>儲存</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 10, fontSize: 12, color: "#22c55e", fontWeight: 700 }}>✅ 已儲存</div>
      )}

      {/* Stats grid */}
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px", marginBottom: 10, width: "100%", maxWidth: 300, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Stat value={tC} label="答對" color="#22c55e" />
          <Stat value={tW} label="答錯" color="#ef4444" />
          <Stat value={maxStreak} label="連擊" color="#f97316" />
          <Stat value={defeated} label="打倒" color="#f59e0b" />
          <Stat value={`Lv.${pLvl}`} label="等級" color="#a855f7" />
          <Stat value={`${tC + tW > 0 ? Math.round(tC / (tC + tW) * 100) : 0}%`} label="正確率" color="#38bdf8" />
        </div>
      </div>

      {/* Move levels */}
      {starter && (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 14 }}>
          {starter.moves.map((m, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>{m.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: m.color }}>Lv.{mLvls[i]}</div>
              <div style={{ fontSize: 10, opacity: 0.35 }}>{getPow(i)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onRestart} style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", border: "none", color: "white", fontSize: 15, fontWeight: 700, padding: "12px 28px", borderRadius: 14 }}>🔄 再挑戰</button>
        <button onClick={onLeaderboard} style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", border: "none", color: "white", fontSize: 13, fontWeight: 700, padding: "12px 20px", borderRadius: 14 }}>🏆</button>
        <button onClick={onHome} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 13, fontWeight: 600, padding: "12px 18px", borderRadius: 14 }}>🏠</button>
      </div>
    </div>
  );
}

function Stat({ value, label, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.45 }}>{label}</div>
    </div>
  );
}
