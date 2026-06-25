/**
 * ExplorerModel.ts
 *
 * Model for the Explorer screen — the combined, interactive rotating-sky
 * explorer. Owns its own {@link SkyModel}; the flat Earth map, celestial sphere,
 * and horizon diagram in the view are all linked through this single instance.
 */
import type { TModel } from "scenerystack/joist";
import { SkyModel, type SkyModelOptions } from "../../common/model/SkyModel.js";

export class ExplorerModel implements TModel {
  /** Shared astronomy state (observer location, sidereal time, stars, toggles). */
  public readonly sky: SkyModel;

  public constructor(options: SkyModelOptions) {
    this.sky = new SkyModel(options);
  }

  public reset(): void {
    this.sky.reset();
  }

  public step(dt: number): void {
    this.sky.step(dt);
  }
}
