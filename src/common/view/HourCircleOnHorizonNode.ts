/**
 * HourCircleOnHorizonNode.ts
 *
 * Draws the 0ʰ hour circle (the great circle through the celestial poles at
 * RA = 0ʰ) on the horizon diagram. The circle rotates with local sidereal time
 * as the sky turns. The far half is dashed.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector3 } from "scenerystack/dot";
import { Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { equatorialToHorizonVector } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectSplitPolyline } from "./skyGraphics.js";

const LABEL_OFFSET = 14;

/** Sample the RA = 0ʰ hour circle in the horizon frame. */
const hourCirclePoints = (latitudeDeg: number, lstHours: number): Vector3[] => {
  const points: Vector3[] = [];
  for (let dec = -90; dec <= 90; dec += 7.5) {
    points.push(equatorialToHorizonVector(0, dec, latitudeDeg, lstHours));
  }
  return points;
};

export class HourCircleOnHorizonNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    siderealTimeProperty: TReadOnlyProperty<number>,
    visibleProperty: TReadOnlyProperty<boolean>,
  ) {
    super();

    const back = new Path(null, {
      stroke: RotatingSkyColors.accentColorProperty,
      lineWidth: 1.5,
      lineDash: [5, 4],
      opacity: 0.6,
    });
    const front = new Path(null, { stroke: RotatingSkyColors.accentColorProperty, lineWidth: 1.5 });
    const label = new Text("0ʰ", { font: new PhetFont(12), fill: RotatingSkyColors.accentColorProperty });
    this.children = [back, front, label];

    Multilink.multilink(
      [projection.viewMatrixProperty, latitudeProperty, siderealTimeProperty],
      (_m, latitude, lst) => {
        const split = projectSplitPolyline(projection, hourCirclePoints(latitude, lst), false);
        front.shape = split.front;
        back.shape = split.back;

        const equatorPoint = equatorialToHorizonVector(0, 0, latitude, lst);
        const screen = projection.project(equatorPoint);
        const away = screen.minus(projection.center);
        label.center = screen.plus(away.magnitude > 0 ? away.normalized().timesScalar(LABEL_OFFSET) : away);
        label.visible = projection.isFrontFacing(equatorPoint);
      },
    );

    visibleProperty.link((visible) => {
      this.visible = visible;
    });
  }
}
