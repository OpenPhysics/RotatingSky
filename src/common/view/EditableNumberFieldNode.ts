/**
 * EditableNumberFieldNode.ts
 *
 * A compact label + white numeric field + unit row, matching the original NAAP
 * coordinate inputs beneath each sky view. Click or focus the field, type a
 * number, and press Enter to commit.
 */

import type { ReadOnlyProperty } from "scenerystack/axon";
import type { SceneryEvent } from "scenerystack/scenery";
import { HBox, Node, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import { CONTROL_FONT_SIZE } from "../../RotatingSkyConstants.js";

const FIELD_WIDTH = 52;
const FIELD_HEIGHT = 18;

export type EditableNumberFieldNodeOptions = {
  labelProperty: ReadOnlyProperty<string>;
  unit: string;
  decimalPlaces: number;
  onCommit: (value: number) => void;
};

const parseNumber = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === ".") {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
};

export class EditableNumberFieldNode extends HBox {
  private editing = false;
  private editBuffer = "";
  private fieldActive = true;
  private readonly decimalPlaces: number;
  private readonly onCommit: (value: number) => void;
  private readonly valueText: Text;
  private readonly fieldBackground: Rectangle;
  private readonly fieldNode: Node;

  public constructor(options: EditableNumberFieldNodeOptions) {
    const { labelProperty, unit, decimalPlaces, onCommit } = options;

    const label = new Text("", {
      font: new PhetFont(CONTROL_FONT_SIZE),
      fill: RotatingSkyColors.textColorProperty,
    });
    const syncLabel = (value: string): void => {
      label.string = `${value}:`;
    };
    syncLabel(labelProperty.value);
    labelProperty.link(syncLabel);

    const fieldBackground = new Rectangle(0, 0, FIELD_WIDTH, FIELD_HEIGHT, {
      fill: "#ffffff",
      stroke: RotatingSkyColors.gridColorProperty,
      lineWidth: 1,
      cornerRadius: 2,
    });
    const valueText = new Text("—", {
      font: new PhetFont(CONTROL_FONT_SIZE),
      fill: "#000000",
    });
    const fieldNode = new Node({
      children: [fieldBackground, valueText],
      focusable: true,
      cursor: "text",
    });
    valueText.centerX = fieldBackground.centerX;
    valueText.centerY = fieldBackground.centerY;

    const unitText = new Text(unit, {
      font: new PhetFont(CONTROL_FONT_SIZE),
      fill: RotatingSkyColors.textColorProperty,
    });

    super({
      spacing: 4,
      align: "center",
      children: [label, fieldNode, unitText],
    });

    this.decimalPlaces = decimalPlaces;
    this.onCommit = onCommit;
    this.valueText = valueText;
    this.fieldBackground = fieldBackground;
    this.fieldNode = fieldNode;

    fieldNode.addInputListener({
      down: () => {
        if (this.fieldActive) {
          this.beginEditing();
        }
      },
      keydown: (event) => this.handleKeyDown(event),
    });
  }

  /** Updates the displayed value when the model changes. Ignored while the user is editing. */
  public setDisplayValue(value: number | null): void {
    if (this.editing) {
      return;
    }
    this.editBuffer = value === null ? "" : value.toFixed(this.decimalPlaces);
    this.updateValueText();
  }

  public setFieldEnabled(enabled: boolean): void {
    this.fieldActive = enabled;
    this.fieldBackground.fill = enabled ? "#ffffff" : "#cccccc";
    this.fieldNode.cursor = enabled ? "text" : "default";
    if (!enabled) {
      this.editing = false;
      this.editBuffer = "";
      this.valueText.string = "—";
    }
  }

  private beginEditing(): void {
    if (this.editing || !this.fieldActive) {
      return;
    }
    this.editing = true;
    if (this.editBuffer === "") {
      this.valueText.string = " ";
    } else {
      this.updateValueText();
    }
    this.fieldNode.focus();
  }

  private commitEditing(): void {
    if (!this.editing) {
      return;
    }
    this.editing = false;
    const parsed = parseNumber(this.editBuffer);
    if (parsed !== null) {
      this.onCommit(parsed);
    } else {
      this.updateValueText();
    }
  }

  private handleKeyDown(event: SceneryEvent): void {
    if (!this.fieldActive) {
      return;
    }

    if (!this.editing) {
      this.beginEditing();
    }

    const key = (event.domEvent as KeyboardEvent | null)?.key;
    if (!key) {
      return;
    }

    if (key === "Enter") {
      this.commitEditing();
      event.handle();
      return;
    }

    if (key === "Escape") {
      this.editing = false;
      this.updateValueText();
      event.handle();
      return;
    }

    if (key === "Backspace") {
      this.editBuffer = this.editBuffer.slice(0, -1);
      this.updateValueText();
      event.handle();
      return;
    }

    if (key === "-" && this.editBuffer.length === 0) {
      this.editBuffer = "-";
      this.updateValueText();
      event.handle();
      return;
    }

    if ((key === "." || key === "Decimal") && !this.editBuffer.includes(".")) {
      this.editBuffer =
        this.editBuffer === "" || this.editBuffer === "-" ? `${this.editBuffer}0.` : `${this.editBuffer}.`;
      this.updateValueText();
      event.handle();
      return;
    }

    if (/^\d$/.test(key)) {
      this.editBuffer += key;
      this.updateValueText();
      event.handle();
    }
  }

  private updateValueText(): void {
    if (!this.fieldActive) {
      this.valueText.string = "—";
      return;
    }
    if (this.editing) {
      this.valueText.string = this.editBuffer === "" ? " " : this.editBuffer;
      return;
    }
    this.valueText.string = this.editBuffer === "" ? "—" : this.editBuffer;
  }
}
