# Math Monster Battle (Vite + React)

## Commands

- `npm run dev` : start local dev server
- `npm run build` : production build
- `npm run lint` : ESLint
- `npm test` : node test suite
- `npm run typecheck` : TypeScript type check (`tsc --noEmit`)

## TypeScript Migration (Incremental)

This project is migrating from JS/JSX to TypeScript gradually.

- `tsconfig.json` is added with strict mode and `allowJs: true`.
- Mixed codebase is supported (`.js/.jsx` + `.ts/.tsx`).
- New/edited leaf UI modules should prefer `.tsx` first.
- Core battle logic migration should be done module-by-module to reduce risk.

Current migrated files:

- `src/types/game.ts`
- `src/types/battle.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/hooks/useBattle.ts` (typed wrapper)
- `src/hooks/useMobileExperience.ts`
- `src/hooks/useBattleRng.ts`
- `src/hooks/useTimer.ts`
- `src/utils/prng.ts`
- `src/utils/playerHp.ts`
- `src/utils/effectTiming.ts`
- `src/utils/turnFlow.ts`
- `src/utils/storage.ts`
- `src/utils/leaderboard.ts`
- `src/utils/time.ts`
- `src/utils/achievementStore.ts`
- `src/utils/sessionLogger.ts`
- `src/utils/eventLogger.ts`
- `src/utils/sfx.ts`
- `src/hooks/useAchievements.ts`
- `src/hooks/useEncyclopedia.ts`
- `src/hooks/useSessionLog.ts`
- `src/hooks/useBattleRuntime.ts`
- `src/hooks/useBattleSessionLifecycle.ts`
- `src/hooks/useCoopTurnRotation.ts`
- `src/hooks/useBattleUIState.ts`
- `src/hooks/usePvpState.ts`
- `src/hooks/battle/battleReducer.ts`
- `src/hooks/battle/turnResolver.ts`
- `src/hooks/battle/effectOrchestrator.ts`
- `src/hooks/battle/playerFlow.ts`
- `src/hooks/battle/enemyFlow.ts`
- `src/hooks/battle/pvpFlow.ts`
- `src/hooks/battle/coopFlow.ts`
- `src/hooks/battle/achievementFlow.ts`
- `src/hooks/battle/timeoutFlow.ts`
- `src/hooks/battle/startGameFlow.ts`
- `src/hooks/battle/turnHelpers.ts`
- `src/hooks/battle/victoryFlow.ts`
- `src/hooks/battle/advanceFlow.ts`
- `src/hooks/battle/answerFlow.ts`
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

1. Migrate `src/hooks/useBattle.js` to `src/hooks/useBattle.ts` (remove wrapper indirection).
2. Introduce type-aware ESLint rules for TS files only (`@typescript-eslint` typed config).
3. Keep `lint + typecheck + test + build` green after each migration batch.
