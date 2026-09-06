import type { GeneratedQuestion } from '../../utils/questionGenerator';
import { SPRITE_ANIMATION_ASSETS } from '../../data/spriteAnimationAssets.ts';
export { getSpritePosePosition as getPilotPosePosition } from '../../data/spriteAnimationAssets.ts';

export type PilotPhase = 'ready' | 'question' | 'playerWindup' | 'playerImpact' | 'playerRecover'
  | 'enemyWindup' | 'enemyImpact' | 'enemyRecover' | 'victory' | 'defeat';
export type PilotMotion = 'idle' | 'windup' | 'strike' | 'recover' | 'hurt' | 'settle';
export const PILOT_POSES = [
  ['待機', 'Idle'], ['吸氣', 'Inhale'], ['蓄力', 'Anticipation'], ['出招', 'Strike'],
  ['追勢', 'Follow-through'], ['收勢', 'Recovery'], ['受擊', 'Recoil'], ['站穩', 'Brace'],
] as const;
// Pixel anchors belong to the unmirrored 512x384 cell, not its visible bounding box.
export const PILOT_ART = {
  player: SPRITE_ANIMATION_ASSETS.player_wolf2,
  enemy: SPRITE_ANIMATION_ASSETS.boss_crazy_dragon,
} as const;
export type PilotState = {
  phase: PilotPhase;
  cycle: number;
  playerHp: number;
  enemyHp: number;
  question: GeneratedQuestion | null;
  correct: boolean | null;
  preview: boolean;
  damage: number;
};
export type PilotAction =
  | { type: 'reset' }
  | { type: 'question'; question: GeneratedQuestion }
  | { type: 'answer'; answer: number; damage: number }
  | { type: 'preview'; actor: 'player' | 'enemy' }
  | { type: 'advance'; phase: PilotPhase; cycle: number };

export const PILOT_MAX_HP = { player: 100, enemy: 180 } as const;
export const PILOT_PHASE_MS: Partial<Record<PilotPhase, number>> = {
  playerWindup: 340, playerImpact: 180, playerRecover: 460,
  enemyWindup: 520, enemyImpact: 200, enemyRecover: 480,
};

export function createPilotState(cycle = 0): PilotState {
  return { phase: 'ready', cycle, playerHp: PILOT_MAX_HP.player, enemyHp: PILOT_MAX_HP.enemy,
    question: null, correct: null, preview: false, damage: 0 };
}

export function pilotReducer(state: PilotState, action: PilotAction): PilotState {
  if (action.type === 'reset') return createPilotState(state.cycle + 1);
  if (action.type === 'preview') {
    if (state.phase !== 'ready' && state.phase !== 'victory' && state.phase !== 'defeat') return state;
    return { ...state, cycle: state.cycle + 1, preview: true, correct: null,
      phase: action.actor === 'player' ? 'playerWindup' : 'enemyWindup' };
  }
  if (action.type === 'question') {
    if (state.phase !== 'ready') return state;
    return { ...state, cycle: state.cycle + 1, phase: 'question', question: action.question, preview: false, correct: null };
  }
  if (action.type === 'answer') {
    if (state.phase !== 'question' || !state.question || !state.question.choices.includes(action.answer)) return state;
    const correct = action.answer === state.question.answer;
    return { ...state, correct, damage: Number.isFinite(action.damage) ? Math.max(1, Math.round(action.damage)) : 1,
      phase: correct ? 'playerWindup' : 'enemyWindup' };
  }
  if (action.cycle !== state.cycle || action.phase !== state.phase) return state;
  const restPhase = state.playerHp === 0 ? 'defeat' : state.enemyHp === 0 ? 'victory' : 'ready';
  switch (state.phase) {
    case 'playerWindup': return { ...state, phase: 'playerImpact', enemyHp: state.preview ? state.enemyHp : Math.max(0, state.enemyHp - state.damage) };
    case 'playerImpact': return { ...state, phase: 'playerRecover' };
    case 'playerRecover': return { ...state, phase: state.preview ? restPhase : state.enemyHp === 0 ? 'victory' : 'enemyWindup' };
    case 'enemyWindup': return { ...state, phase: 'enemyImpact', playerHp: state.preview ? state.playerHp : Math.max(0, state.playerHp - 18) };
    case 'enemyImpact': return { ...state, phase: 'enemyRecover' };
    case 'enemyRecover': return { ...state, phase: restPhase };
    default: return state;
  }
}

export function getPilotMotion(phase: PilotPhase, actor: 'player' | 'enemy'): PilotMotion {
  if (phase === `${actor}Windup`) return 'windup';
  if (phase === `${actor}Impact`) return 'strike';
  if (phase === `${actor}Recover`) return 'recover';
  const other = actor === 'player' ? 'enemy' : 'player';
  if (phase === `${other}Impact`) return 'hurt';
  if (phase === `${other}Recover`) return 'settle';
  return 'idle';
}
