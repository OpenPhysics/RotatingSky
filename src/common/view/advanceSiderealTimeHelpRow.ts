/**
 * Keyboard-help row for Ctrl+Left/Right (advance sidereal time).
 *
 * KeyboardHelpIconFactory.fromHotkeyData looks modifiers up in
 * ENGLISH_KEY_TO_KEY_NODE, which has no `ctrl` entry, so opening the Shortcuts
 * dialog asserts. Supply the Ctrl + arrows icon explicitly; the HotkeyData still
 * drives the label and the real listener keys.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { KeyboardHelpIconFactory, KeyboardHelpSectionRow, TextKeyNode } from "scenerystack/scenery-phet";
import RotatingSkyHotkeyData from "../RotatingSkyHotkeyData.js";

export const advanceSiderealTimeHelpRow = (
  labelStringProperty: TReadOnlyProperty<string>,
  pdomLabelStringProperty: TReadOnlyProperty<string>,
): KeyboardHelpSectionRow => {
  const icon = KeyboardHelpIconFactory.iconPlusIcon(
    new TextKeyNode("Ctrl"),
    KeyboardHelpIconFactory.leftRightArrowKeysRowIcon(),
  );
  return KeyboardHelpSectionRow.fromHotkeyData(RotatingSkyHotkeyData.ADVANCE_SIDEREAL_TIME, {
    labelStringProperty,
    pdomLabelStringProperty,
    icon,
  });
};
