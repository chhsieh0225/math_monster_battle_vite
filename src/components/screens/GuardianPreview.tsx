import { useEffect, useRef, useState } from 'react';
import { GUARDIAN_ENCOUNTERS, getGuardianBackground } from '../../data/guardianEncounters.ts';
import type { GuardianId } from '../../data/guardianEncounters.ts';
import { MONSTERS } from '../../data/monsters.ts';
import { playerfire0SVG } from '../../data/sprites.ts';
import { BattleSprite } from './battle/BattleSprite.tsx';
import { SkillStrikeEffect } from '../effects/SkillStrikeEffect.tsx';
import { getEnemySkillEffect } from '../../utils/skillPresentation.ts';
import { createAttackImpact } from '../../utils/effectTiming.ts';
import type { SpriteTarget } from '../../hooks/useSpriteTargets.ts';
import '../effects/SkillStrikeEffect.css';
import './GuardianPreview.css';

// Development-only art review. No gameplay hook or save writes.
export default function GuardianPreview() {
  const [id, setId] = useState<GuardianId>('limit_knight');
  const [phone, setPhone] = useState(false);
  const [level, setLevel] = useState(13);
  const [action, setAction] = useState<{ slot: number; hurt: boolean; serial: number } | null>(null);
  const [contact, setContact] = useState(false);
  const [width, setWidth] = useState(720);
  const arenaRef = useRef<HTMLDivElement>(null);
  const enemy = MONSTERS.find(monster => monster.id === id)!;
  const encounter = GUARDIAN_ENCOUNTERS[id];
  const height = Math.max(320, width * .58);
  const enemySize = width * .39;
  const playerSize = width * .29;

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const measure = () => setWidth(arena.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(arena);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!action) return;
    const hit = window.setTimeout(() => setContact(true), 500);
    const end = window.setTimeout(() => { setAction(null); setContact(false); }, 1100);
    return () => { window.clearTimeout(hit); window.clearTimeout(end); };
  }, [action]);

  const point = (cx: number, cy: number, size: number): SpriteTarget => ({ cx, cy, size,
    right: `${width - cx}px`, top: `${cy}px`, flyRight: (width - cx) / width * 100, flyTop: cy / height * 100 });
  const source = point(width * .73, height * .38 + enemySize * .40, enemySize * .7);
  const target = point(width * .23, height * .55 + playerSize * .4, playerSize * .7);
  const fx = action && !action.hurt ? { ...getEnemySkillEffect({ id, lvl: level }, 1, false, action.slot),
    flightMs: 500, ...(contact ? { impact: createAttackImpact('hit') } : {}) } : null;

  return <main className="guardian-review">
    <header><p>WORLD ATLAS / NEW ENCOUNTERS</p><h1>四境守衛</h1>
      <p>獨立戰場 · 八格作畫 · 三段招式成長</p></header>
    <nav aria-label="選擇新怪獸">{(Object.keys(GUARDIAN_ENCOUNTERS) as GuardianId[]).map(key =>
      <button key={key} aria-pressed={id === key} onClick={() => { setId(key); setAction(null); setContact(false); }}>
        {MONSTERS.find(monster => monster.id === key)!.name}</button>)}</nav>
    <section className={`guardian-review-panel ${phone ? 'is-phone' : ''}`}>
      <div className="guardian-review-title"><div><h2>{enemy.name}</h2><span>{encounter.habitat}</span></div><span>Lv.{level}</span></div>
      <div ref={arenaRef} className="guardian-review-arena" style={{ height, backgroundImage: `url("${getGuardianBackground(id)}")` }}>
        <div className="guardian-review-player" style={{ left: '8.5%', top: '55%' }}>
          <BattleSprite profileKey="playerfire0SVG" svgStr={playerfire0SVG()} size={playerSize}
            animation={contact && !action?.hurt ? 'playerHit 0.5s ease' : ''} /></div>
        <div className="guardian-review-enemy" style={{ left: '53.5%', top: '38%' }}>
          <BattleSprite key={action?.serial ?? id} profileKey={enemy.spriteKey} svgStr={enemy.svgFn(enemy.c1, enemy.c2)} size={enemySize}
            animation={action ? action.hurt ? 'enemyHit 0.5s ease' : contact ? '' : 'enemyAttackLunge 0.5s ease' : ''} /></div>
        {fx && <SkillStrikeEffect key={`${action!.serial}-${contact}`} effect={fx} source={source} target={target} arena={{ width, height }} />}
      </div>
      <div className="guardian-review-controls">
        {encounter.skills.map((skill, slot) => <button key={slot} disabled={Boolean(action) || (slot === 1 && level < 4) || (slot === 2 && level < 7)}
          onClick={() => { setContact(false); setAction({ slot, hurt: false, serial: Date.now() }); }}>{skill.name}</button>)}
        <button disabled={Boolean(action)} onClick={() => { setContact(false); setAction({ slot: 0, hurt: true, serial: Date.now() }); }}>受擊動作</button>
      </div>
    </section>
    <div className="guardian-review-options">
      <button aria-pressed={phone} onClick={() => setPhone(!phone)}>{phone ? '切換寬版' : '切換手機寬度'}</button>
      <label>招式成長 <select value={level} disabled={Boolean(action)} onChange={e => setLevel(Number(e.target.value))}>
        <option value="1">Lv.1 初階</option><option value="4">Lv.4 進階</option><option value="7">Lv.7 全招式</option><option value="13">Lv.13 完全特效</option>
      </select></label>
    </div>
    <p className="guardian-review-note">素材檢視，不影響存檔。正式遊戲於光、鋼、水區域隨機遭遇。<a href="./">返回遊戲</a></p>
  </main>;
}
