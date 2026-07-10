/**
 * CelestialPoleAltitudeNode.ts
 *
 * Marks the altitude of the celestial pole on the celestial sphere (equatorial
 * world frame). At latitude φ the elevated pole sits |φ|° above the horizon
 * along the local meridian. Draws a small arc from the horizon up to that pole,
 * labeled with |φ|°. Used on the Celestial Sphere screen when the view has
 * morphing toward the horizon orientation.
 */

import { DerivedProperty, Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { raDecToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";

const NCP = new Vector3(0, 0, 1);
const SCP = new Vector3(0, 0, -1);
const ARC_SAMPLES = 16;
/** How far out from the meridian vertex the label sits (unit-sphere radians). */
const LABEL_OFFSET = 0.22;

export class CelestialPoleAltitudeNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    siderealTimeProperty: TReadOnlyProperty<number>,
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

    Multilink.multilink(
      [projection.viewMatrixProperty, latitudeProperty, siderealTimeProperty],
      (_matrix, latitude, lst) => {
        const poleAlt = Math.abs(latitude);
        const elevatedPole = latitude >= 0 ? NCP : SCP;
        const zenith = raDecToVector3(lst, latitude);

        // North (or south) point on the horizon: the elevated pole's component
        // perpendicular to the zenith, lying in the local meridian plane.
        const alongZenith = elevatedPole.dot(zenith);
        const towardPole = elevatedPole.minus(zenith.timesScalar(alongZenith));
        if (towardPole.magnitude < 1e-6 || poleAlt < 0.5) {
          arc.visible = false;
          label.visible = false;
          return;
        }
        const horizonPoint = towardPole.normalized();

        const shape = new Shape();
        const angle = Math.acos(Math.max(-1, Math.min(1, horizonPoint.dot(elevatedPole))));
        const perp = elevatedPole.minus(horizonPoint.timesScalar(horizonPoint.dot(elevatedPole))).normalized();
        for (let i = 0; i <= ARC_SAMPLES; i++) {
          const t = (i / ARC_SAMPLES) * angle;
          const point = horizonPoint.timesScalar(Math.cos(t)).plus(perp.timesScalar(Math.sin(t)));
          const screen = projection.project(point);
          if (i === 0) {
            shape.moveToPoint(screen);
          } else {
            shape.lineToPoint(screen);
          }
        }
        arc.shape = shape;

        const midAngle = angle / 2;
        const mid = horizonPoint.timesScalar(Math.cos(midAngle)).plus(perp.timesScalar(Math.sin(midAngle)));
        const east = zenith.cross(mid).normalized();
        const labelPoint = mid.plus(east.timesScalar(LABEL_OFFSET)).normalized();
        label.center = projection.project(labelPoint);

        this.pickable = false;
        const show = projection.isFrontFacing(horizonPoint) || projection.isFrontFacing(elevatedPole);
        arc.visible = show;
        label.visible = show;
      },
    );

    visibleProperty.link((visible) => {
      this.visible = visible;
    });
  }
}
