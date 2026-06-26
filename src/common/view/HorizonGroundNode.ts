/**
 * HorizonGroundNode.ts
 *
 * The observer's ground plane on the horizon dome: a filled green disk in the
 * horizontal plane with N/E/S/W labels printed on the grass. The stick figure
 * at the sphere center lives in {@link HorizonObserverNode}, above the wireframe.
 *
 * World frame = horizon frame: +Z zenith, +X north, +Y east.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { clamp, Vector3 } from "scenerystack/dot";
import { Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { degToRad } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectFilledShape, projectPolylineShape, smallCirclePoints } from "./skyGraphics.js";

const ZENITH = new Vector3(0, 0, 1);

/** Where the cardinal labels sit on the flat ground disk, as a fraction of the rim radius (1 = on the horizon). */
const GROUND_CARDINAL_RADIUS = 0.9;
/** Azimuth step used to measure the local ground tangent for label rotation. */
const GROUND_TANGENT_AZ_STEP_DEG = 6;

export type HorizonGroundNodeOptions = {
  /** Toggles the N/E/S/W labels on the ground disk. Defaults to always visible. */
  labelsVisibleProperty?: TReadOnlyProperty<boolean>;
};

export class HorizonGroundNode extends Node {
  public constructor(projection: SkyProjection, options?: HorizonGroundNodeOptions) {
    super();

    const groundFill = new Path(null, { fill: RotatingSkyColors.groundColorProperty });
    const groundEdge = new Path(null, {
      stroke: RotatingSkyColors.horizonColorProperty,
      lineWidth: 1,
    });

    const cardinal = (label: string): Text =>
      new Text(label, {
        font: new PhetFont({ size: 16, weight: "bold" }),
        fill: RotatingSkyColors.cardinalLabelColorProperty,
        pickable: false,
      });
    const northText = cardinal("N");
    const eastText = cardinal("E");
    const southText = cardinal("S");
    const westText = cardinal("W");
    const labels = new Node({ children: [northText, eastText, southText, westText], pickable: false });

    this.children = [groundFill, groundEdge, labels];

    /** Point on the flat ground disk (z = 0) at radius `radius` and azimuth `azDeg`. */
    const groundPoint = (azDeg: number, radius: number): Vector3 => {
      const az = degToRad(azDeg);
      return new Vector3(radius * Math.cos(az), radius * Math.sin(az), 0);
    };

    /** Lay a label flat on the ground disk, tangent to the horizon circle. */
    const placeLabel = (text: Text, azDeg: number): void => {
      const anchor = groundPoint(azDeg, GROUND_CARDINAL_RADIUS);
      const screen = projection.project(anchor);
      const tangentEnd = groundPoint(azDeg + GROUND_TANGENT_AZ_STEP_DEG, GROUND_CARDINAL_RADIUS);
      const tangent = projection.project(tangentEnd).minus(screen);

      if (tangent.magnitude === 0) {
        text.visible = false;
        return;
      }

      // Baseline follows the local eastward rim direction; scale foreshortens edge-on labels.
      const referenceTangent =
        GROUND_CARDINAL_RADIUS * ((Math.PI / 180) * GROUND_TANGENT_AZ_STEP_DEG) * projection.radius;
      text.rotation = Math.atan2(tangent.y, tangent.x);
      text.setScaleMagnitude(clamp(tangent.magnitude / referenceTangent, 0.35, 1));
      text.center = screen;
      text.visible = true;
    };

    Multilink.multilink([projection.viewMatrixProperty], () => {
      const horizon = smallCirclePoints(ZENITH, 90);
      groundFill.shape = projectFilledShape(projection, horizon);
      groundEdge.shape = projectPolylineShape(projection, horizon, true);

      // Labels are painted on the top surface of the opaque grass disk, so they
      // are all visible whenever that surface faces the viewer (camera above the
      // horizon) and hidden when looking at the underside.
      if (projection.isFrontFacing(ZENITH)) {
        placeLabel(northText, 0);
        placeLabel(eastText, 90);
        placeLabel(southText, 180);
        placeLabel(westText, 270);
      } else {
        northText.visible = false;
        eastText.visible = false;
        southText.visible = false;
        westText.visible = false;
      }
    });

    options?.labelsVisibleProperty?.link((visible) => {
      labels.visible = visible;
    });
  }
}
