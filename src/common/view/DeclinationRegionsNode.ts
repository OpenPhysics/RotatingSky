/**
 * DeclinationRegionsNode.ts
 *
 * Shades the three declination regions on the celestial sphere for the current
 * observer latitude:
 *  - circumpolar    — stars that never set (a cap around the elevated pole),
 *  - rise-and-set   — stars that rise and set each day (the equatorial belt),
 *  - never-rise     — stars never visible (a cap around the depressed pole).
 *
 * The boundary declination is ±(90° − |latitude|). Each region is an independent
 * toggle; hidden regions are not recomputed, so dragging stays cheap when the
 * (default-off) shading is unused.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { raDecToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectDeclinationBand } from "./skyGraphics.js";

export type DeclinationRegionsNodeOptions = {
  circumpolarVisibleProperty: TReadOnlyProperty<boolean>;
  riseSetVisibleProperty: TReadOnlyProperty<boolean>;
  neverRiseVisibleProperty: TReadOnlyProperty<boolean>;
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
          ? projectDeclinationBand(projection, capRange[0], capRange[1], raDecToVector3)
          : null;
        neverRise.shape = showNeverRise
          ? projectDeclinationBand(projection, antiCapRange[0], antiCapRange[1], raDecToVector3)
          : null;
        riseSet.shape = showRiseSet ? projectDeclinationBand(projection, -threshold, threshold, raDecToVector3) : null;
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
