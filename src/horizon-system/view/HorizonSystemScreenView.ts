/**
 * HorizonSystemScreenView.ts
 *
 * The local sky from an observer's horizon. Supports three presentations:
 * the external horizon dome, a first-person cardinal sky view, or both.
 * The control panel adjusts latitude, view mode / direction, adds stars,
 * animates the diurnal rotation, and toggles trails, angles, and regions.
 */

import { DerivedProperty } from "scenerystack/axon";
import { Bounds2, clamp, Vector2 } from "scenerystack/dot";
import { Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { Checkbox, RectangularPushButton, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import { ViewDirection, viewDirectionDomeAzimuth } from "../../common/model/ViewDirection.js";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
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
import { attachSkyCameraInteraction } from "../../common/view/attachSkyCameraInteraction.js";
import { CelestialEquatorOnHorizonNode } from "../../common/view/CelestialEquatorOnHorizonNode.js";
import { CelestialPoleAxisNode } from "../../common/view/CelestialPoleAxisNode.js";
import { DeclinationRegionsNode } from "../../common/view/DeclinationRegionsNode.js";
import { EquatorHorizonAngleNode } from "../../common/view/EquatorHorizonAngleNode.js";
import { FirstPersonSkyViewNode } from "../../common/view/FirstPersonSkyViewNode.js";
import { HorizonDomeNode } from "../../common/view/HorizonDomeNode.js";
import { HorizonGroundNode } from "../../common/view/HorizonGroundNode.js";
import { HorizonObserverNode } from "../../common/view/HorizonObserverNode.js";
import { HourCircleOnHorizonNode } from "../../common/view/HourCircleOnHorizonNode.js";
import { NcpAltitudeAngleNode } from "../../common/view/NcpAltitudeAngleNode.js";
import { SelectedStarHorizonArcsNode } from "../../common/view/SelectedStarHorizonArcsNode.js";
import { SkyReadoutNode } from "../../common/view/SkyReadoutNode.js";
import { SkyStarsNode } from "../../common/view/SkyStarsNode.js";
import { SkyTrailsNode } from "../../common/view/SkyTrailsNode.js";
import { positionReadoutBelowRightOfProjection } from "../../common/view/skyViewLayout.js";
import { StringManager } from "../../i18n/StringManager.js";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import {
  CONTROL_FONT_SIZE,
  LATITUDE_RANGE,
  PANEL_CONTENT_SPACING,
  PANEL_TITLE_FONT_SIZE,
  RESET_ALL_BUTTON_BOTTOM_MARGIN,
  SCREEN_VIEW_MARGIN,
  SKY_VIEW_MAX_SIZE,
  VIEW_READOUT_GAP,
} from "../../RotatingSkyConstants.js";
import type { HorizonSystemModel } from "../model/HorizonSystemModel.js";
import { HorizonViewMode } from "../model/HorizonViewMode.js";
import { HorizonSystemScreenSummaryContent } from "./HorizonSystemScreenSummaryContent.js";

/** Approximate height of the star coordinate readout below the dome. */
const STAR_READOUT_HEIGHT = 36;

/** Default camera tilt looking slightly down onto the dome. */
const DEFAULT_DOME_ELEVATION = -0.5;

/**
 * Fit a square first-person FOV into `slot`, capped at {@link SKY_VIEW_MAX_SIZE}
 * so the panel matches the dome's visual scale instead of filling the play area.
 */
const fitSkyViewInSlot = (slot: Bounds2): Bounds2 => {
  const side = Math.min(slot.width, slot.height, SKY_VIEW_MAX_SIZE);
  const left = slot.centerX - side / 2;
  const top = slot.centerY - side / 2;
  return new Bounds2(left, top, left + side, top + side);
};

/** Layout the play area left of the control panel into one or two view slots. */
const layoutPlayArea = (
  layoutBounds: { minX: number; maxX: number; minY: number; maxY: number },
  panelLeft: number,
  mode: HorizonViewMode,
): { diagram: Bounds2 | null; sky: Bounds2 | null } => {
  const playLeft = layoutBounds.minX + SCREEN_VIEW_MARGIN;
  const playRight = panelLeft - SCREEN_VIEW_MARGIN;
  const playTop = layoutBounds.minY + SCREEN_VIEW_MARGIN;
  const playBottom = layoutBounds.maxY - RESET_ALL_BUTTON_BOTTOM_MARGIN;
  const play = new Bounds2(playLeft, playTop, playRight, playBottom);

  if (mode === HorizonViewMode.DIAGRAM) {
    return { diagram: play, sky: null };
  }
  if (mode === HorizonViewMode.SKY) {
    return { diagram: null, sky: fitSkyViewInSlot(play) };
  }

  const gap = SCREEN_VIEW_MARGIN;
  const halfWidth = (play.width - gap) / 2;
  const diagramSlot = new Bounds2(play.minX, play.minY, play.minX + halfWidth, play.maxY);
  const skySlot = new Bounds2(play.minX + halfWidth + gap, play.minY, play.maxX, play.maxY);
  return {
    diagram: diagramSlot,
    sky: fitSkyViewInSlot(skySlot),
  };
};

/** Fit an orthographic dome into `bounds`, reserving space for the star readout. */
const projectionInBounds = (bounds: Bounds2): { center: Vector2; radius: number } => {
  const readoutReserve = STAR_READOUT_HEIGHT + VIEW_READOUT_GAP;
  const radius = Math.min(bounds.width / 2, (bounds.height - readoutReserve) / 2) * 0.96;
  return {
    center: new Vector2(bounds.centerX, bounds.minY + radius),
    radius,
  };
};

export class HorizonSystemScreenView extends ScreenView {
  private readonly projection: SkyProjection;
  private readonly skyViewNode: FirstPersonSkyViewNode;
  private readonly diagramLayer: Node;
  private readonly model: HorizonSystemModel;

  public constructor(model: HorizonSystemModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new HorizonSystemScreenSummaryContent(model),
      ...options,
    });

    this.model = model;
    const sky = model.sky;
    const controls = StringManager.getInstance().getControls();
    const keyboardHelp = StringManager.getInstance().getKeyboardHelpStrings();

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: RotatingSkyColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    // ── Control panel (built first so the play area can fill the remainder) ─────
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
        content: new Text(labelProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: LIGHT_SURFACE_TEXT_FILL }),
        listener,
        accessibleName: labelProperty,
      });

    const addStarButton = pushButton(controls.addStarStringProperty, () => sky.addRandomStar());
    const resetTrailsButton = pushButton(controls.resetStarTrailsStringProperty, () => sky.resetStarTrails());
    const removeAllButton = pushButton(controls.removeAllStarsStringProperty, () => sky.removeAllStars());
    const snapDomeButton = pushButton(controls.snapDomeToDirectionStringProperty, () => {
      this.projection.azimuthProperty.value = viewDirectionDomeAzimuth(model.viewDirectionProperty.value);
      this.projection.elevationProperty.value = DEFAULT_DOME_ELEVATION;
    });

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

    const radioText = (labelProperty: typeof controls.viewModeDiagramStringProperty): Text =>
      new Text(labelProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: RotatingSkyColors.textColorProperty });

    const sectionTitle = (labelProperty: typeof controls.viewModeStringProperty): Text =>
      new Text(labelProperty, {
        font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
        fill: RotatingSkyColors.textColorProperty,
      });

    const viewModeRadioGroup = new VerticalAquaRadioButtonGroup<HorizonViewMode>(
      model.viewModeProperty,
      [
        {
          value: HorizonViewMode.DIAGRAM,
          createNode: () => radioText(controls.viewModeDiagramStringProperty),
          options: { accessibleName: controls.viewModeDiagramStringProperty },
        },
        {
          value: HorizonViewMode.SKY,
          createNode: () => radioText(controls.viewModeSkyStringProperty),
          options: { accessibleName: controls.viewModeSkyStringProperty },
        },
        {
          value: HorizonViewMode.BOTH,
          createNode: () => radioText(controls.viewModeBothStringProperty),
          options: { accessibleName: controls.viewModeBothStringProperty },
        },
      ],
      { spacing: 4, radioButtonOptions: { radius: 6 } },
    );

    const viewDirectionRadioGroup = new VerticalAquaRadioButtonGroup<ViewDirection>(
      model.viewDirectionProperty,
      [
        {
          value: ViewDirection.NORTH,
          createNode: () => radioText(controls.viewDirectionNorthStringProperty),
          options: { accessibleName: controls.viewDirectionNorthStringProperty },
        },
        {
          value: ViewDirection.EAST,
          createNode: () => radioText(controls.viewDirectionEastStringProperty),
          options: { accessibleName: controls.viewDirectionEastStringProperty },
        },
        {
          value: ViewDirection.SOUTH,
          createNode: () => radioText(controls.viewDirectionSouthStringProperty),
          options: { accessibleName: controls.viewDirectionSouthStringProperty },
        },
        {
          value: ViewDirection.WEST,
          createNode: () => radioText(controls.viewDirectionWestStringProperty),
          options: { accessibleName: controls.viewDirectionWestStringProperty },
        },
      ],
      { spacing: 4, radioButtonOptions: { radius: 6 } },
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
    const equatorAngleCheckbox = checkbox(
      sky.equatorHorizonAngleVisibleProperty,
      controls.showEquatorHorizonAngleStringProperty,
    );
    const ncpAltitudeCheckbox = checkbox(
      sky.ncpAltitudeAngleVisibleProperty,
      controls.showNcpAltitudeAngleStringProperty,
    );

    const panel = new RotatingSkyPanel(
      new VBox({
        align: "left",
        spacing: PANEL_CONTENT_SPACING,
        children: [
          latitudeControl,
          sectionTitle(controls.viewModeStringProperty),
          viewModeRadioGroup,
          sectionTitle(controls.viewDirectionStringProperty),
          viewDirectionRadioGroup,
          snapDomeButton,
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
          equatorAngleCheckbox,
          ncpAltitudeCheckbox,
        ],
      }),
    );
    panel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    panel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;

    // ── Horizon dome (diagram) ──────────────────────────────────────────────────
    const initialLayout = layoutPlayArea(this.layoutBounds, panel.left, model.viewModeProperty.value);
    const initialDiagram = initialLayout.diagram ?? new Bounds2(0, 0, 1, 1);
    const { center, radius } = projectionInBounds(initialDiagram);
    this.projection = new SkyProjection({
      center,
      radius,
      elevation: DEFAULT_DOME_ELEVATION,
      azimuth: viewDirectionDomeAzimuth(model.viewDirectionProperty.value),
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
    const equatorAngleNode = new EquatorHorizonAngleNode(
      this.projection,
      sky.latitudeProperty,
      sky.equatorHorizonAngleVisibleProperty,
    );
    const ncpAltitudeNode = new NcpAltitudeAngleNode(
      this.projection,
      sky.latitudeProperty,
      sky.ncpAltitudeAngleVisibleProperty,
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
      accessibleHelpText: keyboardHelp.starHelpStringProperty,
    });

    const starReadout = new SkyReadoutNode(sky, { frame: "horizontal" });

    this.diagramLayer = new Node({
      children: [
        declinationRegions,
        new HorizonGroundNode(this.projection),
        domeNode,
        poleAxisNode,
        celestialEquatorNode,
        hourCircleNode,
        equatorAngleNode,
        ncpAltitudeNode,
        new HorizonObserverNode(this.projection),
        new SelectedStarHorizonArcsNode(this.projection, sky, {
          hideBelowHorizonProperty: sky.hideBelowHorizonProperty,
        }),
        trailsNode,
        starsNode,
        starReadout,
      ],
    });
    this.addChild(this.diagramLayer);
    positionReadoutBelowRightOfProjection(starReadout, this.projection);

    attachSkyCameraInteraction(backgroundRect, {
      projection: this.projection,
      sky,
      accessibleNameProperty: keyboardHelp.skyViewStringProperty,
      accessibleHelpTextProperty: keyboardHelp.skyViewHelpStringProperty,
    });

    // ── First-person sky view ───────────────────────────────────────────────────
    const directionLabelProperty = new DerivedProperty(
      [
        model.viewDirectionProperty,
        controls.viewDirectionNorthStringProperty,
        controls.viewDirectionEastStringProperty,
        controls.viewDirectionSouthStringProperty,
        controls.viewDirectionWestStringProperty,
      ],
      (direction, north, east, south, west) => {
        if (direction === ViewDirection.NORTH) {
          return north;
        }
        if (direction === ViewDirection.EAST) {
          return east;
        }
        if (direction === ViewDirection.SOUTH) {
          return south;
        }
        return west;
      },
    );

    const initialSky = initialLayout.sky ?? new Bounds2(0, 0, 1, 1);
    this.skyViewNode = new FirstPersonSkyViewNode(sky, {
      bounds: initialSky,
      viewDirectionProperty: model.viewDirectionProperty,
      directionLabelProperty,
      starAccessibleName: controls.starStringProperty,
      starAccessibleHelp: keyboardHelp.starHelpStringProperty,
    });
    this.addChild(this.skyViewNode);

    const applyLayout = (): void => {
      const layout = layoutPlayArea(this.layoutBounds, panel.left, model.viewModeProperty.value);
      const showDiagram = layout.diagram !== null;
      const showSky = layout.sky !== null;

      this.diagramLayer.visible = showDiagram;
      this.skyViewNode.visible = showSky;
      // Camera drag only makes sense on the external dome.
      backgroundRect.focusable = showDiagram;
      backgroundRect.inputEnabled = showDiagram;

      if (layout.diagram) {
        const fitted = projectionInBounds(layout.diagram);
        this.projection.center = fitted.center;
        this.projection.radius = fitted.radius;
        // center/radius are plain fields — nudge azimuth so viewMatrix listeners redraw.
        const az = this.projection.azimuthProperty.value;
        this.projection.azimuthProperty.value = az + 1e-9;
        this.projection.azimuthProperty.value = az;
        positionReadoutBelowRightOfProjection(starReadout, this.projection);
      }
      if (layout.sky) {
        this.skyViewNode.setViewBounds(layout.sky);
      }
    };

    model.viewModeProperty.link(applyLayout);
    applyLayout();

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

    this.pdomPlayAreaNode.pdomOrder = [backgroundRect, starsNode, this.skyViewNode, starReadout];
    this.pdomControlAreaNode.pdomOrder = [
      latitudeControl,
      viewModeRadioGroup,
      viewDirectionRadioGroup,
      snapDomeButton,
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
      equatorAngleCheckbox,
      ncpAltitudeCheckbox,
      resetAllButton,
    ];
  }

  public reset(): void {
    this.projection.reset();
    this.projection.azimuthProperty.value = viewDirectionDomeAzimuth(this.model.viewDirectionProperty.value);
    this.projection.elevationProperty.value = DEFAULT_DOME_ELEVATION;
  }

  public override step(_dt: number): void {
    // Model.step advances the sidereal time; view nodes react via Properties.
  }
}
