/**
 * RotatingSkyConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in RotatingSkyColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 *
 * Remove the example constants below and replace them with the sim's own.
 */

import { Dimension2, Range } from "scenerystack/dot";
import { HOURS_PER_DAY } from "./common/SkyCoordinates.js";
import RotatingSkyNamespace from "./RotatingSkyNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Bottom inset for the Reset All button — sits slightly closer to the corner than {@link SCREEN_VIEW_MARGIN}. */
export const RESET_ALL_BUTTON_BOTTOM_MARGIN = 10;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/** Horizontal padding inside control panels. */
export const PANEL_X_MARGIN = 8;

/** Vertical padding inside control panels. */
export const PANEL_Y_MARGIN = 7;

/** Default font size (px) for labels on panel controls. */
export const CONTROL_FONT_SIZE = 12;

/** Font size (px) for bold panel section titles. */
export const PANEL_TITLE_FONT_SIZE = 12;

/** Side length (px) of checkbox boxes in control panels. */
export const CHECKBOX_BOX_WIDTH = 16;

/** Default vertical spacing between children inside a panel VBox. */
export const PANEL_CONTENT_SPACING = 8;

/** Track size for standalone panel sliders (e.g. animation-rate). */
export const STANDALONE_SLIDER_TRACK_SIZE = new Dimension2(75, 4);

/** Track size for NumberControl sliders. */
export const NUMBER_CONTROL_SLIDER_TRACK_SIZE = new Dimension2(140, 3);

/** Thumb size shared by panel sliders and NumberControl sliders. */
export const SLIDER_THUMB_SIZE = new Dimension2(13, 26);

/** Default screen-space radius of a projected sky sphere / dome. */
export const SPHERE_RADIUS = 170;

/** Vertical gap between a sky sphere and the coordinate readout beneath it. */
export const VIEW_READOUT_GAP = 10;

// ── Observer location ─────────────────────────────────────────────────────────

/** Default observer latitude (degrees, +N). Boulder, CO ≈ 40° N. */
export const DEFAULT_LATITUDE = 40;

/** Default observer longitude (degrees, +E). Boulder, CO ≈ 105° W. */
export const DEFAULT_LONGITUDE = -105;

/** Allowed latitude range (degrees). */
export const LATITUDE_RANGE = new Range(-90, 90);

/** Allowed longitude range (degrees). */
export const LONGITUDE_RANGE = new Range(-180, 180);

/** Increment (degrees) for arrow-key / keyboard nudges of the observer location. */
export const LOCATION_STEP_DEGREES = 5;

// ── Time / animation ──────────────────────────────────────────────────────────

/**
 * Sidereal hours added per real second at NORMAL speed. 1.0 ⇒ the sky completes
 * one full rotation in 24 seconds; the speed radio buttons scale this.
 */
export const SIDEREAL_HOURS_PER_SECOND = 1;

/**
 * Allowed range of the Explorer's continuous animation-rate multiplier. 1.0 is
 * the baseline {@link SIDEREAL_HOURS_PER_SECOND}; the slider scales it.
 */
export const ANIMATION_RATE_RANGE = new Range(0.2, 5);

/** Sidereal-hour span shown by a "short" star trail. */
export const SHORT_TRAIL_HOURS = 3;

/** Sidereal-hour span shown by a "long" star trail (one full revolution). */
export const LONG_TRAIL_HOURS = HOURS_PER_DAY;

// ── Stars ─────────────────────────────────────────────────────────────────────

/** Maximum number of stars allowed in the sky at once. */
export const MAX_STARS = 30;

/** Screen-space radius (px) of a rendered star dot. */
export const STAR_RADIUS = 5;

RotatingSkyNamespace.register("RotatingSkyConstants", {
  RESET_ALL_BUTTON_BOTTOM_MARGIN,
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  PANEL_X_MARGIN,
  PANEL_Y_MARGIN,
  CONTROL_FONT_SIZE,
  PANEL_TITLE_FONT_SIZE,
  CHECKBOX_BOX_WIDTH,
  PANEL_CONTENT_SPACING,
  STANDALONE_SLIDER_TRACK_SIZE,
  NUMBER_CONTROL_SLIDER_TRACK_SIZE,
  SLIDER_THUMB_SIZE,
  SPHERE_RADIUS,
  VIEW_READOUT_GAP,
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
  LOCATION_STEP_DEGREES,
  SIDEREAL_HOURS_PER_SECOND,
  ANIMATION_RATE_RANGE,
  SHORT_TRAIL_HOURS,
  LONG_TRAIL_HOURS,
  MAX_STARS,
  STAR_RADIUS,
});
