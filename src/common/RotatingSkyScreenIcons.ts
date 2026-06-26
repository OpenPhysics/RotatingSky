/**
 * RotatingSkyScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for the three Rotating Sky
 * screens. Each icon is drawn from scenery primitives on the standard PhET
 * 548 × 373 icon canvas and uses RotatingSkyColors so it follows the active
 * (default / projector) color profile.
 *
 *   Horizon System   — the observer's horizon dome, ground disk, and stars.
 *   Celestial Sphere — wireframe sphere with equator, ecliptic, and Earth globe.
 *   Explorer         — linked celestial-sphere and horizon-dome miniatures.
 */
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import RotatingSkyColors from "../RotatingSkyColors.js";
import { createStarShape } from "./view/starGraphics.js";

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

function starAt(x: number, y: number, outerRadius: number): Path {
  return new Path(createStarShape(outerRadius), {
    fill: RotatingSkyColors.starColorProperty,
    centerX: x,
    centerY: y,
  });
}

/** Filled lower semicircle below a horizontal chord (the ground disk). */
function groundSemicircle(centerX: number, horizonY: number, radius: number): Path {
  return new Path(
    new Shape()
      .moveTo(centerX - radius, horizonY)
      .arc(centerX, horizonY, radius, Math.PI, 0, false)
      .close(),
    { fill: RotatingSkyColors.groundColorProperty },
  );
}

/** Upper semicircle arc (the dome silhouette). */
function domeArc(centerX: number, horizonY: number, radius: number, lineWidth: number): Path {
  return new Path(new Shape().moveTo(centerX - radius, horizonY).arc(centerX, horizonY, radius, Math.PI, 0, true), {
    stroke: RotatingSkyColors.sphereOutlineColorProperty,
    lineWidth,
    lineCap: "round",
  });
}

/** Altitude ring on the dome: a smaller upper arc at a fixed elevation. */
function altitudeRing(
  centerX: number,
  horizonY: number,
  radius: number,
  elevationDeg: number,
  lineWidth: number,
): Path {
  const ringRadius = radius * Math.cos((elevationDeg * Math.PI) / 180);
  const ringCenterY = horizonY - radius * Math.sin((elevationDeg * Math.PI) / 180);
  return new Path(
    new Shape().moveTo(centerX - ringRadius, ringCenterY).arc(centerX, ringCenterY, ringRadius, Math.PI, 0, true),
    {
      stroke: RotatingSkyColors.gridColorProperty,
      lineWidth,
      opacity: 0.85,
      lineCap: "round",
    },
  );
}

/** Simple 2-D stick figure standing on the horizon. */
function stickFigure(baseX: number, baseY: number, scale: number): Node {
  const s = scale;
  const hipY = baseY - s * 1.1;
  const shoulderY = baseY - s * 2.0;
  const headY = baseY - s * 2.65;
  const body = new Path(
    new Shape()
      .moveTo(baseX, baseY)
      .lineTo(baseX, hipY)
      .lineTo(baseX, shoulderY)
      .moveTo(baseX - s * 1.5, shoulderY + s * 0.2)
      .lineTo(baseX + s * 1.5, shoulderY + s * 0.2)
      .moveTo(baseX, baseY)
      .lineTo(baseX - s * 1.0, baseY + s * 1.8)
      .moveTo(baseX, baseY)
      .lineTo(baseX + s * 1.0, baseY + s * 1.8),
    {
      stroke: RotatingSkyColors.observerFigureColorProperty,
      lineWidth: 2.5,
      lineCap: "round",
      lineJoin: "round",
    },
  );
  const head = new Circle(s * 0.5, {
    fill: RotatingSkyColors.observerFigureColorProperty,
    centerX: baseX,
    centerY: headY,
  });
  return new Node({ children: [body, head] });
}

/** Small Earth disc with a simplified land mass. */
function earthGlobe(centerX: number, centerY: number, radius: number): Node {
  const disc = new Circle(radius, {
    fill: RotatingSkyColors.earthOceanColorProperty,
    stroke: RotatingSkyColors.sphereOutlineColorProperty,
    lineWidth: 1.5,
    centerX,
    centerY,
  });
  const land = new Path(
    new Shape()
      .moveTo(centerX - radius * 0.55, centerY - radius * 0.15)
      .quadraticCurveTo(
        centerX - radius * 0.1,
        centerY - radius * 0.75,
        centerX + radius * 0.45,
        centerY - radius * 0.35,
      )
      .quadraticCurveTo(
        centerX + radius * 0.75,
        centerY + radius * 0.05,
        centerX + radius * 0.35,
        centerY + radius * 0.55,
      )
      .quadraticCurveTo(
        centerX - radius * 0.05,
        centerY + radius * 0.8,
        centerX - radius * 0.55,
        centerY + radius * 0.35,
      )
      .close(),
    { fill: RotatingSkyColors.earthLandColorProperty },
  );
  land.clipArea = Shape.circle(centerX, centerY, radius);
  const observer = new Circle(radius * 0.18, {
    fill: RotatingSkyColors.observerColorProperty,
    centerX: centerX + radius * 0.25,
    centerY: centerY - radius * 0.1,
  });
  return new Node({ children: [disc, land, observer] });
}

function celestialSphereGraphic(centerX: number, centerY: number, radius: number): Node {
  const polarAxis = new Line(centerX, centerY - radius - 18, centerX, centerY + radius + 18, {
    stroke: RotatingSkyColors.cardinalLabelColorProperty,
    lineWidth: 3,
    lineCap: "round",
  });
  const outline = new Circle(radius, {
    stroke: RotatingSkyColors.sphereOutlineColorProperty,
    lineWidth: 3,
    centerX,
    centerY,
  });
  const equator = new Path(Shape.ellipse(centerX, centerY, radius, radius * 0.32, 0), {
    stroke: RotatingSkyColors.celestialEquatorColorProperty,
    lineWidth: 3.5,
    lineCap: "round",
  });
  const ecliptic = new Path(Shape.ellipse(centerX, centerY, radius, radius * 0.32, -0.42), {
    stroke: RotatingSkyColors.eclipticColorProperty,
    lineWidth: 3,
    lineCap: "round",
  });
  const meridian = new Path(Shape.ellipse(centerX, centerY, radius * 0.32, radius, 0), {
    stroke: RotatingSkyColors.gridColorProperty,
    lineWidth: 2,
    opacity: 0.75,
    lineCap: "round",
  });
  const earth = earthGlobe(centerX, centerY, radius * 0.28);
  const stars = [
    starAt(centerX - radius * 0.62, centerY - radius * 0.48, 7),
    starAt(centerX + radius * 0.55, centerY - radius * 0.62, 6),
    starAt(centerX + radius * 0.68, centerY + radius * 0.2, 5),
  ];
  return new Node({ children: [polarAxis, outline, meridian, equator, ecliptic, earth, ...stars] });
}

function horizonDomeGraphic(centerX: number, horizonY: number, radius: number): Node {
  const ground = groundSemicircle(centerX, horizonY, radius);
  const horizon = new Line(centerX - radius, horizonY, centerX + radius, horizonY, {
    stroke: RotatingSkyColors.horizonColorProperty,
    lineWidth: 4,
    lineCap: "round",
  });
  const dome = domeArc(centerX, horizonY, radius, 3);
  const rings = [30, 60].map((deg) => altitudeRing(centerX, horizonY, radius, deg, 2));
  const meridian = new Line(centerX, horizonY, centerX, horizonY - radius, {
    stroke: RotatingSkyColors.gridColorProperty,
    lineWidth: 2,
    opacity: 0.85,
    lineCap: "round",
  });
  const observer = stickFigure(centerX, horizonY, 14);
  const stars = [
    starAt(centerX - radius * 0.55, horizonY - radius * 0.72, 7),
    starAt(centerX + radius * 0.48, horizonY - radius * 0.58, 6),
    starAt(centerX - radius * 0.2, horizonY - radius * 0.88, 5),
    starAt(centerX + radius * 0.72, horizonY - radius * 0.78, 5),
  ];
  return new Node({ children: [ground, horizon, dome, ...rings, meridian, observer, ...stars] });
}

export function createHorizonSystemIcon(): ScreenIcon {
  const horizonY = CY + 42;
  const radius = 128;
  return iconFrom(new Node({ children: [background(), horizonDomeGraphic(CX, horizonY, radius)] }));
}

export function createCelestialSphereIcon(): ScreenIcon {
  return iconFrom(new Node({ children: [background(), celestialSphereGraphic(CX, CY, 132)] }));
}

export function createExplorerIcon(): ScreenIcon {
  const leftCenterX = CX - 98;
  const rightCenterX = CX + 98;
  const horizonY = CY + 28;
  const leftSphere = celestialSphereGraphic(leftCenterX, CY - 6, 88);
  const rightDome = horizonDomeGraphic(rightCenterX, horizonY, 86);
  const linkStar = starAt(CX, CY - 18, 10);
  const linkLine = new Path(
    new Shape().moveTo(leftCenterX + 52, CY - 18).quadraticCurveTo(CX, CY - 36, rightCenterX - 52, CY - 18),
    {
      stroke: RotatingSkyColors.accentColorProperty,
      lineWidth: 2.5,
      lineCap: "round",
      opacity: 0.85,
    },
  );
  const divider = new Line(CX, CY - 92, CX, CY + 92, {
    stroke: RotatingSkyColors.gridColorProperty,
    lineWidth: 1.5,
    opacity: 0.35,
    lineDash: [6, 6],
  });
  return iconFrom(new Node({ children: [background(), divider, leftSphere, rightDome, linkLine, linkStar] }));
}
