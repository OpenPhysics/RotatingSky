/**
 * SkyProjection.ts
 *
 * Orthographic 3-D → 2-D projector shared by every sky view. It owns the camera
 * orientation (azimuth + elevation, adjusted by drag-to-rotate) and turns unit
 * vectors on the sphere into screen points.
 *
 * The camera frame is: screen-right = −X′, toward-viewer = Y′, screen-up = Z′.
 * A world point `p` is rotated by the view matrix, then:
 *   screenX = center.x − p′.x · radius
 *   screenY = center.y − p′.z · radius        (screen Y grows downward)
 *   depth   = p′.y                            (≥ 0 ⇒ front hemisphere)
 *
 * Screen-right is −X′ (not +X′) so the (right, up, toward-viewer) frame is
 * right-handed: an orthographic +X′ mapping would mirror the scene, which is
 * invisible on symmetric content but flips the chiral Earth globe east↔west.
 *
 * Views observe `viewMatrixProperty` to redraw when the camera moves, and call
 * `projectWithDepth()` so a single rotation drives both position and front/back
 * occlusion (solid vs. dashed strokes).
 */

import { DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { clamp, Matrix3, Vector2, Vector3 } from "scenerystack/dot";

export type ProjectedPoint = { point: Vector2; depth: number };

export type SkyProjectionOptions = {
  /** Screen-space center of the sphere. */
  center?: Vector2;
  /** Screen-space radius of the sphere, in pixels. */
  radius?: number;
  /** Initial camera spin about the vertical axis, radians. */
  azimuth?: number;
  /** Initial camera tilt, radians (negative looks down onto the sphere). */
  elevation?: number;
};

// The camera tilt is clamped just shy of the poles so the sphere never flips.
const MAX_ELEVATION = Math.PI / 2 - 1e-3;

export class SkyProjection {
  public center: Vector2;
  public radius: number;

  /** Camera spin about the world vertical axis (Z). Adjusted by horizontal drag. */
  public readonly azimuthProperty: NumberProperty;
  /** Camera tilt about the screen-right axis (X). Adjusted by vertical drag. */
  public readonly elevationProperty: NumberProperty;

  /**
   * A reference-frame rotation applied to every world point *before* the camera.
   * Defaults to identity; the Celestial Sphere screen animates it to morph
   * smoothly between the equatorial and horizon orientations.
   */
  public readonly frameMatrixProperty: Property<Matrix3>;

  /** Full rotation (camera ∘ frame) applied to every world point before projection. */
  public readonly viewMatrixProperty: TReadOnlyProperty<Matrix3>;

  public constructor(providedOptions?: SkyProjectionOptions) {
    const options = {
      center: new Vector2(0, 0),
      radius: 150,
      azimuth: 0,
      elevation: 0,
      ...providedOptions,
    };

    this.center = options.center;
    this.radius = options.radius;
    this.azimuthProperty = new NumberProperty(options.azimuth);
    this.elevationProperty = new NumberProperty(options.elevation);
    this.frameMatrixProperty = new Property(Matrix3.identity());

    this.viewMatrixProperty = new DerivedProperty(
      [this.azimuthProperty, this.elevationProperty, this.frameMatrixProperty],
      (azimuth, elevation, frame) =>
        // Apply the frame rotation, then spin about world Z, then pitch about X.
        Matrix3.rotationX(elevation).timesMatrix(Matrix3.rotationZ(azimuth)).timesMatrix(frame),
    );
  }

  /** Projects a unit/world vector to screen space and reports its camera-space depth. */
  public projectWithDepth(point: Vector3): ProjectedPoint {
    const p = this.viewMatrixProperty.value.timesVector3(point);
    return {
      point: new Vector2(this.center.x - p.x * this.radius, this.center.y - p.z * this.radius),
      depth: p.y,
    };
  }

  /** Projects a unit/world vector to a screen point. */
  public project(point: Vector3): Vector2 {
    return this.projectWithDepth(point).point;
  }

  /** True when `point` is on the hemisphere facing the viewer (not occluded). */
  public isFrontFacing(point: Vector3): boolean {
    return this.viewMatrixProperty.value.timesVector3(point).y >= 0;
  }

  /**
   * Inverse of {@link project}: maps a screen point back to a unit vector on the
   * front hemisphere. Points outside the projected disc are clamped to the limb.
   * The view matrix is a pure rotation, so its inverse is its transpose.
   */
  public unproject(screenPoint: Vector2): Vector3 {
    const x = (this.center.x - screenPoint.x) / this.radius;
    const z = (this.center.y - screenPoint.y) / this.radius;
    const r2 = x * x + z * z;
    let cam: Vector3;
    if (r2 > 1) {
      const s = 1 / Math.sqrt(r2);
      cam = new Vector3(x * s, 0, z * s); // on the limb (depth 0)
    } else {
      cam = new Vector3(x, Math.sqrt(1 - r2), z); // front hemisphere
    }
    return this.viewMatrixProperty.value.transposed().timesVector3(cam);
  }

  /** Adjusts the camera by drag deltas (radians), clamping elevation. */
  public rotateBy(deltaAzimuth: number, deltaElevation: number): void {
    this.azimuthProperty.value += deltaAzimuth;
    this.elevationProperty.value = clamp(this.elevationProperty.value + deltaElevation, -MAX_ELEVATION, MAX_ELEVATION);
  }

  /**
   * Spins the camera about the world vertical (zenith / NCP) axis only, leaving
   * the tilt unchanged. Activated by Alt-drag in the screen views — the NAAP
   * "rotate about zenith" mode.
   */
  public rotateAboutZenith(deltaAzimuth: number): void {
    this.azimuthProperty.value += deltaAzimuth;
  }

  /** Restores the camera and frame to their initial orientation. */
  public reset(): void {
    this.azimuthProperty.reset();
    this.elevationProperty.reset();
    this.frameMatrixProperty.reset();
  }

  public dispose(): void {
    this.viewMatrixProperty.dispose();
    this.azimuthProperty.dispose();
    this.elevationProperty.dispose();
    this.frameMatrixProperty.dispose();
  }
}
