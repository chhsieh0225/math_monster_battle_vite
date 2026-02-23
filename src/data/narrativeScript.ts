/**
 * Data-driven narrative beats for the battle campaign.
 *
 * Each beat fires at a specific round index and injects a short story line
 * into the battle intro text, giving the 10-wave journey a narrative arc.
 */

export type NarrativeBeat = {
  /** Wave index (0-based) that triggers this beat */
  round: number;
  /** i18n key for the narrative text */
  textKey: string;
  /** zh-TW fallback when translator is unavailable */
  fallback: string;
};

/** Narrative beats for the standard 10-wave campaign */
const SINGLE_NARRATIVE: NarrativeBeat[] = [
  {
    round: 0,
    textKey: 'narrative.prologue',
    fallback: '📖 傳說數學大陸被怪獸入侵了！唯有計算之力才能拯救世界，出發吧！',
  },
  {
    round: 3,
    textKey: 'narrative.midpoint',
    fallback: '📖 你越來越強了！但前方的怪獸也在變強... 繼續加油！',
  },
  {
    round: 6,
    textKey: 'narrative.lategame',
    fallback: '📖 距離最終決戰不遠了！你的數學力量正在覺醒！',
  },
  {
    round: 9,
    textKey: 'narrative.preBoss',
    fallback: '📖 黑暗的氣息... 最後的強敵就在前方，準備迎接挑戰！',
  },
];

/**
 * Look up a narrative beat for the given round and battle mode.
 * Returns `null` when no narrative applies (most rounds, or PvP mode).
 */
export function getNarrativeBeat(
  round: number,
  battleMode?: string,
): NarrativeBeat | null {
  if (battleMode === 'pvp') return null;
  return SINGLE_NARRATIVE.find((b) => b.round === round) ?? null;
}
