/**
 * HorizonSystemModel.ts
 *
 * Model for the Horizon System screen. It owns its own {@link SkyModel} (the
 * shared astronomy state) — screens are independent, so this latitude/time/star
 * state is not shared with the other screens.
 *
 * Screen-only state: which presentation to show (dome diagram / first-person
 * sky / both) and which cardinal direction the sky view faces.
 */
import { EnumerationProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { SkyModel, type SkyModelOptions } from "../../common/model/SkyModel.js";
import { ViewDirection } from "../../common/model/ViewDirection.js";
import { HorizonViewMode } from "./HorizonViewMode.js";

export class HorizonSystemModel implements TModel {
  /** Shared astronomy state (observer location, sidereal time, stars, toggles). */
  public readonly sky: SkyModel;

  /** Dome diagram, first-person sky, or both. */
  public readonly viewModeProperty = new EnumerationProperty(HorizonViewMode.DIAGRAM);

  /** Cardinal facing for the first-person sky view (and dome snap). */
  public readonly viewDirectionProperty = new EnumerationProperty(ViewDirection.EAST);

  public constructor(options: SkyModelOptions) {
    this.sky = new SkyModel(options);
  }

  public reset(): void {
    this.sky.reset();
    this.viewModeProperty.reset();
    this.viewDirectionProperty.reset();
  }

  public step(dt: number): void {
    this.sky.step(dt);
  }
}
