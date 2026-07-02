# AGENTS.md — Entrepreneur World Game

This repository contains the **Expo / React Native** mobile client.

## Hub documentation

Shared product, architecture, economy, and agent rules live in the hub repo:

- https://github.com/CoderSeb/EntrepreneurWorld

Read the hub's `AGENTS.md`, `README.md`, and `docs/` before larger changes.

## Branches

- **`develop`** — daily work
- **`main`** — stable / release

## Submodule workflow

When this repo changes, update the hub submodule pointer:

1. Commit and push here on `develop`.
2. In [EntrepreneurWorld](https://github.com/CoderSeb/EntrepreneurWorld): `cd repos/game && git pull`, then commit the bumped SHA on hub `develop`.

## Tests

```powershell
pwsh ./scripts/run-mobile-tests.ps1
```
