/**
 * StarTrailMode.ts
 *
 * How much of each star's recent path is drawn as a trail on the Explorer
 * screen: nothing, a short segment, or a full revolution.
 */

import { Enumeration, EnumerationValue } from "scenerystack/phet-core";

export class StarTrailMode extends EnumerationValue {
  public static readonly NONE = new StarTrailMode();
  public static readonly SHORT = new StarTrailMode();
  public static readonly LONG = new StarTrailMode();

  public static readonly enumeration = new Enumeration(StarTrailMode);
}
