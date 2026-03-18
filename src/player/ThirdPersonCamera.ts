import * as THREE from "three";
import { clamp } from "../core/clamp";

const FIXED_PITCH = -0.15;
const DESKTOP_MANUAL_ORBIT_COOLDOWN = 1.05;
const DESKTOP_FORWARD_INTENT_THRESHOLD = 0.08;
const DESKTOP_BACKWARD_INTENT_THRESHOLD = -0.35;
const DESKTOP_DIRECTION_CHANGE_THRESHOLD = 0.16;
const DESKTOP_STRAFE_ONLY_THRESHOLD = 0.42;
const DESKTOP_YAW_FOLLOW_SHARPNESS = 0.0009;
const DESKTOP_YAW_BACKPEDAL_SHARPNESS = 0.01;
const DESKTOP_YAW_RECENTER_SHARPNESS = 0.004;
const DESKTOP_IDLE_RECENTER_SHARPNESS = 0.03;

export type CameraFollowState = {
  facingYaw: number;
  lastMoveWorld: THREE.Vector3;
  lastNonZeroMoveYaw: number;
  hasMeaningfulMovement: boolean;
  moveInputForward: number;
  moveInputRight: number;
};

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function angleDelta(from: number, to: number): number {
  return wrapAngle(to - from);
}

function dampFactor(sharpness: number, dt: number): number {
  return 1 - Math.pow(sharpness, dt);
}

export class ThirdPersonCamera {
  // Fixed-pitch third-person camera with optional manual orbit.
  yaw = 0;
  pitch = FIXED_PITCH; // angled down

  // SWEETLAND_CAMERA_COLLISION_V3: prevent walls/terrain from blocking the player (camera push-in)
  private occluders: THREE.Object3D[] = [];
  private ray = new THREE.Raycaster();
  private focusY = 1.0; // focus point above player (meters)
  private padding = 0.25; // how far in front of wall to keep camera (meters)
  private _focus = new THREE.Vector3();
  private _dir = new THREE.Vector3();
  private _tmp = new THREE.Vector3();
  private desiredPos = new THREE.Vector3();
  private targetYaw = 0;
  private lastAutoFollowYaw = 0;
  private manualOrbitCooldown = 0;
  private desktopAutoFollowEnabled = true;
  private feelProfile: "desktop" | "mobile" = "desktop";
  private hasCameraState = false;

  setOccluders(objs: THREE.Object3D[]): void {
    this.occluders = Array.isArray(objs) ? objs : [];
  }

  distance = 8.2;
  height = 3.0;
  lookSensitivity = 0.0024;
  followSharpness = 0.001;

  private camPos = new THREE.Vector3();
  private targetPos = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera) {}

  updateFromMouse(dx: number, dy: number): void {
    this.yaw -= dx * this.lookSensitivity;
    this.pitch -= dy * this.lookSensitivity;
    this.pitch = clamp(this.pitch, FIXED_PITCH, FIXED_PITCH);
    this.targetYaw = this.yaw;

    if (this.desktopAutoFollowEnabled && (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001)) {
      this.manualOrbitCooldown = DESKTOP_MANUAL_ORBIT_COOLDOWN;
    }
  }

  applyFeelProfile(kind: "desktop" | "mobile"): void {
    this.feelProfile = kind;
    this.pitch = FIXED_PITCH;

    if (kind === "mobile") {
      this.distance = 7.1;
      this.height = 2.7;
      this.lookSensitivity = 0.0036;
      this.followSharpness = 0.00014;
      this.desktopAutoFollowEnabled = false;
      this.manualOrbitCooldown = 0;
      this.targetYaw = this.yaw;
      this.lastAutoFollowYaw = this.yaw;
      return;
    }

    this.distance = 8.2;
    this.height = 3.0;
    this.lookSensitivity = 0.0024;
    this.followSharpness = 0.001;
    this.desktopAutoFollowEnabled = true;
    this.targetYaw = this.yaw;
    this.lastAutoFollowYaw = this.yaw;
  }

  update(targetWorldPos: THREE.Vector3, dt: number, followState?: CameraFollowState): void {
    if (this.desktopAutoFollowEnabled && this.feelProfile === "desktop" && followState) {
      this.updateDesktopAutoFollow(dt, followState);
    }

    this.targetPos.copy(targetWorldPos).add(new THREE.Vector3(0, 1.2, 0));

    const x = Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
    const y = Math.sin(this.pitch) * this.distance + this.height;
    const z = Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;

    this.desiredPos.copy(this.targetPos).add(new THREE.Vector3(x, y, z));

    if (!this.hasCameraState) {
      this.camPos.copy(this.desiredPos);
      this.hasCameraState = true;
    } else {
      const k = dampFactor(this.followSharpness, dt);
      this.camPos.lerp(this.desiredPos, k);
    }

    this.camera.position.copy(this.camPos);

    if (this.occluders && this.occluders.length) {
      this._focus.copy(this.targetPos);
      this._focus.y += this.focusY;

      this._dir.subVectors(this.camera.position, this._focus);
      const dist = this._dir.length();

      if (dist > 0.001) {
        this._dir.multiplyScalar(1.0 / dist);
        this.ray.set(this._focus, this._dir);
        this.ray.far = dist;

        const hits = this.ray.intersectObjects(this.occluders, true);
        if (hits && hits.length) {
          this._tmp.copy(hits[0].point).addScaledVector(this._dir, -this.padding);

          const minDist = 0.65;
          if (this._tmp.distanceTo(this._focus) < minDist) {
            this._tmp.copy(this._focus).addScaledVector(this._dir, minDist);
          }

          const a = clamp(dt * 12, 0, 1);
          this.camera.position.lerp(this._tmp, a);
        }
      }
    }

    this.camera.lookAt(this.targetPos);
  }

  syncFromCamera(): void {
    this.camPos.copy(this.camera.position);
    this.hasCameraState = true;

    this._tmp.subVectors(this.camera.position, this.targetPos);
    if (this._tmp.x * this._tmp.x + this._tmp.z * this._tmp.z > 0.0001) {
      this.yaw = Math.atan2(this._tmp.x, this._tmp.z);
      this.targetYaw = this.yaw;
      this.lastAutoFollowYaw = this.yaw;
    }
  }

  private updateDesktopAutoFollow(dt: number, followState: CameraFollowState): void {
    this.manualOrbitCooldown = Math.max(0, this.manualOrbitCooldown - dt);

    const followTarget = this.getDesktopFollowTarget(followState);
    if (!followTarget) {
      return;
    }

    this.lastAutoFollowYaw = followTarget.yaw;
    if (this.manualOrbitCooldown > 0) {
      return;
    }

    this.targetYaw = followTarget.yaw;
    this.yaw = wrapAngle(
      this.yaw + angleDelta(this.yaw, this.targetYaw) * dampFactor(followTarget.sharpness, dt)
    );
  }

  private getDesktopFollowTarget(
    followState: CameraFollowState
  ): { yaw: number; sharpness: number } | null {
    const desiredYaw = wrapAngle(
      (followState.hasMeaningfulMovement ? followState.lastNonZeroMoveYaw : followState.facingYaw) + Math.PI
    );
    const yawGap = Math.abs(angleDelta(this.yaw, desiredYaw));

    if (!followState.hasMeaningfulMovement) {
      return yawGap < 0.02 ? null : { yaw: desiredYaw, sharpness: DESKTOP_IDLE_RECENTER_SHARPNESS };
    }

    const absForward = Math.abs(followState.moveInputForward);
    const absStrafe = Math.abs(followState.moveInputRight);
    const strafeOnly =
      absStrafe >= DESKTOP_STRAFE_ONLY_THRESHOLD && absForward < DESKTOP_FORWARD_INTENT_THRESHOLD;

    if (strafeOnly) {
      return yawGap < 0.18 ? { yaw: desiredYaw, sharpness: DESKTOP_YAW_RECENTER_SHARPNESS } : null;
    }

    const directionalChange = absStrafe >= DESKTOP_DIRECTION_CHANGE_THRESHOLD;

    if (followState.moveInputForward >= DESKTOP_FORWARD_INTENT_THRESHOLD) {
      return { yaw: desiredYaw, sharpness: DESKTOP_YAW_FOLLOW_SHARPNESS };
    }

    if (directionalChange) {
      return { yaw: desiredYaw, sharpness: DESKTOP_YAW_RECENTER_SHARPNESS };
    }

    if (followState.moveInputForward <= DESKTOP_BACKWARD_INTENT_THRESHOLD) {
      if (yawGap < 0.65) {
        return { yaw: desiredYaw, sharpness: DESKTOP_YAW_BACKPEDAL_SHARPNESS };
      }
      return null;
    }

    if (absStrafe > 0.12 && yawGap < 0.3) {
      return { yaw: desiredYaw, sharpness: DESKTOP_YAW_RECENTER_SHARPNESS };
    }

    if (absForward >= 0.04 || yawGap < 0.45) {
      return { yaw: desiredYaw, sharpness: DESKTOP_YAW_RECENTER_SHARPNESS };
    }

    return null;
  }
}
