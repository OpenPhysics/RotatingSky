/**
 * skyGraphics.ts
 *
 * Geometry helpers shared by the sky view nodes. They generate sampled 3-D
 * circles on the unit sphere and project polylines to 2-D kite Shapes, splitting
 * them into front- and back-hemisphere pieces so callers can stroke the hidden
 * (far-side) part dashed.
 */

import { Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { degToRad } from "../SkyCoordinates.js";
import type { ProjectedPoint, SkyProjection } from "../SkyProjection.js";

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
 * Samples points along the shorter great-circle arc from `p1` to `p2` (both unit
 * vectors). The arc lies in the plane spanned by p1, p2 and the origin; its normal
 * is p1 × p2. `samples` controls how many segments the arc is split into. Ports the
 * NAAP `setArcPoints` great-circle-between-two-points behaviour.
 */
export const greatCircleArcPoints = (p1: Vector3, p2: Vector3, samples = 32): Vector3[] => {
  const dot = Math.max(-1, Math.min(1, p1.dot(p2)));
  const angle = Math.acos(dot);
  if (angle < 1e-9) {
    return [p1, p2];
  }

  // In-plane unit vector perpendicular to p1, pointing toward p2.
  const normal = p1.cross(p2).normalized();
  const perp = normal.cross(p1).normalized();

  const points: Vector3[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * angle;
    points.push(p1.timesScalar(Math.cos(t)).plus(perp.timesScalar(Math.sin(t))));
  }
  return points;
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

/** Camera-space depth of a world point (≥ 0 ⇒ front hemisphere). */
export const worldDepth = (projection: SkyProjection, point: Vector3): number =>
  projection.viewMatrixProperty.value.timesVector3(point).y;

/** World point where the segment crosses the view horizon (depth = 0). */
const clipAtHorizon = (a: Vector3, b: Vector3, depthA: number, depthB: number): Vector3 => {
  const t = depthA / (depthA - depthB);
  return a.plus(b.minus(a).timesScalar(t)).normalized();
};

const TWO_PI = 2 * Math.PI;
const mod2pi = (angle: number): number => ((angle % TWO_PI) + TWO_PI) % TWO_PI;

/**
 * Index of a vertex that sits *inside* a run of front-facing points (its
 * predecessor is also in front), so polygon traversal never begins on a horizon
 * crossing. Returns -1 when no two consecutive points face the viewer.
 */
const frontRunStart = (projection: SkyProjection, vertices: Vector3[]): number => {
  let previousFront = false;
  for (let i = 0; i < vertices.length; i++) {
    const vertex = vertices[i];
    if (vertex && worldDepth(projection, vertex) > 0) {
      if (previousFront) {
        return i;
      }
      previousFront = true;
    } else {
      previousFront = false;
    }
  }
  return -1;
};

/**
 * Fills the near-hemisphere portion of a closed spherical polygon (e.g. a
 * coastline) onto an opaque globe of radius `discRadius` centred at `center`.
 *
 * Ported from NAAP's `Globe.updateGlobe`: it traces the polygon's real outline
 * (so concave bays/peninsulas survive — unlike a centroid fan), and whenever the
 * outline dips to the far side it detours out past the limb to a ring at
 * 1.5·`discRadius`, skirts that ring the short way to the re-entry point, then
 * drops back in. The caller clips the path to the globe disc, which trims the
 * over-drawn ring into a clean round limb. `mapPoint` projects a sphere vector to
 * the globe's screen point; it must scale about `center` so screen angles match.
 */
export const addFrontHemisphereSphericalPolygon = (
  projection: SkyProjection,
  vertices: Vector3[],
  shape: Shape,
  mapPoint: (point: Vector3) => Vector2,
  center: Vector2,
  discRadius: number,
): void => {
  const count = vertices.length;
  const start = count < 3 ? -1 : frontRunStart(projection, vertices);
  const startVertex = start < 0 ? undefined : vertices[start];
  if (!startVertex) {
    return; // fewer than three vertices, or nothing on the near side
  }

  // Detour ring sits outside the disc; minStep keeps each ring chord outside the
  // disc (radius·1.1 > radius) so the masked-off arc reads as the round limb.
  const ring = discRadius * 1.5;
  const minStep = 2 * Math.acos((discRadius * 1.1) / ring);
  const angleOf = (point: Vector2): number => Math.atan2(point.y - center.y, point.x - center.x);
  const ringPoint = (angle: number): Vector2 =>
    new Vector2(center.x + ring * Math.cos(angle), center.y + ring * Math.sin(angle));

  // Skirt the limb outside the disc from `fromAngle` to `toAngle`, the short way.
  const skirtLimb = (fromAngle: number, toAngle: number): void => {
    let arc = mod2pi(toAngle - fromAngle);
    const direction = arc > Math.PI ? -1 : 1;
    if (arc > Math.PI) {
      arc = TWO_PI - arc;
    }
    const segments = Math.ceil(arc / minStep);
    for (let s = 1; s <= segments; s++) {
      shape.lineToPoint(ringPoint(fromAngle + (direction * arc * s) / segments));
    }
  };

  shape.moveToPoint(mapPoint(startVertex));
  let wasBack = false;
  let exitAngle = 0;
  for (let k = 1; k < count; k++) {
    const vertex = vertices[(start + k) % count];
    if (!vertex) {
      continue;
    }
    const screen = mapPoint(vertex);
    const back = worldDepth(projection, vertex) < 0;
    if (back) {
      if (!wasBack) {
        // Just crossed to the far side: step out past the limb at this angle.
        exitAngle = angleOf(screen);
        shape.lineToPoint(ringPoint(exitAngle));
      }
    } else {
      if (wasBack) {
        skirtLimb(exitAngle, angleOf(screen)); // re-entering the near side
      }
      shape.lineToPoint(screen);
    }
    wasBack = back;
  }
  shape.close();
};

/**
 * Appends only the near-hemisphere portion of a polyline, clipping each segment
 * at the view horizon so chords never cut across the sphere interior.
 */
export const addFrontHemispherePolyline = (
  projection: SkyProjection,
  points: Vector3[],
  shape: Shape,
  mapPoint: (point: Vector3) => Vector2,
): void => {
  if (points.length === 0) {
    return;
  }

  let penDown = false;
  const [first, ...rest] = points;
  if (!first) {
    return;
  }
  let previous = first;
  let previousDepth = worldDepth(projection, previous);

  for (const point of rest) {
    const depth = worldDepth(projection, point);
    const previousFront = previousDepth >= 0;
    const front = depth >= 0;

    if (previousFront && front) {
      if (!penDown) {
        shape.moveToPoint(mapPoint(previous));
        penDown = true;
      }
      shape.lineToPoint(mapPoint(point));
    } else if (previousFront && !front) {
      if (!penDown) {
        shape.moveToPoint(mapPoint(previous));
        penDown = true;
      }
      shape.lineToPoint(mapPoint(clipAtHorizon(previous, point, previousDepth, depth)));
      penDown = false;
    } else if (!previousFront && front) {
      shape.moveToPoint(mapPoint(clipAtHorizon(previous, point, previousDepth, depth)));
      penDown = true;
      shape.lineToPoint(mapPoint(point));
    } else {
      penDown = false;
    }

    previous = point;
    previousDepth = depth;
  }
};

/**
 * Quadratic-Bézier smoothing of a run of projected points. Walks the points
 * pairwise, drawing a curve from the previous anchor to the *midpoint* of each
 * successive pair, using the shared vertex as the control. This is the
 * Catmull-Rom-style "midpoint-through-sample" trick: the curve passes through the
 * midpoints (not the original vertices) so it reads as one continuous, smooth
 * curve, and it never overshoots past a sample on either side. A straight
 * `lineTo` closes the gap between the last midpoint and the final point, so the
 * path still ends exactly on the final sample.
 *
 * `penDown` (returned) is whether the path currently has an open subpath, so a
 * caller that splits a curve into front/back runs can resume mid-curve.
 */
const smoothRun = (shape: Shape, points: Vector2[], penDown: boolean): boolean => {
  const n = points.length;
  if (n === 0) {
    return penDown;
  }
  const first = points[0];
  if (!first) {
    return penDown;
  }
  let open = penDown;
  if (!open) {
    shape.moveToPoint(first);
    open = true;
  }
  if (n < 3) {
    for (let i = 1; i < n; i++) {
      const point = points[i];
      if (point) {
        shape.lineToPoint(point);
      }
    }
    return open;
  }
  // Midpoint of each adjacent pair becomes the curve endpoint; the vertex
  // between them is the control point. The first/last segments are straight.
  for (let i = 1; i < n - 1; i++) {
    const control = points[i];
    const next = points[i + 1];
    if (control && next) {
      shape.quadraticCurveToPoint(control, control.average(next));
    }
  }
  // Anchor the final sample so the run terminates exactly where expected.
  const last = points[n - 1];
  if (last) {
    shape.lineToPoint(last);
  }
  return open;
};

/**
 * Draws a closed loop of points as a smooth quadratic-Bézier curve with no
 * visible seam. The path starts (and, via {@link Shape.close}, ends) at the
 * midpoint between the last and first samples, and each sample acts as a control
 * point whose curve lands on the next midpoint. This is the closed-loop form of
 * {@link smoothRun}, used for a fully-visible closed circle (e.g. a small circle
 * near the near pole) so it reads as one continuous curve instead of an arc with
 * a corner at the wrap-around.
 */
const smoothClosedRun = (shape: Shape, points: Vector2[]): void => {
  const n = points.length;
  const first = points[0];
  const last = points[n - 1];
  if (n < 3 || !first || !last) {
    points.forEach((p, i) => {
      if (i === 0) {
        shape.moveToPoint(p);
      } else {
        shape.lineToPoint(p);
      }
    });
    if (n >= 2) {
      shape.close();
    }
    return;
  }
  shape.moveToPoint(last.average(first));
  for (let i = 0; i < n; i++) {
    const control = points[i];
    const next = points[(i + 1) % n];
    if (control && next) {
      shape.quadraticCurveToPoint(control, control.average(next));
    }
  }
  shape.close();
};

/**
 * Walks an *open* point list and appends only its front-hemisphere runs as smooth
 * quadratic-Bézier curves, clipping each segment at the view horizon. This is the
 * shared linear sweep used by {@link addFrontHemisphereSmoothPolyline} for both
 * open curves and closed curves (after the caller rotates a closed ring so its
 * seam falls inside the hidden arc — see that function).
 */
const appendFrontRuns = (
  projection: SkyProjection,
  points: Vector3[],
  shape: Shape,
  mapPoint: (point: Vector3) => Vector2,
): void => {
  if (points.length === 0) {
    return;
  }

  // Accumulate projected samples belonging to the current front run; when the
  // run ends, flush it through smoothRun.
  let run: Vector2[] = [];
  let penDown = false;
  const [first, ...rest] = points;
  if (!first) {
    return;
  }
  let previous = first;
  let previousDepth = worldDepth(projection, previous);

  const flush = (): void => {
    if (run.length > 0) {
      penDown = smoothRun(shape, run, penDown);
      run = [];
    }
  };

  for (const point of rest) {
    const depth = worldDepth(projection, point);
    const previousFront = previousDepth >= 0;
    const front = depth >= 0;

    if (previousFront && front) {
      if (run.length === 0) {
        run.push(mapPoint(previous));
      }
      run.push(mapPoint(point));
    } else if (previousFront && !front) {
      if (run.length === 0) {
        run.push(mapPoint(previous));
      }
      run.push(mapPoint(clipAtHorizon(previous, point, previousDepth, depth)));
      flush();
      penDown = false;
    } else if (!previousFront && front) {
      run.push(mapPoint(clipAtHorizon(previous, point, previousDepth, depth)));
      run.push(mapPoint(point));
    } else {
      run = [];
      penDown = false;
    }

    previous = point;
    previousDepth = depth;
  }
  flush();
};

/**
 * Like {@link addFrontHemispherePolyline} but draws each front-hemisphere run as a
 * smooth quadratic-Bézier curve (via {@link smoothRun}) instead of polyline
 * chords. Each segment is still clipped independently at the view horizon before
 * smoothing, so chords never cut across the sphere interior. Sampling the source
 * curve at a fixed angular step and projecting then smoothing yields a faithful,
 * continuous rendering of the projected great/small circle.
 *
 * For `closed` curves (the default for small circles such as the equator and
 * latitude parallels) the seam between the last and first sample is handled: a
 * loop wholly on the near side is drawn as one seamless closed curve, and a loop
 * crossing the horizon is rotated so the array seam falls inside the hidden arc,
 * keeping the single visible arc contiguous (otherwise it would be split into two
 * unconnected pieces with a gap between them).
 */
export const addFrontHemisphereSmoothPolyline = (
  projection: SkyProjection,
  points: Vector3[],
  shape: Shape,
  mapPoint: (point: Vector3) => Vector2,
  closed = false,
): void => {
  const n = points.length;
  if (n === 0) {
    return;
  }

  if (closed && n >= 3) {
    const depths = points.map((p) => worldDepth(projection, p));
    const anyBack = depths.some((d) => d < 0);
    const anyFront = depths.some((d) => d >= 0);
    if (!anyBack) {
      // Entirely on the near side: one seamless closed loop.
      smoothClosedRun(shape, points.map(mapPoint));
      return;
    }
    if (!anyFront) {
      return; // entirely on the far side: nothing visible
    }
    // Mixed: a plane cuts a sphere circle in at most two points, so there is
    // exactly one front arc. Rotate the ring to start inside the back arc and
    // append the start sample once more so the linear sweep covers the seam
    // edge; this keeps the front arc whole instead of split across the seam.
    let backStart = 0;
    for (let i = 0; i < n; i++) {
      if ((depths[i] ?? 0) < 0) {
        backStart = i;
        break;
      }
    }
    const start = points[backStart];
    if (start) {
      const ring = [...points.slice(backStart), ...points.slice(0, backStart), start];
      appendFrontRuns(projection, ring, shape, mapPoint);
    }
    return;
  }

  appendFrontRuns(projection, points, shape, mapPoint);
};

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

/**
 * Per-sample front/back flags from the mid-depth of each leading segment, mirroring
 * {@link addSplitPolyline}'s midpoint routing.
 */
const computeVisibility = (projected: ProjectedPoint[], closed: boolean): boolean[] =>
  projected.map((b, i) => {
    const a = projected[closed ? (i - 1 + projected.length) % projected.length : Math.max(0, i - 1)];
    return a ? (a.depth + b.depth) / 2 >= 0 : true;
  });

/**
 * Rotates a closed ring so the array seam falls inside the hidden (back) arc
 * rather than the visible front arc, then duplicates the start sample so the
 * linear sweep covers the closing edge. A plane cuts a sphere circle in at most
 * two points, so there is exactly one front arc and one back arc; putting the
 * seam in the back arc keeps the visible arc whole instead of split into two
 * unconnected runs with a gap. Returns the rotated sample/flag arrays (or the
 * originals unchanged when `closed` is false).
 */
const rotateSeamIntoBackArc = (
  projected: ProjectedPoint[],
  isFront: boolean[],
  closed: boolean,
): { ordered: ProjectedPoint[]; orderedFront: boolean[] } => {
  if (!closed) {
    return { ordered: projected, orderedFront: isFront };
  }
  let backStart = 0;
  for (let i = 0; i < isFront.length; i++) {
    if (!isFront[i]) {
      backStart = i;
      break;
    }
  }
  const startItem = projected[backStart];
  if (!startItem) {
    return { ordered: projected, orderedFront: isFront };
  }
  return {
    ordered: [...projected.slice(backStart), ...projected.slice(0, backStart), startItem],
    orderedFront: [...isFront.slice(backStart), ...isFront.slice(0, backStart), isFront[backStart] ?? false],
  };
};

/** Walks samples and routes each into a `front`/`back` run, smoothing on flush. */
const sweepSplitRuns = (ordered: ProjectedPoint[], orderedFront: boolean[], front: Shape, back: Shape): void => {
  let run: Vector2[] = [];
  let runTarget: Shape | null = null;

  const flush = (): void => {
    if (run.length > 0 && runTarget) {
      smoothRun(runTarget, run, false);
    }
    run = [];
    runTarget = null;
  };

  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i];
    if (!item) {
      continue;
    }
    const target = orderedFront[i] ? front : back;
    if (runTarget !== target) {
      flush();
      runTarget = target;
    }
    run.push(item.point);
  }
  flush();
};

/**
 * Smooth counterpart of {@link addSplitPolyline}. Routes each consecutive pair
 * of samples to the `front` or `back` shape by its mid-depth (≥ 0 ⇒ front), then
 * draws each accumulated run as a smooth quadratic-Bézier curve. A `closed`
 * curve whose samples all share one hemisphere is rendered with
 * {@link smoothClosedRun} (no seam); everything else uses {@link smoothRun}, so a
 * single great/small circle crossing the horizon twice smooths into a clean
 * near-side arc plus a clean far-side arc.
 */
export const addSplitSmoothPolyline = (
  projection: SkyProjection,
  points: Vector3[],
  closed: boolean,
  front: Shape,
  back: Shape,
): void => {
  const projected = points.map((p) => projection.projectWithDepth(p));
  const count = closed ? projected.length : projected.length - 1;
  if (count < 1) {
    return;
  }

  const isFront = computeVisibility(projected, closed);
  const allVisible = closed && isFront.every((f) => f);
  const allHidden = closed && isFront.every((f) => !f);

  // Fully-visible (or fully-hidden) closed loop: one seamless smooth loop.
  if (allVisible || allHidden) {
    smoothClosedRun(
      allVisible ? front : back,
      projected.map((p) => p.point),
    );
    return;
  }

  const { ordered, orderedFront } = rotateSeamIntoBackArc(projected, isFront, closed);
  sweepSplitRuns(ordered, orderedFront, front, back);
};

/** Smooth counterpart of {@link projectSplitPolyline}: one polyline → front/back shapes. */
export const projectSplitSmoothPolyline = (
  projection: SkyProjection,
  points: Vector3[],
  closed = true,
): SplitShapes => {
  const front = new Shape();
  const back = new Shape();
  addSplitSmoothPolyline(projection, points, closed, front, back);
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
