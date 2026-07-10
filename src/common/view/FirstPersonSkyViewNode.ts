/**
 * FirstPersonSkyViewNode.ts
 *
 * Observer-facing sky panel: a rectangular FOV looking toward a cardinal
 * direction, with the ground filling the lower portion. Stars and trails are
 * projected from horizontal (alt/az) coordinates — the StarTrails "Sky View"
 * teaching mode, implemented in SceneryStack.
 *
 * Screen mapping (degrees → pixels):
 *   x = left + width  · (az − azCenter + fov/2) / fov
 *   y = top  + height · (1 − (alt − altMin) / (altMax − altMin))
 * with altMin chosen so the horizon sits at `groundFraction` of the panel height.
 */

import { Multilink, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { type Bounds2, clamp, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { CONTROL_FONT_SIZE, STAR_RADIUS } from "../../RotatingSkyConstants.js";
import type { SkyModel } from "../model/SkyModel.js";
import { ViewDirection, viewDirectionAzimuthDeg } from "../model/ViewDirection.js";
import {
  equatorialToHorizontal,
  HOURS_PER_DAY,
  horizontalToEquatorial,
  normalizeDegrees,
  normalizeHours,
} from "../SkyCoordinates.js";
import { SkyStarsNode } from "./SkyStarsNode.js";
import { createStarShape } from "./starGraphics.js";

/**
 * Horizontal / vertical field of view in degrees. Wider than UNL StarTrails'
 * 50° so the panel shows a useful swath of sky rather than a tight zoom.
 */
export const SKY_VIEW_FOV_DEG = 100;

/** Fraction of panel height below the horizon line (ground). */
const GROUND_FRACTION = 0.15;

/** Sidereal-hour spacing between trail samples. */
const TRAIL_SAMPLE_STEP_HOURS = 0.2;
const NUM_FADE_BANDS = 12;
const MIN_FADE_OPACITY = 0.08;

/** Margin (degrees) outside the FOV before a star is culled. */
const FOV_MARGIN_DEG = 2;

/** Altitude tick marks drawn on the sky panel (degrees). */
const ALTITUDE_TICKS_DEG = [0, 15, 30, 45, 60, 75] as const;

export type FirstPersonSkyViewNodeOptions = {
  /** Panel bounds in parent coordinates. */
  bounds: Bounds2;
  /** Cardinal facing. */
  viewDirectionProperty: TReadOnlyProperty<ViewDirection>;
  /** Localized direction label (North / East / …). */
  directionLabelProperty: TReadOnlyProperty<string>;
  /** Accessible name for each star. */
  starAccessibleName?: TReadOnlyProperty<string>;
  /** Accessible help for keyboard star nudging. */
  starAccessibleHelp?: TReadOnlyProperty<string>;
};

type StarLike = { raProperty: { value: number }; decProperty: { value: number } };

export class FirstPersonSkyViewNode extends Node {
  private readonly model: SkyModel;
  private readonly viewDirectionProperty: TReadOnlyProperty<ViewDirection>;
  private bounds2: Bounds2;
  /**
   * Bumped whenever the panel is resized so {@link SkyStarsNode} redraws.
   * Stars listen to Properties, not to plain field writes on `bounds2`.
   */
  private readonly layoutRevisionProperty = new NumberProperty(0);

  /** Altitude at the bottom of the panel (negative = below horizon). */
  private altMin = 0;
  /** Altitude at the top of the panel. */
  private altMax = 0;

  public constructor(model: SkyModel, options: FirstPersonSkyViewNodeOptions) {
    super({ pickable: true });

    this.model = model;
    this.viewDirectionProperty = options.viewDirectionProperty;
    this.bounds2 = options.bounds;

    const skyFill = new Rectangle(0, 0, 1, 1, {
      fill: RotatingSkyColors.skyViewBackgroundColorProperty,
    });
    const frame = new Rectangle(0, 0, 1, 1, {
      stroke: RotatingSkyColors.cardinalLabelColorProperty,
      lineWidth: 2,
      pickable: false,
    });
    const groundFill = new Path(null, { fill: RotatingSkyColors.groundColorProperty });
    const horizonLine = new Path(null, { stroke: RotatingSkyColors.horizonColorProperty, lineWidth: 2 });
    const ticksPath = new Path(null, {
      stroke: RotatingSkyColors.cardinalLabelColorProperty,
      lineWidth: 1,
      opacity: 0.55,
      pickable: false,
    });
    const equatorPath = new Path(null, {
      stroke: RotatingSkyColors.accentColorProperty,
      lineWidth: 1.5,
      opacity: 0.85,
    });
    const poleDot = new Path(createStarShape(STAR_RADIUS + 2), {
      fill: RotatingSkyColors.accentColorProperty,
      pickable: false,
    });
    const poleLabel = new Text("NCP", {
      font: new PhetFont({ size: 11, weight: "bold" }),
      fill: RotatingSkyColors.accentColorProperty,
      pickable: false,
    });
    const directionLabel = new Text(options.directionLabelProperty, {
      font: new PhetFont({ size: CONTROL_FONT_SIZE + 2, weight: "bold" }),
      fill: RotatingSkyColors.cardinalLabelColorProperty,
      pickable: false,
    });

    const bandPaths: Path[] = [];
    for (let b = 0; b < NUM_FADE_BANDS; b++) {
      const opacity = MIN_FADE_OPACITY + ((1 - MIN_FADE_OPACITY) * b) / (NUM_FADE_BANDS - 1);
      bandPaths.push(
        new Path(null, {
          stroke: RotatingSkyColors.trailColorProperty,
          lineWidth: 2,
          opacity,
          lineCap: "round",
          lineJoin: "round",
        }),
      );
    }

    const starsNode = new SkyStarsNode(model, {
      starToPoint: (star) => this.starScreenPoint(star),
      pointToEquatorial: (point) => this.screenToEquatorial(point),
      redrawProperties: [
        model.latitudeProperty,
        model.siderealTimeProperty,
        options.viewDirectionProperty,
        this.layoutRevisionProperty,
      ],
      ...(options.starAccessibleName ? { accessibleName: options.starAccessibleName } : {}),
      ...(options.starAccessibleHelp ? { accessibleHelpText: options.starAccessibleHelp } : {}),
    });

    this.children = [
      skyFill,
      groundFill,
      horizonLine,
      ticksPath,
      equatorPath,
      ...bandPaths,
      poleDot,
      poleLabel,
      starsNode,
      directionLabel,
      frame,
    ];

    const redraw = (): void => {
      this.updateAltitudeRange();
      const b = this.bounds2;
      skyFill.setRect(b.minX, b.minY, b.width, b.height);
      frame.setRect(b.minX, b.minY, b.width, b.height);

      const horizonY = this.altToY(0);
      groundFill.shape = Shape.rect(b.minX, horizonY, b.width, Math.max(0, b.maxY - horizonY));
      horizonLine.shape = Shape.lineSegment(b.minX, horizonY, b.maxX, horizonY);
      ticksPath.shape = this.altitudeTickShape();

      directionLabel.centerX = b.centerX;
      directionLabel.bottom = b.maxY - 8;

      this.redrawEquator(equatorPath);
      this.redrawPole(poleDot, poleLabel);
      this.redrawTrails(bandPaths);
    };

    Multilink.multilink(
      [
        model.latitudeProperty,
        model.siderealTimeProperty,
        model.starTrailsVisibleProperty,
        model.trailStartTimeProperty,
        model.horizonCelestialReferencesVisibleProperty,
        options.viewDirectionProperty,
        options.directionLabelProperty,
        this.layoutRevisionProperty,
      ],
      redraw,
    );
    model.stars.addItemAddedListener(redraw);
    model.stars.addItemRemovedListener(redraw);

    redraw();
  }

  /** Repositions the panel (e.g. after layout / view-mode change). */
  public setViewBounds(bounds: Bounds2): void {
    this.bounds2 = bounds;
    // Notify star Multilinks and the frame redraw that the FOV rectangle moved.
    this.layoutRevisionProperty.value += 1;
  }

  private updateAltitudeRange(): void {
    // Horizon at (1 − GROUND_FRACTION) from the top → alt=0 there.
    this.altMax = SKY_VIEW_FOV_DEG * (1 - GROUND_FRACTION);
    this.altMin = -SKY_VIEW_FOV_DEG * GROUND_FRACTION;
  }

  private azCenter(): number {
    return viewDirectionAzimuthDeg(this.viewDirectionProperty.value);
  }

  /** Shortest signed azimuth offset from view center into (−180, 180]. */
  private azOffset(azDeg: number): number {
    return ((azDeg - this.azCenter() + 540) % 360) - 180;
  }

  private azToX(azDeg: number): number {
    const b = this.bounds2;
    const u = (this.azOffset(azDeg) + SKY_VIEW_FOV_DEG / 2) / SKY_VIEW_FOV_DEG;
    return b.minX + u * b.width;
  }

  private altToY(altDeg: number): number {
    const b = this.bounds2;
    const v = (altDeg - this.altMin) / (this.altMax - this.altMin);
    return b.maxY - v * b.height;
  }

  private projectAltAz(altDeg: number, azDeg: number): Vector2 | null {
    const dAz = this.azOffset(azDeg);
    if (Math.abs(dAz) > SKY_VIEW_FOV_DEG / 2 + FOV_MARGIN_DEG) {
      return null;
    }
    if (altDeg < this.altMin - FOV_MARGIN_DEG || altDeg > this.altMax + FOV_MARGIN_DEG) {
      return null;
    }
    return new Vector2(this.azToX(azDeg), this.altToY(altDeg));
  }

  /** Left-edge altitude ticks so an empty sky still reads as a FOV. */
  private altitudeTickShape(): Shape {
    const b = this.bounds2;
    const shape = new Shape();
    const tickLen = Math.min(18, b.width * 0.04);
    for (const alt of ALTITUDE_TICKS_DEG) {
      if (alt < this.altMin || alt > this.altMax) {
        continue;
      }
      const y = this.altToY(alt);
      shape.moveTo(b.minX, y).lineTo(b.minX + tickLen, y);
      shape.moveTo(b.maxX, y).lineTo(b.maxX - tickLen, y);
    }
    // Vertical center line (due-cardinal).
    shape.moveTo(b.centerX, b.minY).lineTo(b.centerX, this.altToY(0));
    return shape;
  }

  private starScreenPoint(star: StarLike): { point: Vector2; visible: boolean } {
    const { altDeg, azDeg } = equatorialToHorizontal(
      star.raProperty.value,
      star.decProperty.value,
      this.model.latitudeProperty.value,
      this.model.siderealTimeProperty.value,
    );
    // First-person view never shows stars through the ground.
    if (altDeg < 0) {
      return { point: new Vector2(0, 0), visible: false };
    }
    const point = this.projectAltAz(altDeg, azDeg);
    if (!point) {
      return { point: new Vector2(0, 0), visible: false };
    }
    return { point, visible: true };
  }

  private screenToEquatorial(point: Vector2): { raHours: number; decDeg: number } {
    const b = this.bounds2;
    const u = clamp((point.x - b.minX) / b.width, 0, 1);
    const v = clamp((b.maxY - point.y) / b.height, 0, 1);
    const azDeg = normalizeDegrees(this.azCenter() - SKY_VIEW_FOV_DEG / 2 + u * SKY_VIEW_FOV_DEG);
    const altDeg = this.altMin + v * (this.altMax - this.altMin);
    return horizontalToEquatorial(
      altDeg,
      azDeg,
      this.model.latitudeProperty.value,
      this.model.siderealTimeProperty.value,
    );
  }

  private redrawEquator(path: Path): void {
    if (!this.model.horizonCelestialReferencesVisibleProperty.value) {
      path.shape = null;
      return;
    }
    const lat = this.model.latitudeProperty.value;
    const lst = this.model.siderealTimeProperty.value;
    const shape = new Shape();
    let started = false;
    // Sample RA along the celestial equator (dec = 0).
    for (let ra = 0; ra <= HOURS_PER_DAY + 1e-9; ra += 0.1) {
      const { altDeg, azDeg } = equatorialToHorizontal(ra, 0, lat, lst);
      const screen = this.projectAltAz(altDeg, azDeg);
      if (!screen || altDeg < -FOV_MARGIN_DEG) {
        started = false;
        continue;
      }
      if (!started) {
        shape.moveToPoint(screen);
        started = true;
      } else {
        shape.lineToPoint(screen);
      }
    }
    path.shape = shape;
  }

  private redrawPole(dot: Path, label: Text): void {
    const showRefs = this.model.horizonCelestialReferencesVisibleProperty.value;
    const lat = this.model.latitudeProperty.value;
    const direction = this.viewDirectionProperty.value;
    // NCP visible when looking north (northern lat) or SCP when looking south (southern lat).
    const showNcp = showRefs && direction === ViewDirection.NORTH && lat > 0;
    const showScp = showRefs && direction === ViewDirection.SOUTH && lat < 0;
    if (!(showNcp || showScp)) {
      dot.visible = false;
      label.visible = false;
      return;
    }
    const alt = Math.abs(lat);
    const az = showNcp ? 0 : 180;
    const screen = this.projectAltAz(alt, az);
    if (!screen) {
      dot.visible = false;
      label.visible = false;
      return;
    }
    dot.center = screen;
    dot.visible = true;
    label.string = showNcp ? "NCP" : "SCP";
    label.centerX = screen.x;
    label.bottom = screen.y - STAR_RADIUS - 2;
    label.visible = true;
  }

  private clearBandPaths(bandPaths: Path[]): void {
    for (const path of bandPaths) {
      path.shape = null;
    }
  }

  private applyBandShapes(bandPaths: Path[], shapes: Shape[]): void {
    for (let b = 0; b < NUM_FADE_BANDS; b++) {
      const path = bandPaths[b];
      if (path) {
        path.shape = shapes[b] ?? null;
      }
    }
  }

  /** Append one star's trail samples into the per-band shapes. */
  private drawStarTrail(star: StarLike, shapes: Shape[], span: number, trailStart: number, lat: number): void {
    let prevScreen: Vector2 | null = null;
    let prevBand = -1;
    for (let t = 0; t <= span + 1e-9; t += TRAIL_SAMPLE_STEP_HOURS) {
      const lst = normalizeHours(trailStart + t);
      const { altDeg, azDeg } = equatorialToHorizontal(star.raProperty.value, star.decProperty.value, lat, lst);
      if (altDeg < 0) {
        prevScreen = null;
        continue;
      }
      const screen = this.projectAltAz(altDeg, azDeg);
      if (!screen) {
        prevScreen = null;
        continue;
      }
      const band = Math.max(0, Math.min(NUM_FADE_BANDS - 1, Math.floor((t / span) * NUM_FADE_BANDS)));
      const shape = shapes[band];
      if (prevScreen && band === prevBand && shape) {
        shape.lineToPoint(screen);
      } else if (prevScreen && shape) {
        shape.moveToPoint(prevScreen).lineToPoint(screen);
      } else if (shape) {
        shape.moveToPoint(screen);
      }
      prevScreen = screen;
      prevBand = band;
    }
  }

  private redrawTrails(bandPaths: Path[]): void {
    if (!this.model.starTrailsVisibleProperty.value) {
      this.clearBandPaths(bandPaths);
      return;
    }

    const shapes: Shape[] = Array.from({ length: NUM_FADE_BANDS }, () => new Shape());
    const start = this.model.trailStartTimeProperty.value;
    const end = this.model.siderealTimeProperty.value;
    const span = Math.min(HOURS_PER_DAY, end >= start ? end - start : end + HOURS_PER_DAY - start);
    if (span >= 1e-9) {
      const trailStart = end - span;
      const lat = this.model.latitudeProperty.value;
      for (const star of this.model.stars) {
        this.drawStarTrail(star, shapes, span, trailStart, lat);
      }
    }
    this.applyBandShapes(bandPaths, shapes);
  }
}
