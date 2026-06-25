/**
 * HorizonSystemModel.ts
 *
 * Model for the Horizon System screen. It owns its own {@link SkyModel} (the
 * shared astronomy state) — screens are independent, so this latitude/time/star
 * state is not shared with the other screens.
 */
import type { TModel } from "scenerystack/joist";
import { SkyModel, type SkyModelOptions } from "../../common/model/SkyModel.js";

export class HorizonSystemModel implements TModel {
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
