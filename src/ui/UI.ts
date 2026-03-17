import { setHidden, qs } from "../core/dom";
import type { PortfolioSectionId } from "../config/portfolio";
import { PORTFOLIO_SECTIONS } from "../config/portfolio";
import type { DeviceProfile } from "../core/DeviceProfile";

export class UI {
  private coinCountEl = qs<HTMLSpanElement>("#coinCount");
  private promptEl = qs<HTMLDivElement>("#prompt");
  private promptCard = qs<HTMLButtonElement>("#promptCard");
  private promptTitleEl = qs<HTMLDivElement>("#promptTitle");
  private promptHintEl = qs<HTMLDivElement>("#promptHint");

  private panelEl = qs<HTMLDivElement>("#panel");
  private panelTitle = qs<HTMLDivElement>("#panelTitle");
  private panelDesc = qs<HTMLDivElement>("#panelDesc");
  private panelIframe = qs<HTMLIFrameElement>("#panelIframe");
  private panelIframeWrap = qs<HTMLDivElement>("#panelIframeWrap");
  private panelOpenLink = qs<HTMLAnchorElement>("#panelOpenLink");
  private panelEmbedNote = qs<HTMLDivElement>("#panelEmbedNote");
  private panelLoadTimer: number | null = null;

  private dialogueEl = qs<HTMLDivElement>("#dialogue");
  private dialogueName = qs<HTMLDivElement>("#dialogueName");
  private dialogueMeta = qs<HTMLDivElement>("#dialogueMeta");
  private dialogueBody = qs<HTMLDivElement>("#dialogueBody");
  private dialogueNext = qs<HTMLButtonElement>("#dialogueNext");
  private dialogueClose = qs<HTMLButtonElement>("#dialogueClose");

  private loadingEl = qs<HTMLDivElement>("#loading");
  private loadingCard = qs<HTMLDivElement>("#loadingCard");
  private loadingTitle = qs<HTMLDivElement>("#loadingTitle");
  private loadingSub = qs<HTMLDivElement>("#loadingSub");
  private loadingProgress = qs<HTMLDivElement>("#loadingProgress");
  private helpText = qs<HTMLDivElement>("#helpText");
  private resetCoinsBtn = qs<HTMLButtonElement>("#resetCoinsBtn");

  private _coins = 0;
  private isMobileExperience = false;
  private isPortrait = false;

  // Dialogue
  private lines: string[] = [];
  private lineIndex = 0;

  onClosePanel: (() => void) | null = null;
  onCloseDialogue: (() => void) | null = null;
  onPromptAction: (() => void) | null = null;

  constructor() {
    // Panel close
    qs<HTMLButtonElement>("#panelClose").addEventListener("click", () => this.closePanel());

    // SWEETLAND_PORTALS_PANEL_LABELS_V1
    // Make the close buttons advertise the Esc key.
    try {
      qs<HTMLButtonElement>("#panelClose").textContent = "Esc";
      this.dialogueClose.textContent = "Esc";
    } catch {}


    // Dialogue controls
    this.dialogueNext.addEventListener("click", () => this.nextLine());
    this.dialogueClose.addEventListener("click", () => this.closeDialogue());
    this.dialogueBody.addEventListener("click", () => this.nextLine());
    // Hint the actual keybinding.
    this.dialogueClose.textContent = "Escape";
    this.promptCard.addEventListener("click", () => this.onPromptAction?.());
    this.promptCard.addEventListener("pointerdown", (e) => e.stopPropagation());

    // Keyboard: Esc closes panel/dialogue
    window.addEventListener("keydown", (e) => {
      if (e.code === "Escape") {
        if (!this.panelEl.classList.contains("hidden")) this.closePanel();
        if (!this.dialogueEl.classList.contains("hidden")) this.closeDialogue();
      }
    });
  }

  applyDeviceProfile(profile: DeviceProfile): void {
    this.isMobileExperience = profile.isMobileExperience;
    this.isPortrait = profile.isPortrait;

    document.body.classList.toggle("ui-mobile", profile.isMobileExperience);
    document.body.classList.toggle("ui-portrait", profile.isPortrait);

    this.promptCard.disabled = !profile.isMobileExperience;
    this.loadingCard.dataset.mode = profile.isMobileExperience ? "mobile" : "desktop";
    this.resetCoinsBtn.textContent = profile.isMobileExperience ? "Reset" : "Reset Collectibles";

    if (profile.isMobileExperience) {
      this.loadingTitle.textContent = "Tap to Enter Sweet Land";
      this.loadingSub.innerHTML =
        "Move with the joystick. Drag the right side to look.<br>Tap the middle of the joystick to jump. Use the action button to talk and enter portals.";
      this.helpText.innerHTML =
        '<span class="kbd">Drag</span> look · <span class="kbd">Stick</span> move · <span class="kbd">Stick center</span> jump · <span class="kbd">Action</span> talk / enter';
      this.promptHintEl.textContent = "Tap to interact";
      this.panelEmbedNote.textContent = "Open the page for the full portal destination.";
    } else {
      this.loadingTitle.textContent = "Welcome to the Chloeverse!";
      this.loadingSub.innerHTML =
        'Click anywhere to start (this locks your mouse so you can look around)<br>Press <span class="kbd">Esc</span> anytime to unlock your mouse / get your cursor back';
      this.helpText.innerHTML =
        '<span class="kbd">WASD</span> move · <span class="kbd">Shift</span> run · <span class="kbd">Space</span> jump (double) · <span class="kbd">E</span> interact · <span class="kbd">1–4</span> portals · <span id="musicHint"><span class="kbd">M</span> mute</span> · <span class="kbd">Esc</span> close';
      this.promptHintEl.innerHTML = '<span class="kbd">E</span> interact';
      this.panelEmbedNote.textContent = "If the preview is blocked, open the page in a new tab.";
    }
  }

  setCoins(n: number): void {
    this._coins = n;
    this.coinCountEl.textContent = String(n);
  }

  get coins(): number {
    return this._coins;
  }

  showPrompt(title: string | null, hint?: string | null): void {
    if (!title) {
      setHidden(this.promptEl, true);
      return;
    }
    this.promptTitleEl.textContent = title;
    if (hint) {
      this.promptHintEl.textContent = hint;
    } else if (this.isMobileExperience) {
      this.promptHintEl.textContent = "Tap to interact";
    } else {
      this.promptHintEl.innerHTML = '<span class="kbd">E</span> interact';
    }
    setHidden(this.promptEl, false);
  }

  openSection(id: PortfolioSectionId): void {
    const sec = PORTFOLIO_SECTIONS.find((s) => s.id === id);
    if (!sec) return;

    this.panelTitle.textContent = sec.title;
    this.panelDesc.textContent = sec.description;
    this.panelOpenLink.href = sec.url;
    this.panelOpenLink.textContent = this.isMobileExperience ? "Open Page" : "Open in new tab";

    // Embeds can be blocked by X-Frame-Options/CSP. We still try.
    const embed = sec.embedUrl ?? sec.url;
    const shouldShowEmbed = !this.isMobileExperience;
    this.clearPanelLoadState();
    setHidden(this.panelIframeWrap, !shouldShowEmbed);
    setHidden(this.panelEmbedNote, this.isMobileExperience);

    if (shouldShowEmbed) {
      this.panelEmbedNote.textContent = "Preview loading...";
      const handleLoaded = () => {
        this.clearPanelLoadState();
        setHidden(this.panelIframeWrap, false);
        setHidden(this.panelEmbedNote, true);
      };
      const handleFallback = () => {
        this.clearPanelLoadState();
        setHidden(this.panelIframeWrap, true);
        this.panelEmbedNote.textContent = "Preview unavailable here. Open the page in a new tab.";
        setHidden(this.panelEmbedNote, false);
      };

      this.panelIframe.onload = handleLoaded;
      this.panelIframe.onerror = handleFallback;
      this.panelLoadTimer = window.setTimeout(handleFallback, 2600);
      this.panelIframe.src = embed;
    } else {
      this.panelIframe.src = "about:blank";
      this.panelEmbedNote.textContent = "Open the page for the full portal destination.";
      setHidden(this.panelEmbedNote, false);
    }

    setHidden(this.panelEl, false);
  }

  closePanel(): void {
    setHidden(this.panelEl, true);
    // Stop loading remote pages in the background.
    this.clearPanelLoadState();
    this.panelIframe.src = "about:blank";
    this.onClosePanel?.();
  }

  openDialogue(npcName: string, lines: string[]): void {
    this.lines = lines;
    this.lineIndex = 0;

    this.dialogueName.textContent = npcName;
    this.dialogueMeta.textContent = this.isMobileExperience ? "Tap the card to continue" : "";
    this.renderLine();

    setHidden(this.dialogueEl, false);
  }

  private renderLine(): void {
    const line = this.lines[this.lineIndex] ?? "";
    this.dialogueBody.textContent = line;    const isLast = this.lineIndex >= this.lines.length - 1;
    setHidden(this.dialogueNext, isLast);
    if (!isLast) this.dialogueNext.textContent = "Next";
  }

  private nextLine(): void {
    if (this.lineIndex >= this.lines.length - 1) {
      this.closeDialogue();
      return;
    }
    this.lineIndex++;
    this.renderLine();
  }

  closeDialogue(): void {
    setHidden(this.dialogueEl, true);
    this.onCloseDialogue?.();
  }

  setLoading(visible: boolean): void {
    setHidden(this.loadingEl, !visible);
  }

  setLoadingProgress(pct: number): void {
    this.loadingProgress.textContent = `${Math.round(pct)}%`;
  }

  isPanelOpen(): boolean {
    return !this.panelEl.classList.contains("hidden");
  }

  isDialogueOpen(): boolean {
    return !this.dialogueEl.classList.contains("hidden");
  }

  private clearPanelLoadState(): void {
    if (this.panelLoadTimer !== null) {
      window.clearTimeout(this.panelLoadTimer);
      this.panelLoadTimer = null;
    }
    this.panelIframe.onload = null;
    this.panelIframe.onerror = null;
  }
}
