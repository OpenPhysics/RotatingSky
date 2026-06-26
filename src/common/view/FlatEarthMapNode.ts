/**
 * FlatEarthMapNode.ts
 *
 * A flat (equirectangular) map of the Earth with a draggable observer cursor.
 * Dragging the cursor — or typing/arrow-keying — sets the observer's latitude
 * and longitude, which the rest of the Explorer screen is linked to. Arrow keys
 * nudge the location in 5° steps.
 */

import { Multilink, type NumberProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardListener, Line, Node, Path, Rectangle } from "scenerystack/scenery";
import { StringManager } from "../../i18n/StringManager.js";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { LATITUDE_RANGE, LOCATION_STEP_DEGREES, LONGITUDE_RANGE } from "../../RotatingSkyConstants.js";
import { EARTH_SHORE_POLYGONS } from "./EarthShoreData.js";

export type FlatEarthMapNodeOptions = { width: number; height: number };

export class FlatEarthMapNode extends Node {
  public constructor(
    latitudeProperty: NumberProperty,
    longitudeProperty: NumberProperty,
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

    const land = new Shape();
    for (const polygon of EARTH_SHORE_POLYGONS) {
      let previousLon: number | null = null;
      let penDown = false;
      for (const point of polygon) {
        const lon = Math.atan2(point.y, point.x) * (180 / Math.PI);
        const lat = Math.asin(point.z) * (180 / Math.PI);
        if (previousLon !== null && Math.abs(lon - previousLon) > 180) {
          if (penDown) {
            land.close();
          }
          penDown = false;
        }
        if (penDown) {
          land.lineTo(lonToX(lon), latToY(lat));
        } else {
          land.moveTo(lonToX(lon), latToY(lat));
          penDown = true;
        }
        previousLon = lon;
      }
      if (penDown) {
        land.close();
      }
    }
    const landPath = new Path(land, {
      fill: RotatingSkyColors.earthLandColorProperty,
      stroke: RotatingSkyColors.sphereOutlineColorProperty,
      lineWidth: 0.35,
      opacity: 0.95,
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
