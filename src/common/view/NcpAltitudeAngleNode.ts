/**
 * NcpAltitudeAngleNode.ts
 *
 * Marks the altitude of the north celestial pole on the horizon dome. At
 * latitude φ the NCP sits at altitude |φ| due north (or the SCP due south for
 * southern latitudes). Draws a small arc from the horizon up the meridian to
 * the visible pole, labeled with |φ|°.
 */

import { DerivedProperty, Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { altAzToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";

const ZENITH = new Vector3(0, 0, 1);
const ARC_SAMPLES = 16;
/** How far out from the meridian vertex the label sits (unit-sphere radians). */
const LABEL_OFFSET = 0.22;

export class NcpAltitudeAngleNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    visibleProperty: TReadOnlyProperty<boolean>,
  ) {
    super();

    const arc = new Path(null, { stroke: RotatingSkyColors.cardinalLabelColorProperty, lineWidth: 1.5 });
    const label = new Text("", {
      font: new PhetFont({ size: 12, weight: "bold" }),
      fill: RotatingSkyColors.cardinalLabelColorProperty,
    });
    this.children = [arc, label];

    const angleStringProperty = new DerivedProperty(
      [latitudeProperty],
      (latitude) => `${Math.round(Math.abs(latitude))}°`,
    );
    angleStringProperty.link((string) => {
      label.string = string;
    });

    Multilink.multilink([projection.viewMatrixProperty, latitudeProperty], (_matrix, latitude) => {
      // Northern observers: NCP at alt = +lat due north. Southern: SCP at alt = −lat due south.
      const poleAlt = Math.abs(latitude);
      const poleAz = latitude >= 0 ? 0 : 180;
      const horizon = altAzToVector3(0, poleAz);
      const pole = altAzToVector3(poleAlt, poleAz);

      const shape = new Shape();
      for (let i = 0; i <= ARC_SAMPLES; i++) {
        const t = i / ARC_SAMPLES;
        const alt = t * poleAlt;
        const screen = projection.project(altAzToVector3(alt, poleAz));
        if (i === 0) {
          shape.moveToPoint(screen);
        } else {
          shape.lineToPoint(screen);
        }
      }
      arc.shape = shape;

      // Label just east of the mid-altitude point on the meridian.
      const mid = altAzToVector3(poleAlt / 2, poleAz);
      const east = ZENITH.cross(mid).normalized();
      const labelPoint = mid.plus(east.timesScalar(LABEL_OFFSET)).normalized();
      label.center = projection.project(labelPoint);

      this.pickable = false;
      const show = projection.isFrontFacing(horizon) || projection.isFrontFacing(pole);
      arc.visible = show;
      label.visible = show && poleAlt > 0.5;
    });

    visibleProperty.link((visible) => {
      this.visible = visible;
    });
  }
}
