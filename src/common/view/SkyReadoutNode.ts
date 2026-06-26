/**
 * SkyReadoutNode.ts
 *
 * Editable coordinate fields for the currently selected star, styled like the
 * original NAAP lab: two inputs beneath a sky view (equatorial RA/Dec under the
 * celestial sphere, azimuth/altitude under the horizon diagram).
 */

import { Multilink, type UnknownMultilink } from "scenerystack/axon";
import { VBox } from "scenerystack/scenery";
import { StringManager } from "../../i18n/StringManager.js";
import type { SkyModel } from "../model/SkyModel.js";
import { equatorialToHorizontal, horizontalToEquatorial, normalizeDegrees, normalizeHours } from "../SkyCoordinates.js";
import { EditableNumberFieldNode } from "./EditableNumberFieldNode.js";

export type SkyReadoutFrame = "equatorial" | "horizontal";

export type SkyReadoutNodeOptions = {
  /** Which coordinate frame to display. */
  frame: SkyReadoutFrame;
};

const COORDINATE_DECIMAL_PLACES = 1;

export class SkyReadoutNode extends VBox {
  private starLink: UnknownMultilink | null = null;

  public constructor(model: SkyModel, options: SkyReadoutNodeOptions) {
    const controls = StringManager.getInstance().getControls();
    const { frame } = options;

    const firstField =
      frame === "equatorial"
        ? new EditableNumberFieldNode({
            labelProperty: controls.rightAscensionLongStringProperty,
            unit: " h",
            decimalPlaces: COORDINATE_DECIMAL_PLACES,
            onCommit: (value) => {
              const star = model.selectedStarProperty.value;
              if (star) {
                star.setEquatorial(normalizeHours(value), star.decProperty.value);
              }
            },
          })
        : new EditableNumberFieldNode({
            labelProperty: controls.azimuthLongStringProperty,
            unit: " °",
            decimalPlaces: COORDINATE_DECIMAL_PLACES,
            onCommit: (azDeg) => {
              const star = model.selectedStarProperty.value;
              if (!star) {
                return;
              }
              const { altDeg } = equatorialToHorizontal(
                star.raProperty.value,
                star.decProperty.value,
                model.latitudeProperty.value,
                model.siderealTimeProperty.value,
              );
              const { raHours, decDeg } = horizontalToEquatorial(
                altDeg,
                normalizeDegrees(azDeg),
                model.latitudeProperty.value,
                model.siderealTimeProperty.value,
              );
              star.setEquatorial(raHours, decDeg);
            },
          });

    const secondField =
      frame === "equatorial"
        ? new EditableNumberFieldNode({
            labelProperty: controls.declinationLongStringProperty,
            unit: " °",
            decimalPlaces: COORDINATE_DECIMAL_PLACES,
            onCommit: (value) => {
              const star = model.selectedStarProperty.value;
              if (star) {
                star.setEquatorial(star.raProperty.value, value);
              }
            },
          })
        : new EditableNumberFieldNode({
            labelProperty: controls.altitudeLongStringProperty,
            unit: " °",
            decimalPlaces: COORDINATE_DECIMAL_PLACES,
            onCommit: (altDeg) => {
              const star = model.selectedStarProperty.value;
              if (!star) {
                return;
              }
              const { azDeg } = equatorialToHorizontal(
                star.raProperty.value,
                star.decProperty.value,
                model.latitudeProperty.value,
                model.siderealTimeProperty.value,
              );
              const { raHours, decDeg } = horizontalToEquatorial(
                Math.max(-90, Math.min(90, altDeg)),
                azDeg,
                model.latitudeProperty.value,
                model.siderealTimeProperty.value,
              );
              star.setEquatorial(raHours, decDeg);
            },
          });

    super({ align: "left", spacing: 2, children: [firstField, secondField] });

    const update = (): void => {
      const star = model.selectedStarProperty.value;
      const enabled = star !== null;
      firstField.setFieldEnabled(enabled);
      secondField.setFieldEnabled(enabled);
      if (!star) {
        firstField.setDisplayValue(null);
        secondField.setDisplayValue(null);
        return;
      }
      if (frame === "equatorial") {
        firstField.setDisplayValue(star.raProperty.value);
        secondField.setDisplayValue(star.decProperty.value);
      } else {
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          model.latitudeProperty.value,
          model.siderealTimeProperty.value,
        );
        firstField.setDisplayValue(azDeg);
        secondField.setDisplayValue(altDeg);
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
  }
}
