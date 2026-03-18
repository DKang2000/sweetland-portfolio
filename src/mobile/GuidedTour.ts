import { PORTFOLIO_SECTIONS, type PortfolioSectionId } from "../config/portfolio";

type GuidedTourCallbacks = {
  onFocusSection?: (sectionId: PortfolioSectionId) => void;
  onOpenSection: (sectionId: PortfolioSectionId) => void;
  onExploreMode: () => void;
};

type GuidedStopCopy = {
  story: string;
  npc?: string;
};

const GUIDED_STOP_COPY: Record<PortfolioSectionId, GuidedStopCopy> = {
  projects: {
    story: "The first portal sparkles with Chloe's latest creations. Collect your first candy stamp and peek through the sweetest workshop gate in the castle.",
    npc: "Goldie Gum whispers that every great quest starts with a favorite project and a little extra glitter.",
  },
  collabs: {
    story: "The collab corridor hums with party energy. This stop is where Sweet Land opens the doors for shared adventures and co-conspirators.",
    npc: "Rubycakes promises the best candy stories always get louder when more friends join the table.",
  },
  work: {
    story: "Beyond this archway, the castle shifts into builder mode. Here the guided path turns toward Chloe's craft, experience, and founder-era momentum.",
    npc: "Scarlet Squish insists the Work portal is where practical magic learns how to sprint.",
  },
  contact: {
    story: "The final portal glows like a welcome lantern. This is the place to keep the Sweet Land journey going and start the next conversation.",
    npc: "Gumball says every grand tour deserves an easy way to say hello before the carriage rolls home.",
  },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export class GuidedTour {
  private readonly layer = document.createElement("section");
  private currentIndex = 0;
  private earned = new Set<PortfolioSectionId>();
  private showingCompletion = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly callbacks: GuidedTourCallbacks
  ) {
    this.layer.className = "mobile-front-layer guided-tour-layer hidden";
    this.root.appendChild(this.layer);
    this.layer.addEventListener("click", this.onClick);
  }

  start(startIndex = 0): void {
    this.earned.clear();
    this.showingCompletion = false;
    this.showStop(startIndex);
  }

  hide(): void {
    this.layer.classList.add("hidden");
    this.layer.innerHTML = "";
    this.root.classList.toggle("hidden", !this.hasVisibleSibling());
  }

  private showStop(index: number): void {
    this.currentIndex = Math.max(0, Math.min(index, PORTFOLIO_SECTIONS.length - 1));
    this.showingCompletion = false;

    const section = PORTFOLIO_SECTIONS[this.currentIndex];
    if (!section) return;
    this.earned.add(section.id);
    this.callbacks.onFocusSection?.(section.id);

    this.layer.classList.remove("hidden");
    this.root.classList.remove("hidden");

    const copy = GUIDED_STOP_COPY[section.id];
    const isLast = this.currentIndex >= PORTFOLIO_SECTIONS.length - 1;

    this.layer.innerHTML = `
      <div class="mobile-front-backdrop"></div>
      <div class="guided-tour-frame">
        <div class="guided-tour-sheet">
          <div class="guided-tour-header">
            <div>
              <div class="guided-tour-kicker">Sweet Land Quick Tour</div>
              <div class="guided-tour-step">Portal ${this.currentIndex + 1} of ${PORTFOLIO_SECTIONS.length}</div>
            </div>
            <div class="guided-tour-stamps" aria-label="Candy stamp progress">
              ${PORTFOLIO_SECTIONS.map((item, itemIndex) => {
                const earned = this.earned.has(item.id);
                const current = itemIndex === this.currentIndex;
                return `
                  <span class="guided-tour-stamp${earned ? " is-earned" : ""}${current ? " is-current" : ""}" aria-hidden="true">
                    <span class="guided-tour-stamp-core"></span>
                  </span>
                `;
              }).join("")}
            </div>
          </div>
          <div class="guided-tour-body">
            <div class="guided-tour-chip">Candy stamp collected</div>
            <h2 class="guided-tour-title">${escapeHtml(section.title)}</h2>
            <p class="guided-tour-description">${escapeHtml(section.description)}</p>
            <p class="guided-tour-story">${escapeHtml(copy.story)}</p>
            ${copy.npc ? `<p class="guided-tour-flavor">${escapeHtml(copy.npc)}</p>` : ""}
          </div>
          <div class="guided-tour-actions">
            <button class="guided-tour-primary" type="button" data-guided-tour-action="open">Open Page</button>
            <button class="guided-tour-secondary" type="button" data-guided-tour-action="next">${isLast ? "Complete Tour" : "Next Portal"}</button>
          </div>
        </div>
      </div>
    `;
  }

  private showCompletion(): void {
    this.showingCompletion = true;
    this.layer.classList.remove("hidden");
    this.root.classList.remove("hidden");
    this.layer.innerHTML = `
      <div class="mobile-front-backdrop"></div>
      <div class="guided-tour-frame">
        <div class="guided-tour-sheet guided-tour-sheet-finale">
          <div class="guided-tour-header">
            <div>
              <div class="guided-tour-kicker">Tour Complete</div>
              <div class="guided-tour-step">All ${PORTFOLIO_SECTIONS.length} candy stamps collected</div>
            </div>
            <div class="guided-tour-stamps" aria-label="Candy stamp progress">
              ${PORTFOLIO_SECTIONS.map(
                () => `
                  <span class="guided-tour-stamp is-earned" aria-hidden="true">
                    <span class="guided-tour-stamp-core"></span>
                  </span>
                `
              ).join("")}
            </div>
          </div>
          <div class="guided-tour-body">
            <div class="guided-tour-chip guided-tour-chip-finale">Sweet Land celebrates you</div>
            <h2 class="guided-tour-title">You completed the Sweet Land tour</h2>
            <p class="guided-tour-story">The castle gates are open, the candy stamps are glowing, and the next best stop is Contact if you want to keep the journey going with Chloe.</p>
          </div>
          <div class="guided-tour-actions guided-tour-actions-stacked">
            <button class="guided-tour-primary" type="button" data-guided-tour-action="contact">Open Contact</button>
            <button class="guided-tour-secondary" type="button" data-guided-tour-action="replay">Replay Tour</button>
            <button class="guided-tour-secondary" type="button" data-guided-tour-action="explore">Explore Mode</button>
          </div>
        </div>
      </div>
    `;
  }

  private onClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const action = target?.closest<HTMLElement>("[data-guided-tour-action]")?.dataset.guidedTourAction;
    if (!action) return;

    if (this.showingCompletion) {
      switch (action) {
        case "contact":
          this.callbacks.onOpenSection("contact");
          return;
        case "replay":
          this.start(0);
          return;
        case "explore":
          this.hide();
          this.callbacks.onExploreMode();
          return;
        default:
          return;
      }
    }

    const section = PORTFOLIO_SECTIONS[this.currentIndex];
    if (!section) return;

    switch (action) {
      case "open":
        this.callbacks.onOpenSection(section.id);
        return;
      case "next":
        if (this.currentIndex >= PORTFOLIO_SECTIONS.length - 1) {
          this.showCompletion();
        } else {
          this.showStop(this.currentIndex + 1);
        }
        return;
      default:
        return;
    }
  };

  private hasVisibleSibling(): boolean {
    return Array.from(this.root.children).some((child) => {
      if (child === this.layer) return false;
      return !child.classList.contains("hidden");
    });
  }
}
