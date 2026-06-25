# CLAUDE.md — Rotating Sky

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

An interactive astronomy simulation about the apparent rotation of the sky for an
observer on Earth. Forked from `TemplateSingleSim` via `npm run rename` and then
extended to three screens (see `doc/multi-screen.md`):

- **Horizon System** (`src/horizon-system/`) — the local sky from an observer's horizon.
- **Celestial Sphere** (`src/celestial-sphere/`) — the celestial sphere, equator, ecliptic, poles.
- **Explorer** (`src/explorer/`) — the combined, interactive rotating-sky explorer.

Status: scaffold. Each screen has a working model/view/summary/keyboard-help wired
up with a placeholder play area and Reset All. The astronomy model (latitude, time,
star positions) is not yet implemented, and the three screens currently hold
independent state. Reference material for the port lives in the gitignored `NAAP/`
directory (the original NAAP "Rotating Sky" Flash/AIR lab). The automated gate is
`npm run check && npm run lint && npm run build` (plus `npm test`).

## Key files

| File | Purpose |
|---|---|
| `src/RotatingSkyColors.ts` | All `ProfileColorProperty` instances (shared) |
| `src/RotatingSkyConstants.ts` | Named numeric constants (layout px, physics SI units) |
| `src/RotatingSkyNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor; per-screen name + a11y getters |
| `src/common/RotatingSkyPanel.ts` | Pre-themed `Panel` wrapper (uses `RotatingSkyColors`) |
| `src/common/RotatingSkyScreenIcons.ts` | Programmatic home/nav-bar icons for the three screens |
| `src/common/TimeModel.ts` | Composable play/pause + elapsed-time model for animated sims |
| `src/<screen>/…Screen.ts` | Per-screen `Screen<Model, View>` wrapper |
| `src/<screen>/model/…Model.ts` | Per-screen state and logic |
| `src/<screen>/view/…ScreenView.ts` | Per-screen visual nodes, layout, `screenSummaryContent` + `pdomOrder` |
| `src/<screen>/view/…ScreenSummaryContent.ts` | Per-screen accessible summary |
| `src/<screen>/view/…KeyboardHelpContent.ts` | Per-screen keyboard-help dialog content |
| `scripts/generate-icons.ts` | PNG app icons from `public/icons/icon.svg` |

`<screen>` is one of `horizon-system`, `celestial-sphere`, `explorer`, with class
prefixes `HorizonSystem`, `CelestialSphere`, `Explorer`.

## Accessibility

Follows the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).
Each screen registers its own `ScreenSummaryContent` and an explicit `pdomOrder`.
A11y strings live under per-screen keys in the `a11y` block of each locale JSON
(`a11y.horizonSystem`, `a11y.celestialSphere`, `a11y.explorer`), exposed via
`StringManager.get<Screen>A11yStrings()`. When the model gains state, make each
`currentDetailsContent` a live `DerivedProperty` and add `accessibleName`s to every
interactive node.

## Adding shared state

The screens are independent today. To share state (latitude, time of day, selected
star), create a root model and pass it to each per-screen model constructor — see
the "Multi-screen with shared model" pattern in `doc/multi-screen.md`.

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
