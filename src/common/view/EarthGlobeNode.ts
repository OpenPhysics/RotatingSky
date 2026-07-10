/**
 * EarthGlobeNode.ts
 *
 * A small filled Earth globe at the centre of the celestial sphere, with its
 * polar axis aligned to the celestial poles. The globe spins with sidereal time
 * and carries an observer marker at the current latitude/longitude-of-date, so
 * you can see where on Earth the observer stands. Because the globe is opaque,
 * only the near-side (front) grid lines are drawn over it.
 */

import { Multilink, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { type Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import type { EarthMapResolution } from "../../RotatingSkyConstants.js";
import { HOURS_PER_DAY, raDecToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { type EarthShorePoint, getEarthShorePolygons } from "./EarthShoreData.js";
import {
  addFrontHemisphereSmoothPolyline,
  addFrontHemisphereSphericalPolygon,
  smallCirclePoints,
} from "./skyGraphics.js";

const NCP = new Vector3(0, 0, 1);
const GLOBE_SCALE = 0.28; // fraction of the celestial-sphere radius

// Graticule spacing. Meridians are great circles
const GLOBE_LONGITUDES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]; // degrees, spaced 30°
const GLOBE_LATITUDES = [-60, -30, 30, 60]; // degrees (equator drawn separately)
// Angular step for sampling meridians/parallels; small enough that the projected
// curve stays smooth after the quadratic smoothing pass.
const GLOBE_CURVE_STEP_DEG = 5;

/**
 * Full great-circle meridian (pole-to-pole) at the given longitude, sampled at a
 * fine declination step so the projected arc stays smooth. `raOffsetHours` shifts
 * the meridian in RA (longitude-of-date), accounting for sidereal time.
 */
const meridianPoints = (raOffsetHours: number, longitudeDeg: number): Vector3[] => {
  const points: Vector3[] = [];
  for (let dec = -90; dec <= 90; dec += GLOBE_CURVE_STEP_DEG) {
    points.push(raDecToVector3(raOffsetHours + (longitudeDeg / 360) * HOURS_PER_DAY, dec));
  }
  return points;
};

export type EarthGlobeNodeOptions = {
  /**
   * Right ascension offset (hours) applied to the globe geography, modelling the
   * precession of the equinoxes. 0 = J2000 epoch. A non-zero value rotates the
   * coastlines and grid about the polar axis relative to the RA coordinate frame,
   * showing how the equinox point drifts over millennia. Defaults to 0.
   */
  precessionAngleProperty?: TReadOnlyProperty<number>;
};

export class EarthGlobeNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    longitudeProperty: TReadOnlyProperty<number>,
    siderealTimeProperty: TReadOnlyProperty<number>,
    earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>,
    options?: EarthGlobeNodeOptions,
  ) {
    super();

    const precessionAngleProperty = options?.precessionAngleProperty ?? new Property(0);

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

    const shorePointToVector = (point: EarthShorePoint, gst: number): Vector3 => {
      const lonHours = (Math.atan2(point.y, point.x) / (2 * Math.PI)) * 24;
      const latDeg = Math.asin(point.z) * (180 / Math.PI);
      return raDecToVector3(gst + lonHours, latDeg);
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

    const addFrontLandPolygon = (shape: Shape, polygon: readonly EarthShorePoint[], gst: number): void => {
      const vertices = polygon.map((point) => shorePointToVector(point, gst));
      addFrontHemisphereSphericalPolygon(projection, vertices, shape, mapGlobePoint, projection.center, globeRadius);
    };

    Multilink.multilink(
      [
        projection.viewMatrixProperty,
        latitudeProperty,
        longitudeProperty,
        siderealTimeProperty,
        earthMapResolutionProperty,
        precessionAngleProperty,
      ],
      (_m, latitude, longitude, lst, resolution, precessionHours) => {
        disc.center = projection.center;
        applyGlobeClip();

        // The sidereal time is *local* to the observer, so the prime meridian sits at the
        // Greenwich sidereal time, GST = LST − longitude. Anchoring the geography to GST keeps
        // the observer's own city beneath the dot (which stays at RA = LST) rather than always
        // drawing the 0° meridian under it. The precession angle shifts the geography in RA,
        // modelling the slow westward drift of the equinox point.
        const gst = lst - (longitude / 360) * HOURS_PER_DAY + precessionHours;

        const landShape = new Shape();
        for (const polygon of getEarthShorePolygons(resolution)) {
          addFrontLandPolygon(landShape, polygon, gst);
        }
        landPath.shape = landShape;

        const shape = new Shape();
        // Equator (small circle 90° from the NCP), a closed ring.
        addFrontHemisphereSmoothPolyline(projection, smallCirclePoints(NCP, 90), shape, mapGlobePoint, true);
        // Parallels (constant-latitude small circles), evenly spaced either side
        // of the equator; each is a closed ring.
        for (const lat of GLOBE_LATITUDES) {
          addFrontHemisphereSmoothPolyline(projection, smallCirclePoints(NCP, 90 - lat), shape, mapGlobePoint, true);
        }
        // Meridians (full great circles) at even longitude spacing. Because each
        // is a complete great circle, the front-hemisphere clip always shows the
        // near-side arc regardless of where the globe sits in its rotation, so
        // coverage stays even as the coastlines turn.
        for (const lon of GLOBE_LONGITUDES) {
          addFrontHemisphereSmoothPolyline(projection, meridianPoints(gst, lon), shape, mapGlobePoint);
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
