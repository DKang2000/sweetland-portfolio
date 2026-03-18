import { detectDeviceProfile } from "./core/DeviceProfile";
import {
  resolveMobileExperienceMode,
  shouldUseMobileFrontDoor,
} from "./mobile/MobileMode";
import { renderMobileRedirect } from "./mobile/MobileRedirect";
import { renderWebGLFallback } from "./ui/WebGLFallback";

function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function installTouchViewportLock(): void {
  const preventInsideApp = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest("#app")) return;
    event.preventDefault();
  };

  document.addEventListener("touchmove", preventInsideApp, { passive: false });
  document.addEventListener("gesturestart", preventInsideApp as EventListener, { passive: false });
  document.addEventListener("gesturechange", preventInsideApp as EventListener, { passive: false });
}

const profile = detectDeviceProfile();
const resolvedMobileMode = resolveMobileExperienceMode(profile);
if (profile.isMobileExperience) {
  installTouchViewportLock();
}

if (shouldUseMobileFrontDoor(profile, resolvedMobileMode)) {
  renderMobileRedirect();
} else if (!canUseWebGL()) {
  renderWebGLFallback({
    message: "This browser couldn’t start Candy Castle’s 3D renderer, but Chloe’s portals are still ready from here.",
    profile,
    resolvedMobileMode,
  });
} else {
  const bootRuntime = () => {
    import("./bootstrapGame")
      .then(async ({ startGame }) => {
        await startGame(resolvedMobileMode.mode);
      })
      .catch((err) => {
        console.error(err);
        renderWebGLFallback({
          message: profile.isMobileExperience
            ? "Candy Castle ran into a startup issue on this phone, but Chloe’s portals are still here for you."
            : "Candy Castle ran into a startup issue, but Chloe’s portals are still here for you.",
          profile,
          resolvedMobileMode,
        });
      });
  };

  if ("requestAnimationFrame" in window) {
    window.requestAnimationFrame(() => bootRuntime());
  } else {
    setTimeout(bootRuntime, 0);
  }
}
