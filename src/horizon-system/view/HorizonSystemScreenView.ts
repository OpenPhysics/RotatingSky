/**
 * HorizonSystemScreenView.ts
 *
 * The local sky from an observer's horizon. Shows the horizon dome with the
 * stars projected onto it; the control panel adjusts latitude, adds stars,
 * animates the diurnal rotation, and toggles trails and declination bands.
 */

import { clamp, Vector2 } from "scenerystack/dot";
import { DragListener, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { Checkbox, RectangularPushButton } from "scenerystack/sun";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/RotatingSkyButtonOptions.js";
import {
  ROTATING_SKY_CHECKBOX_OPTIONS,
  ROTATING_SKY_NUMBER_CONTROL_OPTIONS,
} from "../../common/RotatingSkyControlOptions.js";
import { RotatingSkyPanel } from "../../common/RotatingSkyPanel.js";
import {
  altAzToVector3,
  equatorialToHorizontal,
  horizontalToEquatorial,
  normalizeDegrees,
  radToDeg,
} from "../../common/SkyCoordinates.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { HorizonDomeNode } from "../../common/view/HorizonDomeNode.js";
import { HorizonGroundNode } from "../../common/view/HorizonGroundNode.js";
import { HorizonObserverNode } from "../../common/view/HorizonObserverNode.js";
import { SkyBandsNode } from "../../common/view/SkyBandsNode.js";
import { SkyReadoutNode } from "../../common/view/SkyReadoutNode.js";
import { SkyStarsNode } from "../../common/view/SkyStarsNode.js";
import { SkyTrailsNode } from "../../common/view/SkyTrailsNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import {
  CONTROL_FONT_SIZE,
  LATITUDE_RANGE,
  PANEL_CONTENT_SPACING,
  SCREEN_VIEW_MARGIN,
  SPHERE_RADIUS,
} from "../../RotatingSkyConstants.js";
import type { HorizonSystemModel } from "../model/HorizonSystemModel.js";
import { HorizonSystemScreenSummaryContent } from "./HorizonSystemScreenSummaryContent.js";

// Drag sensitivity (radians of camera rotation per pixel of pointer movement).
const ROTATE_SPEED = 0.01;

export class HorizonSystemScreenView extends ScreenView {
  private readonly projection: SkyProjection;

  public constructor(model: HorizonSystemModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new HorizonSystemScreenSummaryContent(model),
      ...options,
    });

    const sky = model.sky;
    const controls = StringManager.getInstance().getControls();

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: RotatingSkyColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    // ── Sky projection + dome ───────────────────────────────────────────────────
    this.projection = new SkyProjection({
      center: new Vector2(this.layoutBounds.centerX - 120, this.layoutBounds.centerY + 30),
      radius: SPHERE_RADIUS,
      elevation: -0.5,
      azimuth: Math.PI / 2,
    });

    const bandsNode = new SkyBandsNode(this.projection, sky.latitudeProperty, sky.bandsVisibleProperty);
    const domeNode = new HorizonDomeNode(this.projection, sky.latitudeProperty);

    const trailsNode = new SkyTrailsNode(sky, this.projection, {
      pathPointAt: (star, lst) => {
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          sky.latitudeProperty.value,
          lst,
        );
        return { point: altAzToVector3(altDeg, azDeg), visible: altDeg >= 0 };
      },
      redrawProperties: [sky.latitudeProperty, sky.siderealTimeProperty, this.projection.viewMatrixProperty],
    });

    const starsNode = new SkyStarsNode(sky, {
      starToPoint: (star) => {
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          sky.latitudeProperty.value,
          sky.siderealTimeProperty.value,
        );
        return { point: this.projection.project(altAzToVector3(altDeg, azDeg)), visible: altDeg >= 0 };
      },
      pointToEquatorial: (point) => {
        const v = this.projection.unproject(point);
        const altDeg = radToDeg(Math.asin(clamp(v.z, -1, 1)));
        const azDeg = normalizeDegrees(radToDeg(Math.atan2(v.y, v.x)));
        return horizontalToEquatorial(altDeg, azDeg, sky.latitudeProperty.value, sky.siderealTimeProperty.value);
      },
      redrawProperties: [sky.latitudeProperty, sky.siderealTimeProperty, this.projection.viewMatrixProperty],
      accessibleName: controls.starStringProperty,
    });

    this.addChild(bandsNode);
    this.addChild(new HorizonGroundNode(this.projection));
    this.addChild(domeNode);
    this.addChild(new HorizonObserverNode(this.projection));
    this.addChild(trailsNode);
    this.addChild(starsNode);

    // Drag the empty background to rotate the camera.
    let lastPoint: Vector2 | null = null;
    backgroundRect.addInputListener(
      new DragListener({
        start: (event) => {
          lastPoint = event.pointer.point.copy();
        },
        drag: (event) => {
          if (lastPoint) {
            const p = event.pointer.point;
            this.projection.rotateBy((lastPoint.x - p.x) * ROTATE_SPEED, (lastPoint.y - p.y) * ROTATE_SPEED);
            lastPoint = p.copy();
          }
        },
        end: () => {
          lastPoint = null;
        },
      }),
    );

    // ── Control panel ───────────────────────────────────────────────────────────
    const latitudeControl = new NumberControl(controls.latitudeStringProperty, sky.latitudeProperty, LATITUDE_RANGE, {
      ...ROTATING_SKY_NUMBER_CONTROL_OPTIONS,
      delta: 1,
      numberDisplayOptions: {
        decimalPlaces: 0,
        valuePattern: "{{value}}°",
      },
      titleNodeOptions: {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: RotatingSkyColors.textColorProperty,
        maxWidth: 160,
      },
    });

    const pushButton = (
      labelProperty: typeof controls.addStarStringProperty,
      listener: () => void,
    ): RectangularPushButton =>
      new RectangularPushButton({
        ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
        content: new Text(labelProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: "#000000" }),
        listener,
        accessibleName: labelProperty,
      });

    const addStarButton = pushButton(controls.addStarStringProperty, () => sky.addRandomStar());
    const resetTrailsButton = pushButton(controls.resetStarTrailsStringProperty, () => sky.resetStarTrails());
    const removeAllButton = pushButton(controls.removeAllStarsStringProperty, () => sky.removeAllStars());

    const timeControl = new TimeControlNode(sky.timer.isPlayingProperty, {
      timeSpeedProperty: sky.timeSpeedProperty,
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => sky.stepForward(),
        },
      },
    });

    const checkbox = (
      property: typeof sky.starTrailsVisibleProperty,
      labelProperty: typeof controls.starTrailsStringProperty,
    ): Checkbox =>
      new Checkbox(
        property,
        new Text(labelProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: RotatingSkyColors.textColorProperty }),
        {
          ...ROTATING_SKY_CHECKBOX_OPTIONS,
          accessibleName: labelProperty,
        },
      );

    const trailsCheckbox = checkbox(sky.starTrailsVisibleProperty, controls.starTrailsStringProperty);
    const bandsCheckbox = checkbox(sky.bandsVisibleProperty, controls.showBandsStringProperty);

    const readout = new SkyReadoutNode(sky);

    const panel = new RotatingSkyPanel(
      new VBox({
        align: "left",
        spacing: PANEL_CONTENT_SPACING,
        children: [
          latitudeControl,
          addStarButton,
          timeControl,
          resetTrailsButton,
          trailsCheckbox,
          removeAllButton,
          bandsCheckbox,
          readout,
        ],
      }),
    );
    panel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    panel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    this.addChild(panel);

    // ── Reset All ───────────────────────────────────────────────────────────────
    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    this.addChild(
      new Node({
        pdomOrder: [
          latitudeControl,
          addStarButton,
          timeControl,
          resetTrailsButton,
          trailsCheckbox,
          removeAllButton,
          bandsCheckbox,
          starsNode,
          resetAllButton,
        ],
      }),
    );
  }

  public reset(): void {
    this.projection.reset();
  }

  public override step(_dt: number): void {
    // Model.step advances the sidereal time; view nodes react via Properties.
  }
}
