const DEFAULT_TRAIT_NAMES = new Set(['普通', 'normal', 'none']);

export function isDefaultTraitName(name: string | null | undefined): boolean {
  if (!name) return true;
  return DEFAULT_TRAIT_NAMES.has(name.trim().toLowerCase());
}

export function hasSpecialTrait(
  traitName: string | null | undefined,
  traitDesc: string | null | undefined,
): boolean {
  if (!traitDesc || !traitDesc.trim()) return false;
  return !isDefaultTraitName(traitName);
}
