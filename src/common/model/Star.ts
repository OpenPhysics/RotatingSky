/**
 * Star.ts
 *
 * A single star on the sky. A star is defined by its fixed equatorial
 * coordinates (right ascension + declination); its horizontal position (alt/az)
 * is derived per screen from the observer's latitude and the local sidereal
 * time via {@link SkyCoordinates}. The same Star instance is rendered on both
 * the celestial sphere and the horizon dome, so dragging it on one updates both.
 */

import { NumberProperty } from "scenerystack/axon";
import { normalizeHours } from "../SkyCoordinates.js";

let nextStarId = 0;

export class Star {
  /** Stable identifier, useful for keys and debugging. */
  public readonly id: number;

  /** Right ascension in hours [0, 24). */
  public readonly raProperty: NumberProperty;

  /** Declination in degrees [−90, 90]. */
  public readonly decProperty: NumberProperty;

  public constructor(raHours: number, decDeg: number) {
    this.id = nextStarId++;
    this.raProperty = new NumberProperty(normalizeHours(raHours));
    this.decProperty = new NumberProperty(clampDeclination(decDeg));
  }

  /** Sets the star's equatorial position, normalizing/clamping inputs. */
  public setEquatorial(raHours: number, decDeg: number): void {
    this.raProperty.value = normalizeHours(raHours);
    this.decProperty.value = clampDeclination(decDeg);
  }

  public dispose(): void {
    this.raProperty.dispose();
    this.decProperty.dispose();
  }
}

/** RA wraps but declination is clamped to the poles. */
const clampDeclination = (decDeg: number): number => Math.max(-90, Math.min(90, decDeg));
