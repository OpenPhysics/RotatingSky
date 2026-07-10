/**
 * CelestialSphereModel.ts
 *
 * Model for the Celestial Sphere screen. Owns its own {@link SkyModel} plus a
 * "system blend" Property used by the view to morph smoothly between the
 * celestial-sphere view (0) and the horizon view (1). Also owns the coordinate
 * explorer: a single movable "guide star" positioned by right ascension and
 * declination, shown on demand. Guided-prompt index supports the Switch-style
 * explore questions on this screen.
 */
import { BooleanProperty, NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { SkyModel, type SkyModelOptions } from "../../common/model/SkyModel.js";
import { HOURS_PER_DAY } from "../../common/SkyCoordinates.js";

/** Number of guided explore prompts on the Celestial Sphere screen. */
export const GUIDED_PROMPT_COUNT = 4;

export class CelestialSphereModel implements TModel {
  /** Shared astronomy state (observer location, sidereal time, stars, toggles). */
  public readonly sky: SkyModel;

  /** 0 = celestial-sphere view, 1 = horizon view; animated by the view via twixt. */
  public readonly systemBlendProperty = new NumberProperty(0, { range: new Range(0, 1) });

  /** True while the equatorial↔horizon morph animation is running. */
  public readonly isMorphingProperty = new BooleanProperty(false);

  /** Index of the active guided prompt (0 … {@link GUIDED_PROMPT_COUNT} − 1). */
  public readonly guidedPromptIndexProperty = new NumberProperty(0, {
    range: new Range(0, GUIDED_PROMPT_COUNT - 1),
  });

  /** Right ascension (hours) of the coordinate-explorer guide star. */
  public readonly guideRaProperty = new NumberProperty(6, { range: new Range(0, HOURS_PER_DAY) });

  /** Declination (degrees) of the coordinate-explorer guide star. */
  public readonly guideDecProperty = new NumberProperty(30, { range: new Range(-90, 90) });

  /** Whether the coordinate-explorer guide star (and its RA/Dec guide lines) is shown. */
  public readonly guideStarVisibleProperty = new BooleanProperty(false);

  public constructor(options: SkyModelOptions) {
    this.sky = new SkyModel(options);
    // Bridge-first defaults: poles and horizon plane are the Switch lesson.
    this.sky.labelsVisibleProperty.value = true;
  }

  public reset(): void {
    this.sky.reset();
    // Re-apply screen-specific defaults after SkyModel.reset() restores shared defaults.
    this.sky.labelsVisibleProperty.value = true;
    this.systemBlendProperty.reset();
    this.isMorphingProperty.reset();
    this.guidedPromptIndexProperty.reset();
    this.guideRaProperty.reset();
    this.guideDecProperty.reset();
    this.guideStarVisibleProperty.reset();
  }

  public step(dt: number): void {
    this.sky.step(dt);
  }
}
