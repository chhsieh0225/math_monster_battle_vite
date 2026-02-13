import { useState, useRef } from 'react';
import { calcScore, saveScore } from '../../utils/leaderboard';

export default function GameOverScreen({ defeated, totalEnemies, tC, tW, pLvl, timedMode, maxStreak = 0, starter, mLvls, getPow, onRestart, onLeaderboard, onHome }) {
  const won = defeated >= totalEnemies;
  const finalScore = calcScore(defeated, tC, tW, pLvl, timedMode, maxStreak);
  const [lastRank, setLastRank] = useState(-1);
  const [nameSaved, setNameSaved] = useState(false);
  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem("mathMonsterBattle_name") || ""; } catch (e) { return ""; }
  });
  const scoreSaved = useRef(false);

  const handleSaveScore = () => {
    if (scoreSaved.current) return;
    scoreSaved.current = true;
    const comp = defeated >= totalEnemies;
    const acc = (tC + tW > 0) ? Math.round(tC / (tC + tW) * 100) : 0;
    const sc = finalScore;
    const nm = playerName.trim() || "???";
    try { localStorage.setItem("mathMonsterBattle_name", nm); } catch (e) {}
    const entry = { score: sc, name: nm, defeated, correct: tC, wrong: tW, accuracy: acc, level: pLvl, timed: timedMode, maxStreak, completed: comp, date: new Date().toISOString() };
    const rank = saveScore(entry);
    setLastRank(rank);
    setNameSaved(true);
  };

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:won?"linear-gradient(180deg,#1e1b4b,#312e81,#4338ca)":"linear-gradient(180deg,#1e1b4b,#1a0a2e,#0f0520)",color:"white",padding:24,textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:8,animation:"popIn 0.5s ease"}}>{won?"🏆":"💀"}</div>
      <h2 style={{fontSize:26,fontWeight:900,marginBottom:4}}>{won?"恭喜通關！":"挑戰結束"}{timedMode&&<span style={{fontSize:13,fontWeight:700,background:"rgba(239,68,68,0.3)",padding:"2px 10px",borderRadius:12,marginLeft:8,verticalAlign:"middle"}}>⏱️ 計時</span>}</h2>
      <div style={{marginBottom:12,animation:"popIn 0.4s ease 0.2s both"}}>
        <div style={{fontSize:13,opacity:0.5,marginBottom:2}}>得分</div>
        <div style={{fontSize:32,fontWeight:900,color:"#fbbf24",fontFamily:"'Press Start 2P',monospace",textShadow:"0 0 20px rgba(251,191,36,0.4)"}}>{finalScore}</div>
        {lastRank>=0&&lastRank<3&&<div style={{fontSize:12,color:"#fbbf24",fontWeight:700,marginTop:2,animation:"popIn 0.3s ease 0.5s both"}}>{["🥇 新紀錄！第1名！","🥈 第2名！","🥉 第3名！"][lastRank]}</div>}
        {lastRank>=3&&<div style={{fontSize:12,opacity:0.5,marginTop:2}}>排行榜第 {lastRank+1} 名</div>}
      </div>
      {!nameSaved?<div style={{marginBottom:12,animation:"popIn 0.3s ease 0.4s both"}}><div style={{fontSize:13,opacity:0.5,marginBottom:6}}>輸入你的名字</div><div style={{display:"flex",gap:8,justifyContent:"center",alignItems:"center"}}><input value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="???" maxLength={8} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:10,color:"white",fontSize:16,fontWeight:700,padding:"8px 12px",textAlign:"center",width:140,outline:"none"}} onKeyDown={e=>{if(e.key==="Enter")handleSaveScore();}}/><button onClick={handleSaveScore} style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",border:"none",color:"white",fontSize:14,fontWeight:700,padding:"10px 20px",borderRadius:50}}>儲存</button></div></div>:<div style={{marginBottom:12,fontSize:12,color:"#22c55e",fontWeight:700,animation:"popIn 0.3s ease"}}>✅ 已儲存！</div>}
      <div style={{background:"rgba(255,255,255,0.08)",borderRadius:16,padding:20,marginBottom:12,minWidth:260,border:"1px solid rgba(255,255,255,0.1)"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,fontSize:14}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:"#22c55e"}}>{tC}</div><div style={{opacity:0.5,fontSize:12}}>答對</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:"#ef4444"}}>{tW}</div><div style={{opacity:0.5,fontSize:12}}>答錯</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:"#f97316"}}>{maxStreak}</div><div style={{opacity:0.5,fontSize:12}}>最大連擊</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:"#f59e0b"}}>{defeated}</div><div style={{opacity:0.5,fontSize:12}}>打倒怪獸</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:"#a855f7"}}>Lv.{pLvl}</div><div style={{opacity:0.5,fontSize:12}}>最終等級</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:900,color:"#38bdf8"}}>{tC+tW>0?Math.round(tC/(tC+tW)*100):0}%</div><div style={{opacity:0.5,fontSize:12}}>正確率</div></div>
        </div>
        {maxStreak >= 5 && <div style={{marginTop:10,fontSize:12,fontWeight:700,color:"#f97316",animation:"popIn 0.3s ease"}}>🔥 連擊大師！最高 {maxStreak} 連擊 (+{maxStreak * 20}分)</div>}
      </div>
      <div style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"12px 16px",marginBottom:16,minWidth:260,border:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{fontSize:14,opacity:0.4,marginBottom:8}}>招式等級</div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>{starter&&starter.moves.map((m,i)=><div key={i} style={{textAlign:"center"}}><div style={{fontSize:22}}>{m.icon}</div><div style={{fontSize:13,fontWeight:700,color:m.color}}>Lv.{mLvls[i]}</div><div style={{fontSize:12,opacity:0.4}}>威力{getPow(i)}</div></div>)}</div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={onRestart} style={{background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",color:"white",fontSize:16,fontWeight:700,padding:"12px 32px",borderRadius:50}}>🔄 再挑戰</button>
        <button onClick={onLeaderboard} style={{background:"linear-gradient(135deg,#f59e0b,#ef4444)",border:"none",color:"white",fontSize:14,fontWeight:700,padding:"12px 24px",borderRadius:50}}>🏆 排行榜</button>
        <button onClick={onHome} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",fontSize:14,fontWeight:600,padding:"12px 20px",borderRadius:50}}>🏠</button>
      </div>
    </div>
  );
}
