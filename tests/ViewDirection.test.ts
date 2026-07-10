/**
 * ViewDirection.test.ts
 *
 * Cardinal facing helpers used by the Horizon System sky view and dome snap.
 */

import { describe, expect, it } from "vitest";
import { ViewDirection, viewDirectionAzimuthDeg, viewDirectionDomeAzimuth } from "../src/common/model/ViewDirection.js";

describe("viewDirectionAzimuthDeg", () => {
  it("maps cardinals to astronomy azimuth (N through E)", () => {
    expect(viewDirectionAzimuthDeg(ViewDirection.NORTH)).toBe(0);
    expect(viewDirectionAzimuthDeg(ViewDirection.EAST)).toBe(90);
    expect(viewDirectionAzimuthDeg(ViewDirection.SOUTH)).toBe(180);
    expect(viewDirectionAzimuthDeg(ViewDirection.WEST)).toBe(270);
  });
});

describe("viewDirectionDomeAzimuth", () => {
  it("puts the chosen cardinal toward the viewer on the orthographic dome", () => {
    expect(viewDirectionDomeAzimuth(ViewDirection.NORTH)).toBeCloseTo(Math.PI / 2);
    expect(viewDirectionDomeAzimuth(ViewDirection.EAST)).toBeCloseTo(0);
    expect(viewDirectionDomeAzimuth(ViewDirection.SOUTH)).toBeCloseTo(-Math.PI / 2);
    expect(viewDirectionDomeAzimuth(ViewDirection.WEST)).toBeCloseTo(Math.PI);
  });
});
