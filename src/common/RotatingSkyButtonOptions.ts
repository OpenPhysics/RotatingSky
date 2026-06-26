/**
 * RotatingSkyButtonOptions.ts
 *
 * Shared flat button appearance for the sim. Rectangular and round push buttons
 * default to SceneryStack's 3-D appearance; pass these options (or spread them
 * into nested button options) for a flat look everywhere.
 */

import type { PlayPauseStepButtonGroupOptions } from "scenerystack/scenery-phet";
import { ButtonNode } from "scenerystack/sun";

export const FLAT_BUTTON_APPEARANCE_OPTIONS = {
  buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
} as const;

/** Options for RectangularPushButton and NumberControl arrow buttons. */
export const FLAT_RECTANGULAR_BUTTON_OPTIONS = FLAT_BUTTON_APPEARANCE_OPTIONS;

/** Options for ResetAllButton (extends RoundPushButton). */
export const FLAT_RESET_ALL_BUTTON_OPTIONS = FLAT_BUTTON_APPEARANCE_OPTIONS;

/** Nested options for TimeControlNode play / pause / step round buttons. */
export const FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS = {
  playPauseButtonOptions: FLAT_BUTTON_APPEARANCE_OPTIONS,
  stepForwardButtonOptions: FLAT_BUTTON_APPEARANCE_OPTIONS,
  stepBackwardButtonOptions: FLAT_BUTTON_APPEARANCE_OPTIONS,
} satisfies PlayPauseStepButtonGroupOptions;
