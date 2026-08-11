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

`npm run release` intentionally skips `npm test` in some sims — append `&& npm test` before the version bump so a release cannot ship a failing suite.

## Development notes

- **`npm run decompile`** extracts NAAP Flash ActionScript via JPEXS FFDec from `../Baseline/Astronomy/flash-animations` into gitignored `NAAP/decompiled/`.
- To share state across screens instead, construct one `SkyModel` once and thread it through each per-screen model — see [doc/multi-screen.md](doc/multi-screen.md).
- After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).

## Compliance carve-outs

### `package.json` overrides

JSON cannot carry comments, so the rationale for forced transitive pins lives here. Prefer
**tilde (`~`) or exact** versions — caret (`^`) lets minors drift under what is meant to be a
hard pin. Dependabot ignores these three names (see `.github/dependabot.yml`) so it does not
open PRs that fight the overrides. Revisit when SceneryStack drops or re-pins them upstream.

| Override | Pin | Why |
|---|---|---|
| `lodash` | `~4.18.1` | SceneryStack declares `~4.17.12`. Bump clears Dependabot/npm advisories patched in 4.18.x (e.g. GHSA-r5fr-rjxr-66jc, GHSA-f23m-r3pf-42rh). |
| `three` | `~0.125.2` | SceneryStack declares `^0.104.0`. Floor is 0.125.0 for GHSA-fq6p-x6j3-cmmq (ReDoS). Staying on the 0.125 line avoids a larger API jump; **0.125.x still has open CVEs** (e.g. XSS GHSA-7vvq-7r29-5vg3, fixed only in ≥0.137.0). Remove this override if/when SceneryStack stops depending on `three` or pins a patched line itself. LightPropagation keeps a higher `three` pin — do not force 0.125 there. |
| `brace-expansion` | `~5.0.9` | Transitive via `vite-plugin-pwa` / Workbox. Clears npm audit (originally GHSA-mh99-v99m-4gvg; keep ≥5.0.9 for GHSA-rgw5-rvv9-x895). |
