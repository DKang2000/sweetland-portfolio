import type { PortfolioSectionId } from "../config/portfolio";

export type MoveAxes = {
  x: number;
  y: number;
  strength: number;
};

const VIRTUAL_JUMP_HOLD_MS = 120;

export class InputActions {
  private keys = new Set<string>();
  private lookDX = 0;
  private lookDY = 0;
  private mobileMoveX = 0;
  private mobileMoveY = 0;
  private mobileMoveActive = false;
  private jumpQueued = 0;
  private jumpVirtualHeldUntil = 0;
  private interactQueued = 0;
  private muteQueued = 0;
  private respawnQueued = 0;
  private resetCollectiblesQueued = 0;
  private qualityQueued = 0;
  private mapQueued = 0;
  private portalQueued: PortfolioSectionId[] = [];
  private touchLookActive = false;
  private mouseDown = false;
  private desktopDragOrbitEnabled = true;
  private desktopOrbitPointerId: number | null = null;
  private desktopOrbitLastX = 0;
  private desktopOrbitLastY = 0;

  constructor(private readonly el: HTMLElement) {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    this.el.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("mousemove", this.onMouseMove, { passive: true });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);

    if (e.repeat) {
      return;
    }

    switch (e.code) {
      case "Space":
        this.queueJump();
        break;
      case "KeyE":
        this.interactQueued++;
        break;
      case "KeyM":
        this.muteQueued++;
        break;
      case "KeyR":
        this.respawnQueued++;
        this.resetCollectiblesQueued++;
        break;
      case "KeyQ":
        this.qualityQueued++;
        break;
      case "Tab":
        e.preventDefault();
        this.mapQueued++;
        break;
      case "Digit1":
        this.portalQueued.push("projects");
        break;
      case "Digit2":
        this.portalQueued.push("collabs");
        break;
      case "Digit3":
        this.portalQueued.push("work");
        break;
      case "Digit4":
        this.portalQueued.push("contact");
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType !== "mouse" || e.button !== 0) {
      return;
    }

    this.mouseDown = true;

    if (!this.desktopDragOrbitEnabled) {
      return;
    }

    this.desktopOrbitPointerId = e.pointerId;
    this.desktopOrbitLastX = e.clientX;
    this.desktopOrbitLastY = e.clientY;

    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerType === "mouse" && (e.button === 0 || e.pointerId === this.desktopOrbitPointerId)) {
      this.mouseDown = false;
    }

    if (e.pointerId !== this.desktopOrbitPointerId) {
      return;
    }

    this.releaseDesktopOrbitDrag();
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.desktopOrbitPointerId) {
      return;
    }

    if ((e.buttons & 1) === 0) {
      this.releaseDesktopOrbitDrag();
      return;
    }

    const dx = e.clientX - this.desktopOrbitLastX;
    const dy = e.clientY - this.desktopOrbitLastY;
    this.desktopOrbitLastX = e.clientX;
    this.desktopOrbitLastY = e.clientY;
    this.lookDX += dx;
    this.lookDY += dy;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (document.pointerLockElement !== this.el) return;
    this.lookDX += e.movementX;
    this.lookDY += e.movementY;
  };

  down(code: string): boolean {
    return this.keys.has(code);
  }

  getMoveAxes(): MoveAxes {
    const keyboardX = (this.keys.has("KeyD") ? 1 : 0) + (this.keys.has("KeyA") ? -1 : 0);
    const keyboardY = (this.keys.has("KeyW") ? 1 : 0) + (this.keys.has("KeyS") ? -1 : 0);

    let x = keyboardX;
    let y = keyboardY;

    if (this.mobileMoveActive) {
      x = this.mobileMoveX;
      y = this.mobileMoveY;
    }

    const strength = Math.min(1, Math.hypot(x, y));
    if (strength > 1) {
      x /= strength;
      y /= strength;
    }

    return { x, y, strength: Math.min(1, Math.hypot(x, y)) };
  }

  isRunHeld(): boolean {
    return this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
  }

  isJumpHeld(): boolean {
    return this.keys.has("Space") || performance.now() < this.jumpVirtualHeldUntil;
  }

  queueJump(): void {
    this.jumpQueued++;
    this.jumpVirtualHeldUntil = performance.now() + VIRTUAL_JUMP_HOLD_MS;
  }

  consumeJumpPressed(): boolean {
    if (this.jumpQueued <= 0) return false;
    this.jumpQueued--;
    return true;
  }

  consumeLookDelta(): { dx: number; dy: number } {
    const dx = this.lookDX;
    const dy = this.lookDY;
    this.lookDX = 0;
    this.lookDY = 0;
    return { dx, dy };
  }

  consumeMouseDelta(): { dx: number; dy: number } {
    return this.consumeLookDelta();
  }

  addLookDelta(dx: number, dy: number): void {
    this.lookDX += dx;
    this.lookDY += dy;
  }

  setTouchLookActive(active: boolean): void {
    this.touchLookActive = active;
  }

  setDesktopDragOrbitEnabled(enabled: boolean): void {
    this.desktopDragOrbitEnabled = enabled;
    if (!enabled) {
      this.releaseDesktopOrbitDrag();
    }
  }

  isTouchLooking(): boolean {
    return this.touchLookActive;
  }

  setMobileMove(x: number, y: number): void {
    this.mobileMoveX = x;
    this.mobileMoveY = y;
    this.mobileMoveActive = Math.abs(x) > 0.001 || Math.abs(y) > 0.001;
  }

  clearMobileMove(): void {
    this.mobileMoveX = 0;
    this.mobileMoveY = 0;
    this.mobileMoveActive = false;
  }

  isMobileMoving(): boolean {
    return this.mobileMoveActive;
  }

  queueInteract(): void {
    this.interactQueued++;
  }

  consumeInteractPressed(): boolean {
    if (this.interactQueued <= 0) return false;
    this.interactQueued--;
    return true;
  }

  queueMute(): void {
    this.muteQueued++;
  }

  consumeMutePressed(): boolean {
    if (this.muteQueued <= 0) return false;
    this.muteQueued--;
    return true;
  }

  queueRespawn(): void {
    this.respawnQueued++;
  }

  consumeRespawnPressed(): boolean {
    if (this.respawnQueued <= 0) return false;
    this.respawnQueued--;
    return true;
  }

  queueResetCollectibles(): void {
    this.resetCollectiblesQueued++;
  }

  consumeResetCollectiblesPressed(): boolean {
    if (this.resetCollectiblesQueued <= 0) return false;
    this.resetCollectiblesQueued--;
    return true;
  }

  queueQualityToggle(): void {
    this.qualityQueued++;
  }

  consumeQualityTogglePressed(): boolean {
    if (this.qualityQueued <= 0) return false;
    this.qualityQueued--;
    return true;
  }

  queueMapToggle(): void {
    this.mapQueued++;
  }

  consumeMapTogglePressed(): boolean {
    if (this.mapQueued <= 0) return false;
    this.mapQueued--;
    return true;
  }

  queuePortalShortcut(section: PortfolioSectionId): void {
    this.portalQueued.push(section);
  }

  consumePortalShortcutRequested(): PortfolioSectionId | null {
    return this.portalQueued.shift() ?? null;
  }

  isMouseDown(): boolean {
    return this.mouseDown;
  }

  private releaseDesktopOrbitDrag(): void {
    if (this.desktopOrbitPointerId !== null) {
      try {
        this.el.releasePointerCapture(this.desktopOrbitPointerId);
      } catch {
        // ignore
      }
    }

    this.desktopOrbitPointerId = null;
  }
}
