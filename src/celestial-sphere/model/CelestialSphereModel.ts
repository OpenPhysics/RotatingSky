/**
 * CelestialSphereModel.ts
 *
 * Model for the Celestial Sphere screen. Owns its own {@link SkyModel} plus a
 * "system blend" Property used by the view to morph smoothly between the
 * celestial-sphere view (0) and the horizon view (1).
 */
import { NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { SkyModel, type SkyModelOptions } from "../../common/model/SkyModel.js";

export class CelestialSphereModel implements TModel {
  /** Shared astronomy state (observer location, sidereal time, stars, toggles). */
  public readonly sky: SkyModel;

  /** 0 = celestial-sphere view, 1 = horizon view; animated by the view via twixt. */
  public readonly systemBlendProperty = new NumberProperty(0, { range: new Range(0, 1) });

  public constructor(options: SkyModelOptions) {
    this.sky = new SkyModel(options);
  }

  public reset(): void {
    this.sky.reset();
    this.systemBlendProperty.reset();
  }

  public step(dt: number): void {
    this.sky.step(dt);
  }
}
