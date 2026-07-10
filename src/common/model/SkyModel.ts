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
import type { StarPatternEdge, StarPatternStar } from "./StarPatterns.js";

/** How much of each star's recent path to draw as a trail. */
export type StarTrailMode = "none" | "short" | "long";

/** How long a play segment runs before auto-pausing; `continuous` has no limit. */
export type AnimationDuration = "continuous" | "1hour" | "3hours" | "6hours" | "12hours" | "24hours";

/** Combo-box choices for {@link AnimationDuration}, in display order. */
export const ANIMATION_DURATION_OPTIONS: readonly AnimationDuration[] = [
  "continuous",
  "1hour",
  "3hours",
  "6hours",
  "12hours",
  "24hours",
];

const ANIMATION_DURATION_HOURS = new Map<AnimationDuration, number | null>([
  ["continuous", null],
  ["1hour", 1],
  ["3hours", 3],
  ["6hours", 6],
  ["12hours", 12],
  ["24hours", 24],
]);

export type SkyModelOptions = {
  /** Default observer latitude (deg), from Preferences → query parameters. */
  defaultLatitudeProperty: TReadOnlyProperty<number>;
  /** Default observer longitude (deg), from Preferences → query parameters. */
  defaultLongitudeProperty: TReadOnlyProperty<number>;
};

/** Stars added together from a preset pattern, plus its stick-figure edges. */
export type StarPatternGroup = {
  readonly stars: readonly Star[];
  readonly edges: readonly StarPatternEdge[];
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

  /** Sidereal-hour span for each play segment; `continuous` runs until paused manually. */
  public readonly animationDurationProperty = new Property<AnimationDuration>("continuous");

  /** Observer latitude in degrees, +N / −S. */
  public readonly latitudeProperty: NumberProperty;

  /** Observer longitude in degrees, +E / −W. (Used by the Explorer map.) */
  public readonly longitudeProperty: NumberProperty;

  /** Local sidereal time in hours [0, 24); advances while playing. */
  public readonly siderealTimeProperty = new NumberProperty(0, { range: new Range(0, HOURS_PER_DAY) });

  /** The stars currently in the sky. */
  public readonly stars: ObservableArray<Star> = createObservableArray<Star>();

  /** Preset patterns on the sky (Big Dipper, Orion's Belt, …) with stick-figure edges. */
  public readonly starPatternGroups: ObservableArray<StarPatternGroup> = createObservableArray<StarPatternGroup>();

  /** The selected star (whose RA/Dec readout is shown), or null. */
  public readonly selectedStarProperty = new Property<Star | null>(null);

  /** Whether star trails are drawn (single-checkbox screens). */
  public readonly starTrailsVisibleProperty = new BooleanProperty(true);

  /** Trail length on the Explorer screen: none, short, or a full revolution. */
  public readonly starTrailModeProperty = new Property<StarTrailMode>("none");

  /** Sidereal time at which the current trails began (reset collapses trails). */
  public readonly trailStartTimeProperty = new NumberProperty(0);

  // ── Horizon System appearance toggles ───────────────────────────────────────

  /** Show the Zenith and Nadir labels on the horizon dome. */
  public readonly zenithNadirLabelsVisibleProperty = new BooleanProperty(false);

  /** Show the north–south meridian arc on the horizon dome. */
  public readonly horizonMeridianVisibleProperty = new BooleanProperty(true);

  /** Show NCP/SCP, the 0ʰ hour circle, the celestial equator, and the pole axis. */
  public readonly horizonCelestialReferencesVisibleProperty = new BooleanProperty(false);

  /** Hide stars, trails, and coordinate guides below the horizon (Horizon System). */
  public readonly hideBelowHorizonProperty = new BooleanProperty(false);

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

  /** Show the altitude of the celestial pole (= |lat|) on the horizon meridian. */
  public readonly ncpAltitudeAngleVisibleProperty = new BooleanProperty(false);

  // ── Celestial Sphere appearance toggles ──────────────────────────────────────

  /** Show the observer's horizon plane cutting through the celestial sphere. */
  public readonly horizonPlaneVisibleProperty = new BooleanProperty(true);

  /** Show the RA/Dec graticule (declination circles and RA meridians). */
  public readonly gridVisibleProperty = new BooleanProperty(true);

  /** Show the celestial-sphere silhouette outline. */
  public readonly outlineVisibleProperty = new BooleanProperty(true);

  private readonly defaultLatitudeProperty: TReadOnlyProperty<number>;
  private readonly defaultLongitudeProperty: TReadOnlyProperty<number>;

  /** Sidereal time when the current play segment started; null while paused. */
  private animationPlayStartSiderealTime: number | null = null;

  public constructor(options: SkyModelOptions) {
    this.defaultLatitudeProperty = options.defaultLatitudeProperty;
    this.defaultLongitudeProperty = options.defaultLongitudeProperty;

    this.latitudeProperty = new NumberProperty(options.defaultLatitudeProperty.value, { range: LATITUDE_RANGE });
    this.longitudeProperty = new NumberProperty(options.defaultLongitudeProperty.value, { range: LONGITUDE_RANGE });

    this.timer.isPlayingProperty.link((isPlaying) => {
      this.animationPlayStartSiderealTime = isPlaying ? this.siderealTimeProperty.value : null;
    });
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
  public addPattern(stars: readonly StarPatternStar[], edges: readonly StarPatternEdge[] = []): void {
    const added: Star[] = [];
    for (const { raHours, decDeg } of stars) {
      const star = this.addStar(raHours, decDeg);
      if (star) {
        added.push(star);
      } else {
        break;
      }
    }
    if (added.length === stars.length && edges.length > 0) {
      this.starPatternGroups.push({ stars: added, edges });
    }
  }

  public removeStar(star: Star): void {
    if (!this.stars.includes(star)) {
      return;
    }
    if (this.selectedStarProperty.value === star) {
      this.selectedStarProperty.value = null;
    }
    this.removePatternGroupsContaining(star);
    this.stars.remove(star);
    star.dispose();
  }

  public removeAllStars(): void {
    this.selectedStarProperty.value = null;
    this.starPatternGroups.clear();
    const removed = this.stars.slice();
    this.stars.clear();
    for (const star of removed) {
      star.dispose();
    }
  }

  /** Removes any preset pattern that included `star`. */
  private removePatternGroupsContaining(star: Star): void {
    for (let i = this.starPatternGroups.length - 1; i >= 0; i--) {
      const group = this.starPatternGroups[i];
      if (group?.stars.includes(star)) {
        this.starPatternGroups.remove(group);
      }
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
    const increment = this.speedMultiplier * SIDEREAL_HOURS_PER_SECOND;
    if (this.timer.isPlayingProperty.value) {
      this.advancePlayingTime(increment);
    } else {
      this.advanceSiderealTime(increment);
    }
  }

  public step(dt: number): void {
    this.timer.step(dt);
    if (this.timer.isPlayingProperty.value) {
      this.advancePlayingTime(dt * SIDEREAL_HOURS_PER_SECOND * this.speedMultiplier);
    }
  }

  /** Advances sidereal time while playing, pausing once the duration limit is reached. */
  private advancePlayingTime(siderealHours: number): void {
    const limitHours = ANIMATION_DURATION_HOURS.get(this.animationDurationProperty.value) ?? null;
    if (limitHours === null || this.animationPlayStartSiderealTime === null) {
      this.advanceSiderealTime(siderealHours);
      return;
    }

    const elapsed = siderealHoursElapsed(this.animationPlayStartSiderealTime, this.siderealTimeProperty.value);
    const remaining = limitHours - elapsed;
    if (remaining <= 0) {
      this.timer.isPlayingProperty.value = false;
      return;
    }

    const advance = Math.min(siderealHours, remaining);
    this.advanceSiderealTime(advance);
    if (advance >= remaining) {
      this.timer.isPlayingProperty.value = false;
    }
  }

  public reset(): void {
    this.timer.reset();
    this.timeSpeedProperty.reset();
    this.animationRateProperty.reset();
    this.animationDurationProperty.reset();
    // Reset to the *current* preference defaults so newly reset screens follow them.
    this.latitudeProperty.value = this.defaultLatitudeProperty.value;
    this.longitudeProperty.value = normalizeDegrees(this.defaultLongitudeProperty.value + 180) - 180;
    this.siderealTimeProperty.reset();
    this.starTrailsVisibleProperty.reset();
    this.starTrailModeProperty.reset();
    this.trailStartTimeProperty.reset();
    this.zenithNadirLabelsVisibleProperty.reset();
    this.horizonMeridianVisibleProperty.reset();
    this.horizonCelestialReferencesVisibleProperty.reset();
    this.hideBelowHorizonProperty.reset();
    this.labelsVisibleProperty.reset();
    this.hourCircleVisibleProperty.reset();
    this.celestialEquatorVisibleProperty.reset();
    this.horizonUndersideVisibleProperty.reset();
    this.circumpolarRegionVisibleProperty.reset();
    this.riseSetRegionVisibleProperty.reset();
    this.neverRiseRegionVisibleProperty.reset();
    this.equatorHorizonAngleVisibleProperty.reset();
    this.ncpAltitudeAngleVisibleProperty.reset();
    this.horizonPlaneVisibleProperty.reset();
    this.gridVisibleProperty.reset();
    this.outlineVisibleProperty.reset();
    this.removeAllStars();
  }
}

/** Sidereal hours advanced from `startHours` to `currentHours`, accounting for midnight wrap. */
function siderealHoursElapsed(startHours: number, currentHours: number): number {
  const delta = currentHours - startHours;
  return delta >= 0 ? delta : delta + HOURS_PER_DAY;
}
