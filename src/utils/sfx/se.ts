export type MoveType = 'fire' | 'water' | 'electric' | 'grass' | 'dark' | 'light';

export function normalizeMoveType(type: string): MoveType | null {
  const raw = String(type || '').toLowerCase();
  if (raw === 'lion') return 'light';
  if (raw === 'fire' || raw === 'water' || raw === 'electric' || raw === 'grass' || raw === 'dark' || raw === 'light') {
    return raw;
  }
  return null;
}

export function resolveMoveSoundName(
  type: string,
  idx: number,
  hasSoundName: (name: string) => boolean,
): string {
  const moveType = normalizeMoveType(type);
  if (!moveType) return type;
  const slot = Math.max(0, Math.min(3, Number.isFinite(idx) ? Math.floor(idx) : 0));
  const key = `${moveType}${slot}`;
  if (hasSoundName(key)) return key;
  return moveType;
}

export function createSeDebounce(minGapMs = 30): (name: string, nowMs: number) => boolean {
  const lastPlayTime = new Map<string, number>();
  return (name: string, nowMs: number): boolean => {
    const last = lastPlayTime.get(name) || 0;
    if (nowMs - last < minGapMs) return false;
    lastPlayTime.set(name, nowMs);
    return true;
  };
}
