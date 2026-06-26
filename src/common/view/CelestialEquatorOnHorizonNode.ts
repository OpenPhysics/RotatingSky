/**
 * CelestialEquatorOnHorizonNode.ts
 *
 * Draws the celestial equator as a great circle on the horizon diagram. The
 * equator is the set of dec = 0 points, which in the horizon frame is the great
 * circle perpendicular to the celestial-pole axis (altitude = latitude, due
 * north). It is fixed for a given latitude (stars slide along it as time passes)
 * and always meets the horizon at the due-east and due-west points. The far half
 * is dashed.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { altAzToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectSplitPolyline, smallCirclePoints } from "./skyGraphics.js";

export class CelestialEquatorOnHorizonNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    visibleProperty: TReadOnlyProperty<boolean>,
  ) {
    super();

    const back = new Path(null, {
      stroke: RotatingSkyColors.celestialEquatorColorProperty,
      lineWidth: 1.5,
      lineDash: [5, 4],
      opacity: 0.6,
    });
    const front = new Path(null, { stroke: RotatingSkyColors.celestialEquatorColorProperty, lineWidth: 1.5 });
    this.children = [back, front];

    Multilink.multilink([projection.viewMatrixProperty, latitudeProperty], (_matrix, latitude) => {
      // Celestial-pole axis: due north at altitude = latitude.
      const poleAxis = altAzToVector3(latitude, 0);
      const split = projectSplitPolyline(projection, smallCirclePoints(poleAxis, 90), true);
      front.shape = split.front;
      back.shape = split.back;
    });

    visibleProperty.link((visible) => {
      this.visible = visible;
    });
  }
}
