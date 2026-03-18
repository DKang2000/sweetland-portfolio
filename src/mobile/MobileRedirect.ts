const MOBILE_REDIRECT_URL = "https://chloeverse.io";

type MobileRedirectOptions = {
  message?: string;
  ctaLabel?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderMobileRedirect(options: MobileRedirectOptions = {}): void {
  const app = document.getElementById("app");
  if (!app) return;

  const message =
    options.message ??
    "Please visit imchloekang.com on a mobile site for the best experience.";
  const ctaLabel = options.ctaLabel ?? "Open Chloeverse Mobile";

  app.innerHTML = `
    <div class="fallback-shell fallback-shell-mobile-redirect">
      <div class="mobile-redirect-card">
        <div class="mobile-front-kicker">Chloeverse</div>
        <h1 class="mobile-front-title">Mobile Redirect</h1>
        <p class="mobile-front-copy">${escapeHtml(message)}</p>
        <div class="mobile-front-actions">
          <a class="mobile-front-primary mobile-front-anchor" href="${MOBILE_REDIRECT_URL}" rel="noreferrer">${escapeHtml(ctaLabel)}</a>
        </div>
      </div>
    </div>
  `;
}

export { MOBILE_REDIRECT_URL };
