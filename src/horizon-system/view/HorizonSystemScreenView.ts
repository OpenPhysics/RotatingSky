/**
 * HorizonSystemScreenView.ts
 *
 * The local sky from an observer's horizon. Shows the horizon dome with the
 * stars projected onto it; the control panel adjusts latitude, adds stars,
 * animates the diurnal rotation, and toggles trails and declination regions.
 */

import { DerivedProperty } from "scenerystack/axon";
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
import { CelestialEquatorOnHorizonNode } from "../../common/view/CelestialEquatorOnHorizonNode.js";
import { CelestialPoleAxisNode } from "../../common/view/CelestialPoleAxisNode.js";
import { DeclinationRegionsNode } from "../../common/view/DeclinationRegionsNode.js";
import { HorizonDomeNode } from "../../common/view/HorizonDomeNode.js";
import { HorizonGroundNode } from "../../common/view/HorizonGroundNode.js";
import { HorizonObserverNode } from "../../common/view/HorizonObserverNode.js";
import { HourCircleOnHorizonNode } from "../../common/view/HourCircleOnHorizonNode.js";
import { SelectedStarHorizonArcsNode } from "../../common/view/SelectedStarHorizonArcsNode.js";
import { SkyReadoutNode } from "../../common/view/SkyReadoutNode.js";
import { SkyStarsNode } from "../../common/view/SkyStarsNode.js";
import { SkyTrailsNode } from "../../common/view/SkyTrailsNode.js";
import { positionReadoutBelowProjection } from "../../common/view/skyViewLayout.js";
import { StringManager } from "../../i18n/StringManager.js";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import {
  CONTROL_FONT_SIZE,
  LATITUDE_RANGE,
  PANEL_CONTENT_SPACING,
  RESET_ALL_BUTTON_BOTTOM_MARGIN,
  SCREEN_VIEW_MARGIN,
  VIEW_READOUT_GAP,
} from "../../RotatingSkyConstants.js";
import type { HorizonSystemModel } from "../model/HorizonSystemModel.js";
import { HorizonSystemScreenSummaryContent } from "./HorizonSystemScreenSummaryContent.js";

// Drag sensitivity (radians of camera rotation per pixel of pointer movement).
const ROTATE_SPEED = 0.01;

/** Approximate height of the star coordinate readout below the dome. */
const STAR_READOUT_HEIGHT = 36;

/** Fill the play area left of the control panel with the projected horizon dome. */
const layoutHorizonSystemProjection = (
  layoutBounds: { minX: number; maxX: number; minY: number; maxY: number },
  panelLeft: number,
): { center: Vector2; radius: number } => {
  const playLeft = layoutBounds.minX + SCREEN_VIEW_MARGIN;
  const playRight = panelLeft - SCREEN_VIEW_MARGIN;
  const playTop = layoutBounds.minY + SCREEN_VIEW_MARGIN;
  const playBottom = layoutBounds.maxY - RESET_ALL_BUTTON_BOTTOM_MARGIN;

  const playWidth = playRight - playLeft;
  const verticalForSphere = playBottom - playTop - STAR_READOUT_HEIGHT - VIEW_READOUT_GAP - 12;
  const radius = Math.min(playWidth / 2, verticalForSphere / 2) * 0.96;
  const centerX = (playLeft + playRight) / 2;
  const centerY = playTop + verticalForSphere / 2;

  return { center: new Vector2(centerX, centerY), radius };
};

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

    // ── Control panel (built first so the dome can fill the remaining play area) ─
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
    const riseSetCheckbox = checkbox(sky.riseSetRegionVisibleProperty, controls.showRiseSetStringProperty);
    const circumpolarCheckbox = checkbox(sky.circumpolarRegionVisibleProperty, controls.showCircumpolarStringProperty);
    const neverRiseCheckbox = checkbox(sky.neverRiseRegionVisibleProperty, controls.showNeverRiseStringProperty);
    const hideBelowHorizonCheckbox = checkbox(sky.hideBelowHorizonProperty, controls.hideBelowHorizonStringProperty);
    const labelsCheckbox = checkbox(
      sky.zenithNadirLabelsVisibleProperty,
      controls.showHorizonPointLabelsStringProperty,
    );
    const meridianCheckbox = checkbox(sky.horizonMeridianVisibleProperty, controls.showMeridianStringProperty);
    const celestialReferencesCheckbox = checkbox(
      sky.horizonCelestialReferencesVisibleProperty,
      controls.showCelestialReferencesStringProperty,
    );

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
          riseSetCheckbox,
          circumpolarCheckbox,
          neverRiseCheckbox,
          hideBelowHorizonCheckbox,
          labelsCheckbox,
          meridianCheckbox,
          celestialReferencesCheckbox,
        ],
      }),
    );
    panel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    panel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;

    // ── Sky projection + dome ───────────────────────────────────────────────────
    const { center, radius } = layoutHorizonSystemProjection(this.layoutBounds, panel.left);
    this.projection = new SkyProjection({
      center,
      radius,
      elevation: -0.5,
      azimuth: Math.PI / 2,
    });

    const belowHorizonVisibleProperty = new DerivedProperty([sky.hideBelowHorizonProperty], (hide) => !hide);

    const declinationRegions = new DeclinationRegionsNode(this.projection, sky.latitudeProperty, {
      circumpolarVisibleProperty: sky.circumpolarRegionVisibleProperty,
      riseSetVisibleProperty: sky.riseSetRegionVisibleProperty,
      neverRiseVisibleProperty: sky.neverRiseRegionVisibleProperty,
      toVector: (raHours, decDeg) => {
        const { altDeg, azDeg } = equatorialToHorizontal(raHours, decDeg, sky.latitudeProperty.value, 0);
        return altAzToVector3(altDeg, azDeg);
      },
    });
    declinationRegions.pickable = false;
    const domeNode = new HorizonDomeNode(this.projection, sky.latitudeProperty, {
      undersideVisibleProperty: belowHorizonVisibleProperty,
      meridianVisibleProperty: sky.horizonMeridianVisibleProperty,
      celestialPolesVisibleProperty: sky.horizonCelestialReferencesVisibleProperty,
      zenithNadirLabelsVisibleProperty: sky.zenithNadirLabelsVisibleProperty,
    });
    const celestialEquatorNode = new CelestialEquatorOnHorizonNode(
      this.projection,
      sky.latitudeProperty,
      sky.horizonCelestialReferencesVisibleProperty,
    );
    const hourCircleNode = new HourCircleOnHorizonNode(
      this.projection,
      sky.latitudeProperty,
      sky.siderealTimeProperty,
      sky.horizonCelestialReferencesVisibleProperty,
    );
    const poleAxisNode = new CelestialPoleAxisNode(
      this.projection,
      sky.latitudeProperty,
      sky.horizonCelestialReferencesVisibleProperty,
    );

    const trailsNode = new SkyTrailsNode(sky, this.projection, {
      pathPointAt: (star, lst) => {
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          sky.latitudeProperty.value,
          lst,
        );
        const visible = belowHorizonVisibleProperty.value || altDeg >= 0;
        return { point: altAzToVector3(altDeg, azDeg), visible };
      },
      redrawProperties: [
        sky.latitudeProperty,
        sky.siderealTimeProperty,
        sky.hideBelowHorizonProperty,
        this.projection.viewMatrixProperty,
      ],
    });

    const starsNode = new SkyStarsNode(sky, {
      starToPoint: (star) => {
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          sky.latitudeProperty.value,
          sky.siderealTimeProperty.value,
        );
        const visible = belowHorizonVisibleProperty.value || altDeg >= 0;
        return { point: this.projection.project(altAzToVector3(altDeg, azDeg)), visible };
      },
      pointToEquatorial: (point) => {
        const v = this.projection.unproject(point);
        const altDeg = radToDeg(Math.asin(clamp(v.z, -1, 1)));
        const azDeg = normalizeDegrees(radToDeg(Math.atan2(v.y, v.x)));
        return horizontalToEquatorial(altDeg, azDeg, sky.latitudeProperty.value, sky.siderealTimeProperty.value);
      },
      redrawProperties: [
        sky.latitudeProperty,
        sky.siderealTimeProperty,
        sky.hideBelowHorizonProperty,
        this.projection.viewMatrixProperty,
      ],
      accessibleName: controls.starStringProperty,
    });

    this.addChild(declinationRegions);
    this.addChild(new HorizonGroundNode(this.projection));
    this.addChild(domeNode);
    this.addChild(poleAxisNode);
    this.addChild(celestialEquatorNode);
    this.addChild(hourCircleNode);
    this.addChild(new HorizonObserverNode(this.projection));
    this.addChild(
      new SelectedStarHorizonArcsNode(this.projection, sky, { hideBelowHorizonProperty: sky.hideBelowHorizonProperty }),
    );
    this.addChild(trailsNode);
    this.addChild(starsNode);

    const starReadout = new SkyReadoutNode(sky, { frame: "horizontal" });
    positionReadoutBelowProjection(starReadout, this.projection);
    this.addChild(starReadout);

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

    this.addChild(panel);

    // ── Reset All ───────────────────────────────────────────────────────────────
    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - RESET_ALL_BUTTON_BOTTOM_MARGIN,
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
          riseSetCheckbox,
          circumpolarCheckbox,
          neverRiseCheckbox,
          hideBelowHorizonCheckbox,
          labelsCheckbox,
          meridianCheckbox,
          celestialReferencesCheckbox,
          starsNode,
          starReadout,
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
