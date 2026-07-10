/**
 * CelestialSphereScreenView.ts
 *
 * The celestial sphere with the Earth globe at its centre and the observer's
 * horizon plane tilted by latitude. A "Switch systems" button morphs smoothly
 * between the celestial-sphere orientation and the horizon orientation. The
 * default control set is bridge-first (latitude, switch, pole altitude, guided
 * prompts); time, appearance, and the guide star live under collapsed Lab tools.
 */

import {
  BooleanProperty,
  DerivedProperty,
  Multilink,
  PatternStringProperty,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import { clamp, Dimension2, Range, toFixed, Vector2 } from "scenerystack/dot";
import { HBox, Rectangle, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { AccordionBox, Checkbox, HSlider, RectangularPushButton } from "scenerystack/sun";
import { Animation, Easing } from "scenerystack/twixt";
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
  ROTATING_SKY_SLIDER_OPTIONS,
} from "../../common/RotatingSkyControlOptions.js";
import { RotatingSkyPanel } from "../../common/RotatingSkyPanel.js";
import {
  equatorialToHorizontal,
  HOURS_PER_DAY,
  normalizeHours,
  raDecToVector3,
  radiansToHours,
  radToDeg,
} from "../../common/SkyCoordinates.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { frameMatrixForBlend } from "../../common/skyMorph.js";
import { attachSkyCameraInteraction } from "../../common/view/attachSkyCameraInteraction.js";
import { CelestialPoleAltitudeNode } from "../../common/view/CelestialPoleAltitudeNode.js";
import { CelestialSphereNode } from "../../common/view/CelestialSphereNode.js";
import { CoordinateGuideNode } from "../../common/view/CoordinateGuideNode.js";
import { EarthGlobeNode } from "../../common/view/EarthGlobeNode.js";
import { HorizonPlaneNode } from "../../common/view/HorizonPlaneNode.js";
import { SkyStarsNode } from "../../common/view/SkyStarsNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import {
  CONTROL_FONT_SIZE,
  type EarthMapResolution,
  LATITUDE_RANGE,
  PANEL_CONTENT_SPACING,
  PANEL_CORNER_RADIUS,
  PANEL_TITLE_FONT_SIZE,
  PANEL_X_MARGIN,
  PANEL_Y_MARGIN,
  RESET_ALL_BUTTON_BOTTOM_MARGIN,
  SCREEN_VIEW_MARGIN,
} from "../../RotatingSkyConstants.js";
import { type CelestialSphereModel, GUIDED_PROMPT_COUNT } from "../model/CelestialSphereModel.js";
import { CelestialSphereScreenSummaryContent } from "./CelestialSphereScreenSummaryContent.js";

type CelestialSphereScreenViewOptions = ScreenViewOptions & {
  earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>;
};

const MORPH_DURATION = 1.2; // seconds
const RA_RANGE = new Range(0, HOURS_PER_DAY);
const DEC_RANGE = new Range(-90, 90);
/** Show the pole-altitude arc once the morph is mostly toward the horizon. */
const POLE_ALTITUDE_BLEND_THRESHOLD = 0.35;
const PROMPT_TEXT_MAX_WIDTH = 200;
const LAB_TOOLS_EXPAND_BUTTON_SIDE = 18;

/** Fill the play area left of the right-hand control panels with the celestial sphere. */
const layoutCelestialSphereProjection = (
  layoutBounds: { minX: number; maxX: number; minY: number; maxY: number },
  panelColumnLeft: number,
): { center: Vector2; radius: number } => {
  const playLeft = layoutBounds.minX + SCREEN_VIEW_MARGIN;
  const playRight = panelColumnLeft - SCREEN_VIEW_MARGIN;
  const playTop = layoutBounds.minY + SCREEN_VIEW_MARGIN;
  const playBottom = layoutBounds.maxY - RESET_ALL_BUTTON_BOTTOM_MARGIN;

  const playWidth = playRight - playLeft;
  const playHeight = playBottom - playTop;
  const radius = Math.min(playWidth / 2, playHeight / 2) * 0.96;
  const centerX = (playLeft + playRight) / 2;
  const centerY = (playTop + playBottom) / 2;

  return { center: new Vector2(centerX, centerY), radius };
};

export class CelestialSphereScreenView extends ScreenView {
  private readonly projection: SkyProjection;

  public constructor(model: CelestialSphereModel, options: CelestialSphereScreenViewOptions) {
    const { earthMapResolutionProperty, ...screenViewOptions } = options;
    super({
      screenSummaryContent: new CelestialSphereScreenSummaryContent(model),
      ...screenViewOptions,
    });

    const sky = model.sky;
    const controls = StringManager.getInstance().getControls();
    const keyboardHelp = StringManager.getInstance().getKeyboardHelpStrings();

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: RotatingSkyColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    // ── Switch-systems morph ──────────────────────────────────────────────────
    let morphAnimation: Animation | null = null;
    const morphTo = (target: number): void => {
      morphAnimation?.stop();
      model.isMorphingProperty.value = true;
      morphAnimation = new Animation({
        property: model.systemBlendProperty,
        to: target,
        duration: MORPH_DURATION,
        easing: Easing.CUBIC_IN_OUT,
      });
      morphAnimation.endedEmitter.addListener(() => {
        model.isMorphingProperty.value = false;
      });
      morphAnimation.start();
    };

    const switchButtonLabel = new DerivedProperty(
      [
        model.systemBlendProperty,
        model.isMorphingProperty,
        controls.switchToHorizonStringProperty,
        controls.switchToCelestialSphereStringProperty,
        controls.switchingSystemsStringProperty,
      ],
      (blend, isMorphing, toHorizon, toCelestial, switching) => {
        if (isMorphing) {
          return switching;
        }
        return blend < 0.5 ? toHorizon : toCelestial;
      },
    );
    const switchButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(switchButtonLabel, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: 180,
      }),
      listener: () => {
        if (model.isMorphingProperty.value) {
          return;
        }
        morphTo(model.systemBlendProperty.value < 0.5 ? 1 : 0);
      },
      accessibleName: switchButtonLabel,
      enabledProperty: new DerivedProperty([model.isMorphingProperty], (isMorphing) => !isMorphing),
    });

    const textFill = RotatingSkyColors.textColorProperty;

    const latitudeControl = new NumberControl(controls.latitudeStringProperty, sky.latitudeProperty, LATITUDE_RANGE, {
      ...ROTATING_SKY_NUMBER_CONTROL_OPTIONS,
      delta: 1,
      numberDisplayOptions: {
        decimalPlaces: 0,
        valuePattern: "{{value}}°",
      },
      titleNodeOptions: { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill, maxWidth: 160 },
    });

    const poleAltitudeAbsProperty = new DerivedProperty([sky.latitudeProperty], (latitude) => Math.abs(latitude));
    const poleAltitudeReadout = new Text(
      new PatternStringProperty(
        controls.celestialPoleAltitudeStringProperty,
        { altitude: poleAltitudeAbsProperty },
        { decimalPlaces: { altitude: 0 } },
      ),
      { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill, maxWidth: 200 },
    );
    // Live φ readout is always available; the on-sphere arc appears near horizon blend.
    const poleAltitudeVisibleOnSphereProperty = new DerivedProperty(
      [model.systemBlendProperty],
      (blend) => blend >= POLE_ALTITUDE_BLEND_THRESHOLD,
    );

    // ── Guided prompts ────────────────────────────────────────────────────────
    const promptStringProperties = [
      controls.prompt1StringProperty,
      controls.prompt2StringProperty,
      controls.prompt3StringProperty,
      controls.prompt4StringProperty,
    ] as const;
    const activePromptStringProperty = new DerivedProperty(
      [model.guidedPromptIndexProperty, ...promptStringProperties],
      (index, ...prompts) => {
        const prompt = prompts[index] ?? prompts[0];
        return prompt ?? "";
      },
    );
    const promptText = new Text(activePromptStringProperty, {
      font: new PhetFont(CONTROL_FONT_SIZE),
      fill: textFill,
      maxWidth: PROMPT_TEXT_MAX_WIDTH,
    });
    const promptIndexLabel = new Text(
      new DerivedProperty([model.guidedPromptIndexProperty], (index) => `${index + 1} / ${GUIDED_PROMPT_COUNT}`),
      { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill },
    );
    const previousPromptButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(controls.promptPreviousStringProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: LIGHT_SURFACE_TEXT_FILL,
      }),
      listener: () => {
        model.guidedPromptIndexProperty.value =
          (model.guidedPromptIndexProperty.value + GUIDED_PROMPT_COUNT - 1) % GUIDED_PROMPT_COUNT;
      },
      accessibleName: controls.promptPreviousStringProperty,
    });
    const nextPromptButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(controls.promptNextStringProperty, {
        font: new PhetFont(CONTROL_FONT_SIZE),
        fill: LIGHT_SURFACE_TEXT_FILL,
      }),
      listener: () => {
        model.guidedPromptIndexProperty.value = (model.guidedPromptIndexProperty.value + 1) % GUIDED_PROMPT_COUNT;
      },
      accessibleName: controls.promptNextStringProperty,
    });
    const promptsPanel = new RotatingSkyPanel(
      new VBox({
        align: "left",
        spacing: PANEL_CONTENT_SPACING,
        children: [
          new Text(controls.guidedPromptsStringProperty, {
            font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
            fill: textFill,
          }),
          promptText,
          new HBox({
            spacing: 8,
            children: [previousPromptButton, promptIndexLabel, nextPromptButton],
          }),
        ],
      }),
    );

    // ── Lab tools (collapsed): time, appearance, guide star ───────────────────
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
      property: typeof sky.celestialEquatorVisibleProperty,
      labelProperty: typeof controls.showCelestialEquatorStringProperty,
    ): Checkbox =>
      new Checkbox(
        property,
        new Text(labelProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill, maxWidth: 140 }),
        {
          ...ROTATING_SKY_CHECKBOX_OPTIONS,
          accessibleName: labelProperty,
        },
      );

    const equatorCheckbox = checkbox(sky.celestialEquatorVisibleProperty, controls.showCelestialEquatorStringProperty);
    const hourCircleCheckbox = checkbox(sky.hourCircleVisibleProperty, controls.show0hCircleStringProperty);
    const gridCheckbox = checkbox(sky.gridVisibleProperty, controls.showGridLinesStringProperty);
    const outlineCheckbox = checkbox(sky.outlineVisibleProperty, controls.showSphereOutlineStringProperty);
    const horizonPlaneCheckbox = checkbox(sky.horizonPlaneVisibleProperty, controls.showHorizonPlaneStringProperty);
    const labelsCheckbox = checkbox(sky.labelsVisibleProperty, controls.showLabelsStringProperty);
    const hideBelowCheckbox = checkbox(sky.hideBelowHorizonProperty, controls.hideBelowHorizonStringProperty);
    const appearanceCheckboxes = [
      equatorCheckbox,
      hourCircleCheckbox,
      gridCheckbox,
      outlineCheckbox,
      horizonPlaneCheckbox,
      labelsCheckbox,
      hideBelowCheckbox,
    ];
    const checkboxGrid = new HBox({
      spacing: 10,
      align: "top",
      children: [
        new VBox({
          spacing: 5,
          align: "left",
          children: [equatorCheckbox, hourCircleCheckbox, gridCheckbox, outlineCheckbox],
        }),
        new VBox({
          spacing: 5,
          align: "left",
          children: [horizonPlaneCheckbox, labelsCheckbox, hideBelowCheckbox],
        }),
      ],
    });

    const raSlider = new HSlider(model.guideRaProperty, RA_RANGE, {
      ...ROTATING_SKY_SLIDER_OPTIONS,
      trackSize: new Dimension2(150, 4),
      accessibleName: controls.rightAscensionStringProperty,
    });
    const decSlider = new HSlider(model.guideDecProperty, DEC_RANGE, {
      ...ROTATING_SKY_SLIDER_OPTIONS,
      trackSize: new Dimension2(150, 4),
      accessibleName: controls.declinationStringProperty,
    });

    const coordinateText = (valueProperty: TReadOnlyProperty<string>): Text =>
      new Text(valueProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill });
    const raValue = new DerivedProperty([model.guideRaProperty], (ra) => `${toFixed(ra, 1)} h`);
    const decValue = new DerivedProperty(
      [model.guideDecProperty],
      (dec) => `${dec >= 0 ? "+" : ""}${toFixed(dec, 0)}°`,
    );
    const raGroup = new VBox({
      align: "left",
      spacing: 3,
      children: [
        new HBox({
          spacing: 6,
          children: [
            new Text(controls.rightAscensionStringProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill }),
            coordinateText(raValue),
          ],
        }),
        raSlider,
      ],
    });
    const decGroup = new VBox({
      align: "left",
      spacing: 3,
      children: [
        new HBox({
          spacing: 6,
          children: [
            new Text(controls.declinationStringProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill }),
            coordinateText(decValue),
          ],
        }),
        decSlider,
      ],
    });

    const addStarCheckbox = new Checkbox(
      model.guideStarVisibleProperty,
      new Text(controls.addStarStringProperty, { font: new PhetFont(CONTROL_FONT_SIZE), fill: textFill }),
      {
        ...ROTATING_SKY_CHECKBOX_OPTIONS,
        accessibleName: controls.addStarStringProperty,
      },
    );

    const labToolsExpandedProperty = new BooleanProperty(false);
    const labToolsContent = new VBox({
      align: "left",
      spacing: PANEL_CONTENT_SPACING,
      children: [
        timeControl,
        checkboxGrid,
        new Text(controls.starPositionStringProperty, {
          font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
          fill: textFill,
        }),
        raGroup,
        decGroup,
        addStarCheckbox,
      ],
    });
    const labToolsAccordion = new AccordionBox(labToolsContent, {
      titleNode: new Text(controls.labToolsStringProperty, {
        font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
        fill: textFill,
        maxWidth: 160,
      }),
      titleAlignX: "left",
      expandedProperty: labToolsExpandedProperty,
      fill: RotatingSkyColors.panelBackgroundColorProperty,
      stroke: RotatingSkyColors.panelBorderColorProperty,
      cornerRadius: PANEL_CORNER_RADIUS,
      contentXMargin: PANEL_X_MARGIN,
      contentYMargin: PANEL_Y_MARGIN,
      expandCollapseButtonOptions: { sideLength: LAB_TOOLS_EXPAND_BUTTON_SIDE },
      useExpandedBoundsWhenCollapsed: false,
      accessibleName: controls.labToolsStringProperty,
    });

    // Bridge-first primary panel: latitude, switch, pole altitude identity.
    const primaryPanel = new RotatingSkyPanel(
      new VBox({
        align: "left",
        spacing: PANEL_CONTENT_SPACING,
        children: [latitudeControl, switchButton, poleAltitudeReadout],
      }),
    );

    const panelColumn = new VBox({
      align: "center",
      spacing: 8,
      children: [primaryPanel, promptsPanel, labToolsAccordion],
    });
    panelColumn.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    panelColumn.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;

    const { center, radius } = layoutCelestialSphereProjection(this.layoutBounds, panelColumn.left);
    this.projection = new SkyProjection({
      center,
      radius,
      elevation: -0.35,
      azimuth: 0,
    });

    // The frame matrix follows the morph blend, the latitude, and sidereal time.
    Multilink.multilinkAny([sky.latitudeProperty, sky.siderealTimeProperty, model.systemBlendProperty], () => {
      this.projection.frameMatrixProperty.value = frameMatrixForBlend(
        model.systemBlendProperty.value,
        sky.latitudeProperty.value,
        sky.siderealTimeProperty.value,
      );
    });

    const sphereNode = new CelestialSphereNode(this.projection, {
      labelsVisibleProperty: sky.labelsVisibleProperty,
      celestialEquatorVisibleProperty: sky.celestialEquatorVisibleProperty,
      hourCircleVisibleProperty: sky.hourCircleVisibleProperty,
      gridVisibleProperty: sky.gridVisibleProperty,
      outlineVisibleProperty: sky.outlineVisibleProperty,
    });
    const globeNode = new EarthGlobeNode(
      this.projection,
      sky.latitudeProperty,
      sky.longitudeProperty,
      sky.siderealTimeProperty,
      earthMapResolutionProperty,
    );
    const horizonPlaneNode = new HorizonPlaneNode(this.projection, sky.latitudeProperty, sky.siderealTimeProperty);
    sky.horizonPlaneVisibleProperty.link((visible) => {
      horizonPlaneNode.backLayer.visible = visible;
      horizonPlaneNode.frontLayer.visible = visible;
    });

    const poleAltitudeNode = new CelestialPoleAltitudeNode(
      this.projection,
      sky.latitudeProperty,
      sky.siderealTimeProperty,
      poleAltitudeVisibleOnSphereProperty,
    );

    const coordinateGuideNode = new CoordinateGuideNode(this.projection, {
      guideRaProperty: model.guideRaProperty,
      guideDecProperty: model.guideDecProperty,
      visibleProperty: model.guideStarVisibleProperty,
      accessibleNameProperty: new PatternStringProperty(
        controls.guideStarPositionStringProperty,
        { ra: model.guideRaProperty, dec: model.guideDecProperty },
        { decimalPlaces: { ra: 1, dec: 0 } },
      ),
      accessibleHelpTextProperty: controls.guideStarHelpStringProperty,
    });

    const starsNode = new SkyStarsNode(sky, {
      starToPoint: (star) => {
        // Stars sit at their equatorial position on the sphere; a star currently
        // below the observer's horizon is hidden when "hide below horizon" is on.
        const { altDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          sky.latitudeProperty.value,
          sky.siderealTimeProperty.value,
        );
        const visible = !sky.hideBelowHorizonProperty.value || altDeg >= 0;
        return {
          point: this.projection.project(raDecToVector3(star.raProperty.value, star.decProperty.value)),
          visible,
        };
      },
      pointToEquatorial: (point) => {
        const v = this.projection.unproject(point);
        return {
          raHours: normalizeHours(radiansToHours(Math.atan2(v.y, v.x))),
          decDeg: radToDeg(Math.asin(clamp(v.z, -1, 1))),
        };
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

    this.addChild(sphereNode.backLayer);
    this.addChild(horizonPlaneNode.backLayer);
    this.addChild(coordinateGuideNode.backLayer);
    this.addChild(globeNode);
    this.addChild(sphereNode.frontLayer);
    this.addChild(horizonPlaneNode.frontLayer);
    this.addChild(poleAltitudeNode);
    this.addChild(coordinateGuideNode.frontLayer);
    this.addChild(starsNode);

    attachSkyCameraInteraction(backgroundRect, {
      projection: this.projection,
      sky,
      accessibleNameProperty: keyboardHelp.skyViewStringProperty,
      accessibleHelpTextProperty: keyboardHelp.skyViewHelpStringProperty,
    });

    this.addChild(panelColumn);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        morphAnimation?.stop();
        model.isMorphingProperty.value = false;
        labToolsExpandedProperty.reset();
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - RESET_ALL_BUTTON_BOTTOM_MARGIN,
    });
    this.addChild(resetAllButton);

    this.pdomPlayAreaNode.pdomOrder = [backgroundRect, coordinateGuideNode.frontLayer, starsNode];
    this.pdomControlAreaNode.pdomOrder = [
      latitudeControl,
      switchButton,
      previousPromptButton,
      nextPromptButton,
      labToolsAccordion,
      timeControl,
      ...appearanceCheckboxes,
      raSlider,
      decSlider,
      addStarCheckbox,
      resetAllButton,
    ];
  }

  public reset(): void {
    this.projection.reset();
  }

  public override step(_dt: number): void {
    // Model.step advances sidereal time; nodes react via Properties.
  }
}
