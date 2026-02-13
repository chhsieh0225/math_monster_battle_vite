import MonsterSprite from '../ui/MonsterSprite';
import { STARTERS } from '../../data/starters';

export default function SelectionScreen({ onSelect, onBack }) {
  return (
    <div style={{minHeight:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)",padding:20}}>
      <h2 style={{color:"white",fontSize:22,marginBottom:8,textShadow:"0 2px 8px rgba(0,0,0,0.5)"}}>選擇你的夥伴！</h2>
      <p style={{color:"#94a3b8",fontSize:14,marginBottom:24}}>每種屬性對應不同的數學技能</p>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
      {STARTERS.map((s,i)=>(
        <div key={s.id} onClick={()=>onSelect(s)} style={{background:"linear-gradient(135deg,"+s.c1+","+s.c2+")",borderRadius:16,padding:20,width:140,textAlign:"center",cursor:"pointer",border:"3px solid transparent",transition:"all 0.2s",boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>
          <div style={{marginBottom:8}}><MonsterSprite svgStr={s.stages[0].svgFn(s.c1,s.c2)} size={100}/></div>
          <div style={{color:"white",fontWeight:700,fontSize:16,marginBottom:4}}>{s.typeIcon} {s.name}</div>
          <div style={{color:"rgba(255,255,255,0.8)",fontSize:11,marginBottom:8}}>{s.typeName}系</div>
          <div style={{background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"6px 8px"}}>
            {s.moves.slice(0,3).map((m,j)=><div key={j} style={{color:"rgba(255,255,255,0.9)",fontSize:10,marginBottom:2}}>{m.icon} {m.name}（{m.desc}）</div>)}
          </div>
        </div>
      ))}
      </div>
      <button onClick={onBack} style={{marginTop:24,background:"none",border:"1px solid #475569",color:"#94a3b8",padding:"8px 24px",borderRadius:20,fontSize:14,cursor:"pointer"}}>返回</button>
    </div>
  );
}
