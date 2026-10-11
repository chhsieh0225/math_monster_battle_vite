import { getGuardianBackground } from './guardianEncounters.ts';

const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
const HABITAT_ART: Readonly<Record<string, string>> = {
  venom_mantis: 'lantern_mire', mire_toad: 'lantern_mire',
  night_bat: 'moonseal_court', chain_wraith: 'moonseal_court',
  wild_starter_tiger: 'frost_cove',
};

/** Shared by rendering and preloading, including the coastal ice-tiger branch. */
export function getEncounterBackground(id?: string): string | undefined {
  const habitat = id && Object.hasOwn(HABITAT_ART, id) ? HABITAT_ART[id] : undefined;
  return habitat ? `${BASE}backgrounds/frontier/${habitat}-v1.webp` : getGuardianBackground(id);
}
