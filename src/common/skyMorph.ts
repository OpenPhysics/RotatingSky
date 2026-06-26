/**
 * skyMorph.ts
 *
 * Builds the reference-frame rotation that morphs the Celestial Sphere view
 * between the equatorial orientation (blend 0, NCP up) and the horizon
 * orientation (blend 1, zenith up). The zenith for an observer at `latitudeDeg`
 * and local sidereal time `lstHours` lies at RA = LST, Dec = latitude; the frame
 * rotates the up-direction along the great circle from the NCP to that zenith.
 */

import { Matrix3, Vector3 } from "scenerystack/dot";
import { raDecToVector3 } from "./SkyCoordinates.js";

const NCP = new Vector3(0, 0, 1);

/** Frame matrix for the morph; identity at blend 0, equatorial→horizon at blend 1. */
export const frameMatrixForBlend = (blend: number, latitudeDeg: number, lstHours: number): Matrix3 => {
  const zenith = raDecToVector3(lstHours, latitudeDeg);
  const dot = Math.max(-1, Math.min(1, NCP.dot(zenith)));
  const angle = Math.acos(dot);
  if (angle < 1e-6) {
    return Matrix3.identity();
  }
  const perp = zenith.minus(NCP.timesScalar(dot)).normalized();
  const a = blend * angle;
  const source = NCP.timesScalar(Math.cos(a)).plus(perp.timesScalar(Math.sin(a)));
  return Matrix3.rotateAToB(source, NCP);
};
