/**
 * RotatingSkyColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import RotatingSkyColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import RotatingSkyColors from "../../RotatingSkyColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: RotatingSkyColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the RotatingSkyColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import RotatingSkyNamespace from "./RotatingSkyNamespace.js";

const RotatingSkyColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  // ── Sky rendering ────────────────────────────────────────────────────────────

  /** Sphere / dome outline circle. */
  sphereOutlineColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "sphereOutline", {
    default: "#9fb3c8",
    projector: "#555555",
  }),

  /** RA/Dec and alt/az graticule lines. */
  gridColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "grid", {
    default: "#4a6078",
    projector: "#bbbbbb",
  }),

  /** The celestial equator great circle. */
  celestialEquatorColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "celestialEquator", {
    default: "#ff8a65",
    projector: "#d84315",
  }),

  /** The ecliptic great circle. */
  eclipticColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "ecliptic", {
    default: "#ffd54f",
    projector: "#f9a825",
  }),

  /** The observer's horizon plane / circle. */
  horizonColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "horizon", {
    default: "#66bb6a",
    projector: "#2e7d32",
  }),

  /** Ground fill below the horizon on the horizon dome. Matches NAAP bright green. */
  groundColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "ground", {
    default: "#009900",
    projector: "#66bb6a",
  }),

  /** Cardinal-direction and pole labels (N, E, S, W, NCP, …). */
  cardinalLabelColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "cardinalLabel", {
    default: "#ffffff",
    projector: "#1a1a1a",
  }),

  /** Fill of an ordinary star dot. */
  starColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "star", {
    default: "#fff59d",
    projector: "#f9a825",
  }),

  /** Fill / highlight of the currently selected star. */
  selectedStarColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "selectedStar", {
    default: "#ff5252",
    projector: "#c62828",
  }),

  /** Star-trail arcs. */
  trailColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "trail", {
    default: "#80d8ff",
    projector: "#0277bd",
  }),

  /** Shaded circumpolar band (stars that never set). */
  bandCircumpolarColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "bandCircumpolar", {
    default: "rgba(79,195,247,0.25)",
    projector: "rgba(2,119,189,0.18)",
  }),

  /** Shaded never-rising band (stars never visible). */
  bandNeverRisesColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "bandNeverRises", {
    default: "rgba(120,120,120,0.30)",
    projector: "rgba(120,120,120,0.20)",
  }),

  /** Shaded rise-and-set band (stars that rise and set each day). */
  bandRiseSetColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "bandRiseSet", {
    default: "rgba(102,187,106,0.22)",
    projector: "rgba(46,125,50,0.16)",
  }),

  /** Land fill of the Earth globe / flat map. */
  earthLandColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "earthLand", {
    default: "#6d8c5a",
    projector: "#7cb342",
  }),

  /** Ocean fill of the Earth globe / flat map. */
  earthOceanColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "earthOcean", {
    default: "#2a4d69",
    projector: "#4a90c2",
  }),

  /** The observer's location marker on the Earth globe / flat map. */
  observerColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "observer", {
    default: "#ff5252",
    projector: "#c62828",
  }),

  /** The observer stick figure on the horizon ground disk. */
  observerFigureColorProperty: new ProfileColorProperty(RotatingSkyNamespace, "observerFigure", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),
};

export default RotatingSkyColors;
