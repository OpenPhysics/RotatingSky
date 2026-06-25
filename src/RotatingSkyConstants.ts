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

import { Range } from "scenerystack/dot";
import RotatingSkyNamespace from "./RotatingSkyNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/** Default screen-space radius of a projected sky sphere / dome. */
export const SPHERE_RADIUS = 170;

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

// ── Stars ─────────────────────────────────────────────────────────────────────

/** Maximum number of stars allowed in the sky at once. */
export const MAX_STARS = 30;

/** Screen-space radius (px) of a rendered star dot. */
export const STAR_RADIUS = 5;

RotatingSkyNamespace.register("RotatingSkyConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  SPHERE_RADIUS,
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
  LOCATION_STEP_DEGREES,
  SIDEREAL_HOURS_PER_SECOND,
  MAX_STARS,
  STAR_RADIUS,
});
