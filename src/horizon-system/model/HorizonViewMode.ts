/**
 * HorizonViewMode.ts
 *
 * How the Horizon System screen presents the local sky: the external dome
 * diagram, a first-person cardinal sky view, or both side by side.
 */

import { Enumeration, EnumerationValue } from "scenerystack/phet-core";

export class HorizonViewMode extends EnumerationValue {
  public static readonly DIAGRAM = new HorizonViewMode();
  public static readonly SKY = new HorizonViewMode();
  public static readonly BOTH = new HorizonViewMode();

  public static readonly enumeration = new Enumeration(HorizonViewMode);
}
