export type SkillPigment = 'ember' | 'tide' | 'leaf' | 'root' | 'lightning' | 'ice' | 'stone' | 'mud'
  | 'venom' | 'spore' | 'wisp' | 'chain' | 'serpent' | 'feather' | 'sword' | 'claw' | 'moon'
  | 'butterfly' | 'candy' | 'calculus' | 'knot' | 'matrix' | 'rift' | 'slime' | 'engine';
export type SkillAction = 'orb' | 'surge' | 'meteor' | 'ripple' | 'vortex' | 'cut' | 'cross' | 'claws'
  | 'sprout' | 'vine' | 'swarm' | 'bolt' | 'thunder' | 'chain' | 'serpents' | 'cage' | 'breath'
  | 'rift' | 'mirror' | 'rain' | 'blades' | 'halo' | 'knot' | 'matrix' | 'vector' | 'drain'
  | 'weave' | 'clamp' | 'bloom';
export type SkillChoreography = { pigment: SkillPigment; action: SkillAction; density: number };

// Named recipes share material work, not a universal projectile with a different color.
// The five signature recipes and water:2 deliberately keep their dedicated renderers.
const GROUPS: readonly [SkillPigment, SkillAction, number, string][] = [
  ['claw', 'claws', 1, 'enemy:basic lion:0 boss:0 monster:dragon'],
  ['ember', 'orb', 1, 'fire:0 monster:slime_flare'],
  ['ember', 'surge', 1, 'fire:1 lion:2'],
  ['ember', 'meteor', 3, 'fire:3 monster:fire_rain'],
  ['ember', 'sprout', 3, 'monster:slime_eruption'],
  ['ember', 'breath', 3, 'boss_crazy_dragon:2 monster:fire'],
  ['tide', 'orb', 3, 'water:0'],
  ['tide', 'ripple', 2, 'water:1 monster:slime_pressure'],
  ['tide', 'vortex', 3, 'water:3'],
  ['leaf', 'cut', 1, 'grass:0'],
  ['root', 'vine', 1, 'grass:1'],
  ['leaf', 'swarm', 3, 'grass:2'],
  ['root', 'sprout', 3, 'grass:3 monster:slime_canopy'],
  ['lightning', 'orb', 1, 'electric:0 monster:slime_spark'],
  ['lightning', 'bolt', 1, 'electric:1 monster:slime_thunder'],
  ['lightning', 'thunder', 3, 'electric:2 boss:3'],
  ['lightning', 'chain', 3, 'electric:3'],
  ['moon', 'ripple', 2, 'lion:1'],
  ['moon', 'vortex', 3, 'lion:3'],
  ['sword', 'blades', 3, 'wolf:3'],
  ['ice', 'orb', 1, 'tiger:0'],
  ['ice', 'mirror', 2, 'tiger:1'],
  ['ice', 'claws', 3, 'tiger:2'],
  ['ice', 'rain', 3, 'tiger:3'],
  ['lightning', 'vortex', 3, 'boss:1'],
  ['ember', 'breath', 3, 'boss:2'],
  ['serpent', 'claws', 3, 'boss_hydra:0'],
  ['venom', 'ripple', 2, 'boss_hydra:1'],
  ['serpent', 'serpents', 3, 'boss_hydra:2'],
  ['serpent', 'sprout', 3, 'boss_hydra:3'],
  ['claw', 'cross', 2, 'boss_crazy_dragon:0'],
  ['feather', 'surge', 2, 'boss_crazy_dragon:1 monster:thunder_dive'],
  ['feather', 'rain', 3, 'boss_crazy_dragon:3 monster:eclipse_wings monster:storm_feathers'],
  ['sword', 'cut', 1, 'boss_sword_god:0'],
  ['sword', 'halo', 3, 'boss_sword_god:1'],
  ['rift', 'rift', 3, 'boss_sword_god:2 algebra_knight:2 monster:slime_abyss'],
  ['calculus', 'cut', 1, 'limit_knight:0'],
  ['sword', 'rain', 3, 'limit_knight:1 monster:candy_rain'],
  ['calculus', 'halo', 3, 'limit_knight:2'],
  ['knot', 'cut', 1, 'topology_knight:0'],
  ['knot', 'knot', 2, 'topology_knight:1'],
  ['knot', 'halo', 3, 'topology_knight:2'],
  ['matrix', 'vector', 1, 'algebra_knight:0'],
  ['matrix', 'matrix', 3, 'algebra_knight:1'],
  ['moon', 'orb', 1, 'blue_butterfly:0'],
  ['butterfly', 'swarm', 2, 'blue_butterfly:1 monster:colorful_butterfly'],
  ['moon', 'rain', 3, 'blue_butterfly:2'],
  ['venom', 'cut', 2, 'monster:venom_scythe'],
  ['venom', 'cross', 2, 'monster:venom_cross'],
  ['venom', 'bloom', 2, 'monster:lotus_breath'],
  ['venom', 'ripple', 3, 'monster:mire_tide'],
  ['moon', 'drain', 2, 'monster:moon_siphon'],
  ['chain', 'chain', 1, 'monster:shackle_lash'],
  ['chain', 'cage', 3, 'monster:prison_seal'],
  ['stone', 'clamp', 2, 'monster:crystal_clamp'],
  ['stone', 'sprout', 3, 'monster:crystal_bastion monster:golumn'],
  ['knot', 'weave', 2, 'monster:dream_silk'],
  ['sword', 'vector', 1, 'monster:star_shuttle'],
  ['tide', 'drain', 2, 'monster:slime_bubble'],
  ['stone', 'orb', 2, 'monster:slime_shard'],
  ['stone', 'meteor', 2, 'monster:slime_forge monster:golumn_crash'],
  ['rift', 'drain', 2, 'monster:slime_void'],
  ['wisp', 'cut', 1, 'monster:ghost_reap'],
  ['spore', 'bloom', 3, 'monster:mushroom_bloom'],
  ['engine', 'breath', 3, 'monster:dragon_cannon'],
  ['mud', 'ripple', 3, 'monster:mud_crash'],
  ['mud', 'drain', 1, 'monster:golumn_mud'],
  ['candy', 'cut', 1, 'monster:candy_knight'],
  ['candy', 'surge', 2, 'monster:candy_monster'],
  ['butterfly', 'swarm', 3, 'monster:butterfly_storm'],
  ['slime', 'orb', 1, 'monster:slime'],
  ['wisp', 'drain', 2, 'monster:ghost monster:ghost_lantern'],
  ['spore', 'drain', 2, 'monster:mushroom'],
];

const CATALOG = new Map<string, SkillChoreography>();
for (const [pigment, action, density, ids] of GROUPS) for (const id of ids.split(' ')) {
  if (CATALOG.has(id)) throw new Error(`Duplicate choreography: ${id}`);
  CATALOG.set(id, { pigment, action, density });
}
export const CHOREOGRAPHED_SKILL_IDS = [...CATALOG.keys()];
export function getSkillChoreography(id?: string): SkillChoreography | undefined {
  return id ? CATALOG.get(id) : undefined;
}

/** Physical-slot clocks remain battle-owned; these names only select pose curves. */
export function getChoreographyCast(id?: string): 'Sweep' | 'Channel' | 'Summon' | undefined {
  const action = getSkillChoreography(id)?.action;
  if (!action) return undefined;
  if (id?.startsWith('electric:')) return 'Channel';
  if (['cut', 'cross', 'claws', 'clamp', 'surge', 'vector', 'vine', 'chain'].includes(action)) return 'Sweep';
  if (['sprout', 'rain', 'meteor', 'bolt', 'thunder', 'blades', 'bloom', 'matrix', 'cage'].includes(action)) return 'Summon';
  return 'Channel';
}
