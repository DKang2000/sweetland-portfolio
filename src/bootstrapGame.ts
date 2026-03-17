import { App } from "./app/App";
import { installCollectibleBanner } from "./ui/celebrationBanner";
import { installHudRespawnLabelFix } from "./ui/hudRespawnLabelFix";
import { installRespawnHintRuntimePatch } from "./ui/respawnHintRuntimePatch";
import { installRespawnHudLabel } from "./ui/respawnHudLabel";
import type { DeviceProfile } from "./core/DeviceProfile";

export async function startGame(profile: DeviceProfile): Promise<void> {
  installHudRespawnLabelFix();
  installRespawnHudLabel();
  installRespawnHintRuntimePatch();
  installCollectibleBanner();

  const app = new App();
  try {
    await app.init();
  } catch (err) {
    console.error(err);
    const { renderWebGLFallback } = await import("./ui/WebGLFallback");
    renderWebGLFallback(
      profile.isMobileExperience
        ? "Candy Castle ran into a startup issue on this phone, but Chloe’s portals are still here for you."
        : "Candy Castle ran into a startup issue, but Chloe’s portals are still here for you."
    );
  }
}
