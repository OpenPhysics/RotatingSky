/**
 * HorizonDomeNode.ts
 *
 * The observer's celestial sphere drawn as a transparent wireframe in the
 * horizon frame (+Z = zenith, +X = north, +Y = east): the outer silhouette,
 * altitude rings, azimuth meridians, the N–S meridian, and the celestial pole
 * markers (NCP/SCP). The far hemisphere is dashed. Cardinal labels (N/E/S/W)
 * live on {@link HorizonGroundNode}.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { altAzToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { addSplitSmoothPolyline, smallCirclePoints } from "./skyGraphics.js";

const ZENITH = new Vector3(0, 0, 1);
const NADIR = new Vector3(0, 0, -1);
const ALTITUDE_RINGS_UPPER = [30, 60];
const ALTITUDE_RINGS_FULL = [-60, -30, 30, 60];
const AZIMUTH_LINES = [45, 90, 135, 225, 270, 315];
const POLE_DOT_RADIUS = 4;
const LABEL_OFFSET = 14;
const GRID_DASH = [4, 4];

/** Vertical-circle arc at a fixed azimuth, over the inclusive altitude range. */
const azimuthLinePoints = (azDeg: number, altFrom = 0, altTo = 90): Vector3[] => {
  const points: Vector3[] = [];
  const step = altFrom <= altTo ? 7.5 : -7.5;
  for (let alt = altFrom; step > 0 ? alt <= altTo : alt >= altTo; alt += step) {
    points.push(altAzToVector3(alt, azDeg));
  }
  return points;
};

/** Upper meridian arc: N (alt 0) → zenith → S (alt 0). */
const meridianUpperPoints = (): Vector3[] => [...azimuthLinePoints(0), ...azimuthLinePoints(180).reverse()];

/** Full meridian arc: N → zenith → S → nadir → N. */
const meridianFullPoints = (): Vector3[] => [
  ...azimuthLinePoints(0, 0, 90),
  ...azimuthLinePoints(180, 90, -90),
  ...azimuthLinePoints(0, -90, 0),
];

export type HorizonDomeNodeOptions = {
  /** Toggles the below-horizon wireframe. Defaults to visible. */
  undersideVisibleProperty?: TReadOnlyProperty<boolean>;
  /** Toggles the NCP/SCP labels only (Explorer). Ignored when celestialPolesVisibleProperty is set. */
  labelsVisibleProperty?: TReadOnlyProperty<boolean>;
  /** Toggles NCP/SCP dots and labels together (Horizon System). */
  celestialPolesVisibleProperty?: TReadOnlyProperty<boolean>;
  /** Toggles the north–south meridian arc. Defaults to visible. */
  meridianVisibleProperty?: TReadOnlyProperty<boolean>;
  /** Toggles the Zenith and Nadir labels. */
  zenithNadirLabelsVisibleProperty?: TReadOnlyProperty<boolean>;
};

export class HorizonDomeNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    options?: HorizonDomeNodeOptions,
  ) {
    super({ pickable: false });

    const outline = new Circle(projection.radius, {
      stroke: RotatingSkyColors.sphereOutlineColorProperty,
      lineWidth: 1,
      center: projection.center,
    });

    const gridFront = new Path(null, {
      stroke: RotatingSkyColors.gridColorProperty,
      lineWidth: 0.75,
    });
    const gridBack = new Path(null, {
      stroke: RotatingSkyColors.gridColorProperty,
      lineWidth: 0.75,
      lineDash: GRID_DASH,
      opacity: 0.55,
    });

    const meridianFront = new Path(null, {
      stroke: RotatingSkyColors.gridColorProperty,
      lineWidth: 1,
    });
    const meridianBack = new Path(null, {
      stroke: RotatingSkyColors.gridColorProperty,
      lineWidth: 1,
      lineDash: GRID_DASH,
      opacity: 0.55,
    });
    const meridian = new Node({ children: [meridianBack, meridianFront] });

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
    const poleLabels = new Node({ children: [ncpText, scpText] });
    const celestialPoles = new Node({ children: [ncpDot, scpDot, poleLabels] });

    const pointLabel = (label: string): Text =>
      new Text(label, {
        font: new PhetFont({ size: 12 }),
        fill: RotatingSkyColors.cardinalLabelColorProperty,
      });
    const zenithText = pointLabel("Zenith");
    const nadirText = pointLabel("Nadir");
    const zenithNadirLabels = new Node({ children: [zenithText, nadirText], visible: false });

    this.children = [outline, gridBack, gridFront, meridian, celestialPoles, zenithNadirLabels];

    const placeLabel = (text: Node, point: Vector3): void => {
      const screen = projection.project(point);
      const away = screen.minus(projection.center);
      const offset = away.magnitude > 0 ? away.normalized().timesScalar(LABEL_OFFSET) : away;
      text.center = screen.plus(offset);
    };

    const updateGrid = (): void => {
      const includeUnderside = options?.undersideVisibleProperty?.value ?? true;
      const meridianVisible = options?.meridianVisibleProperty?.value ?? true;
      const altitudeRings = includeUnderside ? ALTITUDE_RINGS_FULL : ALTITUDE_RINGS_UPPER;
      const azimuthFrom = includeUnderside ? -90 : 0;

      outline.center = projection.center;

      const frontGrid = new Shape();
      const backGrid = new Shape();
      for (const alt of altitudeRings) {
        addSplitSmoothPolyline(projection, smallCirclePoints(ZENITH, 90 - alt), true, frontGrid, backGrid);
      }
      for (const az of AZIMUTH_LINES) {
        addSplitSmoothPolyline(projection, azimuthLinePoints(az, azimuthFrom, 90), false, frontGrid, backGrid);
      }
      gridFront.shape = frontGrid;
      gridBack.shape = backGrid;

      if (meridianVisible) {
        const frontMeridian = new Shape();
        const backMeridian = new Shape();
        const meridianPoints = includeUnderside ? meridianFullPoints() : meridianUpperPoints();
        addSplitSmoothPolyline(projection, meridianPoints, false, frontMeridian, backMeridian);
        meridianFront.shape = frontMeridian;
        meridianBack.shape = backMeridian;
        meridian.visible = true;
      } else {
        meridian.visible = false;
      }
    };

    projection.viewMatrixProperty.link(updateGrid);
    options?.undersideVisibleProperty?.link(updateGrid);
    options?.meridianVisibleProperty?.link(updateGrid);
    updateGrid();

    Multilink.multilink([projection.viewMatrixProperty, latitudeProperty], (_matrix, latitude) => {
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

      placeLabel(zenithText, ZENITH);
      placeLabel(nadirText, NADIR);
      zenithText.visible = projection.isFrontFacing(ZENITH);
      nadirText.visible = projection.isFrontFacing(NADIR);
    });

    if (options?.celestialPolesVisibleProperty) {
      options.celestialPolesVisibleProperty.link((visible) => {
        celestialPoles.visible = visible;
      });
    } else {
      options?.labelsVisibleProperty?.link((visible) => {
        poleLabels.visible = visible;
      });
    }

    options?.zenithNadirLabelsVisibleProperty?.link((visible) => {
      zenithNadirLabels.visible = visible;
    });
  }
}
