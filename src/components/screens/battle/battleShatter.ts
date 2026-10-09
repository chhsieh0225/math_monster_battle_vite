/**
 * Shard layout for a boss breaking apart: a jittered 4x3 grid, each cell split
 * into two triangles. Deterministic so every defeat looks deliberate, and the
 * top rows break first so the boss crumbles gradually from the head down.
 */
export type BattleShard = {
  clip: string;
  /** Flight in percent of the sprite box. */
  dx: number;
  dy: number;
  rotate: number;
  /** Seconds after the shatter starts. */
  delay: number;
};

const COLS = [0, 27, 49, 76, 100];
const ROWS = [0, 31, 68, 100];
// Interior vertex jitter (percent), indexed [row][col]; edges stay on the box.
const JITTER: Array<Array<[number, number]>> = [
  [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  [[0, 0], [5, -4], [-6, 5], [4, 3], [0, 0]],
  [[0, 0], [-4, 6], [5, -5], [-5, -3], [0, 0]],
  [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
];

function vertex(row: number, col: number): [number, number] {
  const [jx, jy] = JITTER[row][col];
  return [COLS[col] + jx, ROWS[row] + jy];
}

function polygon(points: Array<[number, number]>): string {
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

function buildShards(): BattleShard[] {
  const shards: BattleShard[] = [];
  for (let row = 0; row < ROWS.length - 1; row += 1) {
    for (let col = 0; col < COLS.length - 1; col += 1) {
      const a = vertex(row, col);
      const b = vertex(row, col + 1);
      const c = vertex(row + 1, col + 1);
      const d = vertex(row + 1, col);
      const halves = (row + col) % 2 === 0 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      halves.forEach((points, half) => {
        const cx = points.reduce((sum, [x]) => sum + x, 0) / 3;
        const cy = points.reduce((sum, [, y]) => sum + y, 0) / 3;
        const spin = ((row * 7 + col * 13 + half * 5) % 9) - 4;
        shards.push({
          clip: polygon(points),
          dx: Math.round((cx - 50) * 1.5 + spin * 3),
          dy: Math.round((cy - 55) * 0.6 + 40 + row * 12),
          rotate: spin * 18 + (half ? 25 : -25),
          delay: Math.round((row * 0.24 + ((col + half) % 3) * 0.05) * 100) / 100,
        });
      });
    }
  }
  return shards;
}

export const BOSS_SHARDS: readonly BattleShard[] = buildShards();
