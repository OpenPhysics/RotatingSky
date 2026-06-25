/**
 * SkyTrailsNode.ts
 *
 * Draws the arc each star has swept since the trails were last reset. For every
 * star it samples the sidereal time from `trailStartTime` to the current time,
 * converts each sample to a point on the sphere via the caller-supplied
 * `pathPointAt`, and strokes the visible (above-horizon) portions. Hidden by the
 * model's `starTrailsVisibleProperty`.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector3 } from "scenerystack/dot";
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
};

// Sidereal-hour spacing between trail samples (smaller = smoother arcs).
const SAMPLE_STEP_HOURS = 0.2;

export class SkyTrailsNode extends Node {
  public constructor(model: SkyModel, projection: SkyProjection, options: SkyTrailsNodeOptions) {
    super();

    const path = new Path(null, { stroke: RotatingSkyColors.trailColorProperty, lineWidth: 2 });
    this.addChild(path);

    const redraw = (): void => {
      const shape = new Shape();
      const start = model.trailStartTimeProperty.value;
      const end = model.siderealTimeProperty.value;
      // Unwrap the swept range; cap at one full day.
      const span = Math.min(HOURS_PER_DAY, end >= start ? end - start : end + HOURS_PER_DAY - start);

      for (const star of model.stars) {
        let penDown = false;
        for (let t = 0; t <= span + 1e-9; t += SAMPLE_STEP_HOURS) {
          const { point, visible } = options.pathPointAt(star, normalizeHours(start + t));
          if (!visible) {
            penDown = false;
            continue;
          }
          const screen = projection.project(point);
          if (penDown) {
            shape.lineToPoint(screen);
          } else {
            shape.moveToPoint(screen);
            penDown = true;
          }
        }
      }
      path.shape = shape;
    };

    model.stars.addItemAddedListener(redraw);
    model.stars.addItemRemovedListener(redraw);
    Multilink.multilinkAny(
      [model.trailStartTimeProperty, model.starTrailsVisibleProperty, ...options.redrawProperties],
      redraw,
    );
    model.starTrailsVisibleProperty.link((visible) => {
      this.visible = visible;
    });
  }
}
