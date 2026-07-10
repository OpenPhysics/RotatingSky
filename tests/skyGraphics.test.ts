/**
 * skyGraphics.test.ts
 *
 * Unit tests for the great-circle arc geometry helper.
 */

import { Vector2, Vector3 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { SkyProjection } from "../src/common/SkyProjection.js";
import { greatCircleArcPoints, projectSplitSmoothPolyline, smallCirclePoints } from "../src/common/view/skyGraphics.js";

describe("greatCircleArcPoints", () => {
  it("returns both endpoints for coincident points", () => {
    const p = new Vector3(1, 0, 0);
    const points = greatCircleArcPoints(p, p);
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual(p);
  });

  it("draws a 90° arc in the expected plane", () => {
    const p1 = new Vector3(1, 0, 0);
    const p2 = new Vector3(0, 1, 0);
    const points = greatCircleArcPoints(p1, p2, 4);

    // 4 segments ⇒ 5 points.
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual(p1);
    // Endpoint matches p2 to floating-point precision (cos(π/2) is ~6e-17, not exactly 0).
    expect(points[4].x).toBeCloseTo(p2.x, 12);
    expect(points[4].y).toBeCloseTo(p2.y, 12);
    expect(points[4].z).toBeCloseTo(p2.z, 12);

    // Every point should be on the unit sphere.
    for (const pt of points) {
      expect(pt.magnitude).toBeCloseTo(1, 6);
    }

    // The midpoint should be at 45°.
    const mid = points[2];
    expect(mid.x).toBeCloseTo(Math.cos(Math.PI / 4), 6);
    expect(mid.y).toBeCloseTo(Math.cos(Math.PI / 4), 6);
    expect(mid.z).toBeCloseTo(0, 6);
  });

  it("takes the shorter arc between two points", () => {
    const p1 = new Vector3(1, 0, 0);
    const p2 = new Vector3(-1, 0.001, 0); // almost 180°, but slightly toward +Y
    const points = greatCircleArcPoints(p1, p2, 10);

    // The arc should go through the +Y side (shorter way).
    const maxY = Math.max(...points.map((p) => p.y));
    expect(maxY).toBeGreaterThan(0);
  });

  it("produces points on the great circle plane (normal check)", () => {
    const p1 = new Vector3(1, 0, 0);
    const p2 = new Vector3(0, 0, 1);
    const normal = p1.cross(p2).normalized(); // (0,-1,0) — plane normal
    const points = greatCircleArcPoints(p1, p2, 8);

    for (const pt of points) {
      // Every point should lie in the plane: dot with normal ≈ 0.
      expect(Math.abs(pt.dot(normal))).toBeLessThan(1e-9);
    }
  });
});

describe("closed-loop seam handling (smooth split)", () => {
  const NCP = new Vector3(0, 0, 1);

  // kite's Shape.close() leaves a trailing empty subpath (one point, no
  // segments) — a Canvas2D-style quirk that draws nothing. Filter it out when
  // asserting on what's actually rendered.
  const drawnSubpaths = (shape: { subpaths: { segments: unknown[] }[] }) =>
    shape.subpaths.filter((s) => s.segments.length > 0);

  it("draws a fully-visible closed ring as one closed subpath (no seam gap)", () => {
    // Identity view: depth = world y. A small ring about the +Y axis (the view
    // direction) lies entirely within 30° of the camera, so every sample has
    // depth ≥ 0.866 — the whole ring is on the near side.
    const projection = new SkyProjection({ center: new Vector2(0, 0), radius: 100 });
    const ring = smallCirclePoints(new Vector3(0, 1, 0), 30, 12);
    const { front, back } = projectSplitSmoothPolyline(projection, ring, true);

    expect(drawnSubpaths(back)).toHaveLength(0);
    expect(drawnSubpaths(front)).toHaveLength(1);
    expect(front.subpaths[0]?.closed).toBe(true);
  });

  it("keeps the front arc whole when the array seam crosses it", () => {
    // Azimuth π/2 makes depth = world x. The equator's near side is then the arc
    // of +x (θ ∈ (−90°, 90°)), which wraps past sample index 0 — i.e. the array
    // seam (between the last and first sample) falls inside the front arc. Without
    // rotating the seam into the hidden arc, the visible arc would split into two
    // unconnected runs with a gap between them.
    const projection = new SkyProjection({ center: new Vector2(0, 0), radius: 100, azimuth: Math.PI / 2 });
    const ring = smallCirclePoints(NCP, 90, 8);
    const { front } = projectSplitSmoothPolyline(projection, ring, true);

    // One contiguous front subpath, not two with a gap.
    expect(drawnSubpaths(front)).toHaveLength(1);
  });
});
