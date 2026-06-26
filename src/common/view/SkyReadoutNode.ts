/**
 * SkyReadoutNode.ts
 *
 * Coordinate readout for the currently selected star, styled like the original NAAP
 * lab: two label/value lines sitting directly beneath a sky view (equatorial RA/Dec
 * under the celestial sphere, azimuth/altitude under the horizon diagram).
 */

import { Multilink, type UnknownMultilink } from "scenerystack/axon";
import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { CONTROL_FONT_SIZE } from "../../RotatingSkyConstants.js";
import type { SkyModel } from "../model/SkyModel.js";
import { equatorialToHorizontal } from "../SkyCoordinates.js";

export type SkyReadoutFrame = "equatorial" | "horizontal";

export type SkyReadoutNodeOptions = {
  /** Which coordinate frame to display. */
  frame: SkyReadoutFrame;
};

const EMPTY_VALUE = "—";

const formatHours = (hours: number): string => `${hours.toFixed(1)} h`;

const formatDegrees = (deg: number): string => `${deg.toFixed(1)} °`;

export class SkyReadoutNode extends VBox {
  private starLink: UnknownMultilink | null = null;

  public constructor(model: SkyModel, options: SkyReadoutNodeOptions) {
    const controls = StringManager.getInstance().getControls();
    const { frame } = options;

    const firstText = new Text("", {
      font: new PhetFont(CONTROL_FONT_SIZE),
      fill: RotatingSkyColors.textColorProperty,
    });
    const secondText = new Text("", {
      font: new PhetFont(CONTROL_FONT_SIZE),
      fill: RotatingSkyColors.textColorProperty,
    });

    super({ align: "left", spacing: 2, children: [firstText, secondText] });

    const update = (): void => {
      const star = model.selectedStarProperty.value;
      if (frame === "equatorial") {
        if (star) {
          firstText.string = `${controls.rightAscensionLongStringProperty.value}: ${formatHours(star.raProperty.value)}`;
          secondText.string = `${controls.declinationLongStringProperty.value}: ${formatDegrees(star.decProperty.value)}`;
        } else {
          firstText.string = `${controls.rightAscensionLongStringProperty.value}: ${EMPTY_VALUE}`;
          secondText.string = `${controls.declinationLongStringProperty.value}: ${EMPTY_VALUE}`;
        }
      } else if (star) {
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          model.latitudeProperty.value,
          model.siderealTimeProperty.value,
        );
        firstText.string = `${controls.azimuthLongStringProperty.value}: ${formatDegrees(azDeg)}`;
        secondText.string = `${controls.altitudeLongStringProperty.value}: ${formatDegrees(altDeg)}`;
      } else {
        firstText.string = `${controls.azimuthLongStringProperty.value}: ${EMPTY_VALUE}`;
        secondText.string = `${controls.altitudeLongStringProperty.value}: ${EMPTY_VALUE}`;
      }
    };

    model.selectedStarProperty.link(() => {
      this.starLink?.dispose();
      const star = model.selectedStarProperty.value;
      if (frame === "equatorial") {
        this.starLink = star ? Multilink.multilinkAny([star.raProperty, star.decProperty], update) : null;
      } else {
        this.starLink = star
          ? Multilink.multilinkAny(
              [star.raProperty, star.decProperty, model.latitudeProperty, model.siderealTimeProperty],
              update,
            )
          : null;
      }
      update();
    });

    const labelProperties =
      frame === "equatorial"
        ? [controls.rightAscensionLongStringProperty, controls.declinationLongStringProperty]
        : [controls.azimuthLongStringProperty, controls.altitudeLongStringProperty];
    Multilink.multilinkAny(labelProperties, update);
  }
}
