# Model - Rotating Sky

This document describes the model (the underlying physics, math, and behavior) for the simulation,
in terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

This sim ports the NAAP *Rotating Sky* lab and has three screens that build the same celestial
geometry from different viewpoints.

- **Horizon System** places the observer under a local sky dome: altitude and azimuth, zenith/nadir,
  meridian, and (optionally) celestial equator, poles, and declination-band shading. Optional first-person
  cardinal view and star trails.
- **Celestial Sphere** emphasizes the equatorial frame — right ascension, declination, hour circles,
  ecliptic, and the poles — with an animated morph between equatorial and horizon frames. A **guide
  star** (separate from user-placed stars) demonstrates coordinate lines; four guided "Explore" prompts
  walk through frame switching.
- **Explorer** combines map location (latitude and longitude), dual views (celestial sphere + horizon
  dome), star **patterns** (Big Dipper, Orion, etc.), richer trail modes, and animation duration limits.

All three screens share the same astronomy rules in `SkyCoordinates.ts`, but each keeps an **independent**
`SkyModel` — changing latitude, time, or stars on one screen does not affect the others. Default
observer latitude and longitude come from shared Preferences (and URL query parameters); Reset All
restores each screen to those defaults.

## Per-screen capability matrix

| Feature | Horizon System | Celestial Sphere | Explorer |
|---|---|---|---|
| Longitude affects sky | No (reference LST only) | No | **Yes** (local sidereal time) |
| User-placed stars | Add random; drag on dome | Guide star only (sliders) | Random, shift-click, 7 patterns |
| Star trails | On/off (default **on**) | None | None / 3 h / 24 h |
| Animation speed | SLOW / NORMAL / FAST | Same | Same + continuous rate slider |
| Animation duration limit | No | No | 1, 3, 6, 12, 24 sidereal h or continuous |
| Declination regions | Optional shading | No | Both equatorial and horizon frames |
| Ecliptic overlay | Optional | Shown on sphere | Optional on both views |

On **Explorer**, longitude shifts **local sidereal time** = LST + (λ/360)×24 h, rotating the observer's
sky relative to the fixed celestial sphere — not just the flat Earth map.

## Quantities and units

| Quantity | Symbol | Units | Range / notes |
|---|---|---|---|
| Observer latitude | φ | degrees (+N / −S) | −90 – 90 (default 40° Boulder) |
| Observer longitude | λ | degrees (+E / −W) | −180 – 180 (default −105°; Explorer astronomy) |
| Local sidereal time | LST | hours | 0 – 24; advances while playing |
| Right ascension | RA | hours | 0 – 24 |
| Declination | Dec | degrees | −90 – 90 |
| Altitude | alt | degrees above horizon | −90 – 90 |
| Azimuth | az | degrees from North through East | 0 – 360 |
| Hour angle | H | hours | LST − RA, wrapped to **[−12, +12)** |
| Animation rate | — | sidereal h / real s | NORMAL: **1 h/s** → full sky rotation in **24 s**; SLOW ×0.25, FAST ×4; Explorer slider 0.2–5× |

## Governing equations

### Hour angle and diurnal motion

At local sidereal time LST, a star at right ascension RA has hour angle:

```
H = LST − RA
```

(wrapped to [−12, +12) hours). As LST advances, *H* increases and the star appears to move westward
along a path of constant declination — the diurnal circle.

### Equatorial ↔ horizontal

For an observer at latitude φ, the standard spherical-astronomy transform relates (RA, Dec) to
(altitude, azimuth). Altitude satisfies:

```
sin(alt) = sin φ · sin Dec + cos φ · cos Dec · cos H
```

Azimuth is measured from **North** toward East (0° = N, 90° = E, 180° = S, 270° = W), computed with
`atan2(east, north)` on horizon-frame components. The inverse transform places a clicked sky direction
back into RA/Dec at the current LST (Explorer shift-click / dome drag).

### Declination bands

At a given latitude, a declination is classified by the altitudes at upper culmination (*H* = 0) and
lower culmination (*H* = 12 h):

- **Circumpolar** — never sets (minimum altitude ≥ 0).
- **Rises and sets** — crosses the horizon.
- **Never rises** — maximum altitude ≤ 0.

These bands explain why Polaris stays up for mid-northern observers while southern stars may never appear.

### Frames (conceptual)

- **Equatorial frame**: +Z toward the north celestial pole; equator in the XY-plane; RA = 0 h along +X.
- **Horizon frame**: +Z toward the zenith; +X north; +Y east.
- **Ecliptic**: fixed great circle on celestial-sphere views (obliquity ≈ 23.44°); not dynamically driven
  by date.

Views project unit-sphere directions for diagrams; the underlying model is coordinate transform, not a
physical Earth–atmosphere simulation.

### Celestial Sphere morph

Animated blend rotates the reference frame from equatorial (NCP up) to horizon (zenith up). Zenith sits
at RA = LST, Dec = φ at full horizon blend.

## Simplifications and assumptions

- Instantaneous geometric astronomy only: **no atmospheric refraction**, extinction, or light-time.
- Earth's axis orientation is fixed (no precession, nutation, or polar motion).
- "Stars" are fixed RA/Dec points, user-placed markers, or pattern stick figures (`StarPatterns.ts` —
  not a full epoch catalog).
- Sidereal time is advanced by the animation clock; **civil solar time and calendar date are not modeled**.
- Horizon System and Celestial Sphere use **reference LST** directly — longitude does not change alt/az
  on those screens.
- Each screen's sky is independent after seeding from preference defaults.

## References

- NAAP *Rotating Sky* lab: Horizon Coordinate System, Celestial Sphere, and related student-guide
  materials under `NAAP/astroUNL/naap/`.
- Original Flash simulators (horizon dome, celestial sphere, explorer-style location tools).
- Standard spherical astronomy: hour angle, alt/az ↔ RA/Dec (any introductory textbook treatment).
