# Mobile Adaptation Notes

## Goal

This repo now serves the same 3D Candy Castle experience on desktop and mobile at the same URL.
Phones still explore the live Three.js world, collect items, talk to NPCs, and enter the same four portals.

## Mobile Controls

- Move with the bottom-left joystick.
- Drag the right side of the screen to orbit the camera.
- Jump by tapping the center of the joystick.
- Use the bottom-right action button to `Talk` or `Enter` when a target is focused.
- Tap the on-screen prompt pill for the same interaction shortcut.
- Use the top buttons for mute, respawn, portals, minimap, low/high FX, and reset collectibles.
- Use the `Portals` drawer to teleport to a portal pedestal without skipping the in-world portal interaction.

## Architecture

- `src/main.ts`
  - Lightweight boot shell that handles capability checks and then dynamically imports the heavy game runtime.
- `src/bootstrapGame.ts`
  - Async runtime entry that installs HUD/runtime patches and starts the main `App`.
- `src/physics/Physics.ts`
  - Rapier is now loaded with a runtime async import instead of being baked into the eager boot path.
- `src/core/gltf.ts`
  - `GLTFLoader` is imported on demand when model loading begins instead of being eagerly bundled into the first runtime graph.
- `src/core/DeviceProfile.ts`
  - Detects coarse pointer / touch capability, portrait vs landscape, viewport size, touch points, and the `forceMobile`, `forceDesktop`, and `mobileLowFx` query overrides.
- `src/core/InputActions.ts`
  - Central semantic action layer for movement, look, jump, interact, mute, respawn, portal shortcuts, map toggle, quality toggle, and reset collectibles.
- `src/ui/MobileControls.ts`
  - Owns the portrait-first mobile overlay, joystick, touch look region, utility buttons, and portal drawer.
- `src/ui/UI.ts`
  - Adapts prompt behavior, loading copy, dialogue sheets, and portal panels for mobile while preserving desktop behavior.
- `src/ui/WebGLFallback.ts`
  - Renders a branded portal fallback if WebGL or scene startup fails.

## Portrait-First Decisions

- The joystick sits bottom-left and the action button sits bottom-right for thumb reach in portrait.
- Utility controls live near the top corners and respect safe areas / notches.
- The center of the screen stays as open as possible for world visibility.
- Dialogue becomes a bottom sheet and portal content becomes a portrait-friendly sheet with a strong primary CTA.
- The minimap is collapsed by default on compact mobile layouts and can be toggled back on.

## Performance Profile

- Mobile / low-FX mode clamps DPR lower than desktop.
- Shadow quality is reduced in low-FX mode.
- Minimap updates are throttled on mobile and hidden by default on compact portrait layouts.
- The boot shell now dynamically loads the heavy 3D runtime so the first page payload is lighter and the loading UI can paint before the full game code arrives.
- Vite output is chunked more deliberately so Three.js core, Three.js extras, Rapier, GSAP, fallback UI, and runtime code can cache independently.
- Rapier and `GLTFLoader` are now behind async import boundaries, so physics and model-loader code are requested only when scene bootstrap actually needs them.
- Mobile utility choices for low/high FX and minimap visibility persist in local storage.
- If a phone-sized mobile session sustains poor frame times, the app can automatically step down into low-FX mode unless the user has explicitly chosen a quality setting.
- The mobile profile can be forced with `?forceMobile=1`.
- Desktop can be forced with `?forceDesktop=1`.
- Low effects can be forced with `?mobileLowFx=1`.
