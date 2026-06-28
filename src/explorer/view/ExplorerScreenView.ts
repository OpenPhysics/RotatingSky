/**
 * ExplorerScreenView.ts
 *
 * The full Rotating Sky Explorer. Two linked 3-D views sit on top — the
 * celestial sphere (left, with the Earth globe and declination-region shading)
 * and the horizon diagram (right, with the celestial equator and star trails) —
 * over four control panels:
 *
 *   - Observer's Location: a flat Earth map plus latitude / longitude controls,
 *   - Animation Controls: play / step, an animation-time picker, plus a continuous rate slider,
 *   - Appearance Settings: eight toggles for the sky overlays,
 *   - Star Controls: a star-pattern picker, add / remove, and trail length.
 *
 * Everything is wired through one shared {@link SkyModel}: a star dragged or
 * added on either sphere appears on both, and every toggle drives both views.
 */

import { DerivedProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { clamp, Vector2 } from "scenerystack/dot";
import { DragListener, HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { Checkbox, ComboBox, HSlider, RectangularPushButton, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import type { AnimationDuration, SkyModel, StarTrailMode } from "../../common/model/SkyModel.js";
import {
  BIG_DIPPER,
  BIG_DIPPER_EDGES,
  CASSIOPEIA,
  CASSIOPEIA_EDGES,
  LITTLE_DIPPER,
  LITTLE_DIPPER_EDGES,
  ORION,
  ORION_EDGES,
  ORIONS_BELT,
  ORIONS_BELT_EDGES,
  SOUTHERN_CROSS,
  SOUTHERN_CROSS_EDGES,
  type StarPattern,
  SUMMER_TRIANGLE,
  SUMMER_TRIANGLE_EDGES,
} from "../../common/model/StarPatterns.js";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
  ROTATING_SKY_COMBO_BOX_OPTIONS,
} from "../../common/RotatingSkyButtonOptions.js";
import {
  ROTATING_SKY_CHECKBOX_OPTIONS,
  ROTATING_SKY_NUMBER_CONTROL_OPTIONS,
  ROTATING_SKY_SLIDER_OPTIONS,
} from "../../common/RotatingSkyControlOptions.js";
import { RotatingSkyPanel } from "../../common/RotatingSkyPanel.js";
import {
  altAzToVector3,
  equatorialToHorizontal,
  HOURS_PER_DAY,
  horizontalToEquatorial,
  normalizeDegrees,
  normalizeHours,
  raDecToVector3,
  radiansToHours,
  radToDeg,
} from "../../common/SkyCoordinates.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { CelestialEquatorOnHorizonNode } from "../../common/view/CelestialEquatorOnHorizonNode.js";
import { CelestialSphereNode } from "../../common/view/CelestialSphereNode.js";
import { DeclinationRegionsNode } from "../../common/view/DeclinationRegionsNode.js";
import { EarthGlobeNode } from "../../common/view/EarthGlobeNode.js";
import { EquatorHorizonAngleNode } from "../../common/view/EquatorHorizonAngleNode.js";
import { FlatEarthMapNode } from "../../common/view/FlatEarthMapNode.js";
import { HorizonDomeNode } from "../../common/view/HorizonDomeNode.js";
import { HorizonGroundNode } from "../../common/view/HorizonGroundNode.js";
import { HorizonObserverNode } from "../../common/view/HorizonObserverNode.js";
import { HorizonPlaneNode } from "../../common/view/HorizonPlaneNode.js";
import { SelectedStarCelestialArcsNode } from "../../common/view/SelectedStarCelestialArcsNode.js";
import { SelectedStarHorizonArcsNode } from "../../common/view/SelectedStarHorizonArcsNode.js";
import { SkyPatternLinesNode } from "../../common/view/SkyPatternLinesNode.js";
import { SkyReadoutNode } from "../../common/view/SkyReadoutNode.js";
import { SkyStarsNode } from "../../common/view/SkyStarsNode.js";
import { SkyTrailsNode } from "../../common/view/SkyTrailsNode.js";
import { positionReadoutBelowProjection } from "../../common/view/skyViewLayout.js";
import { StringManager } from "../../i18n/StringManager.js";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import {
  ANIMATION_RATE_RANGE,
  CONTROL_FONT_SIZE,
  type EarthMapResolution,
  LATITUDE_RANGE,
  LONG_TRAIL_HOURS,
  LONGITUDE_RANGE,
  PANEL_CONTENT_SPACING,
  PANEL_TITLE_FONT_SIZE,
  RESET_ALL_BUTTON_BOTTOM_MARGIN,
  SCREEN_VIEW_MARGIN,
  SHORT_TRAIL_HOURS,
} from "../../RotatingSkyConstants.js";
import type { ExplorerModel } from "../model/ExplorerModel.js";
import { ExplorerScreenSummaryContent } from "./ExplorerScreenSummaryContent.js";

type ExplorerScreenViewOptions = ScreenViewOptions & {
  earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>;
};

const ROTATE_SPEED = 0.01;
/** Sidereal hours advanced per pixel of Ctrl-drag ("rotate about NCP" mode). */
const TIME_DRAG_RATE = 0.02;
const SPHERE_RADIUS = 118;

export class ExplorerScreenView extends ScreenView {
  private readonly sky: SkyModel;
  private readonly celProjection: SkyProjection;
  private readonly horProjection: SkyProjection;

  /**
   * The observer's *local* sidereal time = reference sidereal time + longitude. Driving every
   * observer-relative diagram (horizon plane, globe dot, horizon-dome stars/trails/arcs, the
   * alt/az readout) from this is what wires the longitude control to both views: moving the
   * observer east/west rotates their local sky relative to the fixed celestial sphere.
   */
  private readonly localSiderealTimeProperty: TReadOnlyProperty<number>;

  public constructor(model: ExplorerModel, options: ExplorerScreenViewOptions) {
    const { earthMapResolutionProperty, ...screenViewOptions } = options;
    super({
      screenSummaryContent: new ExplorerScreenSummaryContent(model),
      ...screenViewOptions,
    });

    const sky = model.sky;
    this.sky = sky;
    const localSiderealTimeProperty = new DerivedProperty(
      [sky.siderealTimeProperty, sky.longitudeProperty],
      (siderealTime, longitude) => normalizeHours(siderealTime + (longitude / 360) * HOURS_PER_DAY),
    );
    this.localSiderealTimeProperty = localSiderealTimeProperty;
    const controls = StringManager.getInstance().getControls();
    const textFill = RotatingSkyColors.textColorProperty;

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: RotatingSkyColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    const viewLabel = (labelProperty: typeof controls.celestialSphereViewStringProperty): Text =>
      new Text(labelProperty, { font: new PhetFont({ size: 13, style: "italic" }), fill: textFill });

    // ── Celestial sphere (left) ─────────────────────────────────────────────────
    this.celProjection = new SkyProjection({
      center: new Vector2(245, 205),
      radius: SPHERE_RADIUS,
      elevation: -0.35,
    });
    const celRegions = new DeclinationRegionsNode(this.celProjection, sky.latitudeProperty, {
      circumpolarVisibleProperty: sky.circumpolarRegionVisibleProperty,
      riseSetVisibleProperty: sky.riseSetRegionVisibleProperty,
      neverRiseVisibleProperty: sky.neverRiseRegionVisibleProperty,
    });
    celRegions.pickable = false;
    const celSphere = new CelestialSphereNode(this.celProjection, {
      labelsVisibleProperty: sky.labelsVisibleProperty,
      celestialEquatorVisibleProperty: sky.celestialEquatorVisibleProperty,
      hourCircleVisibleProperty: sky.hourCircleVisibleProperty,
    });
    celSphere.pickable = false;
    const celPatternLines = new SkyPatternLinesNode(sky, {
      starToPoint: (star) => ({
        point: this.celProjection.project(raDecToVector3(star.raProperty.value, star.decProperty.value)),
        visible: true,
      }),
      redrawProperties: [this.celProjection.viewMatrixProperty],
    });
    celPatternLines.pickable = false;
    const celStars = new SkyStarsNode(sky, {
      starToPoint: (star) => ({
        point: this.celProjection.project(raDecToVector3(star.raProperty.value, star.decProperty.value)),
        visible: true,
      }),
      pointToEquatorial: (point) => this.celestialPointToEquatorial(point),
      redrawProperties: [this.celProjection.viewMatrixProperty],
      accessibleName: controls.starStringProperty,
    });

    const celLabel = viewLabel(controls.celestialSphereViewStringProperty);
    celLabel.centerX = this.celProjection.center.x;
    celLabel.top = SCREEN_VIEW_MARGIN + 14;
    this.addChild(celLabel);
    this.addChild(this.addSphereInteraction(this.celProjection, (point) => this.celestialPointToEquatorial(point)));
    this.addChild(celRegions);
    const celHorizonPlane = new HorizonPlaneNode(this.celProjection, sky.latitudeProperty, localSiderealTimeProperty);
    this.addChild(celSphere.backLayer);
    this.addChild(celHorizonPlane.backLayer);
    this.addChild(
      new EarthGlobeNode(
        this.celProjection,
        sky.latitudeProperty,
        sky.longitudeProperty,
        localSiderealTimeProperty,
        earthMapResolutionProperty,
      ),
    );
    this.addChild(celSphere.frontLayer);
    this.addChild(celHorizonPlane.frontLayer);
    this.addChild(celPatternLines);
    this.addChild(celStars);
    const celArcs = new SelectedStarCelestialArcsNode(this.celProjection, sky);
    this.addChild(celArcs);

    const celReadout = new SkyReadoutNode(sky, { frame: "equatorial" });
    positionReadoutBelowProjection(celReadout, this.celProjection);
    this.addChild(celReadout);

    // ── Horizon diagram (right) ─────────────────────────────────────────────────
    this.horProjection = new SkyProjection({
      center: new Vector2(615, 205),
      radius: SPHERE_RADIUS,
      elevation: -0.5,
      azimuth: Math.PI / 2,
    });

    const trailsVisibleProperty = new DerivedProperty([sky.starTrailModeProperty], (mode) => mode !== "none");
    const trailMaxLengthProperty = new DerivedProperty([sky.starTrailModeProperty], (mode) =>
      mode === "short" ? SHORT_TRAIL_HOURS : LONG_TRAIL_HOURS,
    );

    const horTrails = new SkyTrailsNode(sky, this.horProjection, {
      // The trail samples reference sidereal time historically, so offset each sample by the
      // observer's longitude to get the local sidereal time the star's alt/az is computed from.
      pathPointAt: (star, siderealTime) => {
        const localSiderealTime = siderealTime + (sky.longitudeProperty.value / 360) * HOURS_PER_DAY;
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          sky.latitudeProperty.value,
          localSiderealTime,
        );
        return { point: altAzToVector3(altDeg, azDeg), visible: altDeg >= 0 };
      },
      redrawProperties: [sky.latitudeProperty, localSiderealTimeProperty, this.horProjection.viewMatrixProperty],
      visibleProperty: trailsVisibleProperty,
      maxLengthHoursProperty: trailMaxLengthProperty,
    });
    const horPatternLines = new SkyPatternLinesNode(sky, {
      starToPoint: (star) => {
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          sky.latitudeProperty.value,
          localSiderealTimeProperty.value,
        );
        return { point: this.horProjection.project(altAzToVector3(altDeg, azDeg)), visible: altDeg >= 0 };
      },
      redrawProperties: [sky.latitudeProperty, localSiderealTimeProperty, this.horProjection.viewMatrixProperty],
    });
    horPatternLines.pickable = false;
    const horStars = new SkyStarsNode(sky, {
      starToPoint: (star) => {
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          sky.latitudeProperty.value,
          localSiderealTimeProperty.value,
        );
        return { point: this.horProjection.project(altAzToVector3(altDeg, azDeg)), visible: altDeg >= 0 };
      },
      pointToEquatorial: (point) => this.horizonPointToEquatorial(point),
      redrawProperties: [sky.latitudeProperty, localSiderealTimeProperty, this.horProjection.viewMatrixProperty],
      accessibleName: controls.starStringProperty,
    });

    // The same declination bands as the celestial sphere, mapped into the horizon
    // frame: caps tilt with latitude and the never-rise cap drops below the horizon.
    // Bands span all RA, so the LST is immaterial — use 0 for the rotationally
    // symmetric result.
    const horRegions = new DeclinationRegionsNode(this.horProjection, sky.latitudeProperty, {
      circumpolarVisibleProperty: sky.circumpolarRegionVisibleProperty,
      riseSetVisibleProperty: sky.riseSetRegionVisibleProperty,
      neverRiseVisibleProperty: sky.neverRiseRegionVisibleProperty,
      toVector: (raHours, decDeg) => {
        const { altDeg, azDeg } = equatorialToHorizontal(raHours, decDeg, sky.latitudeProperty.value, 0);
        return altAzToVector3(altDeg, azDeg);
      },
    });
    horRegions.pickable = false;

    const horEquator = new CelestialEquatorOnHorizonNode(
      this.horProjection,
      sky.latitudeProperty,
      sky.celestialEquatorVisibleProperty,
    );
    horEquator.pickable = false;
    const horAngle = new EquatorHorizonAngleNode(
      this.horProjection,
      sky.latitudeProperty,
      sky.equatorHorizonAngleVisibleProperty,
    );

    const horLabel = viewLabel(controls.horizonViewStringProperty);
    horLabel.centerX = this.horProjection.center.x;
    horLabel.top = SCREEN_VIEW_MARGIN + 14;
    this.addChild(horLabel);
    this.addChild(this.addSphereInteraction(this.horProjection, (point) => this.horizonPointToEquatorial(point)));
    this.addChild(horRegions);
    this.addChild(new HorizonGroundNode(this.horProjection, { labelsVisibleProperty: sky.labelsVisibleProperty }));
    this.addChild(
      new HorizonDomeNode(this.horProjection, sky.latitudeProperty, {
        undersideVisibleProperty: sky.horizonUndersideVisibleProperty,
        labelsVisibleProperty: sky.labelsVisibleProperty,
      }),
    );
    this.addChild(new HorizonObserverNode(this.horProjection));
    this.addChild(horEquator);
    this.addChild(horAngle);
    this.addChild(
      new SelectedStarHorizonArcsNode(this.horProjection, sky, { siderealTimeProperty: localSiderealTimeProperty }),
    );
    this.addChild(horTrails);
    this.addChild(horPatternLines);
    this.addChild(horStars);

    const horReadout = new SkyReadoutNode(sky, {
      frame: "horizontal",
      siderealTimeProperty: localSiderealTimeProperty,
    });
    positionReadoutBelowProjection(horReadout, this.horProjection);
    this.addChild(horReadout);

    // ── Shared control builders ─────────────────────────────────────────────────
    const panelTitle = (labelProperty: typeof controls.observerLocationStringProperty): Text =>
      new Text(labelProperty, {
        font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
        fill: textFill,
      });

    const pushButton = (labelProperty: typeof controls.addStarRandomlyStringProperty, listener: () => void) =>
      new RectangularPushButton({
        ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
        content: new Text(labelProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: LIGHT_SURFACE_TEXT_FILL }),
        listener,
        accessibleName: labelProperty,
      });

    const numberControl = (
      labelProperty: typeof controls.latitudeStringProperty,
      property: typeof sky.latitudeProperty,
      range: typeof LATITUDE_RANGE,
    ): NumberControl =>
      new NumberControl(labelProperty, property, range, {
        ...ROTATING_SKY_NUMBER_CONTROL_OPTIONS,
        delta: 1,
        numberDisplayOptions: {
          decimalPlaces: 0,
          valuePattern: "{{value}}°",
        },
        titleNodeOptions: { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill, maxWidth: 110 },
      });

    // ── Observer's Location panel ────────────────────────────────────────────────
    const map = new FlatEarthMapNode(sky.latitudeProperty, sky.longitudeProperty, earthMapResolutionProperty, {
      width: 220,
      height: 110,
    });
    const latitudeControl = numberControl(controls.latitudeStringProperty, sky.latitudeProperty, LATITUDE_RANGE);
    const longitudeControl = numberControl(controls.longitudeStringProperty, sky.longitudeProperty, LONGITUDE_RANGE);
    const locationPanel = new RotatingSkyPanel(
      new VBox({
        align: "center",
        spacing: PANEL_CONTENT_SPACING,
        children: [panelTitle(controls.observerLocationStringProperty), map, latitudeControl, longitudeControl],
      }),
    );

    // Combo-box dropdown lists float above the panels in this parent.
    const listParent = new Node();

    // ── Animation Controls panel ─────────────────────────────────────────────────
    const timeControl = new TimeControlNode(sky.timer.isPlayingProperty, {
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => sky.stepForward(),
        },
      },
    });
    const rateSlider = new HSlider(sky.animationRateProperty, ANIMATION_RATE_RANGE, {
      ...ROTATING_SKY_SLIDER_OPTIONS,
      accessibleName: controls.animationRateStringProperty,
    });
    const endLabel = (labelProperty: typeof controls.slowerStringProperty): Text =>
      new Text(labelProperty, { font: new PhetFont(CONTROL_FONT_SIZE - 1), fill: textFill });
    const animationDurationChoices: {
      duration: AnimationDuration;
      labelProperty: typeof controls.animationTimeContinuousStringProperty;
    }[] = [
      { duration: "continuous", labelProperty: controls.animationTimeContinuousStringProperty },
      { duration: "1hour", labelProperty: controls.animationTime1HourStringProperty },
      { duration: "3hours", labelProperty: controls.animationTime3HoursStringProperty },
      { duration: "6hours", labelProperty: controls.animationTime6HoursStringProperty },
      { duration: "12hours", labelProperty: controls.animationTime12HoursStringProperty },
      { duration: "24hours", labelProperty: controls.animationTime24HoursStringProperty },
    ];
    const durationCombo = new ComboBox<AnimationDuration>(
      sky.animationDurationProperty,
      animationDurationChoices.map(({ duration, labelProperty }) => ({
        value: duration,
        createNode: () =>
          new Text(labelProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: LIGHT_SURFACE_TEXT_FILL }),
        accessibleName: labelProperty,
      })),
      listParent,
      {
        ...ROTATING_SKY_COMBO_BOX_OPTIONS,
        listPosition: "above",
        accessibleName: controls.animationTimeStringProperty,
      },
    );
    const animationPanel = new RotatingSkyPanel(
      new VBox({
        align: "center",
        spacing: PANEL_CONTENT_SPACING,
        children: [
          panelTitle(controls.animationControlsStringProperty),
          timeControl,
          new Text(controls.animationTimeStringProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill }),
          durationCombo,
          new Text(controls.animationRateStringProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill }),
          new HBox({
            spacing: 6,
            children: [endLabel(controls.slowerStringProperty), rateSlider, endLabel(controls.fasterStringProperty)],
          }),
        ],
      }),
    );

    // ── Appearance Settings panel ────────────────────────────────────────────────
    const checkbox = (
      property: typeof sky.labelsVisibleProperty,
      labelProperty: typeof controls.showLabelsStringProperty,
    ) =>
      new Checkbox(
        property,
        new Text(labelProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill, maxWidth: 175 }),
        {
          ...ROTATING_SKY_CHECKBOX_OPTIONS,
          accessibleName: labelProperty,
        },
      );
    const appearanceCheckboxes = [
      checkbox(sky.labelsVisibleProperty, controls.showLabelsStringProperty),
      checkbox(sky.hourCircleVisibleProperty, controls.show0hCircleStringProperty),
      checkbox(sky.celestialEquatorVisibleProperty, controls.showCelestialEquatorStringProperty),
      checkbox(sky.horizonUndersideVisibleProperty, controls.showUndersideStringProperty),
      checkbox(sky.neverRiseRegionVisibleProperty, controls.showNeverRiseStringProperty),
      checkbox(sky.riseSetRegionVisibleProperty, controls.showRiseSetStringProperty),
      checkbox(sky.circumpolarRegionVisibleProperty, controls.showCircumpolarStringProperty),
      checkbox(sky.equatorHorizonAngleVisibleProperty, controls.showEquatorHorizonAngleStringProperty),
    ];
    const appearancePanel = new RotatingSkyPanel(
      new VBox({
        align: "left",
        spacing: 5,
        children: [panelTitle(controls.appearanceSettingsStringProperty), ...appearanceCheckboxes],
      }),
    );

    // ── Star Controls panel ──────────────────────────────────────────────────────
    const patterns: StarPattern[] = [
      {
        key: "bigDipper",
        nameProperty: controls.patternBigDipperStringProperty,
        stars: BIG_DIPPER,
        edges: BIG_DIPPER_EDGES,
      },
      {
        key: "orionsBelt",
        nameProperty: controls.patternOrionsBeltStringProperty,
        stars: ORIONS_BELT,
        edges: ORIONS_BELT_EDGES,
      },
      {
        key: "southernCross",
        nameProperty: controls.patternSouthernCrossStringProperty,
        stars: SOUTHERN_CROSS,
        edges: SOUTHERN_CROSS_EDGES,
      },
      {
        key: "cassiopeia",
        nameProperty: controls.patternCassiopeiaStringProperty,
        stars: CASSIOPEIA,
        edges: CASSIOPEIA_EDGES,
      },
      {
        key: "summerTriangle",
        nameProperty: controls.patternSummerTriangleStringProperty,
        stars: SUMMER_TRIANGLE,
        edges: SUMMER_TRIANGLE_EDGES,
      },
      {
        key: "orion",
        nameProperty: controls.patternOrionStringProperty,
        stars: ORION,
        edges: ORION_EDGES,
      },
      {
        key: "littleDipper",
        nameProperty: controls.patternLittleDipperStringProperty,
        stars: LITTLE_DIPPER,
        edges: LITTLE_DIPPER_EDGES,
      },
    ];
    // Action-style picker: selecting a pattern adds stars, then snaps back to the prompt.
    // reentrant allows resetting value from within the selection listener.
    const patternProperty = new Property<StarPattern | null>(null, { reentrant: true });
    patternProperty.lazyLink((pattern) => {
      if (pattern) {
        sky.addPattern(pattern.stars, pattern.edges);
        patternProperty.value = null;
      }
    });
    const patternCombo = new ComboBox<StarPattern | null>(
      patternProperty,
      [
        {
          value: null,
          createNode: () =>
            new Text(controls.starPatternsStringProperty, {
              font: new PhetFont(CONTROL_FONT_SIZE),
              fill: LIGHT_SURFACE_TEXT_FILL,
            }),
          accessibleName: controls.starPatternsStringProperty,
        },
        ...patterns.map((pattern) => ({
          value: pattern as StarPattern | null,
          createNode: () =>
            new Text(pattern.nameProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: LIGHT_SURFACE_TEXT_FILL }),
          accessibleName: pattern.nameProperty,
        })),
      ],
      listParent,
      {
        ...ROTATING_SKY_COMBO_BOX_OPTIONS,
        listPosition: "above",
        accessibleName: controls.starPatternsStringProperty,
      },
    );

    const addStarButton = pushButton(controls.addStarRandomlyStringProperty, () => sky.addRandomStar());
    const removeAllButton = pushButton(controls.removeAllStarsStringProperty, () => sky.removeAllStars());
    const resetTrailsButton = pushButton(controls.resetStarTrailsStringProperty, () => sky.resetStarTrails());

    const radioText = (labelProperty: typeof controls.noStarTrailsStringProperty): Text =>
      new Text(labelProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill });
    const trailRadioGroup = new VerticalAquaRadioButtonGroup<StarTrailMode>(
      sky.starTrailModeProperty,
      [
        {
          value: "none",
          createNode: () => radioText(controls.noStarTrailsStringProperty),
          options: { accessibleName: controls.noStarTrailsStringProperty },
        },
        {
          value: "short",
          createNode: () => radioText(controls.shortStarTrailsStringProperty),
          options: { accessibleName: controls.shortStarTrailsStringProperty },
        },
        {
          value: "long",
          createNode: () => radioText(controls.longStarTrailsStringProperty),
          options: { accessibleName: controls.longStarTrailsStringProperty },
        },
      ],
      { spacing: 4, radioButtonOptions: { radius: 6 } },
    );

    const starPanel = new RotatingSkyPanel(
      new VBox({
        align: "center",
        spacing: PANEL_CONTENT_SPACING,
        children: [
          panelTitle(controls.starControlsStringProperty),
          patternCombo,
          addStarButton,
          removeAllButton,
          trailRadioGroup,
          resetTrailsButton,
        ],
      }),
    );

    // ── Layout: panels in a bottom row ───────────────────────────────────────────
    const panelRow = new HBox({
      align: "top",
      spacing: 8,
      children: [locationPanel, animationPanel, appearancePanel, starPanel],
    });
    panelRow.left = SCREEN_VIEW_MARGIN;
    panelRow.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    this.addChild(panelRow);

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

    // The combo-box list must float above the panels.
    this.addChild(listParent);

    this.addChild(
      new Node({
        pdomOrder: [
          map,
          latitudeControl,
          longitudeControl,
          timeControl,
          durationCombo,
          rateSlider,
          ...appearanceCheckboxes,
          patternCombo,
          addStarButton,
          removeAllButton,
          trailRadioGroup,
          resetTrailsButton,
          celReadout,
          horReadout,
          celStars,
          horStars,
          resetAllButton,
        ],
      }),
    );
  }

  /** Screen point on the celestial sphere → equatorial coordinates. */
  private celestialPointToEquatorial(point: Vector2): { raHours: number; decDeg: number } {
    const v = this.celProjection.unproject(point);
    return {
      raHours: normalizeHours(radiansToHours(Math.atan2(v.y, v.x))),
      decDeg: radToDeg(Math.asin(clamp(v.z, -1, 1))),
    };
  }

  /** Screen point on the horizon dome → equatorial coordinates. */
  private horizonPointToEquatorial(point: Vector2): { raHours: number; decDeg: number } {
    const v = this.horProjection.unproject(point);
    const altDeg = radToDeg(Math.asin(clamp(v.z, -1, 1)));
    const azDeg = normalizeDegrees(radToDeg(Math.atan2(v.y, v.x)));
    return horizontalToEquatorial(altDeg, azDeg, this.sky.latitudeProperty.value, this.localSiderealTimeProperty.value);
  }

  /**
   * Transparent region behind a sphere: drag rotates the camera; shift-click adds
   * a star at the clicked location. Alt-drag spins about the vertical axis only
   * ("rotate about zenith"); Ctrl-drag advances sidereal time ("rotate about NCP").
   */
  private addSphereInteraction(
    projection: SkyProjection,
    pointToEquatorial: (point: Vector2) => { raHours: number; decDeg: number },
  ): Rectangle {
    const size = projection.radius * 2.4;
    const region = new Rectangle(projection.center.x - size / 2, projection.center.y - size / 2, size, size, {
      fill: "rgba(0,0,0,0)",
    });

    let lastPoint: Vector2 | null = null;
    let dragMode: "simple" | "zenith" | "ncp" = "simple";
    region.addInputListener(
      new DragListener({
        start: (event) => {
          const domEvent = event.domEvent as {
            shiftKey?: boolean;
            altKey?: boolean;
            ctrlKey?: boolean;
            metaKey?: boolean;
          } | null;
          const shift = Boolean(domEvent?.shiftKey);
          if (shift) {
            const local = region.globalToParentPoint(event.pointer.point);
            const { raHours, decDeg } = pointToEquatorial(local);
            this.sky.addStar(raHours, decDeg);
            lastPoint = null;
          } else {
            lastPoint = event.pointer.point.copy();
            dragMode = domEvent?.altKey ? "zenith" : domEvent?.ctrlKey || domEvent?.metaKey ? "ncp" : "simple";
          }
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
              projection.rotateAboutZenith(dx * ROTATE_SPEED);
              break;
            case "ncp":
              this.sky.advanceSiderealTime(-dx * TIME_DRAG_RATE);
              break;
            default:
              projection.rotateBy(dx * ROTATE_SPEED, dy * ROTATE_SPEED);
              break;
          }
          lastPoint = p.copy();
        },
        end: () => {
          lastPoint = null;
        },
      }),
    );
    return region;
  }

  public reset(): void {
    this.celProjection.reset();
    this.horProjection.reset();
  }

  public override step(_dt: number): void {
    // Model.step advances sidereal time; nodes react via Properties.
  }
}
