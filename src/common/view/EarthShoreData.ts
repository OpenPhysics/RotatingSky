/**
 * EarthShoreData.ts
 *
 * Shoreline data for the flat Earth map: low-resolution NAAP outlines and
 * high-resolution Natural Earth land polygons. Coordinates use +Z for the
 * north pole and the +X axis for the prime meridian, so longitude is
 * `atan2(y, x)`.
 */

import type { EarthMapResolution } from "../../RotatingSkyConstants.js";
import { EARTH_SHORE_POLYGONS_HIGH } from "./EarthShoreDataHigh.js";
import { EARTH_SHORE_POLYGONS_LOW, type EarthShorePoint } from "./EarthShoreDataLow.js";

export { EARTH_SHORE_POLYGONS_HIGH } from "./EarthShoreDataHigh.js";
export type { EarthShorePoint } from "./EarthShoreDataLow.js";
export { EARTH_SHORE_POLYGONS_LOW } from "./EarthShoreDataLow.js";

export const getEarthShorePolygons = (resolution: EarthMapResolution): readonly (readonly EarthShorePoint[])[] =>
  resolution === "low" ? EARTH_SHORE_POLYGONS_LOW : EARTH_SHORE_POLYGONS_HIGH;
