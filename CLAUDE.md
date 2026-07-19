# CLAUDE.md — Rotating Sky

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

SceneryStack port of the NAAP **Rotating Sky** lab. Three screens build the same celestial geometry from different viewpoints — local horizon dome, equatorial celestial sphere, and a combined explorer. Architecture and formulas: [doc/model.md](doc/model.md), [doc/implementation-notes.md](doc/implementation-notes.md).

- **Horizon System** (`src/horizon-system/`) — altitude/azimuth, zenith, meridian, optional declination-band shading and star trails.
- **Celestial Sphere** (`src/celestial-sphere/`) — RA/Dec, hour circles, ecliptic; animated morph between equatorial and horizon frames; guided "Explore" prompts.
- **Explorer** (`src/explorer/`) — latitude + longitude, dual views, star patterns, richer trail modes, animation duration limits.

Unlike sibling NAAP ports (`BasicCoordinatesAndSeasons`, `MotionsOfTheSun`), RotatingSky owns the canonical `SkyModel` / star-placement pattern those sims partially reuse.

## Key files

| Area | Location |
|---|---|
| Screens | `src/horizon-system/HorizonSystemScreen.ts`, `src/celestial-sphere/CelestialSphereScreen.ts`, `src/explorer/ExplorerScreen.ts` |
| Shared astronomy | `src/common/model/SkyModel.ts`, `Star.ts`, `StarPatterns.ts`, `ViewDirection.ts`, `SkyCoordinates.ts`, `SkyProjection.ts`, `skyMorph.ts` |
| Shared views | `src/common/view/HorizonDomeNode.ts`, `CelestialSphereNode.ts`, `SkyStarsNode.ts`, `SkyTrailsNode.ts`, `DeclinationRegionsNode.ts`, `skyGraphics.ts`, `attachSkyCameraInteraction.ts` |
| Per-screen models | `horizon-system/model/HorizonSystemModel.ts`, `celestial-sphere/model/CelestialSphereModel.ts`, `explorer/model/ExplorerModel.ts` |
| Animation | `src/common/TimeModel.ts` (composed into each `SkyModel`) |
| Colors / constants | `src/RotatingSkyColors.ts`, `src/RotatingSkyConstants.ts` |
| Strings | `src/i18n/StringManager.ts` |
| Preferences / query params | `src/preferences/` (`?latitude`, `?longitude`, `?earthMapResolution=`) |
| Entry | `src/main.ts` |

## Model

Three **independent** screen models — each constructs its own `SkyModel` seeded from shared preference defaults. Changing latitude, time, or stars on one screen does **not** affect the others.

| Screen | Model | Notes |
|---|---|---|
| **Horizon System** | `HorizonSystemModel` | Composes `SkyModel`; `viewModeProperty` (diagram/sky/both), `viewDirectionProperty` (N/E/S/W cardinal view); star trails on/off (default **on**); longitude does not affect astronomy |
| **Celestial Sphere** | `CelestialSphereModel` | Composes `SkyModel`; `systemBlendProperty` morphs equatorial↔horizon frame; separate **guide star** (sliders) vs user stars; four guided prompts; forces labels visible on construct/reset |
| **Explorer** | `ExplorerModel` | Thin wrapper around `SkyModel`; **longitude shifts local sidereal time** `LST + (λ/360)×24 h`; star patterns, shift-click add, trail modes (none / 3 h / 24 h), animation duration auto-pause |

**Shared gotchas**

- Diurnal motion: hour angle **H = LST − RA** (wrapped to [−12, +12) h); at **NORMAL** speed the sky completes one rotation in **24 s** (1 sidereal h/s).
- Two frames in `SkyCoordinates.ts`: **equatorial** (+Z = NCP) and **horizon** (+Z = zenith, +X = N, +Y = E). Azimuth is from North through East.
- `DeclinationRegionsNode` uses frame-specific `toVector` — shades circumpolar / rise-set / never-rise caps on both dome and sphere.
- `attachSkyCameraInteraction`: Ctrl-drag advances LST; Shift-click add star only when `onAddStarAt` is provided (**Explorer only**).
- Default earth map resolution is **`high`** (Natural Earth).

## Accessibility

Follows the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).
Each screen registers `*ScreenSummaryContent` and `*KeyboardHelpContent`, with explicit `pdomOrder`. A11y strings live under `a11y.horizonSystem`, `a11y.celestialSphere`, and `a11y.explorer` in each locale JSON, via `StringManager.getHorizonSystemA11yStrings()` / `getCelestialSphereA11yStrings()` / `getExplorerA11yStrings()`. Keep `currentDetailsContent` live; every interactive node needs an `accessibleName`.

## Testing

Fleet-standard Vitest layout:

| Path | Purpose |
|---|---|
| `vitest.config.ts` | Test environment + `setupFiles`; `execArgv: ["--expose-gc"]` with memory-leak suite |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports |
| `tests/**/*.test.ts` | Model/physics unit tests |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |

| File | Covers |
|---|---|
| `SkyCoordinates.test.ts` | NCP altitude = φ, transits, round-trips, declination bands |
| `SkyModel.test.ts` | Stars, cap, time stepping, duration auto-pause, reset |
| `ViewDirection.test.ts` | Cardinal azimuth helpers |
| `skyGraphics.test.ts` | Projection graphics helpers |
| `TimeModel.test.ts` | Play/pause elapsed time |
| `memory-leak.test.ts` | Dispose regression |

- Put unit tests only under root `tests/` (never co-locate or use `__tests__/`).
- Run `npm test`. CI runs the suite when a `test` script is present.

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

## Development notes

- **`npm run decompile`** extracts NAAP Flash ActionScript via JPEXS FFDec into gitignored `NAAP/decompiled/` — read-only reference.
- To share state across screens instead, construct one `SkyModel` once and thread it through each per-screen model — see [doc/multi-screen.md](doc/multi-screen.md).
- After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
