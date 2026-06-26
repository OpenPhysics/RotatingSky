/**
 * rotatingSkyQueryParameters.ts
 *
 * Sim-specific startup query parameters. This is the single place where every
 * sim-specific query parameter is declared and documented. Public-facing
 * parameters (intended for end users / sharing links) must set `public: true`.
 *
 * ── How to add a query parameter ──────────────────────────────────────────────
 * 1. Add an entry below with a `type`, `defaultValue`, and (if user-facing)
 *    `public: true`. Add `isValidValue` to bound numeric ranges.
 * 2. If it should also be user-editable at runtime, surface it as a preference
 *    in RotatingSkyPreferencesModel (initialize that Property from this query parameter).
 *
 * Usage: append e.g. `?exampleToggle=true` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import {
  DEFAULT_EARTH_MAP_RESOLUTION,
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
  EARTH_MAP_RESOLUTION_VALUES,
} from "../RotatingSkyConstants.js";
import RotatingSkyNamespace from "../RotatingSkyNamespace.js";

const rotatingSkyQueryParameters = QueryStringMachine.getAll({
  /**
   * Default observer latitude in degrees (+N / −S). Seeds the Preferences value
   * and every screen's initial latitude. Example: `?latitude=-33.9`.
   */
  latitude: {
    type: "number",
    defaultValue: DEFAULT_LATITUDE,
    isValidValue: (value: number) => value >= -90 && value <= 90,
    public: true,
  },

  /**
   * Default observer longitude in degrees (+E / −W). Example: `?longitude=151.2`.
   */
  longitude: {
    type: "number",
    defaultValue: DEFAULT_LONGITUDE,
    isValidValue: (value: number) => value >= -180 && value <= 180,
    public: true,
  },

  /**
   * Flat Earth map shoreline detail on the Explorer screen. `low` uses the
   * original NAAP outline; `high` uses Natural Earth land polygons.
   * Example: `?earthMapResolution=low`.
   */
  earthMapResolution: {
    type: "string",
    defaultValue: DEFAULT_EARTH_MAP_RESOLUTION,
    validValues: EARTH_MAP_RESOLUTION_VALUES,
    public: true,
  },
});

RotatingSkyNamespace.register("rotatingSkyQueryParameters", rotatingSkyQueryParameters);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default rotatingSkyQueryParameters;
