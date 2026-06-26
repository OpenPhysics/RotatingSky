/**
 * SkyModel.ts
 *
 * The shared astronomy model reused by all three screens. Each per-screen model
 * owns its *own* SkyModel instance (composition, like TimeModel) so the screens
 * stay independent — changing latitude on one screen does not affect the others.
 *
 * State:
 *  - observer location (latitude / longitude), seeded from the Preferences /
 *    query-parameter defaults and restored to them on reset;
 *  - the local sidereal time, which advances while the animation is playing and
 *    drives the diurnal rotation of the sky;
 *  - the list of stars and the currently selected star;
 *  - star-trail bookkeeping and shared display toggles.
 */

import {
  BooleanProperty,
  createObservableArray,
  EnumerationProperty,
  NumberProperty,
  type ObservableArray,
  Property,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import { dotRandom, Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { TimeSpeed } from "scenerystack/scenery-phet";
import {
  ANIMATION_RATE_RANGE,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
  MAX_STARS,
  SIDEREAL_HOURS_PER_SECOND,
} from "../../RotatingSkyConstants.js";
import { HOURS_PER_DAY, normalizeDegrees, normalizeHours } from "../SkyCoordinates.js";
import { TimeModel } from "../TimeModel.js";
import { Star } from "./Star.js";
import type { StarPatternStar } from "./StarPatterns.js";

/** How much of each star's recent path to draw as a trail. */
export type StarTrailMode = "none" | "short" | "long";

export type SkyModelOptions = {
  /** Default observer latitude (deg), from Preferences → query parameters. */
  defaultLatitudeProperty: TReadOnlyProperty<number>;
  /** Default observer longitude (deg), from Preferences → query parameters. */
  defaultLongitudeProperty: TReadOnlyProperty<number>;
};

/** Sidereal-hours-per-second multiplier for each animation speed. */
const SPEED_MULTIPLIERS = new Map<TimeSpeed, number>([
  [TimeSpeed.SLOW, 0.25],
  [TimeSpeed.NORMAL, 1],
  [TimeSpeed.FAST, 4],
]);

export class SkyModel implements TModel {
  /** Play/pause + elapsed time; isPlayingProperty binds to a TimeControlNode. */
  public readonly timer = new TimeModel();

  /** Animation speed (binds to the TimeControlNode speed radio buttons). */
  public readonly timeSpeedProperty = new EnumerationProperty(TimeSpeed.NORMAL);

  /** Continuous animation-rate multiplier (the Explorer's "animation rate" slider). */
  public readonly animationRateProperty = new NumberProperty(1, { range: ANIMATION_RATE_RANGE });

  /** Observer latitude in degrees, +N / −S. */
  public readonly latitudeProperty: NumberProperty;

  /** Observer longitude in degrees, +E / −W. (Used by the Explorer map.) */
  public readonly longitudeProperty: NumberProperty;

  /** Local sidereal time in hours [0, 24); advances while playing. */
  public readonly siderealTimeProperty = new NumberProperty(0, { range: new Range(0, HOURS_PER_DAY) });

  /** The stars currently in the sky. */
  public readonly stars: ObservableArray<Star> = createObservableArray<Star>();

  /** The selected star (whose RA/Dec readout is shown), or null. */
  public readonly selectedStarProperty = new Property<Star | null>(null);

  /** Whether star trails are drawn (single-checkbox screens). */
  public readonly starTrailsVisibleProperty = new BooleanProperty(true);

  /** Trail length on the Explorer screen: none, short, or a full revolution. */
  public readonly starTrailModeProperty = new Property<StarTrailMode>("none");

  /** Sidereal time at which the current trails began (reset collapses trails). */
  public readonly trailStartTimeProperty = new NumberProperty(0);

  /** Whether the declination "bands" (circumpolar / never-rises) are shaded. */
  public readonly bandsVisibleProperty = new BooleanProperty(false);

  // ── Explorer appearance toggles ──────────────────────────────────────────────

  /** Show the cardinal-direction and pole labels (N/E/S/W, NCP/SCP). */
  public readonly labelsVisibleProperty = new BooleanProperty(false);

  /** Show the 0ʰ hour circle (the RA = 0ʰ great circle through the poles). */
  public readonly hourCircleVisibleProperty = new BooleanProperty(true);

  /** Show the celestial equator on both views. */
  public readonly celestialEquatorVisibleProperty = new BooleanProperty(true);

  /** Show the underside (below-horizon hemisphere) of the horizon diagram. */
  public readonly horizonUndersideVisibleProperty = new BooleanProperty(true);

  /** Shade the circumpolar declination region (stars that never set). */
  public readonly circumpolarRegionVisibleProperty = new BooleanProperty(false);

  /** Shade the rise-and-set declination region (stars that rise and set). */
  public readonly riseSetRegionVisibleProperty = new BooleanProperty(false);

  /** Shade the never-rise declination region (stars never visible). */
  public readonly neverRiseRegionVisibleProperty = new BooleanProperty(false);

  /** Show the angle between the celestial equator and the horizon (= 90° − |lat|). */
  public readonly equatorHorizonAngleVisibleProperty = new BooleanProperty(false);

  private readonly defaultLatitudeProperty: TReadOnlyProperty<number>;
  private readonly defaultLongitudeProperty: TReadOnlyProperty<number>;

  public constructor(options: SkyModelOptions) {
    this.defaultLatitudeProperty = options.defaultLatitudeProperty;
    this.defaultLongitudeProperty = options.defaultLongitudeProperty;

    this.latitudeProperty = new NumberProperty(options.defaultLatitudeProperty.value, { range: LATITUDE_RANGE });
    this.longitudeProperty = new NumberProperty(options.defaultLongitudeProperty.value, { range: LONGITUDE_RANGE });
  }

  // ── Stars ──────────────────────────────────────────────────────────────────

  /** Adds a star at the given equatorial coordinates, selects it, and returns it. */
  public addStar(raHours: number, decDeg: number): Star | null {
    if (this.stars.length >= MAX_STARS) {
      return null;
    }
    const star = new Star(raHours, decDeg);
    this.stars.push(star);
    this.selectedStarProperty.value = star;
    return star;
  }

  /** Adds a star at a uniformly random point on the sphere. */
  public addRandomStar(): Star | null {
    const raHours = dotRandom.nextDoubleBetween(0, HOURS_PER_DAY);
    // Uniform on the sphere: declination from arcsin of a uniform z.
    const decDeg = (Math.asin(dotRandom.nextDoubleBetween(-1, 1)) * 180) / Math.PI;
    return this.addStar(raHours, decDeg);
  }

  /** Drops a preset star pattern onto the sky (used by the "star patterns…" picker). */
  public addPattern(stars: readonly StarPatternStar[]): void {
    for (const { raHours, decDeg } of stars) {
      this.addStar(raHours, decDeg);
    }
  }

  public removeStar(star: Star): void {
    if (!this.stars.includes(star)) {
      return;
    }
    if (this.selectedStarProperty.value === star) {
      this.selectedStarProperty.value = null;
    }
    this.stars.remove(star);
    star.dispose();
  }

  public removeAllStars(): void {
    this.selectedStarProperty.value = null;
    const removed = this.stars.slice();
    this.stars.clear();
    for (const star of removed) {
      star.dispose();
    }
  }

  // ── Trails ─────────────────────────────────────────────────────────────────

  /** Collapses all trails back to a point at the current sidereal time. */
  public resetStarTrails(): void {
    this.trailStartTimeProperty.value = this.siderealTimeProperty.value;
  }

  // ── Time ───────────────────────────────────────────────────────────────────

  /** Advances the sidereal time by `siderealHours`, wrapping into [0, 24). */
  public advanceSiderealTime(siderealHours: number): void {
    this.siderealTimeProperty.value = normalizeHours(this.siderealTimeProperty.value + siderealHours);
  }

  /** Combined multiplier: discrete speed (other screens) × continuous rate (Explorer). */
  private get speedMultiplier(): number {
    return (SPEED_MULTIPLIERS.get(this.timeSpeedProperty.value) ?? 1) * this.animationRateProperty.value;
  }

  /** One step-forward press (used by the TimeControlNode step button). */
  public stepForward(): void {
    this.advanceSiderealTime(this.speedMultiplier * SIDEREAL_HOURS_PER_SECOND);
  }

  public step(dt: number): void {
    this.timer.step(dt);
    if (this.timer.isPlayingProperty.value) {
      this.advanceSiderealTime(dt * SIDEREAL_HOURS_PER_SECOND * this.speedMultiplier);
    }
  }

  public reset(): void {
    this.timer.reset();
    this.timeSpeedProperty.reset();
    this.animationRateProperty.reset();
    // Reset to the *current* preference defaults so newly reset screens follow them.
    this.latitudeProperty.value = this.defaultLatitudeProperty.value;
    this.longitudeProperty.value = normalizeDegrees(this.defaultLongitudeProperty.value + 180) - 180;
    this.siderealTimeProperty.reset();
    this.starTrailsVisibleProperty.reset();
    this.starTrailModeProperty.reset();
    this.trailStartTimeProperty.reset();
    this.bandsVisibleProperty.reset();
    this.labelsVisibleProperty.reset();
    this.hourCircleVisibleProperty.reset();
    this.celestialEquatorVisibleProperty.reset();
    this.horizonUndersideVisibleProperty.reset();
    this.circumpolarRegionVisibleProperty.reset();
    this.riseSetRegionVisibleProperty.reset();
    this.neverRiseRegionVisibleProperty.reset();
    this.equatorHorizonAngleVisibleProperty.reset();
    this.removeAllStars();
  }
}
