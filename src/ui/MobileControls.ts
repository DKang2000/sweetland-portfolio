import type { PortfolioSectionId } from "../config/portfolio";
import type { DeviceProfile } from "../core/DeviceProfile";
import { qs, setHidden } from "../core/dom";
import { InputActions } from "../core/InputActions";

type MobileActionState = {
  label: string;
  visible: boolean;
};

const JOYSTICK_DEAD_ZONE = 0.1;
const JOYSTICK_TAP_TRAVEL = 14;
const JOYSTICK_TAP_MS = 180;
const JOYSTICK_EARLY_JUMP_MS = 95;
const JOYSTICK_JUMP_COOLDOWN_MS = 220;

export class MobileControls {
  private root = qs<HTMLDivElement>("#mobileControls");
  private joystick = qs<HTMLDivElement>("#mobileJoystick");
  private joystickKnob = qs<HTMLDivElement>("#mobileJoystickKnob");
  private actionButton = qs<HTMLButtonElement>("#mobileActionButton");
  private lookRegion = qs<HTMLDivElement>("#mobileLookRegion");
  private portalsButton = qs<HTMLButtonElement>("#mobilePortalsButton");
  private muteButton = qs<HTMLButtonElement>("#mobileMuteButton");
  private respawnButton = qs<HTMLButtonElement>("#mobileRespawnButton");
  private qualityButton = qs<HTMLButtonElement>("#mobileQualityButton");
  private minimapButton = qs<HTMLButtonElement>("#mobileMinimapButton");
  private resetButton = qs<HTMLButtonElement>("#mobileResetButton");
  private drawer = qs<HTMLDivElement>("#mobilePortalDrawer");
  private drawerBackdrop = qs<HTMLButtonElement>("#mobilePortalDrawerBackdrop");
  private drawerClose = qs<HTMLButtonElement>("#mobilePortalDrawerClose");
  private portalButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-portal-target]")
  );

  onAction: (() => void) | null = null;
  onMute: (() => void) | null = null;
  onRespawn: (() => void) | null = null;
  onQualityToggle: (() => void) | null = null;
  onMapToggle: (() => void) | null = null;
  onResetCollectibles: (() => void) | null = null;
  onPortalShortcut: ((section: PortfolioSectionId) => void) | null = null;

  private enabled = false;
  private joystickPointerId: number | null = null;
  private joystickCenterX = 0;
  private joystickCenterY = 0;
  private joystickTapCandidate = false;
  private joystickJumpQueued = false;
  private joystickTouchStart = 0;
  private joystickTravelMax = 0;
  private lastJumpTapAt = 0;
  private joystickEarlyJumpTimer: number | null = null;

  private lookPointerId: number | null = null;
  private lookLastX = 0;
  private lookLastY = 0;

  constructor(private readonly input: InputActions) {
    this.bindEvents();
    this.setEnabled(false);
    this.setActionState({ label: "Talk", visible: false });
  }

  private bindEvents(): void {
    this.joystick.addEventListener("pointerdown", this.onJoystickDown);
    this.actionButton.addEventListener("click", () => this.onAction?.());
    this.portalsButton.addEventListener("click", () => this.toggleDrawer());
    this.muteButton.addEventListener("click", () => this.onMute?.());
    this.respawnButton.addEventListener("click", () => this.onRespawn?.());
    this.qualityButton.addEventListener("click", () => this.onQualityToggle?.());
    this.minimapButton.addEventListener("click", () => this.onMapToggle?.());
    this.resetButton.addEventListener("click", () => this.onResetCollectibles?.());
    this.drawerBackdrop.addEventListener("click", () => this.setDrawerOpen(false));
    this.drawerClose.addEventListener("click", () => this.setDrawerOpen(false));
    this.lookRegion.addEventListener("pointerdown", this.onLookDown);

    for (const button of this.portalButtons) {
      button.addEventListener("click", () => {
        const target = button.dataset.portalTarget as PortfolioSectionId | undefined;
        if (!target) return;
        this.onPortalShortcut?.(target);
        this.setDrawerOpen(false);
      });
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    setHidden(this.root, !enabled);
    if (!enabled) {
      this.setDrawerOpen(false);
      this.releaseJoystick();
      this.releaseLook();
    }
  }

  applyProfile(profile: DeviceProfile): void {
    this.root.dataset.orientation = profile.isPortrait ? "portrait" : "landscape";
    this.root.dataset.compact = profile.isPortraitPrimary ? "1" : "0";
    this.setEnabled(profile.isMobileExperience);
  }

  setActionState(state: MobileActionState): void {
    this.actionButton.textContent = state.label;
    this.actionButton.disabled = !state.visible;
    this.actionButton.classList.toggle("is-active", state.visible);
    this.actionButton.classList.toggle("hidden", !state.visible);
  }

  setMutedState(muted: boolean): void {
    this.muteButton.textContent = muted ? "Sound Off" : "Sound On";
  }

  setLowFxState(lowFx: boolean): void {
    this.qualityButton.textContent = lowFx ? "Low FX" : "High FX";
  }

  setMinimapExpanded(expanded: boolean): void {
    this.minimapButton.textContent = expanded ? "Map On" : "Map Off";
  }

  setGameplayBlocked(blocked: boolean): void {
    this.root.classList.toggle("controls-blocked", blocked);
    if (blocked) {
      this.releaseJoystick();
      this.releaseLook();
    }
  }

  isDrawerOpen(): boolean {
    return !this.drawer.classList.contains("hidden");
  }

  setDrawerOpen(open: boolean): void {
    this.root.classList.toggle("drawer-open", open);
    setHidden(this.drawer, !open);
  }

  private toggleDrawer(): void {
    this.setDrawerOpen(!this.isDrawerOpen());
  }

  private onJoystickDown = (e: PointerEvent): void => {
    if (!this.enabled || this.joystickPointerId !== null) return;
    e.preventDefault();

    this.joystickPointerId = e.pointerId;
    this.joystick.setPointerCapture(e.pointerId);

    const rect = this.joystick.getBoundingClientRect();
    this.joystickCenterX = rect.left + rect.width * 0.5;
    this.joystickCenterY = rect.top + rect.height * 0.5;
    this.joystickTapCandidate = true;
    this.joystickJumpQueued = false;
    this.joystickTouchStart = performance.now();
    this.joystickTravelMax = 0;
    this.clearEarlyJumpTimer();

    this.updateJoystickFromPoint(e.clientX, e.clientY);
    this.joystickEarlyJumpTimer = window.setTimeout(() => {
      if (
        this.joystickPointerId !== null &&
        this.joystickTapCandidate &&
        !this.joystickJumpQueued &&
        performance.now() - this.lastJumpTapAt >= JOYSTICK_JUMP_COOLDOWN_MS
      ) {
        this.joystickJumpQueued = true;
        this.lastJumpTapAt = performance.now();
        this.input.queueJump();
      }
    }, JOYSTICK_EARLY_JUMP_MS);

    this.joystick.addEventListener("pointermove", this.onJoystickMove);
    this.joystick.addEventListener("pointerup", this.onJoystickUp);
    this.joystick.addEventListener("pointercancel", this.onJoystickUp);
  };

  private onJoystickMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.joystickPointerId) return;
    e.preventDefault();
    this.updateJoystickFromPoint(e.clientX, e.clientY);
  };

  private onJoystickUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.joystickPointerId) return;
    e.preventDefault();

    const elapsed = performance.now() - this.joystickTouchStart;
    const canTriggerJump =
      this.joystickTapCandidate &&
      !this.joystickJumpQueued &&
      elapsed <= JOYSTICK_TAP_MS &&
      this.joystickTravelMax <= JOYSTICK_TAP_TRAVEL &&
      performance.now() - this.lastJumpTapAt >= JOYSTICK_JUMP_COOLDOWN_MS;

    if (canTriggerJump) {
      this.joystickJumpQueued = true;
      this.lastJumpTapAt = performance.now();
      this.input.queueJump();
    }

    this.releaseJoystick();
  };

  private updateJoystickFromPoint(clientX: number, clientY: number): void {
    const dx = clientX - this.joystickCenterX;
    const dy = clientY - this.joystickCenterY;
    const distance = Math.hypot(dx, dy);
    const maxRadius = this.joystick.clientWidth * 0.34;
    const innerTapRadius = this.joystick.clientWidth * 0.14;

    this.joystickTravelMax = Math.max(this.joystickTravelMax, distance);
    if (distance > innerTapRadius) {
      this.joystickTapCandidate = false;
      this.clearEarlyJumpTimer();
    }

    let normX = 0;
    let normY = 0;
    let knobX = 0;
    let knobY = 0;

    if (distance > 0.001) {
      const clamped = Math.min(distance, maxRadius);
      knobX = (dx / distance) * clamped;
      knobY = (dy / distance) * clamped;

      const strength = clamped / maxRadius;
      if (strength >= JOYSTICK_DEAD_ZONE) {
        const eased = (strength - JOYSTICK_DEAD_ZONE) / (1 - JOYSTICK_DEAD_ZONE);
        normX = (dx / distance) * eased;
        normY = (-dy / distance) * eased;
      }
    }

    this.input.setMobileMove(normX, normY);
    this.joystickKnob.style.transform = `translate(${knobX.toFixed(1)}px, ${knobY.toFixed(1)}px)`;
    this.joystick.classList.toggle("is-active", Math.abs(normX) > 0.001 || Math.abs(normY) > 0.001);
  }

  private releaseJoystick(): void {
    if (this.joystickPointerId !== null) {
      try {
        this.joystick.releasePointerCapture(this.joystickPointerId);
      } catch {
        // ignore
      }
    }

    this.joystickPointerId = null;
    this.joystickTapCandidate = false;
    this.joystickJumpQueued = false;
    this.clearEarlyJumpTimer();
    this.input.clearMobileMove();
    this.joystickKnob.style.transform = "translate(0px, 0px)";
    this.joystick.classList.remove("is-active");
    this.joystick.removeEventListener("pointermove", this.onJoystickMove);
    this.joystick.removeEventListener("pointerup", this.onJoystickUp);
    this.joystick.removeEventListener("pointercancel", this.onJoystickUp);
  }

  private clearEarlyJumpTimer(): void {
    if (this.joystickEarlyJumpTimer !== null) {
      window.clearTimeout(this.joystickEarlyJumpTimer);
      this.joystickEarlyJumpTimer = null;
    }
  }

  private onLookDown = (e: PointerEvent): void => {
    if (!this.enabled || this.lookPointerId !== null) return;
    if ((e.target as HTMLElement).closest(".mobile-button, .mobile-drawer")) return;

    e.preventDefault();
    this.lookPointerId = e.pointerId;
    this.lookLastX = e.clientX;
    this.lookLastY = e.clientY;
    this.lookRegion.setPointerCapture(e.pointerId);
    this.input.setTouchLookActive(true);

    this.lookRegion.addEventListener("pointermove", this.onLookMove);
    this.lookRegion.addEventListener("pointerup", this.onLookUp);
    this.lookRegion.addEventListener("pointercancel", this.onLookUp);
  };

  private onLookMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.lookPointerId) return;
    e.preventDefault();

    const dx = e.clientX - this.lookLastX;
    const dy = e.clientY - this.lookLastY;
    this.lookLastX = e.clientX;
    this.lookLastY = e.clientY;
    this.input.addLookDelta(dx * 1.3, dy * 0.72);
  };

  private onLookUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.lookPointerId) return;
    e.preventDefault();
    this.releaseLook();
  };

  private releaseLook(): void {
    if (this.lookPointerId !== null) {
      try {
        this.lookRegion.releasePointerCapture(this.lookPointerId);
      } catch {
        // ignore
      }
    }

    this.lookPointerId = null;
    this.input.setTouchLookActive(false);
    this.lookRegion.removeEventListener("pointermove", this.onLookMove);
    this.lookRegion.removeEventListener("pointerup", this.onLookUp);
    this.lookRegion.removeEventListener("pointercancel", this.onLookUp);
  }
}
