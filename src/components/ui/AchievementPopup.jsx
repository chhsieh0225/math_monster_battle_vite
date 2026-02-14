import { useEffect, useState } from 'react';

export default function AchievementPopup({ achievement, onDone }) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 3400);
    const t2 = setTimeout(onDone, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  if (!achievement) return null;
  return (
    <div style={{
      position:"absolute", top:60, right:12, zIndex:300, width:210,
      background:"linear-gradient(135deg,rgba(99,102,241,0.92),rgba(168,85,247,0.92))",
      borderRadius:16, padding:"12px 14px", color:"white",
      boxShadow:"0 6px 28px rgba(88,28,135,0.5)",
      animation: out ? "fadeSlide 0.5s ease reverse forwards" : "popIn 0.35s ease",
      backdropFilter:"blur(8px)",
    }}>
      <div style={{fontSize:11,opacity:0.7,fontWeight:700,marginBottom:4}}>🏅 成就解鎖！</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:28}}>{achievement.icon}</span>
        <div>
          <div style={{fontSize:14,fontWeight:800}}>{achievement.name}</div>
          <div style={{fontSize:11,opacity:0.75,marginTop:2}}>{achievement.desc}</div>
        </div>
      </div>
    </div>
  );
}
