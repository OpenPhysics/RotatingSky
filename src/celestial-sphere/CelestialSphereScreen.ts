/**
 * CelestialSphereScreen.ts
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
import { CelestialSphereModel } from "./model/CelestialSphereModel.js";
import { CelestialSphereKeyboardHelpContent } from "./view/CelestialSphereKeyboardHelpContent.js";
import { CelestialSphereScreenView } from "./view/CelestialSphereScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
// `preferences` supplies the default observer location every screen starts from.
type CelestialSphereScreenOptions = ScreenOptions & { tandem: Tandem; preferences: RotatingSkyPreferencesModel };

export class CelestialSphereScreen extends Screen<CelestialSphereModel, CelestialSphereScreenView> {
  public constructor(options: CelestialSphereScreenOptions) {
    const { preferences, ...screenOptions } = options;
    super(
      // Model factory — called once when the screen is first shown
      () =>
        new CelestialSphereModel({
          defaultLatitudeProperty: preferences.defaultLatitudeProperty,
          defaultLongitudeProperty: preferences.defaultLongitudeProperty,
        }),
      // View factory — receives the model instance
      (model) =>
        new CelestialSphereScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ScreenOptions & { tandem: Tandem }, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: RotatingSkyColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new CelestialSphereKeyboardHelpContent(),
        },
        screenOptions,
      ),
    );
  }
}
