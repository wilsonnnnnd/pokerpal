# PokerPal 🃏

PokerPal is a modern app to manage poker chips and game records. It is built with React Native and Expo. The app tracks games, shows player stats, and saves history.

## Short Project Summary

PokerPal helps record chip counts and settlements for live or online poker games. The app uses Expo and React Native. Data is stored locally with SQLite and AsyncStorage. You can also sync data to Firebase (Firestore and Auth). The project uses TypeScript and Zustand for state. The app is made to work well offline and to sync later.

Main goals:
- Local first: work and save games even when offline.
- Multiple storage layers: memory (Zustand), AsyncStorage cache, local SQLite backup, and optional Firebase sync.
- Easy UI for players and settlement. Show player stats like profit and ROI.
## Features

Basic features: track game progress, save history, and show player stats.

## Architecture

Main stack:
- Frontend: React Native + Expo
- State: Zustand with AsyncStorage
- Local DB: SQLite (expo-sqlite)
- Cloud: Firebase (Firestore + Auth)
- Language: TypeScript
- Tooling: Expo CLI

Data flow:
```
User actions → Zustand store → local SQLite → optional Firebase sync
                 ↓
             AsyncStorage cache
```

## Quick Start

### Requirements
- Node.js 16+
- Expo CLI
- Android Studio (for Android) or Xcode (for iOS)

### Install

1. Clone the repo
```bash
git clone https://github.com/wilsonnnnnd/pokerpal.git
cd pokerpal
```

2. Install deps
```bash
npm install
```

3. Set env
Create a `.env` file and add Firebase keys:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. Start dev server
```bash
npm start
```

5. Run app
```bash
# Android
npm run android

# iOS
npm run ios
```

## Project Structure

```
src/
├── assets/      # images and sounds
├── components/  # reusable UI
├── constants/   # colors and settings
├── firebase/    # firebase helpers
├── hooks/       # custom hooks
├── screens/     # app screens
├── services/    # services and APIs
├── stores/      # Zustand stores
├── types/       # TypeScript types
└── utils/       # helper functions
```

Key files:
- `App.tsx` — app entry and setup
- `src/screens/GamePlayScreen.tsx` — main game flow
- `src/stores/useGameStore.ts` — game state and persistence
- `src/firebase/config.ts` — firebase setup
 - `src/services/localGameService.ts` — local game read/write and SQLite interaction

## How to Use

### Start a game
1. Tap "New Game" on the home screen.
2. Set blinds and chip values.
3. Add players and their buy-ins.
4. Start tracking the game.

### Game actions
- Add buy-in: record when a player adds chips.
- Player status: mark a player leave or return.
- Auto calc: profit and ROI update in real time.
- Finish game: set final chips and save the game.

### View data
- Game history: view past games.
- Player ranking: sort by profit and ROI.
- Stats: view detailed stats per player or game.

## Development Notes

### Formatting rules
- Money: keep 2 decimals `Number(amount.toFixed(2))`
- ROI: 6 decimals `Number(roi.toFixed(6))`
- Chips: integer `Math.round(chips)`

### State usage
```typescript
// read state
const game = useGameStore(state => state.gameId);

// update state
const setGame = useGameStore(state => state.setGame);
setGame({ gameId: 'new-game-id', ... });
```

### Persistence layers
1. Memory (Zustand) — live state
2. AsyncStorage — quick restore
3. SQLite — offline backup
4. Firebase — cross-device sync

### Errors and retry
- Network calls use retry strategies.
- Local DB has fallback logic.
- If Firebase write fails, it is saved locally to retry.

## Testing

```bash
# TypeScript check
npx tsc --noEmit

# Run tests (if any)
npm test
```

## Build & Release

### Android
```bash
# dev build
expo build:android

# production
eas build --platform android
```

### iOS
```bash
# dev build
expo build:ios

# production
eas build --platform ios
```

### Code style
- Use TypeScript strict mode.
- Follow ESLint rules.
- Use function components and hooks.
- Use Zustand for state.

## License

This project uses the MIT license. See [LICENSE](LICENSE).

## Thanks

- React Native — cross-platform
- Expo — development platform
- Firebase — backend services
- Zustand — state management

PokerPal — make poker game tracking simple 🎯