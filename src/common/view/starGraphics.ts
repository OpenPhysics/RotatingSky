/**
 * starGraphics.ts
 *
 * Screen-space star icon used by SkyStarsNode instead of plain circles.
 */

import { Shape } from "scenerystack/kite";

/** Four-point star (NAAP Symbol_10) centered at the origin; `outerRadius` sets the tip distance. */
export const createStarShape = (outerRadius: number, innerRadius = outerRadius * 0.25): Shape => {
  const shape = new Shape();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * 2 * Math.PI - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  return shape.close();
};
