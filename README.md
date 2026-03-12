# Sweet Land Portfolio

`Sweet Land Portfolio` is the codebase behind [imchloekang.com](https://imchloekang.com), a playable 3D candy-castle portfolio for Chloe Kang.

This project is not a generic Three.js starter anymore. The live site is a game-like portfolio experience where visitors:

- spawn into Chloe's Candy Castle with a live 3D third-person camera
- move around the world with keyboard controls
- collect candies / collectibles
- meet NPCs with custom dialogue
- use four portals that route into the broader Chloeverse (`Projects`, `Collabs`, `Work`, and `Contact`)
- see an always-on HUD with controls, loading progress, and collectible count

## Live Experience

The production site is designed as an explorable "hub world" rather than a flat landing page.

- URL: [imchloekang.com](https://imchloekang.com)
- Theme: whimsical candy kingdom / castle
- Camera: third-person exploration
- Navigation: walk to portals or jump directly with hotkeys
- Content model: the castle acts as the front door into Chloe's wider portfolio system

### Current in-world controls

- `WASD`: move
- `Shift`: run
- `Space`: jump / double jump
- `E`: interact
- `1-4`: jump to portfolio portals
- `R`: respawn
- `M`: mute
- `Esc`: release pointer lock / close overlays

## What the repo currently contains

- Three.js scene rendering
- Rapier-based movement and collisions
- third-person controller and camera follow
- collectible system + HUD counter
- portal registry for `Projects`, `Collabs`, `Work`, and `Contact`
- dialogue UI for named NPCs
- custom loading state and soundtrack handling
- local app routes/components used by the in-world portal system

Key files:

- `src/app/App.ts`: main game/app bootstrap
- `src/config/portfolio.ts`: portal destinations and labels
- `src/world/Level.ts`: world composition
- `src/player/`: player controller + camera behavior
- `src/ui/UI.ts`: HUD, prompts, panel, and dialogue UI
- `src/audio/AudioManager.ts`: music / audio orchestration

## Tech Stack

- Vite
- TypeScript
- Three.js
- `@dimforge/rapier3d-compat`
- custom DOM HUD + overlay UI

## Local Development

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run build
npm run preview
npm run models:manifest
npm run pages:build
```

## Deployment Notes

The production build includes large 3D assets. Cloudflare Pages has a hard per-asset size limit, so large models should be hosted outside the default bundle when needed.

- host oversized assets in R2
- point `VITE_ASSET_BASE_URL` at the public asset domain
- use `npm run pages:build` for the Pages-oriented production build

## Repo Purpose

This repo exists to power the explorable candy-castle portfolio itself, not the full set of portfolio subpages. The castle is the interactive entry point; the deeper portfolio destinations live in the separate `chloeverse-portals` project.
