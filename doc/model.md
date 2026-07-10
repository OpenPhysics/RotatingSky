# Model - Rotating Sky

This document describes the model (the underlying physics, math, and behavior) for the simulation, in
terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

This sim ports the NAAP *Rotating Sky* lab and has three screens that build the same celestial
geometry from different viewpoints.

- **Horizon System** places the observer under a local sky dome: altitude and azimuth, zenith/nadir,
  meridian, and (optionally) celestial equator and poles as they appear from that latitude.
- **Celestial Sphere** emphasizes the equatorial frame — right ascension, declination, hour circles,
  and the poles — and how that sphere is tilted relative to the horizon.
- **Explorer** combines map location (latitude/longitude), dual views, and richer animation controls
  so students can place stars, watch diurnal paths, and compare frames.

All three screens share the same astronomy rules, but each keeps an **independent** sky state. Default
observer latitude and longitude come from shared Preferences (and URL query parameters); changing
location or time on one screen does not alter the others. Local sidereal time advances while the
animation plays and drives the daily rotation of the sky.

## Quantities and units

| Quantity | Symbol | Units | Range / notes |
|---|---|---|---|
| Observer latitude | φ | degrees (+N / −S) | −90 – 90 |
| Observer longitude | λ | degrees (+E / −W) | −180 – 180 |
| Local sidereal time | LST | hours | 0 – 24 |
| Right ascension | RA | hours | 0 – 24 |
| Declination | Dec | degrees | −90 – 90 |
| Altitude | alt | degrees above horizon | −90 – 90 |
| Azimuth | az | degrees from North through East | 0 – 360 |
| Hour angle | H | hours | LST − RA (wrapped) |
| Animation rate | — | sidereal hours per real second (scaled) | speed presets / slider |

## Governing equations

### Hour angle and diurnal motion

At local sidereal time LST, a star at right ascension RA has hour angle

```
H = LST − RA
```

(wrapped into a convenient interval). As LST advances, *H* increases and the star appears to move
westward along a path of constant declination — the diurnal circle.

### Equatorial ↔ horizontal

For an observer at latitude φ, the standard spherical-astronomy transform relates (RA, Dec) to
(altitude, azimuth). In condensed form, altitude satisfies

```
sin(alt) = sin φ · sin Dec + cos φ · cos Dec · cos H
```

Azimuth is measured from **North** toward East (0° = N, 90° = E, 180° = S, 270° = W). The inverse
transform places a clicked sky direction back into RA/Dec at the current LST.

### Declination bands

At a given latitude, a declination is classified by the altitudes at upper culmination (*H* = 0) and
lower culmination (*H* = 12ʰ):

- **Circumpolar** — never sets (minimum altitude ≥ 0).
- **Rises and sets** — crosses the horizon.
- **Never rises** — maximum altitude ≤ 0.

These bands explain why Polaris stays up for mid-northern observers while southern stars may never
appear.

### Frames (conceptual)

- **Equatorial frame**: +Z toward the north celestial pole; equator in the XY-plane; RA = 0ʰ along +X.
- **Horizon frame**: +Z toward the zenith; +X north; +Y east.

Views project these unit-sphere directions for diagrams; the underlying model is the coordinate
transform above, not a physical Earth–sky simulation with refraction or precession.

## Simplifications and assumptions

- Instantaneous geometric astronomy only: **no atmospheric refraction**, extinction, or light-time.
- Earth’s axis orientation is fixed (no precession, nutation, or polar motion); “stars” are fixed
  RA/Dec points (or user-placed markers / constellation stick figures), not a full catalog epoch.
- Sidereal time is advanced by the animation clock; civil solar time and date are not modeled.
- Longitude mainly supports the Explorer map; the horizon transform depends on latitude and LST.
- Each screen’s sky is independent after seeding from preference defaults — intentional for lab use
  so students can compare setups without crosstalk.

## References

- NAAP *Rotating Sky* lab: Horizon Coordinate System, Celestial Sphere, and related student-guide
  materials under `NAAP/astroUNL/naap/`.
- Original Flash / NAAP rotating-sky simulators (horizon dome, celestial sphere, and explorer-style
  location tools).
- Standard spherical astronomy: hour angle, alt/az ↔ RA/Dec (any introductory textbook treatment).
