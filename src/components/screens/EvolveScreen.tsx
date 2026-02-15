import type { CSSProperties } from 'react';
import MonsterSprite from '../ui/MonsterSprite';
import type { StarterLite } from '../../types/game';

type EvolveScreenProps = {
  starter: StarterLite | null;
  stageIdx: number;
  onContinue: () => void;
};

export default function EvolveScreen({ starter, stageIdx, onContinue }: EvolveScreenProps) {
  const st = starter?.stages?.[stageIdx];
  const ECOLORS = ["#818cf8","#a855f7","#fbbf24","#22c55e","#60a5fa","#f472b6","#fb923c","#34d399","#c084fc","#facc15"];

  if (!starter || !st) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#0f172a,#1e1b4b,#312e81)", color: "white", padding: 24, textAlign: "center", gap: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>進化資料暫時不可用</div>
        <div style={{ fontSize: 13, opacity: 0.65 }}>已套用安全保護，你可以繼續遊戲。</div>
        <button className="touch-btn" onClick={onContinue} style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", border: "none", color: "white", fontSize: 16, fontWeight: 700, padding: "14px 40px", borderRadius: 50, boxShadow: "0 4px 24px rgba(99,102,241,0.5)" }}>繼續戰鬥！</button>
      </div>
    );
  }

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(270deg,#0f0520,#1e1b4b,#312e81,#1e1b4b,#0f0520)",backgroundSize:"400% 400%",animation:"bgShimmer 6s ease infinite",color:"white",padding:24,textAlign:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"white",animation:"evolveFlash 1.8s ease forwards",zIndex:100,pointerEvents:"none"}}/>
      {[0,0.3,0.6].map((dl,i)=><div key={"br"+i} style={{position:"absolute",left:"50%",top:"42%",width:60,height:60,marginLeft:-30,marginTop:-30,borderRadius:"50%",border:"3px solid",borderColor:["rgba(99,102,241,0.6)","rgba(168,85,247,0.5)","rgba(251,191,36,0.4)"][i],animation:`colorBurst 1.8s ease ${dl}s forwards`,pointerEvents:"none"}}/>)}
      {Array.from({ length: 12 }, (_, i) => {
        const orbitStyle = {
          position: "absolute",
          left: "50%",
          top: "42%",
          width: 0,
          height: 0,
          animation: `evolveSpin ${2.2 + i * 0.25}s linear ${i * 0.12}s infinite`,
          zIndex: 50,
          "--orbit": `${45 + i * 7}px`,
        } as CSSProperties;

        return (
          <div key={`op${i}`} style={orbitStyle}>
            <div style={{ width: 4 + i % 3 * 2, height: 4 + i % 3 * 2, borderRadius: "50%", background: ECOLORS[i % 10], boxShadow: `0 0 ${6 + i * 2}px ${ECOLORS[i % 10]}`, opacity: 0.85 }} />
          </div>
        );
      })}
      {Array.from({length:8},(_,i)=><div key={"ss"+i} style={{position:"absolute",left:`${12+Math.sin(i*1.3)*32+32}%`,top:`${8+Math.cos(i*1.7)*32+32}%`,fontSize:12+i%3*8,animation:`sparkle ${1.5+i*0.2}s ease ${0.3+i*0.25}s infinite`,zIndex:50,pointerEvents:"none"}}>{i%2===0?"✨":"⭐"}</div>)}
      <div style={{position:"relative",zIndex:60}}>
        <div style={{fontSize:20,fontWeight:700,opacity:0.8,marginBottom:16,animation:"fadeSlide 0.5s ease 0.8s both",textShadow:"0 0 20px rgba(168,85,247,0.5)"}}>恭喜！你的夥伴進化了！</div>
        <div style={{fontSize:56,marginBottom:8,animation:"popIn 0.6s ease 1s both",filter:"drop-shadow(0 0 12px rgba(251,191,36,0.5))"}}>{st.emoji}</div>
        <div style={{animation:"growIn 1.2s ease 0.4s both",marginBottom:16}}><div style={{animation:"evolveGlow 2s ease 1.5s infinite"}}><MonsterSprite svgStr={st.svgFn(starter.c1,starter.c2)} size={180}/></div></div>
        <div style={{fontSize:32,fontWeight:900,animation:"fadeSlide 0.5s ease 1.3s both",marginBottom:6,textShadow:"0 0 20px rgba(168,85,247,0.5)",letterSpacing:2}}>{st.name}</div>
        <div style={{fontSize:14,opacity:0.6,marginBottom:32,animation:"fadeSlide 0.3s ease 1.6s both"}}>攻擊力提升！生命恢復！</div>
        <button className="touch-btn" onClick={onContinue} style={{background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",color:"white",fontSize:16,fontWeight:700,padding:"14px 40px",borderRadius:50,boxShadow:"0 4px 24px rgba(99,102,241,0.5)",animation:"fadeSlide 0.3s ease 1.9s both",position:"relative",zIndex:70}}>繼續戰鬥！</button>
      </div>
    </div>
  );
}
