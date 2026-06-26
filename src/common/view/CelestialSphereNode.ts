/**
 * CelestialSphereNode.ts
 *
 * The celestial sphere drawn as a transparent wireframe in the equatorial frame
 * (+Z = NCP): the silhouette, the RA/Dec graticule, the celestial equator, the
 * ecliptic, and the pole markers. Lines on the far hemisphere are dashed.
 * Re-projects whenever the view matrix (camera ∘ frame) changes.
 */

import { Multilink } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { raDecToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { addSplitPolyline, projectSplitPolyline, smallCirclePoints } from "./skyGraphics.js";

const NCP = new Vector3(0, 0, 1);
const SCP = new Vector3(0, 0, -1);
const DEC_CIRCLES = [-60, -30, 30, 60]; // degrees (0 is the equator, drawn separately)
const RA_MERIDIANS = [0, 3, 6, 9, 12, 15, 18, 21]; // hours
const ECLIPTIC_POLE = raDecToVector3(18, 66.56); // 23.44° from the NCP
const DASH = [5, 4];
const POLE_DOT_RADIUS = 4;
const LABEL_OFFSET = 14;

/** Half great-circle meridian at a fixed RA, sampled from SCP to NCP. */
const meridianPoints = (raHours: number): Vector3[] => {
  const points: Vector3[] = [];
  for (let dec = -90; dec <= 90; dec += 7.5) {
    points.push(raDecToVector3(raHours, dec));
  }
  return points;
};

export class CelestialSphereNode extends Node {
  public constructor(projection: SkyProjection) {
    super();

    const outline = new Circle(projection.radius, {
      stroke: RotatingSkyColors.sphereOutlineColorProperty,
      lineWidth: 1.5,
      center: projection.center,
    });

    const solid = (color: typeof RotatingSkyColors.gridColorProperty, lineWidth: number): Path =>
      new Path(null, { stroke: color, lineWidth });
    const dashed = (color: typeof RotatingSkyColors.gridColorProperty, lineWidth: number): Path =>
      new Path(null, { stroke: color, lineWidth, lineDash: DASH, opacity: 0.6 });

    const gridFront = solid(RotatingSkyColors.gridColorProperty, 1);
    const gridBack = dashed(RotatingSkyColors.gridColorProperty, 1);
    const equatorFront = solid(RotatingSkyColors.celestialEquatorColorProperty, 2.5);
    const equatorBack = dashed(RotatingSkyColors.celestialEquatorColorProperty, 2.5);
    const eclipticFront = solid(RotatingSkyColors.eclipticColorProperty, 2);
    const eclipticBack = dashed(RotatingSkyColors.eclipticColorProperty, 2);

    const poleDot = (): Circle => new Circle(POLE_DOT_RADIUS, { fill: RotatingSkyColors.cardinalLabelColorProperty });
    const ncpDot = poleDot();
    const scpDot = poleDot();
    const poleLabel = (label: string): Text =>
      new Text(label, { font: new PhetFont(12), fill: RotatingSkyColors.cardinalLabelColorProperty });
    const ncpText = poleLabel("NCP");
    const scpText = poleLabel("SCP");

    this.children = [
      outline,
      gridBack,
      equatorBack,
      eclipticBack,
      gridFront,
      equatorFront,
      eclipticFront,
      ncpDot,
      scpDot,
      ncpText,
      scpText,
    ];

    const placeLabel = (text: Node, point: Vector3): void => {
      const screen = projection.project(point);
      const away = screen.minus(projection.center);
      text.center = screen.plus(away.magnitude > 0 ? away.normalized().timesScalar(LABEL_OFFSET) : away);
    };

    Multilink.multilink([projection.viewMatrixProperty], () => {
      outline.center = projection.center;

      const gridFrontShape = new Shape();
      const gridBackShape = new Shape();
      for (const dec of DEC_CIRCLES) {
        addSplitPolyline(projection, smallCirclePoints(NCP, 90 - dec), true, gridFrontShape, gridBackShape);
      }
      for (const ra of RA_MERIDIANS) {
        addSplitPolyline(projection, meridianPoints(ra), false, gridFrontShape, gridBackShape);
      }
      gridFront.shape = gridFrontShape;
      gridBack.shape = gridBackShape;

      const equator = projectSplitPolyline(projection, smallCirclePoints(NCP, 90), true);
      equatorFront.shape = equator.front;
      equatorBack.shape = equator.back;

      const ecliptic = projectSplitPolyline(projection, smallCirclePoints(ECLIPTIC_POLE, 90), true);
      eclipticFront.shape = ecliptic.front;
      eclipticBack.shape = ecliptic.back;

      ncpDot.center = projection.project(NCP);
      scpDot.center = projection.project(SCP);
      placeLabel(ncpText, NCP);
      placeLabel(scpText, SCP);
      ncpText.visible = projection.isFrontFacing(NCP);
      scpText.visible = projection.isFrontFacing(SCP);
    });
  }
}
