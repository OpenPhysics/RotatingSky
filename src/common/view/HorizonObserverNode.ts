/**
 * HorizonObserverNode.ts
 *
 * NAAP's `Stickfigure` movie clip: a small black stick figure at the nadir,
 * standing on the green ground disk. Drawn above the dome wireframe so meridian
 * and azimuth lines do not cover it.
 */

import { Multilink } from "scenerystack/axon";
import { Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import type { SkyProjection } from "../SkyProjection.js";

const NADIR = new Vector3(0, 0, -1);

/** Body/legs with feet at `(x, y)`; screen Y grows downward. */
const bodyShape = (x: number, y: number, scale: number): Shape => {
  const hipY = y - scale * 1.1;
  const shoulderY = y - scale * 2.0;
  const shape = new Shape();
  shape.moveTo(x, shoulderY).lineTo(x, hipY).lineTo(x, y);
  shape.moveTo(x - scale * 1.5, shoulderY).lineTo(x + scale * 1.5, shoulderY);
  shape.moveTo(x, y).lineTo(x - scale * 1.0, y + scale * 1.8);
  shape.moveTo(x, y).lineTo(x + scale * 1.0, y + scale * 1.8);
  return shape;
};

export class HorizonObserverNode extends Node {
  public constructor(projection: SkyProjection) {
    super();

    const body = new Path(null, {
      stroke: RotatingSkyColors.observerFigureColorProperty,
      lineWidth: 2,
      lineCap: "round",
      lineJoin: "round",
    });
    const head = new Circle(1, { fill: RotatingSkyColors.observerFigureColorProperty });
    this.children = [body, head];

    Multilink.multilink([projection.viewMatrixProperty], () => {
      const feet = projection.project(NADIR);
      const scale = projection.radius * 0.042;
      body.shape = bodyShape(feet.x, feet.y, scale);
      head.radius = scale * 0.5;
      head.center = new Vector2(feet.x, feet.y - scale * 2.65);
      this.visible = projection.isFrontFacing(NADIR);
    });
  }
}
