# Implementation Notes - Rotating Sky

Developer-facing notes on the architecture. Educator-facing physics are in [model.md](./model.md).

## Architecture Overview

Three independent screens, each composing its own `SkyModel` seeded from `RotatingSkyPreferencesModel`
(latitude, longitude, earth map resolution).

```
src/main.ts
  RotatingSkyPreferencesModel ← rotatingSkyQueryParameters (?latitude, ?longitude, ?earthMapResolution)
  ├─ HorizonSystemScreen   → HorizonSystemModel   { sky: SkyModel, viewMode, viewDirection }
  ├─ CelestialSphereScreen → CelestialSphereModel { sky: SkyModel, systemBlend, guide star, prompts }
  └─ ExplorerScreen        → ExplorerModel        { sky: SkyModel }

src/common/
  model/SkyModel.ts, Star.ts, StarPatterns.ts, ViewDirection.ts
  SkyCoordinates.ts          pure transforms + declinationBand (unit-tested)
  SkyProjection.ts           orthographic projector; dispose()
  skyMorph.ts                equatorial↔horizon frameMatrixForBlend
  TimeModel.ts               play/pause + elapsed seconds
  view/HorizonDomeNode.ts, CelestialSphereNode.ts, SkyStarsNode.ts, SkyTrailsNode.ts
  view/DeclinationRegionsNode.ts, EarthGlobeNode.ts, FlatEarthMapNode.ts, …
  model/EarthShoreDataLow.ts, EarthShoreDataHigh.ts, EarthShoreData.ts

src/<screen>/model/          thin wrappers composing SkyModel
src/preferences/             RotatingSkyPreferencesModel, Node, query params
```

Unlike the other two NAAP ports in this repo (BasicCoordinates, MotionsOfTheSun), RotatingSky owns the
canonical `SkyModel` / star-placement pattern that those sims partially reuse.

Data flows Model → View through AXON `Property` objects. Views never compute astronomy; `SkyCoordinates`
has zero SceneryStack imports.

## SkyModel — shared per-screen astronomy state

| Category | Properties / behavior |
|---|---|
| **Time** | Composes `TimeModel`; `timeSpeedProperty` (TimeSpeed enum); `animationRateProperty` (Explorer slider only); `animationDurationProperty`; `siderealTimeProperty`; `step(dt)` advances LST when playing |
| **Location** | `latitudeProperty`, `longitudeProperty` (longitude used in Explorer views, not in `SkyCoordinates` itself) |
| **Stars** | `stars` ObservableArray; `selectedStarProperty`; `addStar` / `addRandomStar` / `addPattern`; cap `MAX_STARS = 30`; `removeStar` disposes `Star` |
| **Patterns** | `starPatternGroups` — stars + edges from inline `StarPatterns.ts` data (7 asterisms) |
| **Trails** | `trailStartTimeProperty`, `resetStarTrails()`; visibility via `starTrailsVisibleProperty` or `starTrailModeProperty` |
| **Toggles** | ~20 BooleanProperties partitioned by screen in source |

Speed: `(SLOW|NORMAL|FAST multiplier) × animationRateProperty × SIDEREAL_HOURS_PER_SECOND × dt`.

Duration limit (Explorer): tracks elapsed sidereal hours since play start; auto-pauses at selected limit.

## Screen-only models

| Model | Extra state |
|---|---|
| `HorizonSystemModel` | `viewModeProperty` (DIAGRAM/SKY/BOTH), `viewDirectionProperty` (N/E/S/W) |
| `CelestialSphereModel` | `systemBlendProperty` 0–1, `isMorphingProperty`, `guidedPromptIndexProperty` (4 prompts), `guideRaProperty` / `guideDecProperty` / `guideStarVisibleProperty`; forces `labelsVisibleProperty = true` on construct/reset |
| `ExplorerModel` | Thin wrapper only |

## View ↔ model wiring highlights

- **`SkyProjection`**: camera azimuth/elevation + optional `frameMatrixProperty` (Celestial Sphere morph).
- **`SkyStarsNode`**: caller supplies `starToPoint` + optional `pointToEquatorial` (enables drag).
- **`SkyTrailsNode`**: samples LST from `trailStartTime`; Explorer passes longitude-adjusted local LST.
- **`DeclinationRegionsNode`**: `projectDeclinationBand` with frame-specific `toVector` — used on Horizon +
  Explorer (**not** a separate `SkyBandsNode`).
- **`attachSkyCameraInteraction`**: Ctrl-drag advances LST; Shift-click add star **only when `onAddStarAt`
  provided (Explorer)**.
- **Explorer `localSiderealTimeProperty`**: `DerivedProperty([siderealTime, longitude], …)` — critical for
  longitude wiring.

## Key design decisions

- **Independent `SkyModel` per screen** — NAAP lab pattern; preferences seed Reset All only (not live sync).
- **Guide star vs `SkyModel.stars`** on Celestial Sphere — teaching coordinates without cluttering star list.
- **Inline `StarPatterns.ts`** — no external JSON; Explorer-only UI.
- **Earth map resolution** default **`high`** (Natural Earth); `?earthMapResolution=low|high`.

## Common components

- `RotatingSkyPanel`, `RotatingSkyButtonOptions`, `RotatingSkyControlOptions`, `RotatingSkyHotkeyData`.

## Disposal

Screen-lifetime models. `TimeModel.dispose()` exists; `SkyModel` does not dispose it. Dynamic star
removal calls `Star.dispose()`.

## Testing

| File | Covers |
|---|---|
| `SkyCoordinates.test.ts` | NCP altitude = φ, transits, round-trips, declination bands |
| `SkyModel.test.ts` | stars, cap, time stepping, duration auto-pause, reset |
| `TimeModel.test.ts` | play/pause elapsed time |
| `ViewDirection.test.ts` | cardinal azimuth helpers |
| `skyGraphics.test.ts` | projection graphics helpers |
| `memory-leak.test.ts` | fleet dispose pattern |

## Multi-screen

Independent-state pattern — see [multi-screen.md](./multi-screen.md).
