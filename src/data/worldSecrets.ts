/**
 * Hidden spots painted into the world map. They only shimmer once the map is
 * zoomed in, so admiring the art is how you find them. Each one is opened by a
 * small math lock at the child's grade and pays out once.
 */
import type { ItemId } from '../types/game';
import type { Grade } from './gradeCurriculum.ts';

export type SecretId =
  | 'lone_islet' | 'storm_eye' | 'vanishing_road' | 'sky_islet' | 'dragon_claws'
  | 'sea_stack' | 'stone_bridge' | 'coral_lagoon' | 'sea_cliff_falls' | 'mist_temple';

export type WorldSecret = {
  id: SecretId;
  icon: string;
  /** Position on the illustration, percent of width / height (checked against the art). */
  x: number;
  y: number;
  reward: Partial<Record<ItemId, number>>;
};

/** Zoom at which undiscovered secrets start to shimmer. */
export const SECRET_REVEAL_ZOOM = 1.6;

export const WORLD_SECRETS: readonly WorldSecret[] = [
  { id: 'lone_islet', icon: '🌳', x: 37.4, y: 5.8, reward: { candy: 2 } },
  { id: 'storm_eye', icon: '🌩️', x: 43, y: 7.4, reward: { shield: 1 } },
  { id: 'vanishing_road', icon: '🌫️', x: 13, y: 24, reward: { candy: 2 } },
  { id: 'sky_islet', icon: '🏯', x: 67.6, y: 11, reward: { potion: 1 } },
  { id: 'dragon_claws', icon: '🦴', x: 88.4, y: 23.4, reward: { candy: 2 } },
  { id: 'sea_stack', icon: '🪨', x: 96.8, y: 29.8, reward: { candy: 2 } },
  { id: 'stone_bridge', icon: '🌉', x: 33.5, y: 59.3, reward: { potion: 1 } },
  { id: 'coral_lagoon', icon: '🐚', x: 35.5, y: 91, reward: { candy: 2 } },
  { id: 'sea_cliff_falls', icon: '💦', x: 46.9, y: 85.6, reward: { potion: 1 } },
  { id: 'mist_temple', icon: '⛩️', x: 77.3, y: 83.2, reward: { shield: 1, potion: 1 } },
];

export const SECRET_IDS: readonly SecretId[] = WORLD_SECRETS.map((secret) => secret.id);

export function getSecret(id: string | null | undefined): WorldSecret | null {
  return WORLD_SECRETS.find((secret) => secret.id === id) ?? null;
}

/** Lock questions: one representative skill per grade, kept short. */
export const SECRET_LOCK_SKILLS: Record<Grade, Array<{ op: string; range: [number, number] }>> = {
  1: [{ op: '+', range: [2, 9] }, { op: '-', range: [3, 18] }],
  2: [{ op: '+', range: [12, 60] }, { op: '×', range: [2, 9] }],
  3: [{ op: '×', range: [2, 9] }, { op: '÷', range: [2, 9] }, { op: '-', range: [100, 600] }],
  4: [{ op: 'mixed3', range: [2, 9] }, { op: 'frac_same', range: [3, 9] }, { op: '÷', range: [3, 12] }],
  5: [{ op: 'frac_diff', range: [2, 8] }, { op: 'dec_mul', range: [2, 9] }, { op: 'mixed4', range: [2, 9] }],
  6: [{ op: 'frac_muldiv', range: [2, 9] }, { op: 'unknown4', range: [2, 9] }, { op: 'dec_div', range: [2, 9] }],
};
