/**
 * RotatingSkyScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for the three Rotating Sky
 * screens. Each icon is drawn from scenery primitives on the standard PhET
 * 548 × 373 icon canvas and uses RotatingSkyColors so it follows the active
 * (default / projector) color profile.
 *
 *   Horizon System   — a sun above a horizon line, with a few stars.
 *   Celestial Sphere — a sphere with its equator ellipse and polar axis.
 *   Explorer         — a sphere cut by the horizon line, combining both views.
 */
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import RotatingSkyColors from "../RotatingSkyColors.js";

// ── Canvas dimensions (PhET standard icon size) ───────────────────────────────
const W = 548;
const H = 373;
const CX = W / 2;
const CY = H / 2;

function background(): Rectangle {
  return new Rectangle(0, 0, W, H, { fill: RotatingSkyColors.backgroundColorProperty });
}

function iconFrom(content: Node): ScreenIcon {
  return new ScreenIcon(content, {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: RotatingSkyColors.backgroundColorProperty,
  });
}

export function createHorizonSystemIcon(): ScreenIcon {
  const horizon = new Rectangle(40, CY + 38, W - 80, 6, {
    fill: RotatingSkyColors.accentColorProperty,
  });
  const sun = new Circle(48, {
    fill: RotatingSkyColors.accentColorProperty,
    centerX: CX,
    centerY: CY - 36,
  });
  const stars = (
    [
      [120, 90],
      [430, 110],
      [360, 60],
      [180, 70],
    ] as const
  ).map(
    ([x, y]) =>
      new Circle(5, {
        fill: RotatingSkyColors.textColorProperty,
        centerX: x,
        centerY: y,
      }),
  );
  return iconFrom(new Node({ children: [background(), horizon, sun, ...stars] }));
}

export function createCelestialSphereIcon(): ScreenIcon {
  const sphere = new Circle(130, {
    stroke: RotatingSkyColors.accentColorProperty,
    lineWidth: 6,
    centerX: CX,
    centerY: CY,
  });
  const equator = new Path(Shape.ellipse(CX, CY, 130, 42, 0), {
    stroke: RotatingSkyColors.accentColorProperty,
    lineWidth: 4,
  });
  const polarAxis = new Rectangle(CX - 3, CY - 160, 6, 320, {
    fill: RotatingSkyColors.accentColorProperty,
  });
  return iconFrom(new Node({ children: [background(), polarAxis, sphere, equator] }));
}

export function createExplorerIcon(): ScreenIcon {
  const sphere = new Circle(120, {
    stroke: RotatingSkyColors.accentColorProperty,
    lineWidth: 6,
    centerX: CX,
    centerY: CY,
  });
  const horizon = new Rectangle(70, CY - 3, W - 140, 6, {
    fill: RotatingSkyColors.accentColorProperty,
  });
  const sun = new Circle(26, {
    fill: RotatingSkyColors.accentColorProperty,
    centerX: CX + 86,
    centerY: CY - 66,
  });
  return iconFrom(new Node({ children: [background(), sphere, horizon, sun] }));
}
