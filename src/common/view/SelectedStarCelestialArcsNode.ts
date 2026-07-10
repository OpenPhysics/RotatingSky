/**
 * SelectedStarCelestialArcsNode.ts
 *
 * Companion to {@link SelectedStarHorizonArcsNode} for the celestial-sphere view.
 * When a star is selected it draws the NAAP-style equatorial coordinate guides:
 * a red arc along the celestial equator from the 0ʰ point to the star's right
 * ascension (with an hour label), and a blue meridian arc from the equator up to
 * the star's declination (with a degree label).
 *
 * The colours mirror the horizon arcs — red = "around" (RA ≈ azimuth), blue =
 * "up" (Dec ≈ altitude) — so the two spheres read as a matched pair.
 */

import { Multilink, type UnknownMultilink } from "scenerystack/axon";
import { toFixed, type Vector3 } from "scenerystack/dot";
import { Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import RotatingSkyColors from "../../RotatingSkyColors.js";
import type { SkyModel } from "../model/SkyModel.js";
import { raDecToVector3 } from "../SkyCoordinates.js";
import type { SkyProjection } from "../SkyProjection.js";
import { projectSplitPolyline } from "./skyGraphics.js";

const ARC_LINE_WIDTH = 3;
const LABEL_OFFSET = 16;

/** Equator arc from the 0ʰ point clockwise (increasing RA) to `toRaHours`. */
const equatorArcPoints = (toRaHours: number): Vector3[] => {
  const points: Vector3[] = [];
  const step = 0.15; // hours
  for (let ra = 0; ra <= toRaHours; ra += step) {
    points.push(raDecToVector3(ra, 0));
  }
  points.push(raDecToVector3(toRaHours, 0));
  return points;
};

/** Meridian (constant-RA) arc from the equator (Dec 0°) to `toDecDeg`. */
const declinationArcPoints = (raHours: number, toDecDeg: number): Vector3[] => {
  const points: Vector3[] = [];
  const step = toDecDeg >= 0 ? 4 : -4;
  for (let dec = 0; toDecDeg >= 0 ? dec <= toDecDeg : dec >= toDecDeg; dec += step) {
    points.push(raDecToVector3(raHours, dec));
  }
  points.push(raDecToVector3(raHours, toDecDeg));
  return points;
};

const placeLabelOutside = (text: Text, point: Vector3, projection: SkyProjection): void => {
  const screen = projection.project(point);
  const away = screen.minus(projection.center);
  const offset = away.magnitude > 0 ? away.normalized().timesScalar(LABEL_OFFSET) : away;
  text.center = screen.plus(offset);
  text.visible = projection.isFrontFacing(point);
};

export class SelectedStarCelestialArcsNode extends Node {
  private starLink: UnknownMultilink | null = null;

  public constructor(projection: SkyProjection, model: SkyModel) {
    super({ pickable: false });

    const raFront = new Path(null, {
      stroke: RotatingSkyColors.azimuthArcColorProperty,
      lineWidth: ARC_LINE_WIDTH,
    });
    const raBack = new Path(null, {
      stroke: RotatingSkyColors.azimuthArcColorProperty,
      lineWidth: ARC_LINE_WIDTH,
      lineDash: [6, 4],
    });
    const decFront = new Path(null, {
      stroke: RotatingSkyColors.altitudeArcColorProperty,
      lineWidth: ARC_LINE_WIDTH,
    });
    const decBack = new Path(null, {
      stroke: RotatingSkyColors.altitudeArcColorProperty,
      lineWidth: ARC_LINE_WIDTH,
      lineDash: [6, 4],
    });

    const raLabel = new Text("", {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: RotatingSkyColors.azimuthArcColorProperty,
      pickable: false,
    });
    const decLabel = new Text("", {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: RotatingSkyColors.altitudeArcColorProperty,
      pickable: false,
    });

    this.children = [raBack, decBack, raFront, decFront, raLabel, decLabel];

    const hideAll = (): void => {
      raFront.shape = null;
      raBack.shape = null;
      decFront.shape = null;
      decBack.shape = null;
      raLabel.visible = false;
      decLabel.visible = false;
    };

    const update = (): void => {
      const star = model.selectedStarProperty.value;
      if (!star) {
        hideAll();
        return;
      }

      const ra = star.raProperty.value;
      const dec = star.decProperty.value;

      const raSplit = projectSplitPolyline(projection, equatorArcPoints(ra), false);
      raFront.shape = raSplit.front;
      raBack.shape = raSplit.back;

      const decSplit = projectSplitPolyline(projection, declinationArcPoints(ra, dec), false);
      decFront.shape = decSplit.front;
      decBack.shape = decSplit.back;

      raLabel.string = `${toFixed(ra, 1)}ʰ`;
      decLabel.string = dec >= 0 ? `+${toFixed(dec, 0)}°` : `${toFixed(dec, 0)}°`;

      placeLabelOutside(raLabel, raDecToVector3(ra / 2, 0), projection);
      placeLabelOutside(decLabel, raDecToVector3(ra, dec / 2), projection);
    };

    model.selectedStarProperty.link((star) => {
      this.starLink?.dispose();
      this.starLink = star
        ? Multilink.multilinkAny([star.raProperty, star.decProperty, projection.viewMatrixProperty], update)
        : null;
      update();
    });
  }
}
