/**
 * HorizonSystemScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * For multi-screen simulations, duplicate this file (e.g. IntroScreen.ts,
 * LabScreen.ts) and add each screen to the screens array in src/main.ts.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import type { RotatingSkyPreferencesModel } from "../preferences/RotatingSkyPreferencesModel.js";
import RotatingSkyColors from "../RotatingSkyColors.js";
import { HorizonSystemModel } from "./model/HorizonSystemModel.js";
import { HorizonSystemKeyboardHelpContent } from "./view/HorizonSystemKeyboardHelpContent.js";
import { HorizonSystemScreenView } from "./view/HorizonSystemScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
// `preferences` supplies the default observer location every screen starts from.
type HorizonSystemScreenOptions = ScreenOptions & { tandem: Tandem; preferences: RotatingSkyPreferencesModel };

export class HorizonSystemScreen extends Screen<HorizonSystemModel, HorizonSystemScreenView> {
  public constructor(options: HorizonSystemScreenOptions) {
    const { preferences, ...screenOptions } = options;
    super(
      // Model factory — called once when the screen is first shown
      () =>
        new HorizonSystemModel({
          defaultLatitudeProperty: preferences.defaultLatitudeProperty,
          defaultLongitudeProperty: preferences.defaultLongitudeProperty,
        }),
      // View factory — receives the model instance
      (model) =>
        new HorizonSystemScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ScreenOptions & { tandem: Tandem }, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: RotatingSkyColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new HorizonSystemKeyboardHelpContent(),
        },
        screenOptions,
      ),
    );
  }
}
