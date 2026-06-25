/**
 * RotatingSkyPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. The default observer latitude / longitude take their initial
 * values from the corresponding query parameters; each screen's SkyModel seeds
 * (and, on Reset All, restores) its location from these Properties.
 */

import { NumberProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import { LATITUDE_RANGE, LONGITUDE_RANGE } from "../RotatingSkyConstants.js";
import RotatingSkyNamespace from "../RotatingSkyNamespace.js";
import rotatingSkyQueryParameters from "./rotatingSkyQueryParameters.js";

export class RotatingSkyPreferencesModel {
  /** Default observer latitude (deg); initial value from the `latitude` query parameter. */
  public readonly defaultLatitudeProperty: NumberProperty;

  /** Default observer longitude (deg); initial value from the `longitude` query parameter. */
  public readonly defaultLongitudeProperty: NumberProperty;

  public constructor(tandem?: Tandem) {
    this.defaultLatitudeProperty = new NumberProperty(rotatingSkyQueryParameters.latitude, {
      range: LATITUDE_RANGE,
      ...(tandem && { tandem: tandem.createTandem("defaultLatitudeProperty") }),
    });
    this.defaultLongitudeProperty = new NumberProperty(rotatingSkyQueryParameters.longitude, {
      range: LONGITUDE_RANGE,
      ...(tandem && { tandem: tandem.createTandem("defaultLongitudeProperty") }),
    });
  }

  public reset(): void {
    this.defaultLatitudeProperty.reset();
    this.defaultLongitudeProperty.reset();
  }
}

RotatingSkyNamespace.register("RotatingSkyPreferencesModel", RotatingSkyPreferencesModel);
