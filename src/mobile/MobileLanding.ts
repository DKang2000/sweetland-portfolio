import type { MobileExperienceMode } from "./MobileMode";

type MobileLandingCallbacks = {
  onQuickTour: () => void;
  onExploreMode: () => void;
};

type LandingState =
  | { kind: "hidden" }
  | { kind: "entry"; preferredMode: MobileExperienceMode | null; exploreAvailable: boolean }
  | { kind: "explore-warning" }
  | { kind: "rotate-wait" }
  | { kind: "explore-unavailable" };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export class MobileLanding {
  private readonly layer = document.createElement("section");
  private state: LandingState = { kind: "hidden" };

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: MobileLandingCallbacks
  ) {
    this.layer.className = "mobile-front-layer mobile-landing-layer hidden";
    this.root.appendChild(this.layer);
    this.layer.addEventListener("click", this.onClick);
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  showEntry(preferredMode: MobileExperienceMode | null, exploreAvailable = true): void {
    this.state = { kind: "entry", preferredMode, exploreAvailable };
    this.render();
  }

  resumeExploreChoice(exploreAvailable = true): void {
    if (!exploreAvailable) {
      this.state = { kind: "explore-unavailable" };
      this.render();
      return;
    }

    if (this.isPortrait()) {
      this.state = { kind: "explore-warning" };
      this.render();
      return;
    }

    this.hide();
    this.callbacks.onExploreMode();
  }

  hide(): void {
    this.state = { kind: "hidden" };
    this.render();
  }

  private onClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const action = target?.closest<HTMLElement>("[data-mobile-landing-action]")?.dataset.mobileLandingAction;
    if (!action) return;

    switch (action) {
      case "quick-tour":
        this.hide();
        this.callbacks.onQuickTour();
        return;
      case "explore-mode":
        this.resumeExploreChoice(this.canExploreFromEntry());
        return;
      case "explore-continue":
        this.hide();
        this.callbacks.onExploreMode();
        return;
      case "explore-rotate":
        this.state = { kind: "rotate-wait" };
        this.render();
        return;
      case "back":
        this.showEntry(this.entryPreferredMode(), this.canExploreFromEntry());
        return;
      default:
        return;
    }
  };

  private onResize = (): void => {
    if (this.state.kind !== "rotate-wait") return;
    if (this.isPortrait()) return;
    this.hide();
    this.callbacks.onExploreMode();
  };

  private entryPreferredMode(): MobileExperienceMode | null {
    return this.state.kind === "entry" ? this.state.preferredMode : null;
  }

  private canExploreFromEntry(): boolean {
    return this.state.kind === "entry" ? this.state.exploreAvailable : true;
  }

  private isPortrait(): boolean {
    return window.innerHeight >= window.innerWidth;
  }

  private render(): void {
    const hidden = this.state.kind === "hidden";
    this.layer.classList.toggle("hidden", hidden);
    this.root.classList.toggle("hidden", hidden && !this.hasVisibleSibling());

    if (hidden) {
      this.layer.innerHTML = "";
      return;
    }

    if (this.state.kind === "entry") {
      const preferredCopy =
        this.state.preferredMode === "explore"
          ? "Last time you chose Explore Mode."
          : this.state.preferredMode === "guided"
            ? "Last time you took the Quick Tour."
            : "Portrait-first on mobile, with the full 3D castle ready whenever you want to roam.";

      const exploreNote = this.state.exploreAvailable
        ? "Explore Mode launches the existing free-roam 3D castle."
        : "Explore Mode needs 3D support on this device, but the Quick Tour is ready.";

      this.layer.innerHTML = `
        <div class="mobile-front-backdrop"></div>
        <div class="mobile-front-frame">
          <div class="mobile-front-card">
            <div class="mobile-front-kicker">Chloeverse</div>
            <h1 class="mobile-front-title">Enter Sweet Land</h1>
            <p class="mobile-front-copy">Choose a magical path into Candy Castle. Quick Tour is the one-thumb-friendly storybook journey through all four portals.</p>
            <div class="mobile-front-bubble">${escapeHtml(preferredCopy)}</div>
            <div class="mobile-front-actions">
              <button class="mobile-front-primary" type="button" data-mobile-landing-action="quick-tour">Quick Tour</button>
              <button class="mobile-front-secondary" type="button" data-mobile-landing-action="explore-mode">Explore Mode</button>
            </div>
            <p class="mobile-front-note">${escapeHtml(exploreNote)}</p>
          </div>
        </div>
      `;
      return;
    }

    if (this.state.kind === "explore-warning") {
      this.layer.innerHTML = `
        <div class="mobile-front-backdrop"></div>
        <div class="mobile-front-frame">
          <div class="mobile-front-card mobile-front-card-compact">
            <div class="mobile-front-kicker">Explore Mode</div>
            <h2 class="mobile-front-title">Best in landscape</h2>
            <p class="mobile-front-copy">The full Candy Castle roam works best sideways, with the joystick, action button, and camera space all laid out for your thumbs.</p>
            <div class="mobile-front-actions">
              <button class="mobile-front-primary" type="button" data-mobile-landing-action="explore-continue">Continue</button>
              <button class="mobile-front-secondary" type="button" data-mobile-landing-action="explore-rotate">Rotate/Resume</button>
            </div>
            <button class="mobile-front-link" type="button" data-mobile-landing-action="back">Back to entry</button>
          </div>
        </div>
      `;
      return;
    }

    if (this.state.kind === "rotate-wait") {
      this.layer.innerHTML = `
        <div class="mobile-front-backdrop"></div>
        <div class="mobile-front-frame">
          <div class="mobile-front-card mobile-front-card-compact">
            <div class="mobile-front-kicker">Rotate to Resume</div>
            <h2 class="mobile-front-title">Sweet Land is ready</h2>
            <p class="mobile-front-copy">Turn your phone sideways and the castle will reopen in Explore Mode as soon as there is room for the full mobile control deck.</p>
            <button class="mobile-front-link" type="button" data-mobile-landing-action="back">Back to entry</button>
          </div>
        </div>
      `;
      return;
    }

    this.layer.innerHTML = `
      <div class="mobile-front-backdrop"></div>
      <div class="mobile-front-frame">
        <div class="mobile-front-card mobile-front-card-compact">
          <div class="mobile-front-kicker">Quick Tour Ready</div>
          <h2 class="mobile-front-title">Explore Mode needs 3D support</h2>
          <p class="mobile-front-copy">This device can still take the Sweet Land tour, collect candy stamps, and open every portal destination without the live WebGL scene.</p>
          <div class="mobile-front-actions">
            <button class="mobile-front-primary" type="button" data-mobile-landing-action="quick-tour">Quick Tour</button>
            <button class="mobile-front-secondary" type="button" data-mobile-landing-action="back">Back</button>
          </div>
        </div>
      </div>
    `;
  }

  private hasVisibleSibling(): boolean {
    return Array.from(this.root.children).some((child) => {
      if (child === this.layer) return false;
      return !child.classList.contains("hidden");
    });
  }
}
