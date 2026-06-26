/**
 * FlatEarthMapNode.ts
 *
 * A flat (equirectangular) map of the Earth with a draggable observer cursor.
 * Dragging the cursor — or typing/arrow-keying — sets the observer's latitude
 * and longitude, which the rest of the Explorer screen is linked to. Arrow keys
 * nudge the location in 5° steps.
 */

import { Multilink, type NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardListener, Line, Node, Path, Rectangle } from "scenerystack/scenery";
import { StringManager } from "../../i18n/StringManager.js";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import {
  type EarthMapResolution,
  LATITUDE_RANGE,
  LOCATION_STEP_DEGREES,
  LONGITUDE_RANGE,
} from "../../RotatingSkyConstants.js";
import { type EarthShorePoint, getEarthShorePolygons } from "./EarthShoreData.js";

export type FlatEarthMapNodeOptions = { width: number; height: number };

type GeoPoint = { lon: number; lat: number };

const shorePointToGeo = (point: EarthShorePoint): GeoPoint => ({
  lon: Math.atan2(point.y, point.x) * (180 / Math.PI),
  lat: Math.asin(point.z) * (180 / Math.PI),
});

/** True when the short map edge between two lon/lats crosses the antimeridian. */
const crossesDateline = (from: GeoPoint, to: GeoPoint): boolean => Math.abs(to.lon - from.lon) > 180;

/** Degrees traveled eastward from `from` to `to` (mod 360). */
const eastwardArc = (from: GeoPoint, to: GeoPoint): number => (to.lon - from.lon + 360) % 360;

/** Standard shore polygons: split at the dateline so each subpath closes locally. */
const addSplitShorePolygonToShape = (
  shape: Shape,
  polygon: readonly EarthShorePoint[],
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
): void => {
  let previousLon: number | null = null;
  let penDown = false;

  for (const point of polygon) {
    const { lon, lat } = shorePointToGeo(point);
    if (previousLon !== null && Math.abs(lon - previousLon) > 180) {
      if (penDown) {
        shape.close();
      }
      penDown = false;
    }
    if (penDown) {
      shape.lineTo(lonToX(lon), latToY(lat));
    } else {
      shape.moveTo(lonToX(lon), latToY(lat));
      penDown = true;
    }
    previousLon = lon;
  }

  if (penDown) {
    shape.close();
  }
};

/**
 * Southern-cap shore polygons (Antarctica): keep one continuous path, route dateline
 * crossings through the south-pole map edge, and close along the bottom.
 */
const addSouthCapShorePolygonToShape = (
  shape: Shape,
  polygon: readonly EarthShorePoint[],
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
  width: number,
  height: number,
): void => {
  const points = polygon.map(shorePointToGeo);
  const first = points[0] as GeoPoint;

  const appendSouthCapEdge = (from: GeoPoint, to: GeoPoint): void => {
    if (crossesDateline(from, to)) {
      const westward = eastwardArc(from, to) > 180;
      const exitEdgeX = westward ? 0 : width;
      shape.lineTo(exitEdgeX, latToY(from.lat));
      shape.lineTo(exitEdgeX, height);
      // Stop at the target longitude — not the far map edge — so the closing
      // edge does not retrace this bottom segment and leave a fill notch.
      shape.lineTo(lonToX(to.lon), height);
    }
    shape.lineTo(lonToX(to.lon), latToY(to.lat));
  };

  shape.moveTo(lonToX(first.lon), latToY(first.lat));
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    if (from && to) {
      appendSouthCapEdge(from, to);
    }
  }

  // Close directly between adjacent coast points; the dateline edge already
  // traced the south-pole map edge, so routing the close through the bottom
  // again would retrace that segment backwards and leave a fill notch.
  shape.close();
};

/** Add one land shore polygon to the flat map shape. */
const addShorePolygonToShape = (
  shape: Shape,
  polygon: readonly EarthShorePoint[],
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
  width: number,
  height: number,
): void => {
  if (polygon.length === 0) {
    return;
  }

  const minLat = Math.min(...polygon.map((point) => shorePointToGeo(point).lat));
  if (minLat < -60) {
    addSouthCapShorePolygonToShape(shape, polygon, lonToX, latToY, width, height);
  } else {
    addSplitShorePolygonToShape(shape, polygon, lonToX, latToY);
  }
};

const buildLandShape = (
  resolution: EarthMapResolution,
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
  width: number,
  height: number,
): Shape => {
  const land = new Shape();
  for (const polygon of getEarthShorePolygons(resolution)) {
    addShorePolygonToShape(land, polygon, lonToX, latToY, width, height);
  }
  return land;
};

export class FlatEarthMapNode extends Node {
  public constructor(
    latitudeProperty: NumberProperty,
    longitudeProperty: NumberProperty,
    earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>,
    options: FlatEarthMapNodeOptions,
  ) {
    const { width, height } = options;
    const controls = StringManager.getInstance().getControls();

    const lonToX = (lon: number): number => ((lon + 180) / 360) * width;
    const latToY = (lat: number): number => ((90 - lat) / 180) * height;
    const xToLon = (x: number): number => (x / width) * 360 - 180;
    const yToLat = (y: number): number => 90 - (y / height) * 180;

    const mapRect = new Rectangle(0, 0, width, height, {
      fill: RotatingSkyColors.earthOceanColorProperty,
      stroke: RotatingSkyColors.sphereOutlineColorProperty,
      lineWidth: 1,
      cursor: "pointer",
    });

    const landPath = new Path(buildLandShape(earthMapResolutionProperty.value, lonToX, latToY, width, height), {
      fill: RotatingSkyColors.earthLandColorProperty,
      stroke: RotatingSkyColors.sphereOutlineColorProperty,
      lineWidth: 0.35,
      opacity: 0.95,
    });
    earthMapResolutionProperty.link((resolution) => {
      landPath.shape = buildLandShape(resolution, lonToX, latToY, width, height);
    });

    // Graticule: parallels every 30°, meridians every 60°.
    const grid = new Shape();
    for (let lat = -60; lat <= 60; lat += 30) {
      grid.moveTo(0, latToY(lat)).lineTo(width, latToY(lat));
    }
    for (let lon = -120; lon <= 120; lon += 60) {
      grid.moveTo(lonToX(lon), 0).lineTo(lonToX(lon), height);
    }
    const gridPath = new Path(grid, { stroke: RotatingSkyColors.gridColorProperty, lineWidth: 0.5, opacity: 0.7 });
    const equatorLine = new Line(0, latToY(0), width, latToY(0), {
      stroke: RotatingSkyColors.celestialEquatorColorProperty,
      lineWidth: 1,
    });

    // Observer cursor: crosshair + dot.
    const cursor = new Node({
      children: [
        new Line(-10, 0, 10, 0, { stroke: RotatingSkyColors.observerColorProperty, lineWidth: 1.5 }),
        new Line(0, -10, 0, 10, { stroke: RotatingSkyColors.observerColorProperty, lineWidth: 1.5 }),
        new Circle(4, { fill: RotatingSkyColors.observerColorProperty }),
      ],
    });

    super({
      children: [mapRect, landPath, gridPath, equatorLine, cursor],
      tagName: "div",
      focusable: true,
      accessibleName: controls.latitudeStringProperty,
    });

    Multilink.multilink([latitudeProperty, longitudeProperty], (lat, lon) => {
      cursor.translation = new Vector2(lonToX(lon), latToY(lat));
    });

    const setFromLocal = (localX: number, localY: number): void => {
      longitudeProperty.value = LONGITUDE_RANGE.constrainValue(xToLon(localX));
      latitudeProperty.value = LATITUDE_RANGE.constrainValue(yToLat(localY));
    };

    mapRect.addInputListener(
      new DragListener({
        drag: (event) => {
          const local = this.globalToLocalPoint(event.pointer.point);
          setFromLocal(local.x, local.y);
        },
      }),
    );

    this.addInputListener(
      new KeyboardListener({
        keys: ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          if (keysPressed === "arrowLeft") {
            longitudeProperty.value = LONGITUDE_RANGE.constrainValue(longitudeProperty.value - LOCATION_STEP_DEGREES);
          } else if (keysPressed === "arrowRight") {
            longitudeProperty.value = LONGITUDE_RANGE.constrainValue(longitudeProperty.value + LOCATION_STEP_DEGREES);
          } else if (keysPressed === "arrowUp") {
            latitudeProperty.value = LATITUDE_RANGE.constrainValue(latitudeProperty.value + LOCATION_STEP_DEGREES);
          } else if (keysPressed === "arrowDown") {
            latitudeProperty.value = LATITUDE_RANGE.constrainValue(latitudeProperty.value - LOCATION_STEP_DEGREES);
          }
        },
      }),
    );
  }
}
