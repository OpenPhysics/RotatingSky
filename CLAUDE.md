# CLAUDE.md — Rotating Sky

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

An interactive astronomy simulation about the apparent rotation of the sky for an
observer on Earth. Extended to three screens (see `doc/multi-screen.md`):

- **Horizon System** (`src/horizon-system/`) — the local sky from an observer's horizon.
- **Celestial Sphere** (`src/celestial-sphere/`) — the celestial sphere, equator, ecliptic, poles.
- **Explorer** (`src/explorer/`) — the combined, interactive rotating-sky explorer.

Status: the astronomy model is implemented.
Reference material for the port lives in the gitignored `NAAP/` directory
(the original NAAP "Rotating Sky" Flash/AIR lab). The automated gate is
`npm run check && npm run lint && npm run build` (plus `npm test`).

## Key files

| File | Purpose |
|---|---|
| `src/RotatingSkyColors.ts` | All `ProfileColorProperty` instances (shared) |
| `src/RotatingSkyConstants.ts` | Named constants (layout px, angle ranges, animation rates, star limits) |
| `src/RotatingSkyNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor; per-screen name + a11y getters, plus `getControls()` |
| `src/common/RotatingSkyPanel.ts` | Pre-themed `Panel` wrapper (uses `RotatingSkyColors`) |
| `src/common/RotatingSkyButtonOptions.ts` | Shared flat-styled button option presets |
| `src/common/RotatingSkyScreenIcons.ts` | Programmatic home/nav-bar icons for the three screens |
| `src/common/TimeModel.ts` | Composable play/pause + elapsed-time model for animated sims |
| `src/preferences/…` | `rotatingSkyQueryParameters.ts` + `RotatingSkyPreferences{Model,Node}.ts` (default latitude/longitude) |
| `src/<screen>/…Screen.ts` | Per-screen `Screen<Model, View>` wrapper |
| `src/<screen>/model/…Model.ts` | Per-screen model; composes a `SkyModel` (+ any screen-only state) |
| `src/<screen>/view/…ScreenView.ts` | Per-screen visual nodes, layout, `screenSummaryContent` + `pdomOrder` |
| `src/<screen>/view/…ScreenSummaryContent.ts` | Per-screen accessible summary |
| `src/<screen>/view/…KeyboardHelpContent.ts` | Per-screen keyboard-help dialog content |
| `scripts/generate-icons.ts` | PNG app icons from `public/icons/icon.svg` |

`<screen>` is one of `horizon-system`, `celestial-sphere`, `explorer`, with class
prefixes `HorizonSystem`, `CelestialSphere`, `Explorer`.

## Sky engine (`src/common/`)

The shared astronomy lives in a handful of frame-agnostic modules. A view node
draws into a `SkyProjection`; pointing it at a different frame (a different
`toVector`/axis) renders the same geometry on either sphere.

| File | Purpose |
|---|---|
| `model/SkyModel.ts` | Shared state: observer lat/long, sidereal time, the star list + selection, trail bookkeeping, display toggles. Each per-screen model owns one. |
| `model/Star.ts` | One star, fixed by equatorial (RA, Dec); alt/az derived per screen. |
| `model/StarPatterns.ts` | Preset asterisms (Big Dipper, Orion's Belt, …) for the picker. |
| `SkyCoordinates.ts` | Pure spherical-astronomy helpers (RA/Dec ↔ alt/az, the two frames, declination classification). No scenery/model deps → unit-tested. |
| `SkyProjection.ts` | Orthographic 3-D → 2-D projector; owns the camera (azimuth/elevation, drag-to-rotate). `projectWithDepth()` drives front/back occlusion (solid vs. dashed). |
| `view/skyGraphics.ts` | Projects sampled circles/polylines/bands to kite `Shape`s. `projectDeclinationBand` takes a `toVector` frame mapping, so one routine fills a band in **either** frame. |
| `skyMorph.ts` | Frame rotation that morphs the Celestial Sphere view between equatorial and horizon orientation (twixt-animated `systemBlendProperty`). |

Two world frames (`SkyCoordinates.ts`): the **equatorial** frame (+Z = NCP) for the
celestial sphere, and the **horizon** frame (+Z = zenith, +X = N, +Y = E) for the
horizon dome. The Explorer draws both views from one `SkyModel`; the Celestial
Sphere screen morphs a single view between the two.

`DeclinationRegionsNode` shades the circumpolar / rise-and-set / never-rise regions;
with the default equatorial `toVector` it draws them on the celestial sphere, and
with a horizon-frame `toVector` (the Explorer passes one) it mirrors them onto the
horizon dome, where the caps tilt with latitude and the never-rise cap drops below
the horizon. (`SkyBandsNode` is the simpler single-cap shading on the Horizon System
screen, toggled by `bandsVisibleProperty`.)

## Accessibility

Follows the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).
Each screen registers its own `ScreenSummaryContent` and an explicit `pdomOrder`.
A11y strings live under per-screen keys in the `a11y` block of each locale JSON
(`a11y.horizonSystem`, `a11y.celestialSphere`, `a11y.explorer`), exposed via
`StringManager.get<Screen>A11yStrings()`. Each summary's `currentDetailsContent` is
already a live `PatternStringProperty`/`DerivedProperty` over the model, and
interactive nodes carry `accessibleName`s — keep both in sync as you add state.

## Sharing state across screens

The three screens are independent: each per-screen model constructs its own
`SkyModel` (seeded from the shared preference defaults in `main.ts`), so latitude,
time, and stars set on one screen do not carry to the others. To make a piece of
state global instead, construct one `SkyModel` (or a narrower root model) once and
thread that same instance through each per-screen model constructor — see the
"Multi-screen with shared model" pattern in `doc/multi-screen.md`.

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
