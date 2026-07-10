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
 * moves it on every other sphere. Arrow keys nudge RA/Dec when a star is focused.
 */

import { Multilink, type TReadOnlyProperty, type UnknownMultilink } from "scenerystack/axon";
import { clamp, type Vector2 } from "scenerystack/dot";
import { DragListener, KeyboardListener, Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { STAR_RADIUS } from "../../RotatingSkyConstants.js";
import type { SkyModel } from "../model/SkyModel.js";
import type { Star } from "../model/Star.js";
import RotatingSkyHotkeyData from "../RotatingSkyHotkeyData.js";
import { normalizeHours } from "../SkyCoordinates.js";
import { createStarShape } from "./starGraphics.js";

/** RA nudge per arrow-key press (hours) — matches the guide-star step. */
const RA_STEP_HOURS = 0.25;
/** Dec nudge per arrow-key press (degrees). */
const DEC_STEP_DEG = 1;

export type SkyStarsNodeOptions = {
  /** Where to draw `star` on this sphere, and whether it is currently visible. */
  starToPoint: (star: Star) => { point: Vector2; visible: boolean };
  /** Turns a parent-relative screen point into equatorial coords (enables dragging). */
  pointToEquatorial?: (point: Vector2) => { raHours: number; decDeg: number };
  /** Reactive inputs (besides each star's RA/Dec) that affect star positions. */
  redrawProperties: TReadOnlyProperty<unknown>[];
  /** Accessible name for each star dot. */
  accessibleName?: TReadOnlyProperty<string>;
  /** Accessible help text for keyboard star nudging. */
  accessibleHelpText?: TReadOnlyProperty<string>;
};

export class SkyStarsNode extends Node {
  private readonly dots = new Map<Star, { dot: Path; multilink: UnknownMultilink }>();
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
    const canMove = Boolean(this.options.pointToEquatorial);
    const dot = new Path(createStarShape(STAR_RADIUS), {
      cursor: canMove ? "pointer" : "default",
      tagName: "div",
      focusable: true,
      ...(this.options.accessibleName && { accessibleName: this.options.accessibleName }),
      ...(this.options.accessibleHelpText && { accessibleHelpText: this.options.accessibleHelpText }),
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

    if (canMove) {
      dot.addInputListener(
        new KeyboardListener({
          keys: [...RotatingSkyHotkeyData.MOVE_STAR_KEYS],
          fireOnHold: true,
          fire: (_event, keysPressed) => {
            this.model.selectedStarProperty.value = star;
            if (keysPressed === "arrowLeft") {
              star.setEquatorial(normalizeHours(star.raProperty.value - RA_STEP_HOURS), star.decProperty.value);
            } else if (keysPressed === "arrowRight") {
              star.setEquatorial(normalizeHours(star.raProperty.value + RA_STEP_HOURS), star.decProperty.value);
            } else if (keysPressed === "arrowUp") {
              star.setEquatorial(star.raProperty.value, clamp(star.decProperty.value + DEC_STEP_DEG, -90, 90));
            } else if (keysPressed === "arrowDown") {
              star.setEquatorial(star.raProperty.value, clamp(star.decProperty.value - DEC_STEP_DEG, -90, 90));
            }
          },
        }),
      );
    }

    const multilink = Multilink.multilinkAny(
      [star.raProperty, star.decProperty, this.model.selectedStarProperty, ...this.options.redrawProperties],
      () => this.updateStar(star, dot),
    );

    this.dots.set(star, { dot, multilink });
    this.addChild(dot);
  }

  private updateStar(star: Star, dot: Path): void {
    const { point, visible } = this.options.starToPoint(star);
    dot.center = point;
    dot.visible = visible;
    const selected = this.model.selectedStarProperty.value === star;
    dot.fill = selected ? RotatingSkyColors.selectedStarColorProperty : RotatingSkyColors.starColorProperty;
    dot.stroke = selected ? RotatingSkyColors.cardinalLabelColorProperty : null;
    dot.lineWidth = 1;
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
