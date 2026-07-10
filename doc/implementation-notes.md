# Implementation Notes - Rotating Sky

## Architecture overview

Three independent screens. Each screen model **composes** its own `SkyModel` (same pattern as
`TimeModel`), seeded from shared preference defaults for latitude/longitude. Screens do not share live
sky state.

```
main.ts
  ├─ HorizonSystemScreen     → HorizonSystemModel  { sky: SkyModel }
  ├─ CelestialSphereScreen   → CelestialSphereModel { sky: SkyModel }
  └─ ExplorerScreen          → ExplorerModel        { sky: SkyModel }

src/common/
  ├─ model/SkyModel.ts, Star.ts, StarPatterns.ts
  ├─ SkyCoordinates.ts       pure RA/Dec ↔ alt/az, declination bands
  ├─ SkyProjection.ts        camera / view matrix; has dispose()
  ├─ TimeModel.ts            play/pause
  ├─ RotatingSkyPanel.ts, button/control option helpers, screen icons
  ├─ skyMorph.ts
  └─ view/                   heavy shared graphics (dome, sphere, stars, trails,
                             Earth map/globe, arcs, readouts, …)

src/preferences/
  ├─ RotatingSkyPreferencesModel   defaultLatitude / defaultLongitude / earthMapResolution
  ├─ RotatingSkyPreferencesNode
  └─ rotatingSkyQueryParameters    seeds preference defaults
```

Educator-facing math: [model.md](./model.md).

## Model components

### SkyModel (`common/model/`)

Per-screen astronomy state: observer lat/long (reset restores preference defaults), LST, stars /
pattern groups, selection, trail bookkeeping, and screen-specific visibility toggles. Composes
`TimeModel`; `step(dt)` advances sidereal time from speed / animation-rate / duration settings.
`Star` instances are disposed when removed from the sky.

### Thin screen models

`HorizonSystemModel`, `CelestialSphereModel`, and `ExplorerModel` each construct a `SkyModel(options)`
with `defaultLatitudeProperty` / `defaultLongitudeProperty` from preferences and forward `step` /
`reset`.

### SkyCoordinates

UI-free transforms and `declinationBand`; covered by unit tests.

## View components

`common/view/` is large: horizon dome/plane/ground, celestial sphere, star dots/trails/patterns,
coordinate guides, selected-star arcs, Earth map/globe, readouts, editable fields. Screen views
compose these nodes and bind to their local `model.sky`.

`SkyProjection` owns azimuth/elevation/frame matrices and exposes `dispose()` for its Properties.
**Most view nodes are screen-lifetime** — they live as long as the screen and are not disposed on
every interaction. Dispose paths that do exist are for dynamic pieces (e.g. per-star links when stars
are removed, selected-star arc/readout links when selection changes).

## Preferences

Unlike the other two NAAP ports here, preferences are live: default latitude/longitude (and Earth map
resolution) come from query parameters into `RotatingSkyPreferencesModel`. Each `SkyModel` seeds and,
on Reset All, restores location from those Properties.

## TimeModel

Shared play/pause + elapsed-time helper; composed inside `SkyModel` (and disposable if ever torn down).

## Tests

`tests/`: `SkyCoordinates`, `SkyModel`, `TimeModel`, plus `skyGraphics` view helpers.

## Multi-screen

Independent sky state per screen, shared preference defaults only — see [multi-screen.md](./multi-screen.md).
