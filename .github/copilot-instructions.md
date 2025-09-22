The PokerPal codebase (Expo + React Native + Firebase + local sqlite) — quick guide for AI coding agents

使用中文回复：本仓库的交互优先使用中文（简体或繁体均可），除非用户另有指定。

Please keep guidance short and targeted. Use the examples below to implement, refactor, or debug features.

- Project entry: `App.tsx` registers navigation and initializes local DB, settings and auth shim. When changing app-level behaviour (navigation, persisted settings, auth restore), update `App.tsx` and verify navigation flows in the emulator.

- Build / run commands (from `package.json`):
  - start Metro / dev server: `npm start` (runs `expo start`)
  - run Android: `npm run android` (runs `expo run:android`)
  - run iOS: `npm run ios` (runs `expo run:ios`)

- Architecture highlights:
  - UI: React Native screens live under `src/screens/`. `App.tsx` wires the navigator (native stack) and header component `src/components/Header.tsx`.
  - State: global state uses `zustand` stores in `src/stores/` (e.g. `useGameStore.ts`, `usePlayerStore.ts`). Stores persist using AsyncStorage and selectively persist only primitive game fields (see `partialize` in `useGameStore`).
  - Local persistence: `src/services/localDb.ts` initializes sqlite schema; `src/services/localGameService.ts` and `src/services/storageService.ts` read/write local JSON-backed items.
  - Remote: Firebase is configured in `src/firebase/config.ts`. Firestore (`db`) and Auth (`auth`) initialization attempt RN persistence via `@react-native-async-storage/async-storage` when available. Environment config uses Expo environment variables (EXPO_PUBLIC_*).
  - Cross-cutting: many Firebase helpers live under `src/firebase/` (e.g. `saveGame.ts`, `saveGameToHistory.ts`, `gameWriters.ts`). Game finalization is a multi-step flow: save history locally, save to Firebase, save to local SQL, then call finalize on server. See `GamePlayScreen.tsx` for the exact sequence and retry semantics.

- Important patterns to preserve when editing code:
  - Persisted store shape: stores intentionally persist only a small set of primitive fields. Avoid adding large nested objects to `partialize` unless you update migration logic in `useGameStore`.
  - Retry semantics: network operations often use the `retry` helper pattern (exponential backoff) in `GamePlayScreen.tsx`. Reuse that approach for idempotent remote calls.
  - Finalize vs save: The app distinguishes "saving game data" (create/update remote docs and local history) from "finalize" (server-side status flip). Keep these responsibilities separate when changing logic.
  - Auth: `src/firebase/config.ts` tries multiple require paths to enable React Native persistence. When updating firebase packages, keep these guards and warn when persistence is unavailable.

- Files to read first for context changes: `App.tsx`, `src/screens/GamePlayScreen.tsx`, `src/stores/useGameStore.ts`, `src/firebase/config.ts`, `src/services/localGameService.ts`.

- Testing and verification steps for changes (manual):
  1. Start Metro: `npm start` and open emulator/expo go.
 2. For full-native flows (sqlite / firebase auth persistence) run `npm run android` or `npm run ios`.
 3. Verify critical flows: start a game, add players, buy-in, finalize game. Check local history (UI and AsyncStorage), and Firestore writes (if env vars provided).

- Quick code examples (how to read/write stores / persistence):
  - Read game state: `const game = useGameStore.getState(); const id = game.gameId;`
  - Update partial persisted fields: use `useGameStore((s) => s.setGame({...}))` or call `useGameStore.getState().finalizeGame()` to mark finalized and set updated timestamp.

- Environment and secrets: firebase keys are expected in Expo public env vars (EXPO_PUBLIC_FIREBASE_*). Do not hardcode secrets. If missing, firebase initialization will still try to run but auth persistence may be disabled — code contains warnings for this.

- Conventions and small surprises:
  - Global settings are attached to `global.__pokerpal_settings` for synchronous reads elsewhere; ensure changes to language defaults update `App.tsx` initialization.
  - The project mixes English and Chinese comments and messages. Keep i18n-aware strings in place when touching UI copy.
  - Some helper modules export a default object with multiple functions (e.g. `localGameService`), follow that style for small service modules.

- When changing persisted formats, add a migration in the relevant store (example: `migrate` in `useGameStore.ts`).

If anything above is unclear or you'd like more examples (tests, a suggested PR template, or CI commands), tell me which area to expand and I will iterate.
