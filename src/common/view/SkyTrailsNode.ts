/**
 * SkyTrailsNode.ts
 *
 * Draws the arc each star has swept since the trails were last reset. For every
 * star it samples the sidereal time from `trailStartTime` to the current time,
 * converts each sample to a point on the sphere via the caller-supplied
 * `pathPointAt`, and strokes the visible portions. Hidden by the
 * model's `starTrailsVisibleProperty`.
 *
 * Trails fade from full opacity (newest, at the star's current position) to near
 * transparency (oldest), matching the NAAP Flash behaviour. Rather than one path
 * per segment, the trail is bucketed into `NUM_FADE_BANDS` opacity bands and all
 * stars' segments in the same band are merged into one shared Shape — keeping the
 * node count fixed regardless of star count or trail length.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import type { SkyModel } from "../model/SkyModel.js";
import { HOURS_PER_DAY, normalizeHours } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";

export type SkyTrailsNodeOptions = {
  /** Position of `star` on this sphere at a given sidereal time, and whether it shows. */
  pathPointAt: (
    star: { raProperty: { value: number }; decProperty: { value: number } },
    siderealTime: number,
  ) => {
    point: Vector3;
    visible: boolean;
  };
  /** Reactive inputs that change the trails (latitude, sidereal time, view matrix). */
  redrawProperties: TReadOnlyProperty<unknown>[];
  /** Controls trail visibility. Defaults to the model's `starTrailsVisibleProperty`. */
  visibleProperty?: TReadOnlyProperty<boolean>;
  /** Caps the trail length (sidereal hours). Omit / null for "since last reset". */
  maxLengthHoursProperty?: TReadOnlyProperty<number> | null;
};

// Sidereal-hour spacing between trail samples (smaller = smoother arcs).
const SAMPLE_STEP_HOURS = 0.2;

// Number of opacity bands along the trail (more = smoother fade, more Path nodes).
const NUM_FADE_BANDS = 12;
// Opacity at the oldest end of the trail (band 0); band N-1 is fully opaque.
const MIN_FADE_OPACITY = 0.08;

type StarLike = { raProperty: { value: number }; decProperty: { value: number } };

/**
 * Samples one star's trail into the per-band shapes. Each sample is bucketed into
 * an opacity band based on its age (oldest = band 0, newest = band N-1). Band
 * transitions start a new sub-path at the previous point so the trail stays
 * visually continuous.
 */
const drawStarTrail = (
  star: StarLike,
  shapes: Shape[],
  span: number,
  trailStart: number,
  projection: SkyProjection,
  pathPointAt: SkyTrailsNodeOptions["pathPointAt"],
): void => {
  let prevScreen: Vector2 | null = null;
  let prevBand = -1;
  for (let t = 0; t <= span + 1e-9; t += SAMPLE_STEP_HOURS) {
    const { point, visible } = pathPointAt(star, normalizeHours(trailStart + t));
    if (!visible) {
      prevScreen = null;
      continue;
    }
    // Band index: t=0 (oldest) → band 0, t=span (newest) → band NUM_FADE_BANDS-1.
    const band = Math.max(0, Math.min(NUM_FADE_BANDS - 1, Math.floor((t / span) * NUM_FADE_BANDS)));
    const screen = projection.project(point);
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
};

export class SkyTrailsNode extends Node {
  public constructor(model: SkyModel, projection: SkyProjection, options: SkyTrailsNodeOptions) {
    super();

    // One Path per opacity band. Band 0 = oldest (faintest), band N-1 = newest (full opacity).
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
    this.children = bandPaths;

    const visibleProperty = options.visibleProperty ?? model.starTrailsVisibleProperty;
    const maxLengthProperty = options.maxLengthHoursProperty ?? null;

    const redraw = (): void => {
      const shapes: Shape[] = Array.from({ length: NUM_FADE_BANDS }, () => new Shape());

      const start = model.trailStartTimeProperty.value;
      const end = model.siderealTimeProperty.value;
      // Unwrap the swept range; cap at one full day, then at the requested length.
      let span = Math.min(HOURS_PER_DAY, end >= start ? end - start : end + HOURS_PER_DAY - start);
      if (maxLengthProperty) {
        span = Math.min(span, maxLengthProperty.value);
      }

      if (span >= 1e-9) {
        const trailStart = end - span;
        for (const star of model.stars) {
          drawStarTrail(star, shapes, span, trailStart, projection, options.pathPointAt);
        }
      }

      for (let b = 0; b < NUM_FADE_BANDS; b++) {
        const path = bandPaths[b];
        if (path) {
          path.shape = shapes[b] ?? null;
        }
      }
    };

    model.stars.addItemAddedListener(redraw);
    model.stars.addItemRemovedListener(redraw);
    Multilink.multilinkAny(
      [
        model.trailStartTimeProperty,
        visibleProperty,
        ...(maxLengthProperty ? [maxLengthProperty] : []),
        ...options.redrawProperties,
      ],
      redraw,
    );
    visibleProperty.link((visible) => {
      this.visible = visible;
    });
  }
}
