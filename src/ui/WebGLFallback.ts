import type { DeviceProfile } from "../core/DeviceProfile";
import { PORTFOLIO_SECTIONS } from "../config/portfolio";
import { renderMobileRedirect } from "../mobile/MobileRedirect";
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

export function renderWebGLFallback(input?: string | WebGLFallbackOptions): void {
  const { message, profile, resolvedMobileMode } = normalizeOptions(input);
  const app = document.getElementById("app");
  if (!app) return;

  if (profile && resolvedMobileMode && shouldUseMobileFrontDoor(profile, resolvedMobileMode)) {
    renderMobileRedirect({
      message:
        message ?? "Please visit imchloekang.com on a desktop site for the best experience.",
      ctaLabel: "Open Chloeverse Mobile",
    });
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
