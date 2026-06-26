/**
 * EarthGlobeNode.ts
 *
 * A small filled Earth globe at the centre of the celestial sphere, with its
 * polar axis aligned to the celestial poles. The globe spins with sidereal time
 * and carries an observer marker at the current latitude/longitude-of-date, so
 * you can see where on Earth the observer stands. Because the globe is opaque,
 * only the near-side (front) grid lines are drawn over it.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { type Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { raDecToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { EARTH_SHORE_POLYGONS, type EarthShorePoint } from "./EarthShoreData.js";
import { addFrontHemispherePolyline, addFrontHemisphereSphericalPolygon, smallCirclePoints } from "./skyGraphics.js";

const NCP = new Vector3(0, 0, 1);
const GLOBE_SCALE = 0.28; // fraction of the celestial-sphere radius
const GLOBE_LONGITUDES = [0, 45, 90, 135]; // half-meridians, spaced 45°

export class EarthGlobeNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    siderealTimeProperty: TReadOnlyProperty<number>,
  ) {
    super();

    const globeRadius = projection.radius * GLOBE_SCALE;

    const disc = new Circle(globeRadius, {
      fill: RotatingSkyColors.earthOceanColorProperty,
      stroke: RotatingSkyColors.sphereOutlineColorProperty,
      lineWidth: 1,
      center: projection.center,
    });
    const landPath = new Path(null, {
      fill: RotatingSkyColors.earthLandColorProperty,
      stroke: RotatingSkyColors.sphereOutlineColorProperty,
      lineWidth: 0.35,
      opacity: 0.95,
    });
    const gridPath = new Path(null, { stroke: RotatingSkyColors.earthLandColorProperty, lineWidth: 1, opacity: 0.8 });
    const observerDot = new Circle(5, {
      fill: RotatingSkyColors.observerColorProperty,
      stroke: RotatingSkyColors.cardinalLabelColorProperty,
      lineWidth: 1,
    });

    this.children = [disc, landPath, gridPath, observerDot];

    const shorePointToVector = (point: EarthShorePoint, lst: number): Vector3 => {
      const lonHours = (Math.atan2(point.y, point.x) / (2 * Math.PI)) * 24;
      const latDeg = Math.asin(point.z) * (180 / Math.PI);
      return raDecToVector3(lst + lonHours, latDeg);
    };

    // Project a unit vector onto the (smaller) globe; report front-facing.
    const toGlobe = (v: Vector3): { point: Vector2; front: boolean } => {
      const { point, depth } = projection.projectWithDepth(v);
      return {
        point: projection.center.plus(point.minus(projection.center).timesScalar(GLOBE_SCALE)),
        front: depth >= 0,
      };
    };

    const mapGlobePoint = (v: Vector3): Vector2 => toGlobe(v).point;

    const applyGlobeClip = (): void => {
      const clip = Shape.circle(projection.center.x, projection.center.y, globeRadius);
      landPath.clipArea = clip;
      gridPath.clipArea = clip;
    };

    const addFrontLandPolygon = (shape: Shape, polygon: readonly EarthShorePoint[], lst: number): void => {
      const vertices = polygon.map((point) => shorePointToVector(point, lst));
      addFrontHemisphereSphericalPolygon(projection, vertices, shape, mapGlobePoint, projection.center, globeRadius);
    };

    Multilink.multilink(
      [projection.viewMatrixProperty, latitudeProperty, siderealTimeProperty],
      (_m, latitude, lst) => {
        disc.center = projection.center;
        applyGlobeClip();

        const landShape = new Shape();
        for (const polygon of EARTH_SHORE_POLYGONS) {
          addFrontLandPolygon(landShape, polygon, lst);
        }
        landPath.shape = landShape;

        const shape = new Shape();
        addFrontHemispherePolyline(projection, smallCirclePoints(NCP, 90), shape, mapGlobePoint); // equator
        for (const lon of GLOBE_LONGITUDES) {
          const points: Vector3[] = [];
          for (let dec = -90; dec <= 90; dec += 7.5) {
            points.push(raDecToVector3(lst + (lon / 360) * 24, dec));
          }
          addFrontHemispherePolyline(projection, points, shape, mapGlobePoint);
        }
        gridPath.shape = shape;

        // Observer stands where their zenith points: RA = LST, Dec = latitude.
        const observer = toGlobe(raDecToVector3(lst, latitude));
        observerDot.center = observer.point;
        observerDot.visible = observer.front;
      },
    );
  }
}
