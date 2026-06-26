/**
 * CelestialSphereNode.ts
 *
 * The celestial sphere drawn as a transparent wireframe in the equatorial frame
 * (+Z = NCP): the silhouette, the RA/Dec graticule, the celestial equator, the
 * ecliptic, and the pole markers. Lines on the far hemisphere are dashed.
 * Re-projects whenever the view matrix (camera ∘ frame) changes.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { raDecToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { addSplitPolyline, projectSplitPolyline, smallCirclePoints } from "./skyGraphics.js";

export type CelestialSphereNodeOptions = {
  /** Toggles the N/E/S/W and NCP/SCP labels. Defaults to always visible. */
  labelsVisibleProperty?: TReadOnlyProperty<boolean>;
  /** Toggles the celestial equator. Defaults to always visible. */
  celestialEquatorVisibleProperty?: TReadOnlyProperty<boolean>;
  /** Toggles the 0ʰ hour circle (RA = 0ʰ great circle). Defaults to always visible. */
  hourCircleVisibleProperty?: TReadOnlyProperty<boolean>;
};

const NCP = new Vector3(0, 0, 1);
const SCP = new Vector3(0, 0, -1);
// Normal of the RA 0ʰ/12ʰ plane (the 0ʰ hour circle lies in this plane).
const HOUR_CIRCLE_POLE = new Vector3(0, 1, 0);
const RA_ZERO = new Vector3(1, 0, 0); // RA 0ʰ on the equator, where the "0h" label sits
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
  public constructor(projection: SkyProjection, options?: CelestialSphereNodeOptions) {
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

    // The 0ʰ hour circle is grouped so a single visibility toggle hides it all.
    const hourCircleFront = solid(RotatingSkyColors.accentColorProperty, 2);
    const hourCircleBack = dashed(RotatingSkyColors.accentColorProperty, 2);
    const hourCircleLabel = new Text("0ʰ", { font: new PhetFont(12), fill: RotatingSkyColors.accentColorProperty });
    const hourCircle = new Node({ children: [hourCircleBack, hourCircleFront, hourCircleLabel] });

    const poleDot = (): Circle => new Circle(POLE_DOT_RADIUS, { fill: RotatingSkyColors.cardinalLabelColorProperty });
    const ncpDot = poleDot();
    const scpDot = poleDot();
    const poleLabel = (label: string): Text =>
      new Text(label, { font: new PhetFont(12), fill: RotatingSkyColors.cardinalLabelColorProperty });
    const ncpText = poleLabel("NCP");
    const scpText = poleLabel("SCP");

    // Group the optionally-toggled elements so one link hides each whole feature.
    const celestialEquator = new Node({ children: [equatorBack, equatorFront] });
    const labels = new Node({ children: [ncpText, scpText] });

    this.children = [
      outline,
      gridBack,
      eclipticBack,
      gridFront,
      eclipticFront,
      celestialEquator,
      hourCircle,
      ncpDot,
      scpDot,
      labels,
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

      const hourCircleSplit = projectSplitPolyline(projection, smallCirclePoints(HOUR_CIRCLE_POLE, 90), true);
      hourCircleFront.shape = hourCircleSplit.front;
      hourCircleBack.shape = hourCircleSplit.back;
      placeLabel(hourCircleLabel, RA_ZERO);
      hourCircleLabel.visible = projection.isFrontFacing(RA_ZERO);

      ncpDot.center = projection.project(NCP);
      scpDot.center = projection.project(SCP);
      placeLabel(ncpText, NCP);
      placeLabel(scpText, SCP);
      ncpText.visible = projection.isFrontFacing(NCP);
      scpText.visible = projection.isFrontFacing(SCP);
    });

    options?.celestialEquatorVisibleProperty?.link((visible) => {
      celestialEquator.visible = visible;
    });
    options?.hourCircleVisibleProperty?.link((visible) => {
      hourCircle.visible = visible;
    });
    options?.labelsVisibleProperty?.link((visible) => {
      labels.visible = visible;
    });
  }
}
