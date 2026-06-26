/**
 * skyViewLayout.ts
 *
 * Shared layout helpers for positioning readouts and labels relative to a
 * {@link SkyProjection}.
 */

import type { Node } from "scenerystack/scenery";
import { VIEW_READOUT_GAP } from "../../RotatingSkyConstants.js";
import type { SkyProjection } from "../SkyProjection.js";

/** Places a readout directly below a projected sky sphere, centered on it. */
export const positionReadoutBelowProjection = (readout: Node, projection: SkyProjection): void => {
  readout.centerX = projection.center.x;
  readout.top = projection.center.y + projection.radius + VIEW_READOUT_GAP;
};
