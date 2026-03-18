# Mobile Adaptation Notes

## Goal

This repo now serves the same Candy Castle content on desktop and mobile at the same URL.
Desktop still controls the body inside the 3D world. Phone-like mobile now controls the journey first.

On phone-like mobile devices:

- the default entry is a portrait-first guided Sweet Land front door
- the first screen is `Enter Sweet Land`
- `Quick Tour` is the default, one-thumb-friendly storybook path
- `Explore Mode` still launches the existing free-roam mobile 3D castle

The four destinations remain the same:

- `Projects`
- `Collabs`
- `Work`
- `Contact`

## Quick Tour

Quick Tour is the default mobile path for phone-like profiles.

- It is portrait-first and fully tap-driven.
- It uses `PORTFOLIO_SECTIONS` as the source of truth for titles, descriptions, urls, ids, and hotkeys.
- Each stop focuses one existing portal section.
- Each stop awards a lightweight candy stamp.
- Each stop offers `Open Page` and `Next Portal`.
- The completion state celebrates the full tour, points users to `Contact`, and offers `Replay Tour` plus `Explore Mode`.

The tour is backed by the existing runtime when WebGL works:

- the player is teleported to each portal's existing `teleportTo` anchor
- the camera glides into a guided portal framing
- free-roam mobile controls are suppressed while guided mode is active

## Explore Mode

Explore Mode preserves the previous mobile 3D experience.

- Landscape is still recommended for the full joystick/action layout.
- The left joystick, action button, look region, portals drawer, minimap toggle, sound, respawn, and FX controls are unchanged once Explore Mode starts.
- If a user chooses Explore Mode while still in portrait, the app shows a friendly landscape interstitial with `Continue` and `Rotate/Resume`.
- The last explicitly chosen mobile mode is persisted in local storage.

## Architecture

- `src/main.ts`
  - Lightweight boot shell that handles capability checks, resolves guided vs explore mode, and then dynamically imports the heavy game runtime.
- `src/bootstrapGame.ts`
  - Async runtime entry that installs HUD/runtime patches and starts the main `App`.
- `src/mobile/MobileMode.ts`
  - Resolves `guided` vs `explore` using query overrides, local storage, and the device profile.
- `src/mobile/MobileLanding.ts`
  - Owns the branded `Enter Sweet Land` shell plus the portrait Explore Mode interstitial.
- `src/mobile/GuidedTour.ts`
  - Renders the mobile storybook tour, candy stamp progress, and completion state.
- `src/physics/Physics.ts`
  - Rapier is now loaded with a runtime async import instead of being baked into the eager boot path.
- `src/core/gltf.ts`
  - `GLTFLoader` is imported on demand when model loading begins instead of being eagerly bundled into the first runtime graph.
- `src/core/DeviceProfile.ts`
  - Detects coarse pointer / touch capability, portrait vs landscape, viewport size, touch points, and the `forceMobile`, `forceDesktop`, and `mobileLowFx` query overrides.
- `src/core/InputActions.ts`
  - Central semantic action layer for movement, look, jump, interact, mute, respawn, portal shortcuts, map toggle, quality toggle, and reset collectibles.
- `src/ui/MobileControls.ts`
  - Owns the existing Explore Mode mobile overlay, joystick, touch look region, utility buttons, and portal drawer.
- `src/ui/UI.ts`
  - Adapts prompt behavior, loading copy, dialogue sheets, and portal panels for mobile while preserving desktop behavior.
- `src/ui/WebGLFallback.ts`
  - Renders a branded Sweet Land front door on mobile fallback and a portal grid fallback on desktop.

## Mode Resolution

Mobile mode resolution now follows this precedence:

1. `forceDesktop` disables mobile-specific mode handling.
2. `mobileMode=guided` or `mobileMode=explore` wins next.
3. The stored `sweetland:mobileMode` preference wins next.
4. Phone-like mobile defaults to `guided`.
5. Other mobile/coarse layouts default to `explore`.

Useful overrides:

- `?forceMobile=1`
- `?forceDesktop=1`
- `?mobileLowFx=1`
- `?mobileMode=guided`
- `?mobileMode=explore`

## Performance Profile

- Mobile / low-FX mode clamps DPR lower than desktop.
- Shadow quality is reduced in low-FX mode.
- Minimap updates are throttled on mobile and hidden by default on portrait / compact layouts.
- The boot shell now dynamically loads the heavy 3D runtime so the first page payload is lighter and the loading UI can paint before the full game code arrives.
- Vite output is chunked more deliberately so Three.js core, Three.js extras, Rapier, GSAP, fallback UI, and runtime code can cache independently.
- Rapier and `GLTFLoader` are now behind async import boundaries, so physics and model-loader code are requested only when scene bootstrap actually needs them.
- Mobile utility choices for low/high FX and minimap visibility persist in local storage.
- Mobile guided vs explore preference also persists in local storage via `sweetland:mobileMode`.
- If a phone-sized mobile session sustains poor frame times, the app can automatically step down into low-FX mode unless the user has explicitly chosen a quality setting.
