/**
 * HorizonGroundNode.ts
 *
 * The observer's ground plane on the horizon dome: a filled green disk in the
 * horizontal plane and cardinal-direction labels on its rim. The stick figure
 * lives in {@link HorizonObserverNode}, drawn above the dome wireframe.
 *
 * World frame = horizon frame: +Z zenith, +X north, +Y east.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import { Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { altAzToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectFilledShape, projectPolylineShape, smallCirclePoints } from "./skyGraphics.js";

const ZENITH = new Vector3(0, 0, 1);
const NADIR = new Vector3(0, 0, -1);
const LABEL_OFFSET = 12;

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
        font: new PhetFont({ size: 14, weight: "bold" }),
        fill: RotatingSkyColors.cardinalLabelColorProperty,
      });
    const northText = cardinal("N");
    const eastText = cardinal("E");
    const southText = cardinal("S");
    const westText = cardinal("W");
    const labels = new Node({ children: [northText, eastText, southText, westText] });

    this.children = [groundFill, groundEdge, labels];

    const placeLabel = (text: Node, point: Vector3): void => {
      const screen = projection.project(point);
      const away = screen.minus(projection.project(NADIR));
      const offset = away.magnitude > 0 ? away.normalized().timesScalar(LABEL_OFFSET) : away;
      text.center = screen.plus(offset);
      text.visible = projection.isFrontFacing(point);
    };

    Multilink.multilink([projection.viewMatrixProperty], () => {
      const horizon = smallCirclePoints(ZENITH, 90);
      groundFill.shape = projectFilledShape(projection, horizon);
      groundEdge.shape = projectPolylineShape(projection, horizon, true);

      placeLabel(northText, altAzToVector3(0, 0));
      placeLabel(eastText, altAzToVector3(0, 90));
      placeLabel(southText, altAzToVector3(0, 180));
      placeLabel(westText, altAzToVector3(0, 270));
    });

    options?.labelsVisibleProperty?.link((visible) => {
      labels.visible = visible;
    });
  }
}
