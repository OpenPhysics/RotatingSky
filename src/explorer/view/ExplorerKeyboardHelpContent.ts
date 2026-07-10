/**
 * ExplorerKeyboardHelpContent.ts
 *
 * Keyboard Shortcuts dialog for the Explorer screen. Observer-location, sky-
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

export class ExplorerKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
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
      KeyboardHelpSectionRow.fromHotkeyData(RotatingSkyHotkeyData.MOVE_STAR, {
        labelStringProperty: kb.moveStarStringProperty,
        pdomLabelStringProperty: kb.moveStarDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(RotatingSkyHotkeyData.ADD_STAR_AT_CENTER, {
        labelStringProperty: kb.addStarAtCenterStringProperty,
        pdomLabelStringProperty: kb.addStarAtCenterDescriptionStringProperty,
      }),
      KeyboardHelpSectionRow.fromHotkeyData(RotatingSkyHotkeyData.MOVE_OBSERVER_LOCATION, {
        labelStringProperty: kb.moveObserverLocationStringProperty,
        pdomLabelStringProperty: kb.moveObserverLocationDescriptionStringProperty,
      }),
    ]);

    super(
      [skySection, new SliderControlsKeyboardHelpSection(), new TimeControlsKeyboardHelpSection()],
      [new BasicActionsKeyboardHelpSection()],
    );
  }
}
