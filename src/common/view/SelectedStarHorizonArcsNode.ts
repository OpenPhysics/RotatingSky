/**
 * SelectedStarHorizonArcsNode.ts
 *
 * When a star is selected on the horizon diagram, draws the NAAP-style
 * coordinate guides: a red arc along the horizon from north to the star's
 * azimuth (with a degree label), and a blue vertical-circle arc from the
 * horizon up to the star showing its altitude.
 */

import { Multilink, type TReadOnlyProperty, type UnknownMultilink } from "scenerystack/axon";
import type { Vector3 } from "scenerystack/dot";
import { Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import type { SkyModel } from "../model/SkyModel.js";
import { altAzToVector3, equatorialToHorizontal } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectSplitPolyline } from "./skyGraphics.js";

const ARC_LINE_WIDTH = 3;
const LABEL_OFFSET = 16;

/** Vertical-circle samples at a fixed azimuth between two altitudes (inclusive). */
const verticalCirclePoints = (azDeg: number, altFrom: number, altTo: number): Vector3[] => {
  const points: Vector3[] = [];
  const step = altFrom <= altTo ? 4 : -4;
  for (let alt = altFrom; step > 0 ? alt <= altTo : alt >= altTo; alt += step) {
    points.push(altAzToVector3(alt, azDeg));
  }
  return points;
};

/** Horizon arc from north (0°) clockwise to `toAzDeg`. */
const horizonAzimuthArcPoints = (toAzDeg: number): Vector3[] => {
  const points: Vector3[] = [];
  const step = 3;
  for (let az = 0; az <= toAzDeg; az += step) {
    points.push(altAzToVector3(0, az));
  }
  points.push(altAzToVector3(0, toAzDeg));
  return points;
};

const placeLabelOutside = (text: Text, point: Vector3, projection: SkyProjection): void => {
  const screen = projection.project(point);
  const away = screen.minus(projection.center);
  const offset = away.magnitude > 0 ? away.normalized().timesScalar(LABEL_OFFSET) : away;
  text.center = screen.plus(offset);
  text.visible = projection.isFrontFacing(point);
};

export type SelectedStarHorizonArcsNodeOptions = {
  /** When true, hide the guides while the selected star is below the horizon. */
  hideBelowHorizonProperty?: TReadOnlyProperty<boolean>;
};

export class SelectedStarHorizonArcsNode extends Node {
  private starLink: UnknownMultilink | null = null;

  public constructor(projection: SkyProjection, model: SkyModel, options?: SelectedStarHorizonArcsNodeOptions) {
    super({ pickable: false });

    const azimuthFront = new Path(null, {
      stroke: RotatingSkyColors.azimuthArcColorProperty,
      lineWidth: ARC_LINE_WIDTH,
    });
    const azimuthBack = new Path(null, {
      stroke: RotatingSkyColors.azimuthArcColorProperty,
      lineWidth: ARC_LINE_WIDTH,
      lineDash: [6, 4],
    });
    const altitudeFront = new Path(null, {
      stroke: RotatingSkyColors.altitudeArcColorProperty,
      lineWidth: ARC_LINE_WIDTH,
    });
    const altitudeBack = new Path(null, {
      stroke: RotatingSkyColors.altitudeArcColorProperty,
      lineWidth: ARC_LINE_WIDTH,
      lineDash: [6, 4],
    });

    const azimuthLabel = new Text("", {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: RotatingSkyColors.azimuthArcColorProperty,
      pickable: false,
    });
    const altitudeLabel = new Text("", {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: RotatingSkyColors.altitudeArcColorProperty,
      pickable: false,
    });

    this.children = [azimuthBack, altitudeBack, azimuthFront, altitudeFront, azimuthLabel, altitudeLabel];

    const hideAll = (): void => {
      azimuthFront.shape = null;
      azimuthBack.shape = null;
      altitudeFront.shape = null;
      altitudeBack.shape = null;
      azimuthLabel.visible = false;
      altitudeLabel.visible = false;
    };

    const update = (): void => {
      const star = model.selectedStarProperty.value;
      if (!star) {
        hideAll();
        return;
      }

      const { altDeg, azDeg } = equatorialToHorizontal(
        star.raProperty.value,
        star.decProperty.value,
        model.latitudeProperty.value,
        model.siderealTimeProperty.value,
      );

      if (altDeg < 0 && options?.hideBelowHorizonProperty?.value) {
        hideAll();
        return;
      }

      const azimuthSplit = projectSplitPolyline(projection, horizonAzimuthArcPoints(azDeg), false);
      azimuthFront.shape = azimuthSplit.front;
      azimuthBack.shape = azimuthSplit.back;

      const altitudeSplit = projectSplitPolyline(projection, verticalCirclePoints(azDeg, 0, altDeg), false);
      altitudeFront.shape = altitudeSplit.front;
      altitudeBack.shape = altitudeSplit.back;

      azimuthLabel.string = `${Math.round(azDeg)}°`;
      altitudeLabel.string = altDeg >= 0 ? `+${altDeg.toFixed(1)}°` : `${altDeg.toFixed(1)}°`;

      placeLabelOutside(azimuthLabel, altAzToVector3(0, azDeg / 2), projection);
      placeLabelOutside(altitudeLabel, altAzToVector3(altDeg / 2, azDeg), projection);
    };

    model.selectedStarProperty.link((star) => {
      this.starLink?.dispose();
      const hideBelowHorizon = options?.hideBelowHorizonProperty;
      this.starLink = star
        ? Multilink.multilinkAny(
            [
              star.raProperty,
              star.decProperty,
              model.latitudeProperty,
              model.siderealTimeProperty,
              ...(hideBelowHorizon ? [hideBelowHorizon] : []),
            ],
            update,
          )
        : null;
      update();
    });

    projection.viewMatrixProperty.link(update);
  }
}
