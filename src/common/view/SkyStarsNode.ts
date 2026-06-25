/**
 * SkyStarsNode.ts
 *
 * A reusable layer that renders the model's stars on one sphere (horizon dome,
 * celestial sphere, …). The caller supplies:
 *  - `starToPoint`: where to draw a star on this sphere, and whether it shows;
 *  - `pointToEquatorial` (optional): how to turn a dragged screen point back into
 *    equatorial coordinates, which makes the stars draggable on this sphere;
 *  - `redrawProperties`: the extra reactive inputs (latitude, sidereal time, view
 *    matrix) that move stars even when their RA/Dec are unchanged.
 *
 * Because every screen shares the same Star instances, dragging a star here also
 * moves it on every other sphere.
 */

import { Multilink, type TReadOnlyProperty, type UnknownMultilink } from "scenerystack/axon";
import type { Vector2 } from "scenerystack/dot";
import { Circle, DragListener, Node } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { STAR_RADIUS } from "../../RotatingSkyConstants.js";
import type { SkyModel } from "../model/SkyModel.js";
import type { Star } from "../model/Star.js";

export type SkyStarsNodeOptions = {
  /** Where to draw `star` on this sphere, and whether it is currently visible. */
  starToPoint: (star: Star) => { point: Vector2; visible: boolean };
  /** Turns a parent-relative screen point into equatorial coords (enables dragging). */
  pointToEquatorial?: (point: Vector2) => { raHours: number; decDeg: number };
  /** Reactive inputs (besides each star's RA/Dec) that affect star positions. */
  redrawProperties: TReadOnlyProperty<unknown>[];
  /** Accessible name for each star dot. */
  accessibleName?: TReadOnlyProperty<string>;
};

export class SkyStarsNode extends Node {
  private readonly dots = new Map<Star, { dot: Circle; multilink: UnknownMultilink }>();
  private readonly model: SkyModel;
  private readonly options: SkyStarsNodeOptions;

  public constructor(model: SkyModel, options: SkyStarsNodeOptions) {
    super();
    this.model = model;
    this.options = options;

    model.stars.addItemAddedListener((star) => this.addStar(star));
    model.stars.addItemRemovedListener((star) => this.removeStar(star));
    for (const star of model.stars) {
      this.addStar(star);
    }
  }

  private addStar(star: Star): void {
    const dot = new Circle(STAR_RADIUS, {
      cursor: this.options.pointToEquatorial ? "pointer" : "default",
      tagName: "div",
      focusable: true,
      ...(this.options.accessibleName && { accessibleName: this.options.accessibleName }),
    });

    dot.addInputListener(
      new DragListener({
        start: () => {
          this.model.selectedStarProperty.value = star;
        },
        drag: (event) => {
          const pointToEquatorial = this.options.pointToEquatorial;
          if (pointToEquatorial) {
            const parentPoint = this.globalToParentPoint(event.pointer.point);
            const { raHours, decDeg } = pointToEquatorial(parentPoint);
            star.setEquatorial(raHours, decDeg);
          }
        },
      }),
    );

    const multilink = Multilink.multilinkAny(
      [star.raProperty, star.decProperty, this.model.selectedStarProperty, ...this.options.redrawProperties],
      () => this.updateStar(star, dot),
    );

    this.dots.set(star, { dot, multilink });
    this.addChild(dot);
  }

  private updateStar(star: Star, dot: Circle): void {
    const { point, visible } = this.options.starToPoint(star);
    dot.center = point;
    dot.visible = visible;
    const selected = this.model.selectedStarProperty.value === star;
    dot.fill = selected ? RotatingSkyColors.selectedStarColorProperty : RotatingSkyColors.starColorProperty;
    dot.stroke = selected ? RotatingSkyColors.cardinalLabelColorProperty : null;
    dot.lineWidth = 1.5;
  }

  private removeStar(star: Star): void {
    const entry = this.dots.get(star);
    if (entry) {
      entry.multilink.dispose();
      this.removeChild(entry.dot);
      entry.dot.dispose();
      this.dots.delete(star);
    }
  }
}
