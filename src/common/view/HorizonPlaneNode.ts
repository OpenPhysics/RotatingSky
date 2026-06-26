/**
 * HorizonPlaneNode.ts
 *
 * The observer's horizon drawn as a great circle on the celestial sphere, tilted
 * so its pole (the zenith) sits at RA = LST, Dec = latitude. Shown on the
 * Celestial Sphere and Explorer screens. The far half is dashed.
 *
 * Paint order is split across {@link backLayer} and {@link frontLayer} so callers
 * can sandwich the Earth globe between the dashed and solid halves.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Circle, Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { raDecToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectSplitPolyline, smallCirclePoints } from "./skyGraphics.js";

export class HorizonPlaneNode extends Node {
  /** Dashed far-side half — paint before the Earth globe. */
  public readonly backLayer: Node;
  /** Solid near-side half and zenith marker — paint after the Earth globe. */
  public readonly frontLayer: Node;

  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    siderealTimeProperty: TReadOnlyProperty<number>,
  ) {
    super();

    const back = new Path(null, {
      stroke: RotatingSkyColors.horizonColorProperty,
      lineWidth: 1,
      lineDash: [5, 4],
      opacity: 0.6,
    });
    const front = new Path(null, { stroke: RotatingSkyColors.horizonColorProperty, lineWidth: 1 });
    const zenithDot = new Circle(4, { fill: RotatingSkyColors.horizonColorProperty });

    this.backLayer = new Node({ children: [back] });
    this.frontLayer = new Node({ children: [front, zenithDot] });

    Multilink.multilink(
      [projection.viewMatrixProperty, latitudeProperty, siderealTimeProperty],
      (_matrix, latitude, lst) => {
        const zenithAxis = raDecToVector3(lst, latitude);
        const split = projectSplitPolyline(projection, smallCirclePoints(zenithAxis, 90), true);
        front.shape = split.front;
        back.shape = split.back;
        zenithDot.center = projection.project(zenithAxis);
        zenithDot.visible = projection.isFrontFacing(zenithAxis);
      },
    );
  }
}
