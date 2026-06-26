/**
 * SkyReadoutNode.ts
 *
 * A small readout panel showing the equatorial coordinates (right ascension and
 * declination) of the currently selected star, or a "no star selected" message.
 * Updates live as the selection changes and as a selected star is dragged.
 */

import { Multilink, type UnknownMultilink } from "scenerystack/axon";
import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { CONTROL_FONT_SIZE, PANEL_TITLE_FONT_SIZE } from "../../RotatingSkyConstants.js";
import type { SkyModel } from "../model/SkyModel.js";

/** Formats RA hours as `h m` (e.g. 6.5 → "6h 30m"). */
const formatRA = (raHours: number): string => {
  const h = Math.floor(raHours);
  const m = Math.round((raHours - h) * 60);
  return m === 60 ? `${(h + 1) % 24}h 0m` : `${h}h ${m}m`;
};

/** Formats declination as a signed degree value (e.g. "+23.5°"). */
const formatDec = (decDeg: number): string => `${decDeg >= 0 ? "+" : "−"}${Math.abs(decDeg).toFixed(1)}°`;

export class SkyReadoutNode extends VBox {
  private starLink: UnknownMultilink | null = null;

  public constructor(model: SkyModel) {
    const controls = StringManager.getInstance().getControls();

    const title = new Text(controls.selectedStarStringProperty, {
      font: new PhetFont({ size: PANEL_TITLE_FONT_SIZE, weight: "bold" }),
      fill: RotatingSkyColors.textColorProperty,
    });
    const raText = new Text("", { font: new PhetFont(CONTROL_FONT_SIZE), fill: RotatingSkyColors.textColorProperty });
    const decText = new Text("", { font: new PhetFont(CONTROL_FONT_SIZE), fill: RotatingSkyColors.textColorProperty });

    super({ align: "left", spacing: 4, children: [title, raText, decText] });

    const update = (): void => {
      const star = model.selectedStarProperty.value;
      if (star) {
        raText.string = `${controls.rightAscensionStringProperty.value}: ${formatRA(star.raProperty.value)}`;
        decText.string = `${controls.declinationStringProperty.value}: ${formatDec(star.decProperty.value)}`;
      } else {
        raText.string = controls.noStarSelectedStringProperty.value;
        decText.string = "";
      }
    };

    model.selectedStarProperty.link(() => {
      this.starLink?.dispose();
      const star = model.selectedStarProperty.value;
      this.starLink = star ? Multilink.multilinkAny([star.raProperty, star.decProperty], update) : null;
      update();
    });

    // Re-render when the labels themselves change (locale switch).
    Multilink.multilinkAny(
      [
        controls.rightAscensionStringProperty,
        controls.declinationStringProperty,
        controls.noStarSelectedStringProperty,
      ],
      update,
    );
  }
}
