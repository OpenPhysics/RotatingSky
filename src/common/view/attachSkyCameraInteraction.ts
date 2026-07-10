/**
 * attachSkyCameraInteraction.ts
 *
 * Pointer + keyboard camera control for a sky projection region. Matches the
 * NAAP drag modes:
 *   - plain drag / arrow keys          → free camera rotate
 *   - Alt-drag / Alt+arrows            → rotate about zenith only
 *   - Ctrl/Meta-drag / Ctrl+arrows     → advance sidereal time ("rotate about NCP")
 *
 * Optional Shift-click / Shift+Enter adds a star at the pointer / sphere center
 * when `onAddStarAt` is provided (Explorer).
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { Vector2 } from "scenerystack/dot";
import { DragListener, KeyboardListener, type Node } from "scenerystack/scenery";
import type { SkyModel } from "../model/SkyModel.js";
import RotatingSkyHotkeyData from "../RotatingSkyHotkeyData.js";
import type { SkyProjection } from "../SkyProjection.js";

/** Radians of camera rotation per pixel of pointer movement. */
export const SKY_ROTATE_SPEED = 0.01;
/** Sidereal hours advanced per pixel of Ctrl-drag. */
export const SKY_TIME_DRAG_RATE = 0.02;

/** Radians of camera rotation per keyboard arrow press. */
const KEYBOARD_ROTATE_STEP = 0.1;
/** Sidereal hours advanced per Ctrl+arrowLeft/Right press. */
const KEYBOARD_TIME_STEP_HOURS = 0.25;

export type AttachSkyCameraInteractionOptions = {
  projection: SkyProjection;
  sky: SkyModel;
  /** Localized accessible name for the focusable sky region. */
  accessibleNameProperty: TReadOnlyProperty<string>;
  /** Localized help text describing arrow / Alt / Ctrl modes. */
  accessibleHelpTextProperty?: TReadOnlyProperty<string>;
  /**
   * When set, Shift-click and Shift+Enter add a star. The callback receives a
   * parent-relative screen point (click location, or the projection center).
   */
  onAddStarAt?: (parentPoint: Vector2) => void;
};

/**
 * Makes `target` a focusable sky-camera control with pointer drag and keyboard
 * equivalents. Returns `target` for chaining.
 */
export const attachSkyCameraInteraction = <T extends Node>(
  target: T,
  options: AttachSkyCameraInteractionOptions,
): T => {
  const { projection, sky, accessibleNameProperty, accessibleHelpTextProperty, onAddStarAt } = options;

  target.tagName = "div";
  target.focusable = true;
  target.accessibleName = accessibleNameProperty;
  if (accessibleHelpTextProperty) {
    target.accessibleHelpText = accessibleHelpTextProperty;
  }

  let lastPoint: Vector2 | null = null;
  let dragMode: "simple" | "zenith" | "ncp" = "simple";

  target.addInputListener(
    new DragListener({
      start: (event) => {
        const domEvent = event.domEvent as {
          shiftKey?: boolean;
          altKey?: boolean;
          ctrlKey?: boolean;
          metaKey?: boolean;
        } | null;
        if (onAddStarAt && domEvent?.shiftKey) {
          onAddStarAt(target.globalToParentPoint(event.pointer.point));
          lastPoint = null;
          return;
        }
        lastPoint = event.pointer.point.copy();
        dragMode = domEvent?.altKey ? "zenith" : domEvent?.ctrlKey || domEvent?.metaKey ? "ncp" : "simple";
      },
      drag: (event) => {
        if (!lastPoint) {
          return;
        }
        const p = event.pointer.point;
        const dx = p.x - lastPoint.x;
        const dy = lastPoint.y - p.y;
        switch (dragMode) {
          case "zenith":
            projection.rotateAboutZenith(dx * SKY_ROTATE_SPEED);
            break;
          case "ncp":
            sky.advanceSiderealTime(-dx * SKY_TIME_DRAG_RATE);
            break;
          default:
            projection.rotateBy(dx * SKY_ROTATE_SPEED, dy * SKY_ROTATE_SPEED);
            break;
        }
        lastPoint = p.copy();
      },
      end: () => {
        lastPoint = null;
      },
    }),
  );

  target.addInputListener(
    new KeyboardListener({
      keys: [
        ...RotatingSkyHotkeyData.ROTATE_SKY_KEYS,
        ...RotatingSkyHotkeyData.ROTATE_ABOUT_ZENITH_KEYS,
        ...RotatingSkyHotkeyData.ADVANCE_SIDEREAL_TIME_KEYS,
        ...(onAddStarAt ? RotatingSkyHotkeyData.ADD_STAR_AT_CENTER_KEYS : []),
      ],
      fireOnHold: true,
      fire: (_event, keysPressed) => {
        if (onAddStarAt && keysPressed === "shift+enter") {
          onAddStarAt(projection.center);
          return;
        }

        if (
          keysPressed === "alt+arrowLeft" ||
          keysPressed === "alt+arrowRight" ||
          keysPressed === "alt+arrowUp" ||
          keysPressed === "alt+arrowDown"
        ) {
          const sign = keysPressed === "alt+arrowLeft" || keysPressed === "alt+arrowDown" ? -1 : 1;
          projection.rotateAboutZenith(sign * KEYBOARD_ROTATE_STEP);
          return;
        }

        if (keysPressed === "ctrl+arrowLeft" || keysPressed === "ctrl+arrowRight") {
          const sign = keysPressed === "ctrl+arrowLeft" ? 1 : -1;
          sky.advanceSiderealTime(sign * KEYBOARD_TIME_STEP_HOURS);
          return;
        }

        // Plain arrows: free camera rotate (left/right = azimuth, up/down = elevation).
        if (keysPressed === "arrowLeft") {
          projection.rotateBy(-KEYBOARD_ROTATE_STEP, 0);
        } else if (keysPressed === "arrowRight") {
          projection.rotateBy(KEYBOARD_ROTATE_STEP, 0);
        } else if (keysPressed === "arrowUp") {
          projection.rotateBy(0, KEYBOARD_ROTATE_STEP);
        } else if (keysPressed === "arrowDown") {
          projection.rotateBy(0, -KEYBOARD_ROTATE_STEP);
        }
      },
    }),
  );

  return target;
};
