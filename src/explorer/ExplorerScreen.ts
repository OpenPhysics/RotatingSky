/**
 * ExplorerScreen.ts
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
import { ExplorerModel } from "./model/ExplorerModel.js";
import { ExplorerKeyboardHelpContent } from "./view/ExplorerKeyboardHelpContent.js";
import { ExplorerScreenView } from "./view/ExplorerScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
// `preferences` supplies the default observer location every screen starts from.
type ExplorerScreenOptions = ScreenOptions & { tandem: Tandem; preferences: RotatingSkyPreferencesModel };

export class ExplorerScreen extends Screen<ExplorerModel, ExplorerScreenView> {
  public constructor(options: ExplorerScreenOptions) {
    const { preferences, ...screenOptions } = options;
    super(
      // Model factory — called once when the screen is first shown
      () =>
        new ExplorerModel({
          defaultLatitudeProperty: preferences.defaultLatitudeProperty,
          defaultLongitudeProperty: preferences.defaultLongitudeProperty,
        }),
      // View factory — receives the model instance
      (model) =>
        new ExplorerScreenView(model, {
          tandem: options.tandem.createTandem("view"),
          earthMapResolutionProperty: preferences.earthMapResolutionProperty,
        }),
      optionize<ScreenOptions & { tandem: Tandem }, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: RotatingSkyColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new ExplorerKeyboardHelpContent(),
        },
        screenOptions,
      ),
    );
  }
}
