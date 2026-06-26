/**
 * CelestialPoleAxisNode.ts
 *
 * Draws short blue stubs extending outward from the NCP and SCP on the horizon
 * dome. The near segment is solid; the far segment is dashed.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { altAzToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { addSplitPolyline } from "./skyGraphics.js";

const AXIS_EXTENSION = 0.18;

/** Outward stubs from each pole marker on the dome surface. */
const poleAxisSegments = (latitudeDeg: number): Vector3[][] => {
  const ncp = altAzToVector3(latitudeDeg, 0);
  const scp = altAzToVector3(-latitudeDeg, 180);
  return [
    [ncp, ncp.plus(ncp.normalized().timesScalar(AXIS_EXTENSION))],
    [scp, scp.plus(scp.normalized().timesScalar(AXIS_EXTENSION))],
  ];
};

export class CelestialPoleAxisNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    visibleProperty: TReadOnlyProperty<boolean>,
  ) {
    super();

    const backPath = new Path(null, {
      stroke: RotatingSkyColors.accentColorProperty,
      lineWidth: 2,
      lineDash: [5, 4],
      opacity: 0.6,
    });
    const frontPath = new Path(null, { stroke: RotatingSkyColors.accentColorProperty, lineWidth: 2 });
    this.children = [backPath, frontPath];

    Multilink.multilink([projection.viewMatrixProperty, latitudeProperty], (_m, latitude) => {
      const frontShape = new Shape();
      const backShape = new Shape();
      for (const segment of poleAxisSegments(latitude)) {
        addSplitPolyline(projection, segment, false, frontShape, backShape);
      }
      frontPath.shape = frontShape;
      backPath.shape = backShape;
    });

    visibleProperty.link((visible) => {
      this.visible = visible;
    });
  }
}
