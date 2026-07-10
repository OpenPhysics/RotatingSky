/**
 * CelestialSphereKeyboardHelpContent.ts
 *
 * Keyboard Shortcuts dialog for the Celestial Sphere screen. Guide-star, sky-
 * camera, and star rows come from RotatingSkyHotkeyData so icons stay in sync
 * with the listeners.
 */

import {
  BasicActionsKeyboardHelpSection,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  SliderControlsKeyboardHelpSection,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import RotatingSkyHotkeyData from "../../common/RotatingSkyHotkeyData.js";
import { StringManager } from "../../i18n/StringManager.js";

export class CelestialSphereKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const kb = StringManager.getInstance().getKeyboardHelpStrings();

    const skySection = new KeyboardHelpSection(kb.skyStringProperty, [
      KeyboardHelpSectionRow.fromHotkeyData(RotatingSkyHotkeyData.ROTATE_SKY, {
        labelStringProperty: kb.rotateSkyStringProperty,
        pdomLabelStringProperty: kb.rotateSkyDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(RotatingSkyHotkeyData.ROTATE_ABOUT_ZENITH, {
        labelStringProperty: kb.rotateAboutZenithStringProperty,
        pdomLabelStringProperty: kb.rotateAboutZenithDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(RotatingSkyHotkeyData.ADVANCE_SIDEREAL_TIME, {
        labelStringProperty: kb.advanceSiderealTimeStringProperty,
        pdomLabelStringProperty: kb.advanceSiderealTimeDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(RotatingSkyHotkeyData.MOVE_GUIDE_STAR, {
        labelStringProperty: kb.moveGuideStarStringProperty,
        pdomLabelStringProperty: kb.moveGuideStarDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(RotatingSkyHotkeyData.MOVE_STAR, {
        labelStringProperty: kb.moveStarStringProperty,
        pdomLabelStringProperty: kb.moveStarDescriptionStringProperty,
      }),
    ]);

    super(
      [skySection, new SliderControlsKeyboardHelpSection(), new TimeControlsKeyboardHelpSection()],
      [new BasicActionsKeyboardHelpSection()],
    );
  }
}
