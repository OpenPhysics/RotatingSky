/**
 * CelestialSphereScreenSummaryContent.ts
 *
 * The accessible screen summary read by screen readers (SceneryStack's
 * Interactive Description). It appears at the top of the parallel DOM and gives
 * a non-visual user a way to orient themselves and to re-read the simulation's
 * current state at any time.
 *
 * A summary has four regions:
 *   - playAreaContent       — what the play area contains
 *   - controlAreaContent    — what the controls do
 *   - currentDetailsContent — a LIVE paragraph describing current state
 *   - interactionHintContent — a short hint on how to get started
 *
 * `currentDetailsContent` is a live `PatternStringProperty`: it fills the
 * localized pattern with the observer's latitude and the local sidereal time,
 * and updates automatically as the model changes.
 */
import { PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { CelestialSphereModel } from "../model/CelestialSphereModel.js";

export class CelestialSphereScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: CelestialSphereModel) {
    const a11y = StringManager.getInstance().getCelestialSphereA11yStrings();
    const sky = model.sky;

    const currentDetails = new PatternStringProperty(
      a11y.currentDetailsStringProperty,
      {
        latitude: sky.latitudeProperty,
        time: sky.siderealTimeProperty,
      },
      { decimalPlaces: { latitude: 0, time: 1 } },
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
