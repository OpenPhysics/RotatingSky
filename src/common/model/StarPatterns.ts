/**
 * StarPatterns.ts
 *
 * A small catalog of recognizable star patterns the Explorer screen can drop
 * onto the sky in one click (the "star patterns…" picker). Each pattern is just
 * a list of equatorial coordinates (right ascension in hours, declination in
 * degrees) using the real bright-star positions, so the asterisms keep their
 * familiar shape and sit in the correct part of the sky.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";

export type StarPatternStar = { raHours: number; decDeg: number };

/** Index pair into a pattern's star list — the stick-figure segment to draw. */
export type StarPatternEdge = readonly [number, number];

export type StarPattern = {
  /** Stable key used for the picker value. */
  readonly key: string;
  /** Localized display name shown in the picker. */
  readonly nameProperty: TReadOnlyProperty<string>;
  /** The stars that make up the pattern. */
  readonly stars: readonly StarPatternStar[];
  /** Line segments joining stars (indices into {@link stars}). */
  readonly edges: readonly StarPatternEdge[];
};

/** The Big Dipper (the bright asterism in Ursa Major). */
export const BIG_DIPPER: readonly StarPatternStar[] = [
  { raHours: 11.062, decDeg: 61.75 }, // Dubhe
  { raHours: 11.03, decDeg: 56.38 }, // Merak
  { raHours: 11.897, decDeg: 53.69 }, // Phecda
  { raHours: 12.257, decDeg: 57.03 }, // Megrez
  { raHours: 12.9, decDeg: 55.96 }, // Alioth
  { raHours: 13.399, decDeg: 54.93 }, // Mizar
  { raHours: 13.792, decDeg: 49.31 }, // Alkaid
];

/** Big Dipper stick figure: bowl (pan) plus handle. */
export const BIG_DIPPER_EDGES: readonly StarPatternEdge[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [3, 4],
  [4, 5],
  [5, 6],
];

/** Orion's Belt (the three near-equatorial stars of Orion). */
export const ORIONS_BELT: readonly StarPatternStar[] = [
  { raHours: 5.679, decDeg: -1.94 }, // Alnitak
  { raHours: 5.604, decDeg: -1.2 }, // Alnilam
  { raHours: 5.533, decDeg: -0.3 }, // Mintaka
];

export const ORIONS_BELT_EDGES: readonly StarPatternEdge[] = [
  [0, 1],
  [1, 2],
];

/** The Southern Cross (Crux), a southern-hemisphere asterism. */
export const SOUTHERN_CROSS: readonly StarPatternStar[] = [
  { raHours: 12.443, decDeg: -63.1 }, // Acrux
  { raHours: 12.795, decDeg: -59.69 }, // Mimosa
  { raHours: 12.519, decDeg: -57.11 }, // Gacrux
  { raHours: 12.252, decDeg: -58.75 }, // Imai
];

/** Southern Cross: long axis Gacrux–Acrux, short axis Mimosa–Imai. */
export const SOUTHERN_CROSS_EDGES: readonly StarPatternEdge[] = [
  [2, 0],
  [1, 3],
];

/** Cassiopeia's "W". */
export const CASSIOPEIA: readonly StarPatternStar[] = [
  { raHours: 0.153, decDeg: 59.15 }, // Caph
  { raHours: 0.675, decDeg: 56.54 }, // Schedar
  { raHours: 0.945, decDeg: 60.72 }, // Gamma Cas
  { raHours: 1.43, decDeg: 60.24 }, // Ruchbah
  { raHours: 1.906, decDeg: 63.67 }, // Segin
];

export const CASSIOPEIA_EDGES: readonly StarPatternEdge[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
];
