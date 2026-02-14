import MonsterSprite from '../ui/MonsterSprite';
import { STARTERS } from '../../data/starters';
import { VERSION } from '../../data/constants';

export default function TitleScreen({ onStartNormal, onStartTimed, onLeaderboard, onAchievements, onEncyclopedia }) {
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)",color:"white",padding:24,textAlign:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"8%",left:"12%",fontSize:40,opacity:0.12,animation:"sparkle 3s ease infinite"}}>⭐</div>
      <div style={{position:"absolute",top:"18%",right:"18%",fontSize:30,opacity:0.08,animation:"sparkle 4s ease 1s infinite"}}>✨</div>
      <div style={{display:"flex",gap:12,marginBottom:16,alignItems:"flex-end"}}>{STARTERS.map((s,i)=><div key={s.id} style={{animation:`float ${3+i*0.4}s ease-in-out ${i*0.3}s infinite`}}><MonsterSprite svgStr={s.stages[0].svgFn(s.c1,s.c2)} size={i===1?110:95}/></div>)}</div>
      <h1 style={{fontSize:32,fontWeight:900,marginBottom:4,letterSpacing:2,textShadow:"0 0 30px rgba(99,102,241,0.5)"}}>數學寶可夢</h1>
      <h2 style={{fontSize:18,fontWeight:700,marginBottom:8,opacity:0.6}}>Math Monster Battle</h2>
      <p style={{fontSize:13,opacity:0.4,marginBottom:28,lineHeight:1.7}}>選擇招式 → 回答數學題 → 打倒怪獸！<br/>持續使用同一招式可以升級威力 🔥<br/>連續答對蓄力必殺技 💪</p>
      <div style={{display:"flex",gap:10,marginBottom:12}}>
        <button onClick={onStartNormal} style={{background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",color:"white",fontSize:17,fontWeight:800,padding:"14px 28px",borderRadius:50,boxShadow:"0 4px 24px rgba(99,102,241,0.4)",letterSpacing:1}}>⚔️ 一般模式</button>
        <button onClick={onStartTimed} style={{background:"linear-gradient(135deg,#ef4444,#f59e0b)",border:"none",color:"white",fontSize:17,fontWeight:800,padding:"14px 28px",borderRadius:50,boxShadow:"0 4px 24px rgba(239,68,68,0.4)",letterSpacing:1}}>⏱️ 計時模式</button>
      </div>
      <div style={{fontSize:11,opacity:0.3,marginBottom:8}}>計時模式：5秒內回答，否則怪獸搶先攻擊！</div>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button onClick={onLeaderboard} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"white",fontSize:13,fontWeight:600,padding:"8px 18px",borderRadius:50}}>🏆 排行榜</button>
        <button onClick={onAchievements} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"white",fontSize:13,fontWeight:600,padding:"8px 18px",borderRadius:50}}>⭐ 成就</button>
        <button onClick={onEncyclopedia} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"white",fontSize:13,fontWeight:600,padding:"8px 18px",borderRadius:50}}>📚 圖鑑</button>
      </div>
      <div style={{display:"flex",gap:16,marginTop:16,fontSize:12,opacity:0.3}}><div>🔥 乘法</div><div>🌊 除法</div><div>💥 混合</div><div>⚡ 九九</div></div>
      <div style={{marginTop:36,opacity:0.25,fontSize:11,lineHeight:1.8}}><div>設計：Chung-Han Hsieh</div><div style={{fontSize:10}}>✉️ ch.hsieh@mx.nthu.edu.tw</div><div>程式實作：由 Claude (Anthropic) 協助生成</div><div style={{marginTop:6,fontSize:10,opacity:0.6,fontFamily:"monospace"}}>{VERSION}</div></div>
    </div>
  );
}
