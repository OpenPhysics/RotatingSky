/**
 * ViewDirection.ts
 *
 * Cardinal facing for the Horizon System sky view and for snapping the
 * external horizon-dome camera. Azimuth is measured from North through East
 * (0° = N, 90° = E, 180° = S, 270° = W), matching {@link SkyCoordinates}.
 */

import { Enumeration, EnumerationValue } from "scenerystack/phet-core";

export class ViewDirection extends EnumerationValue {
  public static readonly NORTH = new ViewDirection();
  public static readonly EAST = new ViewDirection();
  public static readonly SOUTH = new ViewDirection();
  public static readonly WEST = new ViewDirection();

  public static readonly enumeration = new Enumeration(ViewDirection);
}

/** Center azimuth (degrees) for a first-person sky view facing `direction`. */
export const viewDirectionAzimuthDeg = (direction: ViewDirection): number => {
  if (direction === ViewDirection.NORTH) {
    return 0;
  }
  if (direction === ViewDirection.EAST) {
    return 90;
  }
  if (direction === ViewDirection.SOUTH) {
    return 180;
  }
  return 270;
};

/**
 * Camera azimuth (radians) that puts `direction` toward the viewer on the
 * orthographic horizon dome ({@link SkyProjection}). Derived from the horizon
 * frame (+X north, +Y east) and the projector's toward-viewer = +Y′ convention.
 */
export const viewDirectionDomeAzimuth = (direction: ViewDirection): number => {
  if (direction === ViewDirection.NORTH) {
    return Math.PI / 2;
  }
  if (direction === ViewDirection.EAST) {
    return 0;
  }
  if (direction === ViewDirection.SOUTH) {
    return -Math.PI / 2;
  }
  return Math.PI;
};
