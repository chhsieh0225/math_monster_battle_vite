import { loadScores } from '../../utils/leaderboard';

export default function LeaderboardScreen({ totalEnemies, onBack }) {
  const scores = loadScores();
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",background:"linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)",color:"white",padding:24,overflow:"auto"}}>
      <div style={{fontSize:36,marginBottom:4,marginTop:16}}>🏆</div>
      <h2 style={{fontSize:22,fontWeight:900,marginBottom:16,letterSpacing:1}}>排行榜</h2>
      {scores.length===0?<div style={{opacity:0.4,fontSize:14,marginTop:40}}>尚無紀錄，快去挑戰吧！</div>:
      <div style={{width:"100%",maxWidth:340}}>
        {scores.map((s,i)=>{const d=new Date(s.date);const ds=`${d.getMonth()+1}/${d.getDate()}`;
        return<div key={s.date+"_"+i} style={{display:"flex",alignItems:"center",gap:10,background:i===0?"rgba(251,191,36,0.12)":i===1?"rgba(192,192,192,0.08)":i===2?"rgba(205,127,50,0.08)":"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px 14px",marginBottom:6,border:`1px solid ${i===0?"rgba(251,191,36,0.25)":i<3?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.05)"}`,animation:`fadeSlide 0.3s ease ${i*0.05}s both`}}>
          <div style={{width:28,fontSize:i<3?20:14,textAlign:"center",fontWeight:900,color:i===0?"#fbbf24":i===1?"#c0c0c0":i===2?"#cd7f32":"rgba(255,255,255,0.4)"}}>{i<3?["🥇","🥈","🥉"][i]:`${i+1}`}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.85)",marginBottom:1}}>{s.name||"???"}</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:18,fontWeight:900,color:"#fbbf24",fontFamily:"'Press Start 2P',monospace"}}>{s.score}</span>
              {s.timed&&<span style={{fontSize:9,background:"rgba(239,68,68,0.3)",padding:"1px 6px",borderRadius:8,fontWeight:700}}>⏱️</span>}
              {s.completed&&<span style={{fontSize:9,background:"rgba(34,197,94,0.3)",padding:"1px 6px",borderRadius:8,fontWeight:700}}>👑</span>}
            </div>
            <div style={{fontSize:10,opacity:0.5,marginTop:2}}>怪獸 {s.defeated}/{totalEnemies} · 正確率 {s.accuracy}% · Lv.{s.level}</div>
          </div>
          <div style={{fontSize:10,opacity:0.3,flexShrink:0}}>{ds}</div>
        </div>;})}
      </div>}
      <button onClick={onBack} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",fontSize:14,fontWeight:600,padding:"10px 28px",borderRadius:50,marginTop:20}}>🏠 返回主畫面</button>
    </div>
  );
}
