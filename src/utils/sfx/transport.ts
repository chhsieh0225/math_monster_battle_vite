export function scheduleSeries(
  count: number,
  baseDelayMs: number,
  jitterMs: number,
  randomFloat: (min: number, max: number) => number,
  cb: (i: number) => void,
): void {
  for (let i = 0; i < count; i += 1) {
    const delay = Math.max(0, Math.round(i * baseDelayMs + randomFloat(0, jitterMs)));
    setTimeout(() => cb(i), delay);
  }
}

export function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function clearTimerSet(set: Set<ReturnType<typeof setInterval>>): void {
  for (const timer of set) clearInterval(timer);
  set.clear();
}

export function rampMediaVolume(
  el: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
  timerSet: Set<ReturnType<typeof setInterval>>,
  onDone?: () => void,
): void {
  const start = Date.now();
  const startVol = clampUnit(from);
  const endVol = clampUnit(to);
  try { el.volume = startVol; } catch { /* best-effort */ }
  const safeDur = Math.max(1, Math.floor(durationMs));
  const timer = setInterval(() => {
    const progress = Math.min(1, (Date.now() - start) / safeDur);
    const vol = startVol + (endVol - startVol) * progress;
    try { el.volume = clampUnit(vol); } catch { /* best-effort */ }
    if (progress >= 1) {
      clearInterval(timer);
      timerSet.delete(timer);
      if (onDone) {
        try { onDone(); } catch { /* best-effort */ }
      }
    }
  }, 16);
  timerSet.add(timer);
}
