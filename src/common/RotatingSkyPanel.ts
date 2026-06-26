/**
 * RotatingSkyPanel.ts
 *
 * A pre-themed Panel that automatically uses RotatingSkyColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { RotatingSkyPanel } from "../../common/RotatingSkyPanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new RotatingSkyPanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new RotatingSkyPanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new RotatingSkyPanel(content, { fill: "transparent" });
 */

import type { Node } from "scenerystack/scenery";
import type { PanelOptions } from "scenerystack/sun";
import { Panel } from "scenerystack/sun";
import RotatingSkyColors from "../RotatingSkyColors.js";
import { PANEL_CORNER_RADIUS, PANEL_X_MARGIN, PANEL_Y_MARGIN } from "../RotatingSkyConstants.js";

export class RotatingSkyPanel extends Panel {
  public constructor(content: Node, providedOptions?: PanelOptions) {
    super(content, {
      fill: RotatingSkyColors.panelBackgroundColorProperty,
      stroke: RotatingSkyColors.panelBorderColorProperty,
      cornerRadius: PANEL_CORNER_RADIUS,
      xMargin: PANEL_X_MARGIN,
      yMargin: PANEL_Y_MARGIN,
      ...providedOptions,
    });
  }
}
