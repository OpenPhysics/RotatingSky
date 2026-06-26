/**
 * RotatingSkyPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Lets the user choose
 * the default observer latitude / longitude that every screen starts from (and
 * returns to on Reset All). Controls are bound to RotatingSkyPreferencesModel
 * Properties, whose initial values come from rotatingSkyQueryParameters.
 */

import { Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont } from "scenerystack/scenery-phet";
import { VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../common/RotatingSkyButtonOptions.js";
import { StringManager } from "../i18n/StringManager.js";
import { type EarthMapResolution, LATITUDE_RANGE, LONGITUDE_RANGE } from "../RotatingSkyConstants.js";
import RotatingSkyNamespace from "../RotatingSkyNamespace.js";
import type { RotatingSkyPreferencesModel } from "./RotatingSkyPreferencesModel.js";

/** Preferences dialog content sits on a light background regardless of color profile. */
const PREFERENCES_TEXT_FILL = "#1a1a1a";

export class RotatingSkyPreferencesNode extends VBox {
  public constructor(preferencesModel: RotatingSkyPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: PREFERENCES_TEXT_FILL,
    });

    const numberControl = (
      titleProperty: typeof prefStrings.defaultLatitudeStringProperty,
      property: RotatingSkyPreferencesModel["defaultLatitudeProperty"],
      range: typeof LATITUDE_RANGE,
      tandemName: string,
    ): NumberControl =>
      new NumberControl(titleProperty, property, range, {
        delta: 1,
        numberDisplayOptions: {
          decimalPlaces: 0,
          valuePattern: "{{value}}°",
        },
        titleNodeOptions: {
          font: new PhetFont(14),
          fill: PREFERENCES_TEXT_FILL,
          maxWidth: 220,
        },
        arrowButtonOptions: { ...FLAT_RECTANGULAR_BUTTON_OPTIONS, scale: 0.75 },
        layoutFunction: NumberControl.createLayoutFunction4({ sliderPadding: 5 }),
        ...(tandem && { tandem: tandem.createTandem(tandemName) }),
      });

    super({
      align: "left",
      spacing: 12,
      children: [
        header,
        numberControl(
          prefStrings.defaultLatitudeStringProperty,
          preferencesModel.defaultLatitudeProperty,
          LATITUDE_RANGE,
          "defaultLatitudeControl",
        ),
        numberControl(
          prefStrings.defaultLongitudeStringProperty,
          preferencesModel.defaultLongitudeProperty,
          LONGITUDE_RANGE,
          "defaultLongitudeControl",
        ),
        new Text(prefStrings.earthMapResolutionStringProperty, {
          font: new PhetFont(14),
          fill: PREFERENCES_TEXT_FILL,
          maxWidth: 220,
        }),
        new VerticalAquaRadioButtonGroup<EarthMapResolution>(
          preferencesModel.earthMapResolutionProperty,
          [
            {
              value: "low",
              createNode: () =>
                new Text(prefStrings.earthMapResolutionLowStringProperty, {
                  font: new PhetFont(14),
                  fill: PREFERENCES_TEXT_FILL,
                }),
              options: { accessibleName: prefStrings.earthMapResolutionLowStringProperty },
            },
            {
              value: "high",
              createNode: () =>
                new Text(prefStrings.earthMapResolutionHighStringProperty, {
                  font: new PhetFont(14),
                  fill: PREFERENCES_TEXT_FILL,
                }),
              options: { accessibleName: prefStrings.earthMapResolutionHighStringProperty },
            },
          ],
          {
            spacing: 4,
            radioButtonOptions: { radius: 6 },
            ...(tandem && { tandem: tandem.createTandem("earthMapResolutionRadioButtonGroup") }),
          },
        ),
      ],
    });
  }
}

RotatingSkyNamespace.register("RotatingSkyPreferencesNode", RotatingSkyPreferencesNode);
