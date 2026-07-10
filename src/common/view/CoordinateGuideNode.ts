/**
 * CoordinateGuideNode.ts
 *
 * The coordinate-explorer overlay for the Celestial Sphere screen: a blue
 * right-ascension hour circle (constant-RA great-circle meridian through both
 * celestial poles) and a red declination circle (constant-Dec small circle),
 * crossing at a draggable guide star. Used to read off / set a position by
 * RA and Dec directly on the sphere.
 *
 * Paint order is split across {@link backLayer} and {@link frontLayer} so callers
 * can sandwich the Earth globe between the dashed (far-side) and solid (near-side)
 * strokes, matching {@link CelestialSphereNode} / {@link HorizonPlaneNode}.
 */

import { Multilink, type Property, type TReadOnlyProperty } from "scenerystack/axon";
import { clamp, Vector3 } from "scenerystack/dot";
import { DragListener, KeyboardListener, Node, Path } from "scenerystack/scenery";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { STAR_RADIUS } from "../../RotatingSkyConstants.js";
import RotatingSkyHotkeyData from "../RotatingSkyHotkeyData.js";
import { normalizeHours, raDecToVector3, radiansToHours, radToDeg } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectSplitPolyline, smallCirclePoints } from "./skyGraphics.js";
import { createStarShape } from "./starGraphics.js";

export type CoordinateGuideNodeOptions = {
  /** Movable right ascension (hours) of the guide star. */
  guideRaProperty: Property<number>;
  /** Movable declination (degrees) of the guide star. */
  guideDecProperty: Property<number>;
  /** Whether the guide star and its RA/Dec lines are shown. */
  visibleProperty: TReadOnlyProperty<boolean>;
  /** Accessible name for the guide star (live RA/Dec read by a screen reader). */
  accessibleNameProperty: TReadOnlyProperty<string>;
  /** Accessible help text describing how to operate the guide star. */
  accessibleHelpTextProperty?: TReadOnlyProperty<string>;
};

const NCP = new Vector3(0, 0, 1);
const DASH = [5, 4];
const MERIDIAN_STEP_DEG = 7.5;

/** RA nudge per arrow-key press (hours). */
const RA_STEP_HOURS = 0.25;
/** Dec nudge per arrow-key press (degrees). */
const DEC_STEP_DEG = 1;

/** Half great-circle meridian (SCP → NCP) at a fixed RA, sampled in 3-D. */
const meridianPoints = (raHours: number): Vector3[] => {
  const points: Vector3[] = [];
  for (let dec = -90; dec <= 90; dec += MERIDIAN_STEP_DEG) {
    points.push(raDecToVector3(raHours, dec));
  }
  return points;
};

export class CoordinateGuideNode extends Node {
  /** Dashed far-side guide strokes — paint before the Earth globe. */
  public readonly backLayer: Node;
  /** Solid near-side guide strokes and the draggable star — paint after the globe. */
  public readonly frontLayer: Node;

  public constructor(projection: SkyProjection, options: CoordinateGuideNodeOptions) {
    super();

    const { guideRaProperty, guideDecProperty, visibleProperty } = options;

    const solid = (color: typeof RotatingSkyColors.guideRaColorProperty, lineWidth: number): Path =>
      new Path(null, { stroke: color, lineWidth });
    const dashed = (color: typeof RotatingSkyColors.guideRaColorProperty, lineWidth: number): Path =>
      new Path(null, { stroke: color, lineWidth, lineDash: DASH, opacity: 0.6 });

    const raFront = solid(RotatingSkyColors.guideRaColorProperty, 1.5);
    const raBack = dashed(RotatingSkyColors.guideRaColorProperty, 1.5);
    const decFront = solid(RotatingSkyColors.guideDecColorProperty, 1.5);
    const decBack = dashed(RotatingSkyColors.guideDecColorProperty, 1.5);

    const starDot = new Path(createStarShape(STAR_RADIUS), {
      fill: RotatingSkyColors.starColorProperty,
      stroke: RotatingSkyColors.cardinalLabelColorProperty,
      lineWidth: 1,
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      accessibleName: options.accessibleNameProperty,
      ...(options.accessibleHelpTextProperty && { accessibleHelpText: options.accessibleHelpTextProperty }),
    });
    // Dragging the guide star across the sphere updates its RA/Dec directly; the
    // multilink below repositions the dot, so the listener must not translate it.
    starDot.addInputListener(
      new DragListener({
        drag: (event) => {
          const point = this.frontLayer.globalToParentPoint(event.pointer.point);
          const v = projection.unproject(point);
          guideRaProperty.value = normalizeHours(radiansToHours(Math.atan2(v.y, v.x)));
          guideDecProperty.value = radToDeg(Math.asin(clamp(v.z, -1, 1)));
        },
      }),
    );
    // Keyboard: arrow keys nudge RA/Dec directly (the star's natural coordinates).
    starDot.addInputListener(
      new KeyboardListener({
        keys: [...RotatingSkyHotkeyData.ARROW_KEYS],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          switch (keysPressed) {
            case "arrowLeft":
              guideRaProperty.value = normalizeHours(guideRaProperty.value - RA_STEP_HOURS);
              break;
            case "arrowRight":
              guideRaProperty.value = normalizeHours(guideRaProperty.value + RA_STEP_HOURS);
              break;
            case "arrowUp":
              guideDecProperty.value = clamp(guideDecProperty.value + DEC_STEP_DEG, -90, 90);
              break;
            case "arrowDown":
              guideDecProperty.value = clamp(guideDecProperty.value - DEC_STEP_DEG, -90, 90);
              break;
            default:
              break;
          }
        },
      }),
    );

    this.backLayer = new Node({ children: [raBack, decBack] });
    this.frontLayer = new Node({ children: [raFront, decFront, starDot] });

    Multilink.multilink([guideRaProperty, guideDecProperty, projection.viewMatrixProperty], (raHours, decDeg) => {
      // RA guide: the meridian (half great circle) of constant RA through both poles.
      const raSplit = projectSplitPolyline(projection, meridianPoints(raHours), false);
      raFront.shape = raSplit.front;
      raBack.shape = raSplit.back;

      // Dec guide: the small circle of constant declination (parallel to the equator).
      const decSplit = projectSplitPolyline(projection, smallCirclePoints(NCP, 90 - decDeg), true);
      decFront.shape = decSplit.front;
      decBack.shape = decSplit.back;

      const starPosition = raDecToVector3(raHours, decDeg);
      starDot.center = projection.project(starPosition);
      // The marker stays visible (and focusable) even when rotated behind the globe.
    });

    visibleProperty.link((visible) => {
      this.backLayer.visible = visible;
      this.frontLayer.visible = visible;
    });
  }
}
