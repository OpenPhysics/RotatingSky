/**
 * ExplorerScreenView.ts
 *
 * The full Rotating Sky Explorer: a flat Earth map (lower-left) that sets the
 * observer's location, a celestial sphere (left), and a horizon dome (right),
 * all linked through one shared SkyModel. Stars appear on both spheres; dragging
 * a star on either moves it on both. Shift-click on a sphere adds a star there.
 */

import { DerivedProperty } from "scenerystack/axon";
import { clamp, Vector2 } from "scenerystack/dot";
import { DragListener, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { Checkbox, RectangularPushButton } from "scenerystack/sun";
import type { SkyModel } from "../../common/model/SkyModel.js";
import { RotatingSkyPanel } from "../../common/RotatingSkyPanel.js";
import {
  altAzToVector3,
  equatorialToHorizontal,
  horizontalToEquatorial,
  normalizeDegrees,
  normalizeHours,
  raDecToVector3,
  radiansToHours,
  radToDeg,
} from "../../common/SkyCoordinates.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { CelestialSphereNode } from "../../common/view/CelestialSphereNode.js";
import { EarthGlobeNode } from "../../common/view/EarthGlobeNode.js";
import { FlatEarthMapNode } from "../../common/view/FlatEarthMapNode.js";
import { HorizonDomeNode } from "../../common/view/HorizonDomeNode.js";
import { HorizonPlaneNode } from "../../common/view/HorizonPlaneNode.js";
import { SkyReadoutNode } from "../../common/view/SkyReadoutNode.js";
import { SkyStarsNode } from "../../common/view/SkyStarsNode.js";
import { SkyTrailsNode } from "../../common/view/SkyTrailsNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { SCREEN_VIEW_MARGIN } from "../../RotatingSkyConstants.js";
import type { ExplorerModel } from "../model/ExplorerModel.js";
import { ExplorerScreenSummaryContent } from "./ExplorerScreenSummaryContent.js";

const ROTATE_SPEED = 0.01;
const SPHERE_RADIUS = 140;

export class ExplorerScreenView extends ScreenView {
  private readonly sky: SkyModel;
  private readonly celProjection: SkyProjection;
  private readonly horProjection: SkyProjection;

  public constructor(model: ExplorerModel, options?: ScreenViewOptions) {
    super({
      screenSummaryContent: new ExplorerScreenSummaryContent(model),
      ...options,
    });

    const sky = model.sky;
    this.sky = sky;
    const controls = StringManager.getInstance().getControls();

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: RotatingSkyColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    // ── Celestial sphere (left) ─────────────────────────────────────────────────
    this.celProjection = new SkyProjection({
      center: new Vector2(250, 250),
      radius: SPHERE_RADIUS,
      elevation: -0.35,
    });
    const celStars = new SkyStarsNode(sky, {
      starToPoint: (star) => ({
        point: this.celProjection.project(raDecToVector3(star.raProperty.value, star.decProperty.value)),
        visible: true,
      }),
      pointToEquatorial: (point) => this.celestialPointToEquatorial(point),
      redrawProperties: [this.celProjection.viewMatrixProperty],
      accessibleName: controls.starStringProperty,
    });
    this.addChild(this.addSphereInteraction(this.celProjection, (point) => this.celestialPointToEquatorial(point)));
    this.addChild(new CelestialSphereNode(this.celProjection));
    this.addChild(new HorizonPlaneNode(this.celProjection, sky.latitudeProperty, sky.siderealTimeProperty));
    this.addChild(new EarthGlobeNode(this.celProjection, sky.latitudeProperty, sky.siderealTimeProperty));
    this.addChild(celStars);

    // ── Horizon dome (right) ────────────────────────────────────────────────────
    this.horProjection = new SkyProjection({
      center: new Vector2(620, 270),
      radius: SPHERE_RADIUS,
      elevation: -0.5,
      azimuth: Math.PI / 2,
    });
    const horTrails = new SkyTrailsNode(sky, this.horProjection, {
      pathPointAt: (star, lst) => {
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          sky.latitudeProperty.value,
          lst,
        );
        return { point: altAzToVector3(altDeg, azDeg), visible: altDeg >= 0 };
      },
      redrawProperties: [sky.latitudeProperty, sky.siderealTimeProperty, this.horProjection.viewMatrixProperty],
    });
    const horStars = new SkyStarsNode(sky, {
      starToPoint: (star) => {
        const { altDeg, azDeg } = equatorialToHorizontal(
          star.raProperty.value,
          star.decProperty.value,
          sky.latitudeProperty.value,
          sky.siderealTimeProperty.value,
        );
        return { point: this.horProjection.project(altAzToVector3(altDeg, azDeg)), visible: altDeg >= 0 };
      },
      pointToEquatorial: (point) => this.horizonPointToEquatorial(point),
      redrawProperties: [sky.latitudeProperty, sky.siderealTimeProperty, this.horProjection.viewMatrixProperty],
      accessibleName: controls.starStringProperty,
    });
    this.addChild(this.addSphereInteraction(this.horProjection, (point) => this.horizonPointToEquatorial(point)));
    this.addChild(new HorizonDomeNode(this.horProjection, sky.latitudeProperty));
    this.addChild(horTrails);
    this.addChild(horStars);

    // ── Flat Earth map (lower-left) ─────────────────────────────────────────────
    const map = new FlatEarthMapNode(sky.latitudeProperty, sky.longitudeProperty, { width: 300, height: 150 });
    map.left = SCREEN_VIEW_MARGIN;
    map.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    this.addChild(map);

    // ── Control panel ───────────────────────────────────────────────────────────
    const pushButton = (
      labelProperty: typeof controls.addStarRandomlyStringProperty,
      listener: () => void,
    ): RectangularPushButton =>
      new RectangularPushButton({
        content: new Text(labelProperty, { font: new PhetFont(14), fill: "#000000" }),
        listener,
        accessibleName: labelProperty,
      });

    const addStarButton = pushButton(controls.addStarRandomlyStringProperty, () => sky.addRandomStar());
    const removeAllButton = pushButton(controls.removeAllStarsStringProperty, () => sky.removeAllStars());

    const trailsCheckbox = new Checkbox(
      sky.starTrailsVisibleProperty,
      new Text(controls.starTrailsStringProperty, {
        font: new PhetFont(14),
        fill: RotatingSkyColors.textColorProperty,
      }),
      {
        checkboxColor: RotatingSkyColors.textColorProperty,
        checkboxColorBackground: RotatingSkyColors.panelBackgroundColorProperty,
        accessibleName: controls.starTrailsStringProperty,
      },
    );

    const timeControl = new TimeControlNode(sky.timer.isPlayingProperty, {
      timeSpeedProperty: sky.timeSpeedProperty,
      playPauseStepButtonOptions: { stepForwardButtonOptions: { listener: () => sky.stepForward() } },
    });

    const locationReadout = new Text(
      new DerivedProperty(
        [sky.latitudeProperty, sky.longitudeProperty, controls.latitudeStringProperty],
        (lat, lon, label) => `${label}: ${lat.toFixed(0)}°, ${lon.toFixed(0)}°`,
      ),
      { font: new PhetFont(13), fill: RotatingSkyColors.textColorProperty },
    );

    const panel = new RotatingSkyPanel(
      new VBox({
        align: "left",
        spacing: 12,
        children: [
          addStarButton,
          removeAllButton,
          trailsCheckbox,
          timeControl,
          locationReadout,
          new SkyReadoutNode(sky),
        ],
      }),
    );
    panel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    panel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    this.addChild(panel);

    const resetAllButton = new ResetAllButton({
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
          map,
          addStarButton,
          removeAllButton,
          trailsCheckbox,
          timeControl,
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
    return horizontalToEquatorial(altDeg, azDeg, this.sky.latitudeProperty.value, this.sky.siderealTimeProperty.value);
  }

  /**
   * Transparent region behind a sphere: drag rotates the camera; shift-click adds
   * a star at the clicked location.
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
    region.addInputListener(
      new DragListener({
        start: (event) => {
          const shift = Boolean((event.domEvent as { shiftKey?: boolean } | null)?.shiftKey);
          if (shift) {
            const local = region.globalToParentPoint(event.pointer.point);
            const { raHours, decDeg } = pointToEquatorial(local);
            this.sky.addStar(raHours, decDeg);
            lastPoint = null;
          } else {
            lastPoint = event.pointer.point.copy();
          }
        },
        drag: (event) => {
          if (lastPoint) {
            const p = event.pointer.point;
            projection.rotateBy((p.x - lastPoint.x) * ROTATE_SPEED, (p.y - lastPoint.y) * ROTATE_SPEED);
            lastPoint = p.copy();
          }
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
