import { detectDeviceProfile } from "./core/DeviceProfile";
import {
  persistMobileExperienceMode,
  resolveMobileExperienceMode,
  shouldUseMobileFrontDoor,
  type ResolvedMobileMode,
} from "./mobile/MobileMode";
import { renderWebGLFallback } from "./ui/WebGLFallback";
import type { App } from "./app/App";

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

if (!canUseWebGL()) {
  renderWebGLFallback({
    message: "This browser couldn’t start Candy Castle’s 3D renderer, but Chloe’s guided Sweet Land tour is still ready.",
    profile,
    resolvedMobileMode,
  });
} else {
  const bootRuntime = () => {
    import("./bootstrapGame")
      .then(async ({ startGame }) => {
        const app = await startGame(resolvedMobileMode.mode);
        await maybeInstallMobileFrontDoor(app, profile, resolvedMobileMode);
      })
      .catch((err) => {
        console.error(err);
        renderWebGLFallback({
          message: profile.isMobileExperience
            ? "Candy Castle ran into a startup issue on this phone, but Chloe’s guided Sweet Land tour is still here for you."
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

async function maybeInstallMobileFrontDoor(
  app: App,
  profile: ReturnType<typeof detectDeviceProfile>,
  resolved: ResolvedMobileMode
): Promise<void> {
  if (!shouldUseMobileFrontDoor(profile, resolved) || !resolved.mode) {
    return;
  }

  const root = document.getElementById("mobileFrontDoor");
  if (!root) return;

  const [{ MobileLanding }, { GuidedTour }] = await Promise.all([
    import("./mobile/MobileLanding"),
    import("./mobile/GuidedTour"),
  ]);

  const startExplore = (): void => {
    persistMobileExperienceMode("explore");
    tour.hide();
    landing.hide();
    app.resumeMobileExplore();
  };

  const startGuided = (): void => {
    persistMobileExperienceMode("guided");
    landing.hide();
    app.setMobileInteractionMode("guided");
    tour.start();
  };

  const requestExplore = (): void => {
    app.setMobileInteractionMode("guided");
    tour.hide();
    landing.resumeExploreChoice(true);
  };

  const landing = new MobileLanding(root, {
    onQuickTour: startGuided,
    onExploreMode: startExplore,
  });

  const tour = new GuidedTour(root, {
    onFocusSection: (sectionId) => app.focusPortalStop(sectionId),
    onOpenSection: (sectionId) => app.openMobileSection(sectionId),
    onExploreMode: requestExplore,
  });

  app.dismissLoadingOverlay();

  if (resolved.source === "default") {
    app.setMobileInteractionMode("guided");
    landing.showEntry(null, true);
    return;
  }

  if (resolved.mode === "guided") {
    startGuided();
    return;
  }

  if (isPortraitMobile()) {
    app.setMobileInteractionMode("guided");
  }
  landing.resumeExploreChoice(true);
}

function isPortraitMobile(): boolean {
  return window.innerHeight >= window.innerWidth;
}
