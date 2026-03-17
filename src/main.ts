import { detectDeviceProfile } from "./core/DeviceProfile";
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
if (profile.isMobileExperience) {
  installTouchViewportLock();
}

if (!canUseWebGL()) {
  renderWebGLFallback("This browser couldn’t start Candy Castle’s 3D renderer, so here are Chloe’s portal destinations instead.");
} else {
  const bootRuntime = () => {
    import("./bootstrapGame")
      .then(({ startGame }) => startGame(profile))
      .catch((err) => {
        console.error(err);
        renderWebGLFallback(
          profile.isMobileExperience
            ? "Candy Castle ran into a startup issue on this phone, but Chloe’s portals are still here for you."
            : "Candy Castle ran into a startup issue, but Chloe’s portals are still here for you."
        );
      });
  };

  if ("requestAnimationFrame" in window) {
    window.requestAnimationFrame(() => bootRuntime());
  } else {
    window.setTimeout(bootRuntime, 0);
  }
}
