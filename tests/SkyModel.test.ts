/**
 * SkyModel.test.ts
 *
 * Unit tests for the shared astronomy model: star add/remove/clear/select,
 * the star cap, sidereal-time stepping (only while playing, wrapping at 24h),
 * trail bookkeeping, and reset-to-preference-default behaviour.
 */

import { NumberProperty } from "scenerystack/axon";
import { beforeEach, describe, expect, it } from "vitest";
import { SkyModel } from "../src/common/model/SkyModel.js";
import { MAX_STARS } from "../src/RotatingSkyConstants.js";

const makeModel = (latitude = 40, longitude = -105): SkyModel =>
  new SkyModel({
    defaultLatitudeProperty: new NumberProperty(latitude),
    defaultLongitudeProperty: new NumberProperty(longitude),
  });

describe("SkyModel location", () => {
  it("seeds latitude/longitude from the provided defaults", () => {
    const model = makeModel(-33.9, 151.2);
    expect(model.latitudeProperty.value).toBeCloseTo(-33.9);
    expect(model.longitudeProperty.value).toBeCloseTo(151.2);
  });

  it("restores the preference defaults on reset", () => {
    const model = makeModel(40, -105);
    model.latitudeProperty.value = 10;
    model.longitudeProperty.value = 20;
    model.reset();
    expect(model.latitudeProperty.value).toBe(40);
    expect(model.longitudeProperty.value).toBe(-105);
  });
});

describe("SkyModel stars", () => {
  let model: SkyModel;
  beforeEach(() => {
    model = makeModel();
  });

  it("adds a star and selects it", () => {
    const star = model.addStar(6, 20);
    expect(star).not.toBeNull();
    expect(model.stars.length).toBe(1);
    expect(model.selectedStarProperty.value).toBe(star);
  });

  it("enforces the maximum star count", () => {
    for (let i = 0; i < MAX_STARS; i++) {
      expect(model.addStar(i % 24, 0)).not.toBeNull();
    }
    expect(model.stars.length).toBe(MAX_STARS);
    expect(model.addStar(1, 1)).toBeNull();
    expect(model.stars.length).toBe(MAX_STARS);
  });

  it("removes a star and clears the selection when it was selected", () => {
    const star = model.addStar(3, 10);
    if (star === null) {
      throw new Error("expected addStar to return a star");
    }
    model.removeStar(star);
    expect(model.stars.length).toBe(0);
    expect(model.selectedStarProperty.value).toBeNull();
  });

  it("removes all stars and clears the selection", () => {
    model.addStar(1, 1);
    model.addStar(2, 2);
    model.removeAllStars();
    expect(model.stars.length).toBe(0);
    expect(model.selectedStarProperty.value).toBeNull();
  });
});

describe("SkyModel time", () => {
  it("does not advance sidereal time while paused", () => {
    const model = makeModel();
    model.step(1);
    expect(model.siderealTimeProperty.value).toBe(0);
  });

  it("advances sidereal time while playing and wraps at 24h", () => {
    const model = makeModel();
    model.timer.isPlayingProperty.value = true;
    model.step(2); // 2 s × 1 sidereal-hour/s at NORMAL speed
    expect(model.siderealTimeProperty.value).toBeCloseTo(2);
    model.advanceSiderealTime(23);
    expect(model.siderealTimeProperty.value).toBeCloseTo(1); // 25 mod 24
  });

  it("resetStarTrails anchors the trail start to the current sidereal time", () => {
    const model = makeModel();
    model.advanceSiderealTime(5);
    model.resetStarTrails();
    expect(model.trailStartTimeProperty.value).toBeCloseTo(5);
  });
});
