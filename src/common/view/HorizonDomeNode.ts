/**
 * HorizonDomeNode.ts
 *
 * The observer's local sky drawn as a wireframe dome: the horizon circle,
 * altitude rings, azimuth lines, the meridian, the cardinal points (N/E/S/W),
 * the zenith, and the celestial pole markers (NCP/SCP) whose altitude tracks the
 * observer's latitude. Re-projects whenever the camera (view matrix) moves or
 * the latitude changes.
 *
 * World frame = horizon frame: +Z zenith, +X north, +Y east.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import { Circle, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { altAzToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectMultiPolylineShape, projectPolylineShape, smallCirclePoints } from "./skyGraphics.js";

const ZENITH = new Vector3(0, 0, 1);
const ALTITUDE_RINGS = [30, 60]; // degrees above the horizon
const AZIMUTH_LINES = [45, 90, 135, 225, 270, 315]; // degrees (N-S meridian drawn separately)
const POLE_DOT_RADIUS = 4;
const LABEL_OFFSET = 14; // px, pushes labels just outside the projected point

/** Upper-hemisphere arc (alt 0→90) of a vertical circle at a fixed azimuth. */
const azimuthLinePoints = (azDeg: number): Vector3[] => {
  const points: Vector3[] = [];
  for (let alt = 0; alt <= 90; alt += 7.5) {
    points.push(altAzToVector3(alt, azDeg));
  }
  return points;
};

/** Upper meridian arc: N (alt 0) → zenith → S (alt 0). */
const meridianPoints = (): Vector3[] => [...azimuthLinePoints(0), ...azimuthLinePoints(180).reverse()];

export class HorizonDomeNode extends Node {
  public constructor(projection: SkyProjection, latitudeProperty: TReadOnlyProperty<number>) {
    super();

    const ringsPath = new Path(null, {
      stroke: RotatingSkyColors.gridColorProperty,
      lineWidth: 1,
    });
    const linesPath = new Path(null, {
      stroke: RotatingSkyColors.gridColorProperty,
      lineWidth: 1,
    });
    const meridianPath = new Path(null, {
      stroke: RotatingSkyColors.gridColorProperty,
      lineWidth: 1.5,
    });
    const horizonPath = new Path(null, {
      stroke: RotatingSkyColors.horizonColorProperty,
      lineWidth: 3,
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

    const poleDot = (): Circle => new Circle(POLE_DOT_RADIUS, { fill: RotatingSkyColors.cardinalLabelColorProperty });
    const ncpDot = poleDot();
    const scpDot = poleDot();
    const poleLabel = (label: string): Text =>
      new Text(label, {
        font: new PhetFont({ size: 12 }),
        fill: RotatingSkyColors.cardinalLabelColorProperty,
      });
    const ncpText = poleLabel("NCP");
    const scpText = poleLabel("SCP");

    this.children = [
      ringsPath,
      linesPath,
      meridianPath,
      horizonPath,
      northText,
      eastText,
      southText,
      westText,
      ncpDot,
      scpDot,
      ncpText,
      scpText,
    ];

    // Place a label just outside the sphere center direction of its point.
    const placeLabel = (text: Node, point: Vector3): void => {
      const screen = projection.project(point);
      const away = screen.minus(projection.center);
      const offset = away.magnitude > 0 ? away.normalized().timesScalar(LABEL_OFFSET) : away;
      text.center = screen.plus(offset);
    };

    Multilink.multilink([projection.viewMatrixProperty, latitudeProperty], (_matrix, latitude) => {
      // Static dome geometry.
      ringsPath.shape = projectMultiPolylineShape(
        projection,
        ALTITUDE_RINGS.map((alt) => smallCirclePoints(ZENITH, 90 - alt)),
        true,
      );
      linesPath.shape = projectMultiPolylineShape(
        projection,
        AZIMUTH_LINES.map((az) => azimuthLinePoints(az)),
        false,
      );

      meridianPath.shape = projectPolylineShape(projection, meridianPoints(), false);
      horizonPath.shape = projectPolylineShape(projection, smallCirclePoints(ZENITH, 90), true);

      placeLabel(northText, altAzToVector3(0, 0));
      placeLabel(eastText, altAzToVector3(0, 90));
      placeLabel(southText, altAzToVector3(0, 180));
      placeLabel(westText, altAzToVector3(0, 270));

      // Celestial poles: NCP due north at altitude = latitude; SCP is its antipode.
      // Show whichever pole is above the horizon for this observer.
      const ncp = altAzToVector3(latitude, 0);
      const scp = altAzToVector3(-latitude, 180);
      ncpDot.center = projection.project(ncp);
      scpDot.center = projection.project(scp);
      ncpDot.visible = latitude >= 0;
      scpDot.visible = latitude <= 0;
      placeLabel(ncpText, ncp);
      placeLabel(scpText, scp);
      ncpText.visible = ncpDot.visible;
      scpText.visible = scpDot.visible;
    });
  }
}
