# Entrepreneur World — Game (Mobile)

Expo / React Native + TypeScript client for **Entrepreneur World**.

**Hub repo (docs, scripts, submodules):** [EntrepreneurWorld](https://github.com/CoderSeb/EntrepreneurWorld)

## Branches

| Branch | Purpose |
|--------|---------|
| `develop` | Daily development |
| `main` | Stable / release |

## Prerequisites

- Node.js 20+
- npm
- [Expo Go](https://expo.dev/go) on device or Android emulator

## Quick start

```powershell
pwsh ./scripts/start-mobile.ps1
```

Or manually:

```powershell
npm install
npm start
```

Press **`a`** for Android emulator or scan the QR code with Expo Go.

### npm TLS on Windows

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm install
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Expo dev server |
| `npm test` | Jest unit tests |
| `npm run typecheck` | TypeScript strict check |
| `pwsh ./scripts/run-mobile-tests.ps1` | typecheck + Jest |
| `pwsh ./scripts/start-mobile.ps1` | install deps + Expo |

## Backend (optional)

Point the app at a local API (default `http://localhost:5080` or `http://10.0.2.2:5080` on Android emulator):

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='http://192.168.1.10:5080'
pwsh ./scripts/start-mobile.ps1
```

See hub [LOCAL_DEVELOPMENT.md](https://github.com/CoderSeb/EntrepreneurWorld/blob/develop/docs/LOCAL_DEVELOPMENT.md) for full stack setup via submodules.

## Structure

```text
app/              expo-router screens
src/domain/       economy, save, money (no UI)
src/components/   reusable UI
src/theme/        design tokens
src/context/      GameContext
assets/config/    bundled economy_config_v1.json
```

Design tokens: hub [DESIGN_SYSTEM.md](https://github.com/CoderSeb/EntrepreneurWorld/blob/develop/docs/DESIGN_SYSTEM.md).
