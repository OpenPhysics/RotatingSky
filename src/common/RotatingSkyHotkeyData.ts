/**
 * RotatingSkyHotkeyData.ts
 *
 * Single source of truth for Rotating Sky keyboard shortcuts. Listeners and the
 * Keyboard Shortcuts dialog both derive from these HotkeyData instances.
 */

import { HotkeyData } from "scenerystack/scenery";

const ARROW_KEYS = ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"] as const;
const ALT_ARROW_KEYS = ["alt+arrowLeft", "alt+arrowRight", "alt+arrowUp", "alt+arrowDown"] as const;
const CTRL_HORIZONTAL_ARROW_KEYS = ["ctrl+arrowLeft", "ctrl+arrowRight"] as const;
const ADD_STAR_KEYS = ["shift+enter"] as const;

const RotatingSkyHotkeyData = {
  ARROW_KEYS,
  ROTATE_SKY_KEYS: ARROW_KEYS,
  ROTATE_ABOUT_ZENITH_KEYS: ALT_ARROW_KEYS,
  ADVANCE_SIDEREAL_TIME_KEYS: CTRL_HORIZONTAL_ARROW_KEYS,
  ADD_STAR_AT_CENTER_KEYS: ADD_STAR_KEYS,
  MOVE_STAR_KEYS: ARROW_KEYS,

  /**
   * Nudge the observer's latitude / longitude on the Explorer flat-Earth map.
   */
  MOVE_OBSERVER_LOCATION: new HotkeyData({
    keys: [...ARROW_KEYS],
    repoName: "rotating-sky",
    binderName: "Move Observer Location",
  }),

  /**
   * Nudge the celestial-sphere guide star in right ascension / declination.
   */
  MOVE_GUIDE_STAR: new HotkeyData({
    keys: [...ARROW_KEYS],
    repoName: "rotating-sky",
    binderName: "Move Guide Star",
  }),

  /**
   * Free camera rotate on a focused sky region (arrow keys).
   */
  ROTATE_SKY: new HotkeyData({
    keys: [...ARROW_KEYS],
    repoName: "rotating-sky",
    binderName: "Rotate Sky View",
  }),

  /**
   * Rotate about zenith only (Alt + arrows), matching Alt-drag.
   */
  ROTATE_ABOUT_ZENITH: new HotkeyData({
    keys: [...ALT_ARROW_KEYS],
    repoName: "rotating-sky",
    binderName: "Rotate About Zenith",
  }),

  /**
   * Advance / rewind sidereal time (Ctrl + left/right), matching Ctrl-drag.
   */
  ADVANCE_SIDEREAL_TIME: new HotkeyData({
    keys: [...CTRL_HORIZONTAL_ARROW_KEYS],
    repoName: "rotating-sky",
    binderName: "Advance Sidereal Time",
  }),

  /**
   * Nudge the focused star in RA / Dec (arrow keys).
   */
  MOVE_STAR: new HotkeyData({
    keys: [...ARROW_KEYS],
    repoName: "rotating-sky",
    binderName: "Move Star",
  }),

  /**
   * Add a star at the sphere center when the sky region is focused (Explorer).
   */
  ADD_STAR_AT_CENTER: new HotkeyData({
    keys: [...ADD_STAR_KEYS],
    repoName: "rotating-sky",
    binderName: "Add Star At Center",
  }),
} as const;

export default RotatingSkyHotkeyData;
