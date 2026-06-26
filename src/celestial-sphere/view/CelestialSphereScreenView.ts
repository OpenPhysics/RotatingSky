/**
 * CelestialSphereScreenView.ts
 *
 * The celestial sphere with the Earth globe at its centre and the observer's
 * horizon plane tilted by latitude. A "view" button morphs smoothly between the
 * celestial-sphere orientation and the horizon orientation. Drag to rotate.
 */

import { DerivedProperty, Multilink } from "scenerystack/axon";
import { clamp, Vector2 } from "scenerystack/dot";
import { DragListener, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { RectangularPushButton } from "scenerystack/sun";
import { Animation, Easing } from "scenerystack/twixt";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/RotatingSkyButtonOptions.js";
import { RotatingSkyPanel } from "../../common/RotatingSkyPanel.js";
import { normalizeHours, raDecToVector3, radiansToHours, radToDeg } from "../../common/SkyCoordinates.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { frameMatrixForBlend } from "../../common/skyMorph.js";
import { CelestialSphereNode } from "../../common/view/CelestialSphereNode.js";
import { EarthGlobeNode } from "../../common/view/EarthGlobeNode.js";
import { HorizonPlaneNode } from "../../common/view/HorizonPlaneNode.js";
import { SkyStarsNode } from "../../common/view/SkyStarsNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import {
  CONTROL_FONT_SIZE,
  PANEL_CONTENT_SPACING,
  SCREEN_VIEW_MARGIN,
  SPHERE_RADIUS,
} from "../../RotatingSkyConstants.js";
import type { CelestialSphereModel } from "../model/CelestialSphereModel.js";
import { CelestialSphereScreenSummaryContent } from "./CelestialSphereScreenSummaryContent.js";

const ROTATE_SPEED = 0.01;
const MORPH_DURATION = 1.2; // seconds

export class CelestialSphereScreenView extends ScreenView {
  private readonly projection: SkyProjection;

  public constructor(model: CelestialSphereModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new CelestialSphereScreenSummaryContent(model),
      ...options,
    });

    const sky = model.sky;
    const controls = StringManager.getInstance().getControls();

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: RotatingSkyColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    this.projection = new SkyProjection({
      center: new Vector2(this.layoutBounds.centerX - 110, this.layoutBounds.centerY),
      radius: SPHERE_RADIUS,
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

    const sphereNode = new CelestialSphereNode(this.projection);
    const globeNode = new EarthGlobeNode(this.projection, sky.latitudeProperty, sky.siderealTimeProperty);
    const horizonPlaneNode = new HorizonPlaneNode(this.projection, sky.latitudeProperty, sky.siderealTimeProperty);

    const starsNode = new SkyStarsNode(sky, {
      starToPoint: (star) => ({
        point: this.projection.project(raDecToVector3(star.raProperty.value, star.decProperty.value)),
        visible: true,
      }),
      pointToEquatorial: (point) => {
        const v = this.projection.unproject(point);
        return {
          raHours: normalizeHours(radiansToHours(Math.atan2(v.y, v.x))),
          decDeg: radToDeg(Math.asin(clamp(v.z, -1, 1))),
        };
      },
      redrawProperties: [this.projection.viewMatrixProperty],
      accessibleName: controls.starStringProperty,
    });

    this.addChild(sphereNode);
    this.addChild(horizonPlaneNode);
    this.addChild(globeNode);
    this.addChild(starsNode);

    // Drag the background to rotate the camera.
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

    // ── Morph control + animation ───────────────────────────────────────────────
    let morphAnimation: Animation | null = null;
    const morphTo = (target: number): void => {
      morphAnimation?.stop();
      morphAnimation = new Animation({
        property: model.systemBlendProperty,
        to: target,
        duration: MORPH_DURATION,
        easing: Easing.CUBIC_IN_OUT,
      });
      morphAnimation.start();
    };

    const viewButtonLabel = new DerivedProperty(
      [model.systemBlendProperty, controls.horizonViewStringProperty, controls.celestialSphereViewStringProperty],
      (blend, horizon, celestial) => (blend < 0.5 ? horizon : celestial),
    );
    const viewButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(viewButtonLabel, { font: new PhetFont(CONTROL_FONT_SIZE), fill: "#000000" }),
      listener: () => morphTo(model.systemBlendProperty.value < 0.5 ? 1 : 0),
      accessibleName: viewButtonLabel,
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

    const panel = new RotatingSkyPanel(
      new VBox({ align: "left", spacing: PANEL_CONTENT_SPACING, children: [viewButton, timeControl] }),
    );
    panel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    panel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    this.addChild(panel);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        morphAnimation?.stop();
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    this.addChild(new Node({ pdomOrder: [viewButton, timeControl, starsNode, resetAllButton] }));
  }

  public reset(): void {
    this.projection.reset();
  }

  public override step(_dt: number): void {
    // Model.step advances sidereal time; nodes react via Properties.
  }
}
