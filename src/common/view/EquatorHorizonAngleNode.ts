/**
 * EquatorHorizonAngleNode.ts
 *
 * Marks the angle between the celestial equator and the horizon on the horizon
 * diagram. The celestial equator meets the horizon at the due-east point, where
 * it rises at an angle of (90° − |latitude|). This node draws that angle as a
 * small arc with a numeric label at the east point, hidden when the vertex is on
 * the far side of the dome.
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
const ARC_RADIANS = 0.32; // angular radius of the arc around the east point
const ARC_SAMPLES = 16;

/** Slerp-free small-arc interpolation between two unit directions, re-normalized. */
const blendDirection = (a: Vector3, b: Vector3, t: number): Vector3 =>
  a
    .timesScalar(1 - t)
    .plus(b.timesScalar(t))
    .normalized();

export class EquatorHorizonAngleNode extends Node {
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
      (latitude) => `${Math.round(90 - Math.abs(latitude))}°`,
    );
    angleStringProperty.link((string) => {
      label.string = string;
    });

    Multilink.multilink([projection.viewMatrixProperty, latitudeProperty], (_matrix, latitude) => {
      // Vertex: the due-east point, where the equator always crosses the horizon.
      const vertex = altAzToVector3(0, 90);
      // Tangent to the horizon at the vertex (toward the south point).
      const horizonTangent = ZENITH.cross(vertex).normalized();
      // Tangent to the equator at the vertex (perpendicular to the pole axis).
      const poleAxis = altAzToVector3(latitude, 0);
      const equatorTangent = poleAxis.cross(vertex).normalized();

      const directionToPoint = (direction: Vector3): Vector3 =>
        vertex.timesScalar(Math.cos(ARC_RADIANS)).plus(direction.timesScalar(Math.sin(ARC_RADIANS)));

      const shape = new Shape();
      for (let i = 0; i <= ARC_SAMPLES; i++) {
        const dir = blendDirection(horizonTangent, equatorTangent, i / ARC_SAMPLES);
        const screen = projection.project(directionToPoint(dir));
        if (i === 0) {
          shape.moveToPoint(screen);
        } else {
          shape.lineToPoint(screen);
        }
      }
      arc.shape = shape;

      // Label just outside the middle of the arc.
      const midDir = blendDirection(horizonTangent, equatorTangent, 0.5);
      const midPoint = vertex
        .timesScalar(Math.cos(ARC_RADIANS * 1.6))
        .plus(midDir.timesScalar(Math.sin(ARC_RADIANS * 1.6)));
      label.center = projection.project(midPoint);

      this.pickable = false;
      arc.visible = projection.isFrontFacing(vertex);
      label.visible = projection.isFrontFacing(vertex);
    });

    visibleProperty.link((visible) => {
      this.visible = visible;
    });
  }
}
