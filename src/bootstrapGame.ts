import { App } from "./app/App";
import { installCollectibleBanner } from "./ui/celebrationBanner";
import { installHudRespawnLabelFix } from "./ui/hudRespawnLabelFix";
import { installRespawnHintRuntimePatch } from "./ui/respawnHintRuntimePatch";
import { installRespawnHudLabel } from "./ui/respawnHudLabel";
import type { MobileExperienceMode } from "./mobile/MobileMode";

export async function startGame(initialMobileMode: MobileExperienceMode | null = null): Promise<App> {
  installHudRespawnLabelFix();
  installRespawnHudLabel();
  installRespawnHintRuntimePatch();
  installCollectibleBanner();

  const app = new App(initialMobileMode);
  await app.init();
  return app;
}
