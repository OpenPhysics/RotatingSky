/**
 * DeclinationRegionsNode.ts
 *
 * Shades the three declination regions for the current observer latitude:
 *  - circumpolar    — stars that never set (a cap around the elevated pole),
 *  - rise-and-set   — stars that rise and set each day (the equatorial belt),
 *  - never-rise     — stars never visible (a cap around the depressed pole).
 *
 * Each band spans all right ascensions, so it is a small-circle cap/belt about
 * the celestial-pole axis. By default the bands are placed in the equatorial
 * frame (the celestial sphere); pass a `toVector` mapping to shade the same
 * bands in another frame — e.g. the horizon dome, where the caps tilt with
 * latitude and the never-rise cap sits below the horizon.
 *
 * The boundary declination is ±(90° − |latitude|). Each region is an independent
 * toggle; hidden regions are not recomputed, so dragging stays cheap when the
 * (default-off) shading is unused.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector3 } from "scenerystack/dot";
import { Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { raDecToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectDeclinationBand } from "./skyGraphics.js";

export type DeclinationRegionsNodeOptions = {
  circumpolarVisibleProperty: TReadOnlyProperty<boolean>;
  riseSetVisibleProperty: TReadOnlyProperty<boolean>;
  neverRiseVisibleProperty: TReadOnlyProperty<boolean>;
  /**
   * Maps (raHours, decDeg) to a world vector in the projection's frame. Defaults
   * to the equatorial frame ({@link raDecToVector3}, celestial sphere). Read
   * inside the latitude multilink, so a closure over the current latitude stays
   * in sync.
   */
  toVector?: (raHours: number, decDeg: number) => Vector3;
};

export class DeclinationRegionsNode extends Node {
  public constructor(
    projection: SkyProjection,
    latitudeProperty: TReadOnlyProperty<number>,
    options: DeclinationRegionsNodeOptions,
  ) {
    super();

    const circumpolar = new Path(null, { fill: RotatingSkyColors.bandCircumpolarColorProperty });
    const riseSet = new Path(null, { fill: RotatingSkyColors.bandRiseSetColorProperty });
    const neverRise = new Path(null, { fill: RotatingSkyColors.bandNeverRisesColorProperty });

    // rise/set behind the caps so the cap colors read on top where they meet.
    this.children = [riseSet, circumpolar, neverRise];

    const toVector = options.toVector ?? raDecToVector3;

    Multilink.multilink(
      [
        projection.viewMatrixProperty,
        latitudeProperty,
        options.circumpolarVisibleProperty,
        options.riseSetVisibleProperty,
        options.neverRiseVisibleProperty,
      ],
      (_matrix, latitude, showCircumpolar, showRiseSet, showNeverRise) => {
        const threshold = 90 - Math.abs(latitude); // |dec| boundary of the rise/set belt
        const north = latitude >= 0;
        const capRange: [number, number] = north ? [threshold, 90] : [-90, -threshold];
        const antiCapRange: [number, number] = north ? [-90, -threshold] : [threshold, 90];

        circumpolar.shape = showCircumpolar
          ? projectDeclinationBand(projection, capRange[0], capRange[1], toVector)
          : null;
        neverRise.shape = showNeverRise
          ? projectDeclinationBand(projection, antiCapRange[0], antiCapRange[1], toVector)
          : null;
        riseSet.shape = showRiseSet ? projectDeclinationBand(projection, -threshold, threshold, toVector) : null;
      },
    );

    options.circumpolarVisibleProperty.link((visible) => {
      circumpolar.visible = visible;
    });
    options.riseSetVisibleProperty.link((visible) => {
      riseSet.visible = visible;
    });
    options.neverRiseVisibleProperty.link((visible) => {
      neverRise.visible = visible;
    });
  }
}
