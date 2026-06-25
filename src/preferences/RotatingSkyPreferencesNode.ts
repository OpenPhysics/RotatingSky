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
import type { Tandem } from "scenerystack/tandem";
import { StringManager } from "../i18n/StringManager.js";
import RotatingSkyColors from "../RotatingSkyColors.js";
import { LATITUDE_RANGE, LONGITUDE_RANGE } from "../RotatingSkyConstants.js";
import RotatingSkyNamespace from "../RotatingSkyNamespace.js";
import type { RotatingSkyPreferencesModel } from "./RotatingSkyPreferencesModel.js";

export class RotatingSkyPreferencesNode extends VBox {
  public constructor(preferencesModel: RotatingSkyPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: RotatingSkyColors.textColorProperty,
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
          textOptions: { fill: RotatingSkyColors.textColorProperty },
        },
        titleNodeOptions: {
          font: new PhetFont(14),
          fill: RotatingSkyColors.textColorProperty,
          maxWidth: 220,
        },
        sliderOptions: { trackFillEnabled: RotatingSkyColors.textColorProperty },
        arrowButtonOptions: { scale: 0.75 },
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
      ],
    });
  }
}

RotatingSkyNamespace.register("RotatingSkyPreferencesNode", RotatingSkyPreferencesNode);
