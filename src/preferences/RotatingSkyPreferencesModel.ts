/**
 * RotatingSkyPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. The default observer latitude / longitude take their initial
 * values from the corresponding query parameters; each screen's SkyModel seeds
 * (and, on Reset All, restores) its location from these Properties.
 */

import { NumberProperty, StringUnionProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import {
  EARTH_MAP_RESOLUTION_VALUES,
  type EarthMapResolution,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
} from "../RotatingSkyConstants.js";
import RotatingSkyNamespace from "../RotatingSkyNamespace.js";
import rotatingSkyQueryParameters from "./rotatingSkyQueryParameters.js";

export class RotatingSkyPreferencesModel {
  /** Default observer latitude (deg); initial value from the `latitude` query parameter. */
  public readonly defaultLatitudeProperty: NumberProperty;

  /** Default observer longitude (deg); initial value from the `longitude` query parameter. */
  public readonly defaultLongitudeProperty: NumberProperty;

  /** Flat Earth map shoreline detail; initial value from the `earthMapResolution` query parameter. */
  public readonly earthMapResolutionProperty: StringUnionProperty<EarthMapResolution>;

  public constructor(tandem?: Tandem) {
    this.defaultLatitudeProperty = new NumberProperty(rotatingSkyQueryParameters.latitude, {
      range: LATITUDE_RANGE,
      ...(tandem && { tandem: tandem.createTandem("defaultLatitudeProperty") }),
    });
    this.defaultLongitudeProperty = new NumberProperty(rotatingSkyQueryParameters.longitude, {
      range: LONGITUDE_RANGE,
      ...(tandem && { tandem: tandem.createTandem("defaultLongitudeProperty") }),
    });
    this.earthMapResolutionProperty = new StringUnionProperty(
      rotatingSkyQueryParameters.earthMapResolution as EarthMapResolution,
      {
        validValues: EARTH_MAP_RESOLUTION_VALUES,
        ...(tandem && { tandem: tandem.createTandem("earthMapResolutionProperty") }),
      },
    );
  }

  public reset(): void {
    this.defaultLatitudeProperty.reset();
    this.defaultLongitudeProperty.reset();
    this.earthMapResolutionProperty.reset();
  }
}

RotatingSkyNamespace.register("RotatingSkyPreferencesModel", RotatingSkyPreferencesModel);
