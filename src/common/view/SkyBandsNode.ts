/**
 * SkyBandsNode.ts
 *
 * Shades the circumpolar "band" on the horizon dome: the cap of sky around the
 * elevated celestial pole within which stars never set. Its angular radius
 * equals the observer's |latitude|, so it grows from a point at the equator to
 * the whole sky at the pole. Toggled by the model's `bandsVisibleProperty`.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { altAzToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectFilledShape, projectPolylineShape, smallCirclePoints } from "./skyGraphics.js";

export class SkyBandsNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    visibleProperty: TReadOnlyProperty<boolean>,
  ) {
    super();

    const capFill = new Path(null, { fill: RotatingSkyColors.bandCircumpolarColorProperty });
    const capStroke = new Path(null, {
      stroke: RotatingSkyColors.bandCircumpolarColorProperty,
      lineWidth: 2,
      lineDash: [6, 4],
    });
    this.children = [capFill, capStroke];

    Multilink.multilink([projection.viewMatrixProperty, latitudeProperty], (_matrix, latitude) => {
      const absLat = Math.abs(latitude);
      if (absLat < 0.5) {
        capFill.shape = null;
        capStroke.shape = null;
        return;
      }
      // Elevated pole: NCP (north) in the N hemisphere, SCP (south) in the S.
      const poleAxis = latitude >= 0 ? altAzToVector3(latitude, 0) : altAzToVector3(absLat, 180);
      const boundary = smallCirclePoints(poleAxis, absLat);
      capFill.shape = projectFilledShape(projection, boundary);
      capStroke.shape = projectPolylineShape(projection, boundary, true);
    });

    visibleProperty.link((visible) => {
      this.visible = visible;
    });
  }
}
