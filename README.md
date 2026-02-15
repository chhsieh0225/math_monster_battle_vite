# Math Monster Battle (Vite + React)

## Commands

- `npm run dev` : start local dev server
- `npm run build` : production build
- `npm run lint` : ESLint
- `npm test` : node test suite

## TypeScript Migration (Incremental)

This project is migrating from JS/JSX to TypeScript gradually.

- `tsconfig.json` is added with strict mode and `allowJs: true`.
- Mixed codebase is supported (`.js/.jsx` + `.ts/.tsx`).
- New/edited leaf UI modules should prefer `.tsx` first.
- Core battle logic migration should be done module-by-module to reduce risk.

Current migrated files:

- `src/types/game.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/components/ui/HPBar.tsx`
- `src/components/ui/XPBar.tsx`
- `src/components/ui/DamagePopup.tsx`
- `src/components/ui/Particle.tsx`
- `src/components/ui/TextBox.tsx`
- `src/components/ui/MonsterSprite.tsx`
- `src/components/ui/AchievementPopup.tsx`
- `src/components/screens/EvolveScreen.tsx`
- `src/components/screens/LeaderboardScreen.tsx`
- `src/components/screens/AchievementScreen.tsx`
- `src/components/screens/GameOverScreen.tsx`
- `src/components/screens/TitleScreen.tsx`
- `src/components/screens/PvpResultScreen.tsx`
- `src/components/screens/SettingsScreen.tsx`
- `src/components/screens/SelectionScreen.tsx`
- `src/components/screens/DashboardScreen.tsx`
- `src/components/screens/EncyclopediaScreen.tsx`

## Next Recommended TS Steps

1. Migrate battle domain files in this order:
   - `turnResolver` → `battleReducer` → `playerFlow/enemyFlow` → `useBattle`.
2. Introduce type-aware ESLint rules for TS files only (`@typescript-eslint` typed config).
3. Keep `lint + typecheck` green after each migration batch.
