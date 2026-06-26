/**
 * HorizonObserverNode.ts
 *
 * NAAP's `Stickfigure` movie clip: a small black stick figure at the center of
 * the sphere (the observer's position). Its limbs are defined in 3-D and projected
 * through {@link SkyProjection} like the dome wireframe, so it rotates with the view.
 */

import { Multilink } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import type { SkyProjection } from "../SkyProjection.js";

/** Observer at the sphere origin; size is a fraction of the unit-sphere radius. */
const ORIGIN = Vector3.ZERO;
const FIGURE_SCALE = 0.042;

/** Stick-figure segments in the horizon frame (+X north, +Y east, +Z zenith). */
const figureSegments = (): Array<[Vector3, Vector3]> => {
  const s = FIGURE_SCALE;
  const hip = new Vector3(0, 0, s * 1.1);
  const shoulder = new Vector3(0, 0, s * 2.0);
  return [
    [ORIGIN, hip],
    [hip, shoulder],
    [shoulder, new Vector3(-s * 1.5, 0, s * 2.0)],
    [shoulder, new Vector3(s * 1.5, 0, s * 2.0)],
    [ORIGIN, new Vector3(-s * 1.0, 0, -s * 1.8)],
    [ORIGIN, new Vector3(s * 1.0, 0, -s * 1.8)],
  ];
};

const figureHead = (): { center: Vector3; radius: number } => {
  const s = FIGURE_SCALE;
  return { center: new Vector3(0, 0, s * 2.65), radius: s * 0.5 };
};

const projectSegment = (shape: Shape, a: Vector3, b: Vector3, projection: SkyProjection): void => {
  const start = projection.project(a);
  const end = projection.project(b);
  shape.moveTo(start.x, start.y).lineTo(end.x, end.y);
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
      const shape = new Shape();
      for (const [a, b] of figureSegments()) {
        projectSegment(shape, a, b, projection);
      }
      body.shape = shape;

      const { center, radius } = figureHead();
      const headScreen = projection.project(center);
      const headRadiusScreen = projection.project(center.plus(new Vector3(radius, 0, 0))).minus(headScreen).magnitude;
      head.center = headScreen;
      head.radius = headRadiusScreen;

      // Hide when the upper body rotates behind the sphere.
      this.visible = projection.isFrontFacing(new Vector3(0, 0, FIGURE_SCALE * 2.0));
    });
  }
}
