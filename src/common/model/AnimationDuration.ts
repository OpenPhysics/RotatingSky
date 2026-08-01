/**
 * AnimationDuration.ts
 *
 * How long a play segment runs before auto-pausing. CONTINUOUS has no limit;
 * the others cap the segment at a sidereal-hour span.
 */

import { Enumeration, EnumerationValue } from "scenerystack/phet-core";

export class AnimationDuration extends EnumerationValue {
  public static readonly CONTINUOUS = new AnimationDuration();
  public static readonly ONE_HOUR = new AnimationDuration();
  public static readonly THREE_HOURS = new AnimationDuration();
  public static readonly SIX_HOURS = new AnimationDuration();
  public static readonly TWELVE_HOURS = new AnimationDuration();
  public static readonly TWENTY_FOUR_HOURS = new AnimationDuration();

  public static readonly enumeration = new Enumeration(AnimationDuration);
}
