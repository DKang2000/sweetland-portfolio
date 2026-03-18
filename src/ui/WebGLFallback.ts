import type { DeviceProfile } from "../core/DeviceProfile";
import { PORTFOLIO_SECTIONS } from "../config/portfolio";
import { GuidedTour } from "../mobile/GuidedTour";
import { MobileLanding } from "../mobile/MobileLanding";
import { shouldUseMobileFrontDoor, type ResolvedMobileMode } from "../mobile/MobileMode";

type WebGLFallbackOptions = {
  message?: string;
  profile?: DeviceProfile;
  resolvedMobileMode?: ResolvedMobileMode;
};

function normalizeOptions(input?: string | WebGLFallbackOptions): WebGLFallbackOptions {
  if (typeof input === "string") {
    return { message: input };
  }
  return input ?? {};
}

function openSection(sectionId: string): void {
  const section = PORTFOLIO_SECTIONS.find((item) => item.id === sectionId);
  if (!section) return;
  window.open(section.url, "_blank", "noopener,noreferrer");
}

export function renderWebGLFallback(input?: string | WebGLFallbackOptions): void {
  const { message, profile, resolvedMobileMode } = normalizeOptions(input);
  const app = document.getElementById("app");
  if (!app) return;

  if (profile && resolvedMobileMode && shouldUseMobileFrontDoor(profile, resolvedMobileMode)) {
    renderMobileFallback(app, message, resolvedMobileMode);
    return;
  }

  app.innerHTML = `
    <div class="fallback-shell">
      <div class="fallback-card">
        <div class="fallback-kicker">Chloeverse</div>
        <h1>Sweet Land is still open</h1>
        <p class="fallback-copy">
          ${message ?? "This device couldn’t start the Candy Castle scene cleanly, but Chloe’s four portal destinations are still ready from here."}
        </p>
        <div class="fallback-grid">
          ${PORTFOLIO_SECTIONS.map(
            (section) => `
              <a class="fallback-link" href="${section.url}" target="_blank" rel="noreferrer">
                <span class="fallback-link-title">${section.title}</span>
                <span class="fallback-link-copy">${section.description}</span>
                <span class="fallback-link-cta">Open page</span>
              </a>
            `
          ).join("")}
        </div>
        <a class="fallback-contact" href="https://chloeverse.io/contact/" target="_blank" rel="noreferrer">
          Contact Chloe
        </a>
      </div>
    </div>
  `;
}

function renderMobileFallback(
  app: HTMLElement,
  message: string | undefined,
  resolvedMobileMode: ResolvedMobileMode
): void {
  app.innerHTML = `
    <div class="fallback-shell fallback-shell-mobile">
      <div class="fallback-card fallback-card-mobile">
        <div class="fallback-kicker">Chloeverse</div>
        <h1>Sweet Land is ready for the Quick Tour</h1>
        <p class="fallback-copy">
          ${message ?? "This phone can still take the storybook path through all four Candy Castle portals, even without the live 3D scene."}
        </p>
      </div>
      <div id="mobileFrontDoor" class="mobile-front-door hidden" aria-live="polite"></div>
    </div>
  `;

  const root = app.querySelector<HTMLElement>("#mobileFrontDoor");
  if (!root) return;

  const landing = new MobileLanding(root, {
    onQuickTour: () => tour.start(),
    onExploreMode: () => landing.resumeExploreChoice(false),
  });

  const tour = new GuidedTour(root, {
    onOpenSection: (sectionId) => openSection(sectionId),
    onExploreMode: () => {
      tour.hide();
      landing.resumeExploreChoice(false);
    },
  });

  if (resolvedMobileMode.mode === "guided" && resolvedMobileMode.source !== "default") {
    tour.start();
    return;
  }

  landing.showEntry(
    resolvedMobileMode.source === "default" ? null : resolvedMobileMode.mode,
    false
  );
}
