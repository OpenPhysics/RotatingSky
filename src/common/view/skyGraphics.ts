/**
 * skyGraphics.ts
 *
 * Geometry helpers shared by the sky view nodes. They generate sampled 3-D
 * circles on the unit sphere and project polylines to 2-D kite Shapes, splitting
 * them into front- and back-hemisphere pieces so callers can stroke the hidden
 * (far-side) part dashed.
 */

import { type Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { degToRad } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";

/** Number of samples used to approximate a full circle. */
export const CIRCLE_SAMPLES = 96;

/** Returns two unit vectors spanning the plane perpendicular to `axis`. */
const orthonormalBasis = (axis: Vector3): [Vector3, Vector3] => {
  // Pick a reference not parallel to the axis, then build u, v via cross products.
  const reference = Math.abs(axis.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
  const u = axis.cross(reference).normalized();
  const v = axis.cross(u).normalized();
  return [u, v];
};

/**
 * Sample points on the small circle whose points are `polarAngleDeg` away from
 * `axis` (90° gives a great circle). `axis` is assumed to be a unit vector.
 */
export const smallCirclePoints = (axis: Vector3, polarAngleDeg: number, samples = CIRCLE_SAMPLES): Vector3[] => {
  const polar = degToRad(polarAngleDeg);
  const cosP = Math.cos(polar);
  const sinP = Math.sin(polar);
  const [u, v] = orthonormalBasis(axis);
  const points: Vector3[] = [];
  for (let i = 0; i < samples; i++) {
    const theta = (i / samples) * 2 * Math.PI;
    points.push(
      axis
        .timesScalar(cosP)
        .plus(u.timesScalar(sinP * Math.cos(theta)))
        .plus(v.timesScalar(sinP * Math.sin(theta))),
    );
  }
  return points;
};

export type SplitShapes = { front: Shape; back: Shape };

/**
 * Appends a projected polyline to the given `front` / `back` shapes, routing each
 * segment by its camera-space depth (≥ 0 ⇒ front hemisphere). Lets callers merge
 * many polylines into a single pair of shapes.
 */
export const addSplitPolyline = (
  projection: SkyProjection,
  points: Vector3[],
  closed: boolean,
  front: Shape,
  back: Shape,
): void => {
  const projected = points.map((p) => projection.projectWithDepth(p));
  const count = closed ? projected.length : projected.length - 1;
  for (let i = 0; i < count; i++) {
    const a = projected[i];
    const b = projected[(i + 1) % projected.length];
    if (!(a && b)) {
      continue;
    }
    const target = (a.depth + b.depth) / 2 >= 0 ? front : back;
    target.moveToPoint(a.point).lineToPoint(b.point);
  }
};

/** Projects a single polyline into separate front / back shapes (occlusion). */
export const projectSplitPolyline = (projection: SkyProjection, points: Vector3[], closed = true): SplitShapes => {
  const front = new Shape();
  const back = new Shape();
  addSplitPolyline(projection, points, closed, front, back);
  return { front, back };
};

/** Projects several polylines into a single shared pair of front / back shapes. */
export const projectSplitPolylines = (
  projection: SkyProjection,
  polylines: Vector3[][],
  closed: boolean,
): SplitShapes => {
  const front = new Shape();
  const back = new Shape();
  for (const points of polylines) {
    addSplitPolyline(projection, points, closed, front, back);
  }
  return { front, back };
};

/** Projects a polyline into a single Shape (no occlusion), optionally closed. */
export const projectPolylineShape = (projection: SkyProjection, points: Vector3[], closed = false): Shape => {
  return projectMultiPolylineShape(projection, [points], closed);
};

/** Projects several polylines into one Shape (no occlusion); `closeEach` closes every subpath. */
export const projectMultiPolylineShape = (
  projection: SkyProjection,
  polylines: Vector3[][],
  closeEach = false,
): Shape => {
  const shape = new Shape();
  for (const points of polylines) {
    points.forEach((p, i) => {
      const screen = projection.project(p);
      if (i === 0) {
        shape.moveToPoint(screen);
      } else {
        shape.lineToPoint(screen);
      }
    });
    if (closeEach) {
      shape.close();
    }
  }
  return shape;
};

/**
 * Fills a band of constant-declination sky between `decLow` and `decHigh` (all
 * right ascensions) by tiling it with quads and projecting each. `toVector` maps
 * (raHours, decDeg) to a world vector, so the same routine fills a band on the
 * celestial sphere (equatorial frame) or any other frame. Each quad's winding is
 * normalized so the front and back hemispheres overlap into one uniform fill
 * (no holes) under the default non-zero fill rule.
 */
export const projectDeclinationBand = (
  projection: SkyProjection,
  decLow: number,
  decHigh: number,
  toVector: (raHours: number, decDeg: number) => Vector3,
  raSteps = 48,
): Shape => {
  const shape = new Shape();
  const decSteps = Math.max(1, Math.round((decHigh - decLow) / 15));
  for (let i = 0; i < raSteps; i++) {
    const ra0 = (i / raSteps) * 24;
    const ra1 = ((i + 1) / raSteps) * 24;
    for (let j = 0; j < decSteps; j++) {
      const d0 = decLow + ((decHigh - decLow) * j) / decSteps;
      const d1 = decLow + ((decHigh - decLow) * (j + 1)) / decSteps;
      const quad = [
        projection.project(toVector(ra0, d0)),
        projection.project(toVector(ra1, d0)),
        projection.project(toVector(ra1, d1)),
        projection.project(toVector(ra0, d1)),
      ];
      addNormalizedQuad(shape, quad);
    }
  }
  return shape;
};

/** Appends a quad to `shape`, normalizing its winding to a consistent orientation. */
const addNormalizedQuad = (shape: Shape, points: Vector2[]): void => {
  let area = 0;
  for (let k = 0; k < points.length; k++) {
    const a = points[k];
    const b = points[(k + 1) % points.length];
    if (a && b) {
      area += a.x * b.y - b.x * a.y;
    }
  }
  const ordered = area < 0 ? [...points].reverse() : points;
  ordered.forEach((p, k) => {
    if (k === 0) {
      shape.moveToPoint(p);
    } else {
      shape.lineToPoint(p);
    }
  });
  shape.close();
};

/** Projects a polyline into a single closed Shape (no occlusion) for fills. */
export const projectFilledShape = (projection: SkyProjection, points: Vector3[]): Shape => {
  const shape = new Shape();
  points.forEach((p, i) => {
    const screen = projection.project(p);
    if (i === 0) {
      shape.moveToPoint(screen);
    } else {
      shape.lineToPoint(screen);
    }
  });
  return shape.close();
};
