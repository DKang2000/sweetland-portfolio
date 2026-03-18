import type { DeviceProfile } from "../core/DeviceProfile";

export const MOBILE_MODE_STORAGE_KEY = "sweetland:mobileMode";

export type MobileExperienceMode = "guided" | "explore";
export type MobileModeSource = "desktop" | "query" | "stored" | "default";

export type ResolvedMobileMode = {
  mode: MobileExperienceMode | null;
  source: MobileModeSource;
};

function isMobileMode(value: string | null): value is MobileExperienceMode {
  return value === "guided" || value === "explore";
}

function readQueryMode(): MobileExperienceMode | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("mobileMode");
    return isMobileMode(value) ? value : null;
  } catch {
    return null;
  }
}

function readStoredMode(): MobileExperienceMode | null {
  try {
    const value = window.localStorage.getItem(MOBILE_MODE_STORAGE_KEY);
    return isMobileMode(value) ? value : null;
  } catch {
    return null;
  }
}

export function resolveMobileExperienceMode(profile: DeviceProfile): ResolvedMobileMode {
  if (profile.forceDesktop || !profile.isMobileExperience) {
    return { mode: null, source: "desktop" };
  }

  const queryMode = readQueryMode();
  if (queryMode) {
    return { mode: queryMode, source: "query" };
  }

  const storedMode = readStoredMode();
  if (storedMode) {
    return { mode: storedMode, source: "stored" };
  }

  return {
    mode: profile.isPhoneLike ? "guided" : "explore",
    source: "default",
  };
}

export function persistMobileExperienceMode(mode: MobileExperienceMode): void {
  try {
    window.localStorage.setItem(MOBILE_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function shouldUseMobileFrontDoor(
  profile: DeviceProfile,
  _resolved: ResolvedMobileMode
): boolean {
  return profile.isMobileExperience && !profile.forceDesktop;
}
