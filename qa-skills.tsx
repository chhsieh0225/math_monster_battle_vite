import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import BattleScreen from './src/components/screens/BattleScreen.tsx';
import { STARTERS } from './src/data/starters.ts';
import { MONSTERS } from './src/data/monsters.ts';
import * as sprites from './src/data/sprites.ts';
import { I18nProvider, useI18n } from './src/i18n/index.tsx';
import { createAttackImpact, getAttackEffectHitDelay } from './src/utils/effectTiming.ts';
import { getEnemySkillEffect } from './src/utils/skillPresentation.ts';
import type { AttackEffectVm } from './src/types/battle.ts';
import './src/App.css';
const noop = () => {};
const view = { getPow: () => 30, dualEff: () => 1, timerSubscribe: () => noop, getTimerLeft: () => 15 };
const pvpSide = { charge: 0, burn: 0, freeze: false, static: 0, paralyze: false, combo: 0, specDef: false };
const base = {
  screen:'battle',phase:'menu',pLvl:8,pStg:2,pHp:150,pHpSub:100,pExp:0,expNext:100,eHp:180,eHpSub:180,
  round:0,streak:0,passiveCount:0,charge:3,chargeReady:true,
  pvpState:{p1:pvpSide,p2:pvpSide,turn:'p1',winner:null,actionCount:0},
  selIdx:null,q:null,fb:null,answered:false,bText:'QA',dmgs:[],parts:[],pAnim:'',pSubAnim:'',eAnim:'',eSubAnim:'',
  effMsg:null,burnStack:0,frozen:false,staticStack:0,specDef:false,cursed:false,bossPhase:1,bossTurn:0,bossCharging:false,
  sealedMove:-1,sealedTurns:0,diffLevel:0,questionTimerSec:15,timedMode:false,mHits:[0,0,0,0],mLvlUp:null,
  inventory:{potion:0,candy:0,shield:0},achPopup:null,collectionPopup:null,defAnim:null,hintsRevealed:0,
};
function App(){
  const {t}=useI18n();
  const [mode,setMode]=useState('single');
  const [enemyKey,setEnemyKey]=useState('bossSwordGodSVG');
  const [family,setFamily]=useState('wolf');
  const [type,setType]=useState('steel');
  const [lvl,setLvl]=useState(5);
  const [idx,setIdx]=useState(2);
  const [effect,setEffect]=useState<AttackEffectVm|null>(null);
  const [inspect,setInspect]=useState(true);
  const [low,setLow]=useState(false);
  const [paused,setPaused]=useState(false);
  const [active,setActive]=useState('main');
  const [phase2,setPhase2]=useState(false);
  const [width,setWidth]=useState(innerWidth);
  useEffect(()=>{const resize=()=>setWidth(innerWidth);addEventListener('resize',resize);return()=>removeEventListener('resize',resize);},[]);
  const starter=STARTERS.find(s=>s.id===family)!;
  const sub=STARTERS.find(s=>s.id==='water')!;
  const template=MONSTERS.find(m=>m.spriteKey===enemyKey)!;
  const enemy={...template,svgFn:sprites[enemyKey],spriteKey:enemyKey,activeSpriteKey:enemyKey,lvl:8,maxHp:180};
  const state={...base,starter,enemy,enemySub:mode==='coop'?enemy:null,allySub:mode==='coop'?{...sub,selectedStageIdx:1}:null,
    battleMode:mode,coopActiveSlot:active,bossPhase:phase2?2:1,eHp:phase2?90:180,atkEffect:effect,mLvls:[lvl,lvl,lvl,lvl],gamePaused:paused};
  const actions={chooseMove:(i:number)=>{setIdx(i);cast(i);},answer:noop,advance:noop,rmD:noop,rmP:noop,dismissAch:noop,dismissCollectionPopup:noop,useItem:noop,
    togglePause:()=>setPaused(v=>!v),toggleCoopActive:()=>setActive(v=>v==='main'?'sub':'main'),revealHint:noop};
  function cast(i=idx){const value={type,idx:i,lvl,sourceSlot:active as 'main'|'sub'};setEffect(value);if(!inspect){setTimeout(()=>setEffect(v=>v===value?{...value,impact:createAttackImpact('hit')}:v),getAttackEffectHitDelay(type));setTimeout(()=>setEffect(null),1300);}}
  return <><style>{`#root{height:100dvh}.qa-tools{position:fixed;z-index:100001;bottom:0;left:0;width:100%;max-height:64px;overflow:auto;background:#102030ef;color:white;font:11px monospace}.qa-tools button{font:11px monospace;margin:2px;padding:3px}${inspect?'.skill-fx *{animation-delay:-110ms!important;animation-play-state:paused!important}':''}`}</style>
    <BattleScreen state={state as never} actions={actions as never} view={view as never} mobile={{compactUI:width<900,lowPerfMode:low,autoLowEnd:false} as never} t={t} onOpenSettings={noop}/>
    <nav className="qa-tools" aria-label="QA"><span>{enemyKey} / Lv.{lvl} / {type} / {idx}</span>
      {['single','coop'].map(v=><button key={v} onClick={()=>setMode(v)}>{v}</button>)}
      {['darkLordSVG','bossHydraSVG','bossCrazyDragonSVG','bossSwordGodSVG','dragonSVG'].map(v=><button key={v} onClick={()=>{setEnemyKey(v);setEffect(null);}}>{v}</button>)}
      {['wolf','fire','tiger'].map(v=><button key={v} onClick={()=>setFamily(v)}>{v}</button>)}
      {[1,3,5,6].map(v=><button key={v} onClick={()=>{setLvl(v);setEffect(e=>e?{...e,lvl:v}:null);}}>Level {v}</button>)}
      {['fire','water','grass','electric','dark','light','steel','ice'].map(v=><button key={v} onClick={()=>{setType(v);setEffect(e=>e?{...e,type:v}:null);}}>FX {v}</button>)}
      {[0,1,2,3].map(v=><button key={v} onClick={()=>{setIdx(v);setEffect(e=>e?{...e,idx:v}:null);}}>Move {v}</button>)}
      <button onClick={()=>cast()}>Cast</button><button onClick={()=>setEffect({type,idx,lvl,sourceSlot:active as 'main'|'sub',impact:createAttackImpact('hit')})}>Impact</button>
      <button onClick={()=>setEffect({...getEnemySkillEffect(enemy,phase2?2:1,idx===3),targetSide:'player',sourceSlot:'main',targetSlot:'main',impact:createAttackImpact('hit')})}>Enemy impact</button>
      <button onClick={()=>setEffect({...getEnemySkillEffect(enemy,phase2?2:1,idx===3),targetSide:'player',sourceSlot:'sub',targetSlot:'sub',impact:createAttackImpact('hit')})}>Sub impact</button>
      <button onClick={()=>setEffect(null)}>Clear</button><button onClick={()=>setInspect(v=>!v)}>Inspect {String(inspect)}</button>
      <button onClick={()=>setLow(v=>!v)}>Low {String(low)}</button><button onClick={()=>setPaused(v=>!v)}>Pause</button>
      <button onClick={()=>setPhase2(v=>!v)}>Phase 2</button><button onClick={actions.toggleCoopActive}>Active {active}</button>
    </nav></>;
}
createRoot(document.getElementById('root')!).render(<I18nProvider><App/></I18nProvider>);
