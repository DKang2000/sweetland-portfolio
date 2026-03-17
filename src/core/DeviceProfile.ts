import { Emitter } from "./Emitter";

type DeviceEvents = {
  change: DeviceProfile;
};

export type DeviceProfile = {
  isMobileExperience: boolean;
  isTouchDevice: boolean;
  isCoarsePointer: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isPortraitPrimary: boolean;
  isSmallViewport: boolean;
  isPhoneLike: boolean;
  maxTouchPoints: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  forceMobile: boolean;
  forceDesktop: boolean;
  forceLowFx: boolean;
  useLowFx: boolean;
  useCompactMinimap: boolean;
};

function getQueryFlag(name: string): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    return value === "1" || value === "true";
  } catch {
    return false;
  }
}

function safeMatch(query: string): boolean {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

export function detectDeviceProfile(): DeviceProfile {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const pixelRatio = window.devicePixelRatio || 1;

  const forceMobile = getQueryFlag("forceMobile");
  const forceDesktop = getQueryFlag("forceDesktop");
  const forceLowFx = getQueryFlag("mobileLowFx");

  const isCoarsePointer = safeMatch("(pointer: coarse)") || safeMatch("(hover: none)");
  const isTouchDevice =
    forceMobile ||
    (!forceDesktop &&
      (maxTouchPoints > 0 ||
        "ontouchstart" in window ||
        safeMatch("(any-pointer: coarse)")));

  const isPortrait = viewportHeight >= viewportWidth;
  const isSmallViewport = Math.max(viewportWidth, viewportHeight) <= 980 || viewportWidth <= 820;
  const isPhoneLike = Math.max(viewportWidth, viewportHeight) <= 960;

  const inferredMobile =
    !forceDesktop &&
    (forceMobile || (isTouchDevice && isCoarsePointer) || (isTouchDevice && isSmallViewport));

  const isMobileExperience = inferredMobile;
  const useLowFx = forceLowFx || isMobileExperience;
  const useCompactMinimap = isMobileExperience && (isPhoneLike || viewportWidth <= 520);

  return {
    isMobileExperience,
    isTouchDevice,
    isCoarsePointer,
    isPortrait,
    isLandscape: !isPortrait,
    isPortraitPrimary: isMobileExperience && isPortrait,
    isSmallViewport,
    isPhoneLike,
    maxTouchPoints,
    viewportWidth,
    viewportHeight,
    pixelRatio,
    forceMobile,
    forceDesktop,
    forceLowFx,
    useLowFx,
    useCompactMinimap,
  };
}

export class DeviceProfileStore {
  private profile = detectDeviceProfile();
  readonly events = new Emitter<DeviceEvents>();

  constructor() {
    this.applyDocumentState();
    window.addEventListener("resize", this.refresh, { passive: true });
    window.addEventListener("orientationchange", this.refresh, { passive: true });
  }

  get current(): DeviceProfile {
    return this.profile;
  }

  refresh = (): void => {
    const next = detectDeviceProfile();
    const changed =
      JSON.stringify(next) !== JSON.stringify(this.profile);

    this.profile = next;
    this.applyDocumentState();

    if (changed) {
      this.events.emit("change", next);
    }
  };

  private applyDocumentState(): void {
    const root = document.documentElement;
    const body = document.body;
    const profile = this.profile;

    root.dataset.experience = profile.isMobileExperience ? "mobile" : "desktop";
    root.dataset.orientation = profile.isPortrait ? "portrait" : "landscape";
    root.dataset.lowFx = profile.useLowFx ? "1" : "0";

    body.classList.toggle("mobile-experience", profile.isMobileExperience);
    body.classList.toggle("desktop-experience", !profile.isMobileExperience);
    body.classList.toggle("portrait-primary", profile.isPortraitPrimary);
    body.classList.toggle("compact-minimap", profile.useCompactMinimap);
  }
}
