# PokerPal

PokerPal is a poker session tracker for live/online games, built with Expo + React Native (TypeScript). It helps manage blinds, buy-ins, chip counts, and settlement results, and provides basic player stats.

中文说明见：[README.zh-CN.md](./README.zh-CN.md)

## Highlights

- Session tracking: blinds, chip base values, buy-ins, leave/return, settlement
- Stats: profit / ROI / appearances ranking and summaries
- Quick Record: faster flow to record a session
- Invite via link/QR (e.g. `https://hdpoker.xyz/join/<gameId>?token=...`)
- Local-first: works offline (AsyncStorage + SQLite) and can sync later
- Optional cloud: Firebase Auth + Firestore (some write flows require host permission)

## Tech Stack

- Expo SDK 54, React Native 0.81, React 19
- TypeScript (`strict: true`)
- Navigation: React Navigation (native-stack)
- State: zustand (persisted to AsyncStorage)
- Local storage: expo-sqlite (with an in-memory fallback) + AsyncStorage
- Cloud: Firebase (Auth / Firestore)

## Getting Started

### Requirements

- Node.js 18+
- npm
- Android Studio (Android) / Xcode (iOS, macOS required)

### Install

```bash
npm install
```

### Environment Variables (Firebase optional)

1) Copy `.env.example` to `.env`
2) Fill in Firebase config (Expo exposes `EXPO_PUBLIC_*` variables to the client):

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional; supported in code)

If you enable Firebase/Google capabilities on iOS:

- Put `GoogleService-Info.plist` at the repository root (path is referenced by [app.json](./app.json))

### Start Dev Server

```bash
npm start
```

### Run on Device/Simulator

```bash
npm run android
npm run ios
npm run web
```

## Build & Release (EAS)

Build profiles are defined in [eas.json](./eas.json): `development` / `preview` / `production`.

```bash
# Android internal build (apk)
eas build --profile development --platform android

# Android preview build (apk)
eas build --profile preview --platform android

# Android store build (aab)
eas build --profile production --platform android

# iOS (example)
eas build --profile production --platform ios
```

Submit (example):

```bash
eas submit --profile production --platform android
```

## Project Structure

```
src/
├── assets/      static assets (images / sounds / styles)
├── components/  UI components (common / gaming / settings)
├── constants/   constants and config
├── firebase/    Firebase init and data access
├── hooks/       custom hooks (permission / stats / etc.)
├── i18n/        localization
├── providers/   global providers (Auth / Settings / Popup)
├── screens/     screens
├── services/    service layer (localDb / auth / storage / etc.)
├── stores/      zustand stores
├── types/       type definitions
└── utils/       utilities
```

## Key Entry Points

- [App.tsx](./App.tsx): app bootstrap, providers, navigation
- [localDb.ts](./src/services/localDb.ts): SQLite schema + SQL wrapper (with fallback)
- [firebase/config.ts](./src/firebase/config.ts): Firebase init (reads `EXPO_PUBLIC_*`)
- [useGameStore.ts](./src/stores/useGameStore.ts): core game store (persisted to AsyncStorage)

## Numeric Conventions

- Money: keep 2 decimals `Number(amount.toFixed(2))`
- ROI: keep 6 decimals `Number(roi.toFixed(6))`
- Chips: integer `Math.round(chips)`

## Type Check

```bash
npx tsc --noEmit
```

## Security

Please report security issues privately following [SECURITY.md](./SECURITY.md).
