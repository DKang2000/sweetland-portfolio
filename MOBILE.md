# Mobile Adaptation Notes

## Goal

This repo now serves the live Candy Castle experience on desktop and a simplified redirect experience on mobile at the same URL.

On mobile devices:

- the app now shows a branded redirect card instead of booting the 3D castle
- the message tells visitors: `Please visit imchloekang.com on a desktop site for the best experience.`
- the primary button opens `https://chloeverse.io`

Desktop behavior remains unchanged.

## Mobile Redirect

- Mobile now exits early in `src/main.ts` before the heavy 3D runtime loads.
- The redirect card is rendered by `src/mobile/MobileRedirect.ts`.
- The same redirect card is reused for mobile WebGL/runtime fallback so mobile messaging stays consistent.
- Desktop fallback still preserves the four portal destinations from `PORTFOLIO_SECTIONS`.

## Architecture

- `src/main.ts`
  - Lightweight boot shell that now short-circuits mobile into a branded redirect card before booting the heavy runtime.
- `src/bootstrapGame.ts`
  - Async runtime entry that installs HUD/runtime patches and starts the main `App`.
- `src/mobile/MobileMode.ts`
  - Still resolves mobile-vs-desktop routing and existing mobile query overrides.
- `src/mobile/MobileRedirect.ts`
  - Renders the mobile-only redirect card and CTA to `https://chloeverse.io`.
- `src/physics/Physics.ts`
  - Rapier is now loaded with a runtime async import instead of being baked into the eager boot path.
- `src/core/gltf.ts`
  - `GLTFLoader` is imported on demand when model loading begins instead of being eagerly bundled into the first runtime graph.
- `src/core/DeviceProfile.ts`
  - Detects coarse pointer / touch capability, portrait vs landscape, viewport size, touch points, and the `forceMobile`, `forceDesktop`, and `mobileLowFx` query overrides.
- `src/ui/WebGLFallback.ts`
  - Reuses the mobile redirect card for mobile fallback and keeps the portal grid fallback on desktop.

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
- If a phone-sized mobile session sustains poor frame times, the app can automatically step down into low-FX mode unless the user has explicitly chosen a quality setting.
