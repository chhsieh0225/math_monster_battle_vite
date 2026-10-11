import type { RegionId } from './worldMap.ts';
import type { SecretId } from './worldSecrets.ts';

export type SideRouteId = 'frost_cove' | 'orbital_trial' | 'limit_trial' | 'matrix_trial';
export type WorldSideRoute = {
  id: SideRouteId;
  secret: SecretId;
  region: RegionId;
  monsterId: string;
  floors: readonly number[];
  name: string;
  nameEn: string;
};

// Floors are zero-based. Coastal visits span early and evolved ice-tiger forms.
export const WORLD_SIDE_ROUTES: readonly WorldSideRoute[] = [
  { id: 'frost_cove', secret: 'coral_lagoon', region: 'water', monsterId: 'starter_mirror:tiger', floors: [2, 5], name: '冰潮洞灣', nameEn: 'Frost Tide Cove' },
  { id: 'orbital_trial', secret: 'storm_eye', region: 'steel', monsterId: 'topology_knight', floors: [3, 6], name: '環軌騎士試煉', nameEn: 'Orbital Knight Trial' },
  { id: 'limit_trial', secret: 'sky_islet', region: 'light', monsterId: 'limit_knight', floors: [7], name: '極限騎士試煉', nameEn: 'Limit Knight Trial' },
  { id: 'matrix_trial', secret: 'mist_temple', region: 'light', monsterId: 'algebra_knight', floors: [8], name: '矩陣騎士試煉', nameEn: 'Matrix Knight Trial' },
];

export function getSideRoute(id: unknown): WorldSideRoute | undefined {
  return WORLD_SIDE_ROUTES.find((route) => route.id === id);
}
