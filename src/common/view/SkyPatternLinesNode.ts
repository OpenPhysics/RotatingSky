/**
 * SkyPatternLinesNode.ts
 *
 * Draws stick-figure lines between stars that were added as a preset pattern
 * (Big Dipper, Orion's Belt, …). Lines follow the stars when they are dragged
 * or when the sky rotates.
 */

import { Multilink, type TReadOnlyProperty, type UnknownMultilink } from "scenerystack/axon";
import type { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import type { SkyModel } from "../model/SkyModel.js";
import type { Star } from "../model/Star.js";

export type SkyPatternLinesNodeOptions = {
  /** Where to draw `star` on this sphere, and whether it is currently visible. */
  starToPoint: (star: Star) => { point: Vector2; visible: boolean };
  /** Reactive inputs (besides each star's RA/Dec) that affect line positions. */
  redrawProperties: TReadOnlyProperty<unknown>[];
};

export class SkyPatternLinesNode extends Node {
  public constructor(model: SkyModel, options: SkyPatternLinesNodeOptions) {
    super();

    const path = new Path(null, {
      stroke: RotatingSkyColors.starColorProperty,
      lineWidth: 1.5,
      opacity: 0.85,
    });
    this.addChild(path);

    const starLinks = new Map<Star, UnknownMultilink>();

    const redraw = (): void => {
      const shape = new Shape();
      for (const group of model.starPatternGroups) {
        for (const [i, j] of group.edges) {
          const starA = group.stars[i];
          const starB = group.stars[j];
          if (!(starA && starB)) {
            continue;
          }
          const a = options.starToPoint(starA);
          const b = options.starToPoint(starB);
          if (a.visible && b.visible) {
            shape.moveToPoint(a.point);
            shape.lineToPoint(b.point);
          }
        }
      }
      path.shape = shape;
    };

    const linkStar = (star: Star): void => {
      starLinks.set(star, Multilink.multilink([star.raProperty, star.decProperty], redraw));
    };

    const unlinkStar = (star: Star): void => {
      starLinks.get(star)?.dispose();
      starLinks.delete(star);
    };

    model.starPatternGroups.addItemAddedListener(redraw);
    model.starPatternGroups.addItemRemovedListener(redraw);
    model.stars.addItemAddedListener((star) => {
      linkStar(star);
      redraw();
    });
    model.stars.addItemRemovedListener((star) => {
      unlinkStar(star);
      redraw();
    });
    for (const star of model.stars) {
      linkStar(star);
    }

    Multilink.multilinkAny([...options.redrawProperties], redraw);
    redraw();
  }
}
