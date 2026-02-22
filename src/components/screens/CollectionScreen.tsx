import { useMemo } from 'react';
import { loadCollection } from '../../utils/collectionStore.ts';

/** Catalogue of all possible drops with display info. */
const DROP_CATALOG: { emoji: string; name: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' }[] = [
  { emoji: '🍬', name: 'Candy', rarity: 'common' },
  { emoji: '🧪', name: 'Potion', rarity: 'common' },
  { emoji: '🔥', name: 'Flame Shard', rarity: 'rare' },
  { emoji: '💧', name: 'Water Drop', rarity: 'rare' },
  { emoji: '⚡', name: 'Thunder Gem', rarity: 'rare' },
  { emoji: '💀', name: 'Dark Fragment', rarity: 'rare' },
  { emoji: '🛡️', name: 'Steel Plate', rarity: 'rare' },
  { emoji: '👻', name: 'Ghost Wisp', rarity: 'epic' },
  { emoji: '💎', name: 'Diamond', rarity: 'epic' },
  { emoji: '⭐', name: 'Star Crystal', rarity: 'epic' },
  { emoji: '🐉', name: 'Dragon Scale', rarity: 'legendary' },
  { emoji: '👑', name: 'Crown', rarity: 'legendary' },
  { emoji: '🏆', name: 'Trophy', rarity: 'legendary' },
  { emoji: '🏁', name: 'PvP Flag', rarity: 'epic' },
];

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

const RARITY_BG: Record<string, string> = {
  common: 'rgba(148,163,184,0.08)',
  rare: 'rgba(59,130,246,0.10)',
  epic: 'rgba(168,85,247,0.10)',
  legendary: 'rgba(245,158,11,0.12)',
};

type CollectionScreenProps = {
  onBack: () => void;
};

export default function CollectionScreen({ onBack }: CollectionScreenProps) {
  const data = useMemo(() => loadCollection(), []);
  const totalItems = Object.values(data).reduce((s, n) => s + n, 0);
  const uniqueCount = Object.keys(data).length;

  return (
    <main style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg,#0f172a 0%,#1e1b4b 40%,#312e81 100%)',
      color: 'white', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button className="back-touch-btn" onClick={onBack} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'white', fontSize: 14, fontWeight: 700, padding: '6px 14px', borderRadius: 10,
        }}>← Back</button>
        <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: 1 }}>🎒 Collection</h1>
        <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.5 }}>
          {uniqueCount}/{DROP_CATALOG.length} types · {totalItems} total
        </div>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: 10, alignContent: 'start',
      }}>
        {DROP_CATALOG.map(({ emoji, name, rarity }) => {
          const count = data[emoji] || 0;
          const owned = count > 0;
          return (
            <div key={emoji} style={{
              background: owned ? RARITY_BG[rarity] : 'rgba(255,255,255,0.02)',
              border: `1px solid ${owned ? RARITY_COLORS[rarity] + '44' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 12, padding: '12px 8px', textAlign: 'center',
              opacity: owned ? 1 : 0.35,
              transition: 'opacity .2s, transform .15s',
            }}>
              <div style={{ fontSize: 32, marginBottom: 4, filter: owned ? 'none' : 'grayscale(1)' }}>
                {emoji}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: owned ? RARITY_COLORS[rarity] : '#64748b',
                marginBottom: 2,
              }}>
                {name}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 600,
                color: owned ? 'rgba(255,255,255,0.7)' : '#475569',
              }}>
                {owned ? `×${count > 999 ? '999+' : count}` : '???'}
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700, marginTop: 3,
                color: RARITY_COLORS[rarity], opacity: owned ? 0.7 : 0.3,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {rarity}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
