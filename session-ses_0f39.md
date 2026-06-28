# New session - 2026-06-28T04:01:59.129Z

**Session ID:** ses_0f39bd4a6ffeOTznR8iWMERAt1
**Created:** 6/28/2026, 12:01:59 AM
**Updated:** 6/28/2026, 12:30:00 AM

---

## User

IN the NAAP directory, there is a directory called astro-simulations, that contains some react/javascript simulations, in it you will sun-motion-simulator which is somewhat analogous to the horizon system, can you compare and try to draw Lessons from that simulation, and improvmenet that you can bring, I think it uses pixi, so it may not all be relevant but do your best

---

## Assistant (Plan · GLM-5.1 · 271.9s)

_Thinking:_

The user wants me to compare the NAAP `astro-simulations/sun-motion-simulator` with the Horizon System screen in this Rotating Sky project, and draw lessons/improvements. I'm in plan mode, so I should only read and analyze.

Let me start by exploring both codebases to understand what's there.

Let me launch explore agents to investigate both the NAAP sun-motion-simulator and the horizon-system screen.

I'll investigate both the NAAP sun-motion-simulator and your Horizon System screen to draw meaningful comparisons. Let me explore both in parallel.

**Tool: task**

**Input:**
```json
{
  "description": "Explore NAAP sun-motion-simulator",
  "prompt": "I need a thorough analysis of a React/JavaScript simulation located in the NAAP directory of this repo. The repo root is /home/veillette/OpenPhysics/RotatingSky.\n\nFirst, find the directory. It should be somewhere under `NAAP/astro-simulations/sun-motion-simulator` (or similar path — search for it). Use Glob and Grep to locate it.\n\nOnce found, do a \"very thorough\" exploration. I need to understand:\n\n1. **Architecture & tech stack**: What framework/libraries does it use (React, PixiJS, etc.)? Read package.json and the main entry files. How is the app structured (components, state management, stores)?\n\n2. **The sky/horizon visualization**: Find the main rendering code for the sky dome / horizon view. How does it draw the sun's path, the horizon, cardinal directions, the sky background (day/night gradient), stars? What projection does it use? How does it animate the sun's motion over time?\n\n3. **Interaction model**: What user controls exist (sliders for latitude, date, time, play/pause, etc.)? How are they wired to the visualization? What gets recomputed on each change?\n\n4. **Astronomy/physics model**: Find the math that computes sun position (declination, hour angle, altitude/azimuth), analemma, equation of time, sunrise/sunset, seasons. List the key formulas and where they live.\n\n5. **Features**: Note any notable features — multiple views (e.g. horizon view + sky map + analemma), date picker, path tracing, terms/glossary, accessibility, responsive design, animations/transitions, sun's declination range markings, etc.\n\n6. **UX/educational touches**: Anything pedagogically interesting — labels, tooltips, explanations, the way it teaches concepts like seasons, solstices, equinoxes, the sun's daily arc.\n\n7. **Limitations / weaknesses**: Things that are clunky, hardcoded, or missing.\n\nFor each finding, report concrete file paths (with line numbers where relevant) and short code excerpts. Be concrete and detailed — this is for a cross-comparison with another codebase. Return a comprehensive written report organized by the sections above. Do NOT edit anything — read only.",
  "subagent_type": "explore"
}
```

**Output:**
```
<task id="ses_0f39b6210ffet8bGqWf18Yql1K" state="completed">
<task_result>
I now have a thorough understanding. Here is my comprehensive analysis.

---

# Sun Motion Simulator — Codebase Analysis

**Location:** `/home/veillette/OpenPhysics/RotatingSky/NAAP/astro-simulations/sun-motion-simulator/`
**Origin:** A JavaScript/HTML port (by Nik Nyby, Columbia University `ccnmtl`, GPL-3.0+) of the NAAP/UNL "Motions of the Sun" Flash original. Part of the `astro-simulations` monorepo. Version 0.8.0, build date 2024-07-09.

The whole sim is ~2,600 lines of source across 9 source files. It's small enough that I read every source file.

---

## 1. Architecture & Tech Stack

**Stack** (`package.json` lines 27-35):
- **React 19.2** (`react`, `react-dom`) — using **class components exclusively**, no hooks, no functional components.
- **Three.js ~0.155.0** — the main 3D horizon-dome visualization, plus addons: `OrbitControls`, postprocessing (`EffectComposer`, `RenderPass`, `ShaderPass`), `FXAAShader`, `FontLoader`, `TextGeometry`. `THREE` is globally injected via webpack `ProvidePlugin` (`webpack.config.js` lines 20-24).
- **PixiJS ~6.5.1** — used for the three 2D input widgets (analog clock, date slider, latitude-on-earth-map). Each widget is its own `PIXI.Application`.
- **`solar-calculator` ^0.3.0** — third-party ephemeris for *some* of the sun math (see §4 inconsistency).
- **`react-range-step-input`** — the animation-speed slider.
- **Bootstrap 4.3 + jQuery + Popper** (loaded from CDN in `index.html` lines 8, 148-152) for the navbar and Help/About modals.
- **Webpack 5 + Babel** (`webpack.config.js`); **Jest** for unit tests (`Makefile` line 14).

**Structure** — there is **no state-management library, no router, no store**. Everything lives as `state` in a single top-level class component, `SunMotionSim`, in `src/main.jsx`. State is passed down as props; child → parent communication is via callback props (`onDateTimeUpdate`, `onLatitudeUpdate`, etc.).

Component tree (`src/main.jsx` `render()`, lines 110-237):
```
SunMotionSim (main.jsx)  -- owns ALL state
 ├─ <CelestialSphere>      (three.js 3D dome)        -- ref + imperative API
 ├─ <DatePicker>           (pixi.js month slider)
 ├─ <Clock>                (pixi.js 24h analog clock)
 ├─ <LatitudePicker>       (pixi.js earth-map slider)
 ├─ <AnimationControls>    (play/pause, speed, mode)
 └─ <GeneralSettings>      (show/hide checkboxes)
```

**Two different React/three integration patterns coexist:**
- `CelestialSphere.jsx` builds the entire three.js scene imperatively in `componentDidMount` (lines 70-252) and then mutates it in `componentDidUpdate` (lines 257-418). It holds a `React.createRef()` exposed to the parent so Reset can call `onResetClicked()` (line 1086). It is essentially a non-reactive three.js app stuffed inside a React wrapper.
- The PixiJS widgets (`Clock`, `DatePicker`, `LatitudePicker`) follow the same pattern: build a PIXI app once in `componentDidMount`, sync from props in `componentDidUpdate`.

**Entry point:** `src/main.jsx` lines 409-411 — `createRoot(document.querySelector('#sim-container')).render(<SunMotionSim />)`. The `index.html` shell hardcodes a 1140-px-wide Bootstrap container (line 11) and the modal markup.

---

## 2. The Sky / Horizon Visualization

All rendering is in **`src/CelestialSphere.jsx`** (1103 lines). Despite the name, this is the **horizon diagram** — a literal 3D hemisphere ("dome") centered on a stickfigure observer, viewed with orbit controls. There is **no separate 2D sky-map projection** (unlike the RotatingSky TS port's stereographic `SkyProjection`); the "projection" here is just three.js orthographic 3D.

### Camera & scene setup (`componentDidMount`, lines 75-159)
- **Orthographic camera**, frustum size 120, positioned at `(-60, 60, 80)` (line 83-88).
- **`OrbitControls`** constrained: `enablePan=false`, `enableZoom=false`, `maxPolarAngle=85°` (lines 90-100) — the user can drag-rotate the view but can't flip past the horizon or zoom.
- **Postprocessing chain** (`EffectComposer`, lines 143-157): `RenderPass` → `FXAAShader` (antialiasing) → a custom `MutedColorsShader` (see below). The composer is rendered at 4× device-pixel-ratio (line 150).
- Lights: an `AmbientLight` + a `DirectionalLight` representing the sun, with `castShadow=true` (lines 124-140). The light's target is the stickfigure so it casts a shadow.
- Sphere radius constant `this.sphereRadius = 50` (line 42).

### The dome & horizon plane (`drawGlobe`, lines 433-588; `drawPlane`, lines 419-432)
- **Day dome**: a `SphereGeometry` hemisphere (phi 0→π/2) with translucent blue `MeshBasicMaterial` `0xb0c0ff`, `side: BackSide` (lines 482-490). Its color is **recomputed every frame** by `getSkyColor()`.
- **Night dome**: a dark grey (`0x303030`) hemisphere behind the day dome (lines 436-444).
- **Solid black "hide-underside" dome**: a slightly larger opaque black hemisphere + disc that masks everything below the horizon when the "Show underside" toggle is off (lines 447-480). This is a visual hack rather than clipping.
- **Horizon plane**: a `CircleGeometry` textured with `img/plane.svg` (a compass rose with **N/E/S/W** labels — see `plane.svg` lines 95/106/116/127 `aria-label`). At the poles it swaps to `plane_all_n.svg` / `plane_all_s.svg` (all four labels become N or S) — `componentDidUpdate` lines 276-285.

### Sky background / day-night gradient (`getSkyColor`, lines 827-839)
```js
const angle = target.y;                          // sun's world Y
if (angle < 0 || angle > 180) return new THREE.Color(0x353535);   // sun below horizon
const c = new THREE.Color(0xb0c0ff);
c.lerp(new THREE.Color(0x353535), 1 - Math.min(angle / 50));      // fade blue→dark by altitude
```
So the dome color is a function of the sun's altitude: dark grey when below the horizon, lerping toward blue as it rises (saturating at 50 units above). **There are no stars** anywhere in the codebase.

### Sun (`drawSun`, lines 659-692)
- A `CircleGeometry` disk (`0xffdd90` yellow) plus a hidden black `TorusGeometry` border that becomes visible on hover (lines 666-672, 336-344).
- Position is set from declination + hour angle. The sun's **Y = declination-in-degrees** (abusing `radToDeg` for the radius-50 sphere), and its horizontal radius from `getSunDeclinationRadius`.

### Sun's daily path = the declination circle (`drawGlobe`, lines 517-524; updated lines 307-332)
- A yellow `TorusGeometry` (`0xffff50`) at the sun's current declination, whose radius is `sphereRadius * cos(dec)^1.25` (lines 845-847). The **`^1.25` exponent is an unexplained visual fudge** — not geometrically a true small circle on a sphere (which would be `cos(dec)^1`).
- Toggled by `showDeclinationCircle`.

### Other reference circles (`drawGlobe`, lines 492-588)
- **Celestial equator**: blue torus (`0x6070ff`), radius `sphereRadius − 0.5`.
- **Ecliptic**: white torus, `rotation.x = degToRad(90+24)`, `rotation.y = degToRad(-12)` (lines 585-587). **24° is a hardcoded approximation of the 23.44° obliquity.**
- **Prime hour circle** (0h RA reference): a half-torus plus top/bottom cylinder caps (lines 536-579).
- **Observer's meridian** and **zenith equator** — thin white torus rings (lines 502-510).

### Month labels on the ecliptic (`drawPrimeHourMonthsText`, lines 597-639)
- 12 3D text meshes ("Jan"…​"Dec") built asynchronously via `FontLoader` from `fonts/helvetiker_bold.typeface.json`, arranged around a circle of radius 53, then rotated to align March 21 with the prime hour line (`rotation.z = degToRad(47)`, line 571 — another magic number). Toggled by `showMonthLabels`.

### Analemma (`drawAnalemma`, lines 702-735; `initAnalemmaArray`, lines 740-761)
- A red `TubeGeometry` (`0xe80000`) along a custom `THREE.Curve` sampled at **n=200 points** across the year.
- Each sample: `pos = getPosition(day)` (RA/dec), `eot = -getEqnOfTime(day)`, then `x = cos(dec)·cos(eot)`, `y = cos(dec)·sin(eot)`, `z = sin(dec)`.
- The curve has a confessedly mysterious bug (lines 716-724): the curve is **invisible unless `t` appears in the coordinates**, worked around by adding `t / 99999999` to x. Also scaled by hardcoded factors `1.15` (z) and `1.2` (y) and `49` (line 727) — unexplained fudges to make it fit the sphere.
- Toggled by `showAnalemma`.

### Stickfigure observer (`drawStickfigure`, lines 640-658)
- A thin box textured with `img/stickfigure.svg`, `castShadow=true`, positioned at the sphere center (y=5). Its shadow from the sun-directional-light falls on the horizon plane — a pedagogically nice ground reference for sun azimuth/altitude.

### Animation (`animate`, main.jsx lines 278-325)
- A single `requestAnimationFrame` loop in the parent advances `dateTime`:
  - **Continuous mode**: `elapsed_ms × 3 × 3600 × animationRate` → at rate 1, **3 hours per real second** (line 293).
  - **Step-by-day mode**: accumulates ms until a full day elapses, then jumps exactly one day (lines 295-311) — used to trace e.g. the noon-sun path over the year.
  - **Loop-day mode**: pins the calendar day while letting time-of-day advance (lines 315-320).
- The child's own RAF loop (`CelestialSphere.animate`, lines 794-807) just re-renders the composer and refreshes the sky color; the actual scene-graph updates happen in `componentDidUpdate`:
  - `orbitGroup` / `sunOrbitGroup` are rotated by `latitude − π/2` on X and `hourAngleToRadians(hourAngle)` on Y (lines 258-295).
  - `eclipticOrbitGroup.rotation.y = degToRad((dayOfYear/365.24)·−360 + 141) + sunRotation` (line 304) — the **`141` is an unexplained magic offset** for aligning the ecliptic with the date.

### Custom shader (`src/shaders/MutedColorsShader.js`)
- A fragment pass that desaturates only the **green** channel: `color.g = dot(c, vec3(0.349·amount, 1−0.314·amount, 0.168·amount))`. It's based on three.js's `SepiaShader`. The net effect is a mild, slightly odd color muting — described as making colors "more muted," but the choice to touch only green is curious.

---

## 3. Interaction Model

All controls are driven from `SunMotionSim.state` (`main.jsx` lines 23-54) and dispatched via handlers (`main.jsx` lines 326-406). The state shape:

| State field | Default | Set by |
|---|---|---|
| `dateTime` | May 27, 2019 12:00 UTC | clock, date picker, sun drag, animation |
| `latitude` | 40.8 | latitude picker |
| `hourAngle`, `siderealTime`, `sunDeclination` | derived | `onDateUpdate` (line 242) |
| `sunAzimuth` | 182° | `componentDidUpdate` (lines 261-276) |
| `isPlaying`, `animationRate`, `loopDay`, `stepByDay` | false / 1 / false / false | AnimationControls |
| `showDeclinationCircle/Ecliptic/MonthLabels/Underside/Stickfigure` | mostly true | GeneralSettings checkboxes |
| `showAnalemma` | false | Advanced checkbox |

**Recomputation cascade** (`componentDidUpdate`, main.jsx lines 256-277):
- On `dateTime` change → recompute `siderealTime`, `hourAngle`, `sunDeclination` via `onDateUpdate` (which calls `getDayOfYear`, `getSiderealTime`, `getHourAngle`, `getPosition`, `solar.century`, `solar.declination`).
- On `hourAngle` or `latitude` change → recompute `sunAzimuth` from `getSolarZenith` + `getSolarAzimuth`.

### The controls

**`DatePicker.jsx`** (PixiJS, 248 lines) — a horizontal strip (500×30 px, scaled 2× internally) with the 12 months laid out left-to-right. A draggable black line+arrowhead marks the date. `dateToLocalPos` (line 175) maps day-of-year → x via `dayOfYear/365.25 × width`; `localPosToDate` (line 189) is the inverse and **wraps** (negative x → previous year). Clicking left/right of the marker bumps the date ±1 day (lines 216-226). Also a numeric day input + month `<select>` (lines 27-51).

**`Clock.jsx`** (PixiJS, 322 lines) — a **24-hour analog clock** (the `img/clock.svg` face has hour numerals 0,2,4,…,22 around the dial). Two draggable hands:
- The **hour hand** makes a full revolution per 24 hours (line 81: `((hours + minutes/60)/24)·2π`).
- The **minute hand** revolves per hour (line 77).
- Dragging either hand uses a clever **clockwise/counter-clockwise detection via the 2D cross product** (`isCounterClockwise`, line 210) so that dragging the minute hand in complete circles can roll the hour up/down (lines 247-263), and dragging the hour hand can roll the day (lines 299-309). This logic is explicitly flagged by the author as something that "took a while to figure out" (line 252).
- Backed by an accessible `<input type="time">` (lines 39-43).

**`LatitudePicker.jsx`** (PixiJS, 239 lines) — a world map (`img/earthmap.svg`) with a draggable horizontal latitude line. `latitudeToLocalPos`/`localPosToLatitude` (lines 227-233) linearly map ±90° to canvas Y (clamped). Clicking above/below the line nudges ±1° (lines 184-194). Numeric input + an **N/S hemisphere toggle** that flips the sign (lines 214-220).

**`AnimationControls.jsx`** (98 lines) — Start/Stop button; radio (Continuous vs Step-by-day); "Loop day" checkbox (disabled when stepping by day); a `RangeStepInput` whose min/max/step **change with mode**: continuous = 0.01–10 (→ 0.03–30 hrs/sec), step-by-day = 5–122 days/sec (lines 69-75). Switching modes resets the rate (lines 79-87).

**`GeneralSettings.jsx`** (71 lines) — five plain checkboxes wired through the generic `handleInputChange` (main.jsx lines 326-341), which uses `event.target.name` as the state key.

**Dragging the sun on the dome** (`CelestialSphere.onMouseMove`, lines 948-1050) — the most intricate interaction:
- Raycast from mouse to an invisible math `THREE.Plane` (`orbitPlane`) that's aligned with the current declination circle (`updateOrbitPlanePosition`, lines 908-924).
- Then a **brute-force nearest-vertex search** over every triangle of the declination torus geometry (lines 988-1019, O(triangles) per mousemove), applying the orbit group's quaternion to each vertex.
- The closest point is converted to an angle via `atan2(z, x)` → `getTime(angle)` (line 812) → updates `dateTime`. This drives the time-of-day.

---

## 4. Astronomy / Physics Model

The math lives in **`src/utils.js`** (249 lines) plus the third-party **`solar-calculator`** package. There are **two parallel ephemerides in use simultaneously** — a notable architectural smell.

### `utils.js` formulas

**Solar zenith/altitude** (`getSolarZenith`, lines 24-39) — standard spherical-astronomy formula:
```
sin(alt) = sinφ·sinδ + cosφ·cosδ·cosH
```
`acos` → zenith, `asin` → altitude (when `altitude=true`). Wikipedia-cited.

**Solar azimuth** (`getSolarAzimuth`, lines 49-70) — `acos` form:
```
cosφ_azimuth = (sinδ·cosφ − cosH·cosδ·sinφ) / sin(zenith)
```
with a morning/afternoon branch: if `H<0` or `H>π` return `az`, else `2π − az`. Clamp with `min/max(±1)`.

**Sidereal time** (`getSiderealTime`, lines 107-112) — **a purely linear empirical fit**, not the real GMST formula:
```js
24 * (((0.280464852 + 1.0027397260274 * day) % 1 + 1) % 1)
```
Comment: "From the original source code" (i.e., transcribed from the ActionScript Flash original). **No longitude term** — sidereal time depends only on day-of-year.

**Hour angle** (`getHourAngle`, lines 117-131) — `(sidereal − RA) mod 24`, wrapped to `[-12, 12]`.

**Day of year** (`getDayOfYear`, lines 139-154) — integer day **plus fractional time-of-day** (so `day` is a continuous float, e.g., 100.5 = noon on day 100).

**Sun position (RA/Dec)** (`getPosition`, lines 216-236) — from Chris Siedell's gist (linked in the comment). RA is a linear-in-day term plus a Fourier series in `cos/sin(k·0.017214206·day)` for k=1..4 (where `0.017214206 ≈ 2π/365.24`):
```js
ra = 0.01721421*day − 1.3793756 − 0.001830724*cos(...) + 0.032070267*sin(...) + ...
dec = (180/π) * atan2(sin(ra), 2.30644456403329)   // constant ≈ cot(23.44°)
```
RA returned mod 24 (decimal hours), declination in degrees.

**Equation of time** (`getEqnOfTime`, lines 200-213) — also from Siedell's gist, a similar Fourier series in `cos/sin(k·0.017214206·day)` for k=1..4, returned in **radians**.

### `solar-calculator` usage (main.jsx lines 89-90, 247-248)

A *different* ephemeris is used for the actual scene state:
```js
const centuryDate = solar.century(this.state.dateTime);          // Julian centuries
const eot = formatMinutes(solar.equationOfTime(centuryDate));    // displayed only
const sunDeclination = degToRad(solar.declination(centuryDate)); // drives the sun + declination circle
```

### The inconsistency
- **`sunDeclination` (which positions the sun and the declination circle) comes from `solar-calculator`.**
- **The analemma comes from `getPosition` + `getEqnOfTime` (Siedell).**
- **The displayed Equation of Time comes from `solar-calculator`**, but the analemma's horizontal extent is built from the Siedell EOT.

So the analemma and the plotted sun use **different ephemerides** — they will not agree to full precision, and there's no comment acknowledging this.

### Hour-angle convention clash
There are **two different** `hourAngleToRadians` functions:
- `utils.js` line 76: `(hours/24)·2π` (plain).
- `CelestialSphere.jsx` lines 19-23: `−(hours/24)·2π − π` (negated and offset by π), for the 3D rotation.

### What's missing
- **No longitude**: the observer's location has no longitude; time is always UTC and sidereal time ignores longitude. This is a major physical simplification.
- **No explicit sunrise/sunset** computation, **no season names**, **no solstice/equinox markers** (the solstices are only implicit at the peaks of declination).
- The ecliptic obliquity is **hardcoded to 24°** rather than 23.44°.

### Tests (`src/utils.test.js`, 135 lines)
Jest covers only the pure functions in `utils.js`: `getHourAngle`, `getDayOfYear`, `formatMinutes`, `formatHours`, `roundToOnePlace`, `getSolarAzimuth`, `getSolarZenith`. No component or rendering tests. Test fixtures pin values like `getSolarZenith(...) = 19.4887°` at the default state.

---

## 5. Features

- **Single combined horizon-dome view** (no separate sky-map panel, no separate analemma chart — the analemma is overlaid on the dome).
- **24-hour analog clock** with draggable hands (full day-resolution).
- **Horizontal date slider** across the 12 months, with wrap-around.
- **Latitude picker on a world map** with hemisphere toggle.
- **Directly draggable sun** on the dome (drives time-of-day).
- **Two animation modes**: continuous fast-forward, and step-by-day (keep time fixed, advance date — to trace e.g. the noon-sun path). Plus **loop-day** mode.
- **Toggleable overlays**: declination circle, ecliptic, month labels, underside of sphere, stickfigure + shadow, analemma.
- **Live readouts** in the Information panel (main.jsx lines 142-186): sun altitude, azimuth, RA, declination, hour angle, sidereal time, equation of time.
- **Stickfigure shadow** from the sun — a tangible ground reference.
- **Adaptive sky color** (day/night fade by sun altitude).
- **Hover tooltips** on the dome's reference circles.
- **WebGL availability check** (`src/utils/WebGL.js`, used at `CelestialSphere.jsx` line 71).
- **Reset** (navbar) restores initial state and the OrbitControls camera (`main.jsx` lines 355-364).
- **Help and About modals** (`index.html` lines 64-147).
- **Muted-colors postprocessing** shader (a mild accessibility/visual-comfort touch).

---

## 6. UX / Educational Touches

- **The Help modal** (`index.html` lines 78-115) is genuinely pedagogical prose: it explains the horizon-diagram concept ("a representation of the sky as if it were a large sphere centered on an observer"), the role of each panel, and crucially explains the **two animation modes** with a concrete example: *"Stepping by day keeps the time of day fixed as the day of year changes. For example, one can use this mode to see the path the noon time sun traces over the year."*
- **Hover tooltips** with parenthetical explanations (`CelestialSphere.jsx` lines 860-877):
  - "The ecliptic (Sun's annual path)"
  - "Sun's declination (Its daily path)"
  - "Celestial equator"
  - "Prime hour circle (0h right ascension)"
  
  The tooltip follows the mouse (lines 880-885, 893-899).
- **Month labels** on the ecliptic tie the calendar to the sun's annual path — teaching the seasonal relationship.
- **Stickfigure + shadow** gives an intuitive, embodied sense of sun direction that pure circles don't.
- **Sky color fade** makes "sun below horizon = night" immediately legible without reading numbers.
- **Step-by-day mode** is explicitly an instructional feature for visualizing seasonal change independent of daily motion — a thoughtful separation of timescales.
- **The analemma** teaches the equation of time + declination variation as a single curve.
- **Information panel sentence** (main.jsx line 144) restates the observer context in plain language: *"The horizon diagram is shown for an observer at latitude X° N on {date} at {time}."*
- The 24-hour clock face is unusual but appropriate for astronomy (sidereally honest).

---

## 7. Limitations / Weaknesses

**Layout & responsiveness**
- **Hardcoded pixel layout** in `index.html` lines 10-56: `1140px` container, `1110px` sim width, `430×430` sphere, `200×200` clock, `500×30` date picker, `271×140` earth map. **Not responsive**, not mobile-friendly. `user-select: none` globally on `#sim-container`.

**Architecture**
- Class components with React 19 but **legacy patterns**; heavy imperative three.js mutation inside `componentDidUpdate` (no reactive scene graph). Brittle.
- **Two parallel ephemerides** (`solar-calculator` vs Siedell `getPosition`/`getEqnOfTime`) with no acknowledgment — the analemma and the plotted sun disagree at the margins.
- The author leaves several **TODO/confession comments**: the analemma invisible-unless-`t`-in-coords hack (lines 716-721), "probably don't need to reset the surface normal here twice" (line 918), "do this in a better way" for the sun hover border (line 337).
- Sun-drag uses an **O(triangles)-per-mousemove nearest-vertex scan** (lines 988-1019) instead of analytic geometry — a performance smell on slow devices.

**Astronomy accuracy**
- **Ecliptic obliquity hardcoded to 24°** (`CelestialSphere.jsx` line 586) instead of 23.44°.
- **`cos(dec)^1.25`** fudge exponent for the declination-circle radius (line 846) — not a true small circle on a sphere.
- **Sidereal time is a linear fit with no longitude term** (`utils.js` lines 107-112) — physically incomplete.
- Numerous **unexplained magic numbers**: `141` (ecliptic Y offset, line 304), `47` (month-text Z rotation, line 571), `1.15`/`1.2`/`49` (analemma scale, lines 722/727), `50`-unit altitude saturation (line 837).
- **No longitude**, **no sunrise/sunset times**, **no solstice/equinox markers**, **no stars/planets/moon**.

**Visual hacks**
- The "hide underside" feature is an **opaque black dome + disc** sitting just outside the real dome (lines 447-480) rather than proper clipping.
- The `MutedColorsShader` desaturates **only the green channel**, which is an odd choice for "muted colors" (a proper desaturation would mix all three channels).

**Dependencies / deployment**
- **Bootstrap, jQuery, Popper loaded from CDN** with SRI hashes (`index.html` lines 8, 148-152) — **won't work offline**; **not a PWA**, no service worker, no manifest.
- **WebGL required** — `WebGL.js` only displays an error message, no canvas-2D fallback.
- `renderer.useLegacyLights = true` (line 121) is flagged as a temporary workaround for a three.js r155 lighting change.

**Accessibility**
- The 3D dome and all three PixiJS widgets are **canvas-based and not keyboard/screen-reader accessible**. The numeric `<input type="number/time">` and `<select>` behind them are the only keyboard paths, and they are not clearly labeled as alternatives.
- No ARIA on the sim canvas itself; `user-select:none`. Help/About modals do have proper ARIA roles (`role="dialog"`, `aria-labelledby`).
- No `alt` text on the canvas scenes.

**Testing**
- Only `utils.js` pure functions are tested. **Zero component/render/integration tests**; the three.js/PixiJS rendering is entirely unverified by automated tests.

**Hardcoded defaults**
- Initial date is **May 27, 2019** (chosen as "some random non-leap year, just to keep things simple" — `main.jsx` lines 24-29), latitude **40.8°** (roughly NYC/Columbia). No way to deep-link state via URL.

---

### Quick file map for cross-comparison

| File | Lines | Role |
|---|---|---|
| `src/main.jsx` | 411 | Top-level stateful component; owns all state; animation loop |
| `src/CelestialSphere.jsx` | 1103 | three.js horizon dome; sun, paths, analemma, stickfigure, dragging |
| `src/Clock.jsx` | 322 | PixiJS 24-hour analog clock; draggable hands |
| `src/DatePicker.jsx` | 248 | PixiJS horizontal month slider |
| `src/LatitudePicker.jsx` | 239 | PixiJS latitude-on-earth-map slider |
| `src/AnimationControls.jsx` | 98 | Play/pause, mode radios, speed slider |
| `src/GeneralSettings.jsx` | 71 | Show/hide checkboxes |
| `src/utils.js` | 249 | All astronomy math (zenith, azimuth, sidereal, RA/dec, EOT) |
| `src/utils.test.js` | 135 | Jest tests for utils |
| `src/shaders/MutedColorsShader.js` | 44 | Green-channel desaturation postprocess |
| `src/utils/WebGL.js` | 96 | WebGL feature detection (vendored from three.js examples) |
| `package.json` | 59 | React 19, three 0.155, pixi 6.5, solar-calculator |
| `index.html` | 157 | Shell, Bootstrap CDN, Help/About modals, fixed-pixel CSS |
| `webpack.config.js` | 40 | Build config; THREE ProvidePlugin |

The single most important takeaway for cross-comparison: this is a **single-view, 3D-rendered, three.js/PixiJS hybrid** with **two inconsistent ephemerides**, **no longitude**, **hardcoded layout**, and **class-component imperative rendering**, versus (presumably) the RotatingSky TS port's multi-screen, projection-based, fully reactive, accessibility-first, PWA approach.
</task_result>
</task>
```

**Tool: task**

**Input:**
```json
{
  "description": "Explore Horizon System screen",
  "prompt": "I need a thorough analysis of the \"Horizon System\" screen in this SceneryStack-based astronomy simulation at /home/veillette/OpenPhysics/RotatingSky.\n\nDo a \"very thorough\" exploration of everything related to the Horizon System screen. The code lives under `src/horizon-system/`. Also relevant: shared sky engine under `src/common/` and the supporting files described in CLAUDE.md.\n\nPlease investigate and report on:\n\n1. **Model** (`src/horizon-system/model/`): What state does HorizonSystemModel hold? How does it compose SkyModel? What properties are exposed (latitude, longitude, time, stars, toggles, etc.)?\n\n2. **View** (`src/horizon-system/view/`): What nodes are drawn? How is the horizon dome rendered? How are stars drawn? Cardinal directions? Meridian? How is the observer represented? What toggles exist (bands, trails, etc.)?\n\n3. **Controls / UI**: What controls does the user have (play/pause, latitude slider, star picker, time)? How is the control panel laid out?\n\n4. **Astronomy engine** (`src/common/`): Read SkyCoordinates.ts, SkyModel.ts, SkyProjection.ts, skyGraphics.ts, skyMorph.ts. Explain the coordinate frames (equatorial vs horizon), the projection (orthographic), and how alt/az is computed. How does time advance sidereal motion?\n\n5. **Accessibility**: What's the PDOM summary, pdomOrder, keyboard help, a11y strings for this screen?\n\n6. **What it does NOT have**: Specifically note whether the Horizon System screen models the SUN, the sun's daily path/analemma, date/seasons, sunrise/sunset, or only stars. Note whether it has a day/night sky background, declination bands tied to the sun, etc.\n\n7. **Animation**: How does TimeModel drive the sky rotation? What's the animation rate?\n\nFor each finding, report concrete file paths with line numbers and short code excerpts. Be concrete and detailed — this is for a cross-comparison with another simulation. Return a comprehensive written report. Do NOT edit anything — read only.",
  "subagent_type": "explore"
}
```

**Output:**
```
<task id="ses_0f39b61e0ffex5LSkCz0qa442Y" state="completed">
<task_result>
I now have a thorough understanding of the entire Horizon System screen and its supporting engine. Here is the comprehensive report.

---

# Horizon System Screen — Thorough Analysis

The Horizon System is the first of three screens in the Rotating Sky sim (registered first in `src/main.ts:43-50`). It shows an observer's **local sky** (the horizon dome) with stars projected onto it. It is essentially a thin view layer over the shared sky engine; nearly all astronomy state lives in `SkyModel`, and nearly all rendering lives in reusable `src/common/view/` nodes.

---

## 1. Model — `src/horizon-system/model/HorizonSystemModel.ts`

The screen model is a **deliberately thin composition wrapper**. The entire file is 26 lines:

```ts
// HorizonSystemModel.ts:11-26
export class HorizonSystemModel implements TModel {
  public readonly sky: SkyModel;

  public constructor(options: SkyModelOptions) {
    this.sky = new SkyModel(options);
  }
  public reset(): void { this.sky.reset(); }
  public step(dt: number): void { this.sky.step(dt); }
}
```

Key design point (documented in the header, `HorizonSystemModel.ts:3-7`): each screen **owns its own `SkyModel`**, so latitude/time/stars set on one screen do **not** carry to the others. The model factory in `HorizonSystemScreen.ts:30-34` constructs it seeded from the shared preference defaults (`preferences.defaultLatitudeProperty` / `defaultLongitudeProperty`).

### State actually held (in `SkyModel`, `src/common/model/SkyModel.ts`)

All of the screen's state is in `SkyModel`. The properties (`SkyModel.ts:86-176`):

| Property | Type | Default | Purpose |
|---|---|---|---|
| `timer` (`SkyModel.ts:88`) | `TimeModel` | paused | play/pause + elapsed seconds |
| `timeSpeedProperty` (`:91`) | `EnumerationProperty<TimeSpeed>` | `NORMAL` | SLOW/NORMAL/FAST radio |
| `animationRateProperty` (`:94`) | `NumberProperty` (0.2–5) | 1 | continuous rate slider (**Explorer-only**; not exposed here) |
| `animationDurationProperty` (`:97`) | `Property<AnimationDuration>` | `"continuous"` | auto-pause span (**not exposed here**) |
| `latitudeProperty` (`:100`) | `NumberProperty` (−90..90) | pref default (40°) | observer latitude |
| `longitudeProperty` (`:103`) | `NumberProperty` (−180..180) | pref default (−105°) | observer longitude (**unused by this screen's view** — no map) |
| `siderealTimeProperty` (`:106`) | `NumberProperty` [0,24) | 0 | local sidereal time in hours |
| `stars` (`:109`) | `ObservableArray<Star>` | empty | max `MAX_STARS` = 30 |
| `starPatternGroups` (`:112`) | `ObservableArray` | empty | preset asterisms (**not used here** — no pattern picker) |
| `selectedStarProperty` (`:115`) | `Property<Star\|null>` | null | star whose readout/arcs show |
| `starTrailsVisibleProperty` (`:118`) | `BooleanProperty` | true | trails on/off |
| `trailStartTimeProperty` (`:124`) | `NumberProperty` | 0 | when current trails began |

**Horizon-System-specific toggles** (`SkyModel.ts:126-138`):
- `zenithNadirLabelsVisibleProperty` → false
- `horizonMeridianVisibleProperty` → true
- `horizonCelestialReferencesVisibleProperty` → false (NCP/SCP dots, 0ʰ circle, equator, pole-axis stubs)
- `hideBelowHorizonProperty` → false

The model also defines toggles used only by the other screens (`labelsVisibleProperty`, `hourCircleVisibleProperty`, `celestialEquatorVisibleProperty`, `horizonUndersideVisibleProperty`, `circumpolarRegionVisibleProperty`, `riseSetRegionVisibleProperty`, `neverRiseRegionVisibleProperty`, etc., `SkyModel.ts:140-175`). The Horizon System view **does** wire three of those shared region toggles (`circumpolar/riseSet/neverRise`) to its `DeclinationRegionsNode`.

Star operations (`SkyModel.ts:197-269`): `addStar`, `addRandomStar` (uniform on the sphere via `asin` of uniform `z`, `:209-213`), `addPattern`, `removeStar`, `removeAllStars`, `resetStarTrails` (`:267-269`).

---

## 2. View — `src/horizon-system/view/HorizonSystemScreenView.ts`

The view (`HorizonSystemScreenView.ts`, 369 lines) builds a single `SkyProjection` and layers reusable common nodes on top of it.

### Projection setup (`HorizonSystemScreenView.ts:199-205`)
```ts
const { center, radius } = layoutHorizonSystemProjection(this.layoutBounds, panel.left);
this.projection = new SkyProjection({
  center, radius,
  elevation: -0.5,        // looks slightly down onto the dome
  azimuth: Math.PI / 2,
});
```
The play area is sized by `layoutHorizonSystemProjection` (`:67-85`): it fills the space left of the control panel, top-aligned, reserving `STAR_READOUT_HEIGHT + VIEW_READOUT_GAP` below for the readout.

### Rendered nodes (addChild order, `HorizonSystemScreenView.ts:287-302`)

| # | Node | File | What it draws |
|---|---|---|---|
| 1 | `Rectangle` background (`:99-102`) | inline | Static deep-navy fill (`backgroundColorProperty`). **Not** a day/night gradient. |
| 2 | `DeclinationRegionsNode` (`:209-218`) | `common/view/DeclinationRegionsNode.ts` | Three shaded declination bands, mapped into the **horizon frame** via a custom `toVector` closure (`:213-216`) that runs `equatorialToHorizontal(...)` then `altAzToVector3`. Caps tilt with latitude; never-rise cap drops below horizon. |
| 3 | `HorizonGroundNode` (`:288`) | `common/view/HorizonGroundNode.ts` | Filled green ground disk (z=0 great circle) + N/E/S/W bold labels painted flat on the grass, foreshortened/rotated to follow the rim (`HorizonGroundNode.ts:42-101`). Hidden when viewed from underneath. |
| 4 | `HorizonDomeNode` (`:219-224`) | `common/view/HorizonDomeNode.ts` | Transparent wireframe dome: outer silhouette circle; altitude rings at 30°/60° (and −30°/−60° when underside visible); azimuth lines at 45/90/135/225/270/315°; the N–S meridian; NCP/SCP dots+labels; Zenith/Nadir labels. **Far hemisphere is dashed** (`HorizonDomeNode.ts:81-86, 92-97`). |
| 5 | `CelestialPoleAxisNode` (`:236-240`) | `common/view/CelestialPoleAxisNode.ts` | Short blue stubs extending outward from NCP/SCP along the pole axis (`AXIS_EXTENSION = 0.18`). |
| 6 | `CelestialEquatorOnHorizonNode` (`:225-229`) | `common/view/CelestialEquatorOnHorizonNode.ts` | Celestial equator as the great circle perpendicular to the pole axis (= the dec=0 circle), fixed for a given latitude, meeting horizon at due E/W. |
| 7 | `HourCircleOnHorizonNode` (`:230-235`) | `common/view/HourCircleOnHorizonNode.ts` | The RA = 0ʰ hour circle; **rotates with sidereal time** as the sky turns, with a "0ʰ" label. |
| 8 | `HorizonObserverNode` (`:293`) | `common/view/HorizonObserverNode.ts` | NAAP "Stickfigure": a small stick figure at the sphere center, limbs defined in 3-D and projected through `SkyProjection` so it rotates with the camera (`HorizonObserverNode.ts:21-33`). Hidden when rotated behind the sphere (`:73`). |
| 9 | `SelectedStarHorizonArcsNode` (`:294-296`) | `common/view/SelectedStarHorizonArcsNode.ts` | NAAP-style coordinate guides for the selected star: **red azimuth arc** along the horizon from N to the star's az (with degree label), **blue altitude arc** up the vertical circle to the star (`SelectedStarHorizonArcsNode.ts:131-143`). |
| 10 | `SkyTrailsNode` (`:242-259`) | `common/view/SkyTrailsNode.ts` | Arcs each star swept since last reset. Samples LST from `trailStartTime` to now every 0.2 sidereal hours (`SAMPLE_STEP_HOURS`, `SkyTrailsNode.ts:38`). `pathPointAt` closure uses `equatorialToHorizontal` → `altAzToVector3`. |
| 11 | `SkyStarsNode` (`:261-285`) | `common/view/SkyStarsNode.ts` | Star dots as 4-point shapes (`starGraphics.ts`, NAAP `Symbol_10`). **Draggable**: `pointToEquatorial` unprojects the screen point and calls `horizontalToEquatorial` (`:272-277`). Selected star fills red with an outline (`SkyStarsNode.ts:90-93`). `accessibleName` = "Star". |
| 12 | `SkyReadoutNode` (`:300-302`) | `common/view/SkyReadoutNode.ts` | Editable **Az/Alt** fields (`frame: "horizontal"`) for the selected star, positioned below-right of the dome. Commits write back through `horizontalToEquatorial`. |

### Cardinal directions, meridian, observer
- **Cardinal directions (N/E/S/W)**: rendered by `HorizonGroundNode` on the green ground disk (`HorizonGroundNode.ts:48-101`).
- **Meridian**: the N–S meridian arc lives in `HorizonDomeNode` (`meridianUpperPoints`/`meridianFullPoints`, `HorizonDomeNode.ts:40-48`), toggled by `horizonMeridianVisibleProperty`.
- **Observer**: the stick figure (`HorizonObserverNode`), always at origin.

### Camera interaction
Dragging the empty background rotates the camera (`HorizonSystemScreenView.ts:304-322`), `ROTATE_SPEED = 0.01` rad/px (`:61`), clamped by `SkyProjection.rotateBy`.

### Toggles exposed on this screen (`:159-172`)
`starTrailsVisible`, `riseSetRegionVisible`, `circumpolarRegionVisible`, `neverRiseRegionVisible`, `hideBelowHorizon`, `zenithNadirLabelsVisible` ("Show Labels"), `horizonMeridianVisible`, `horizonCelestialReferencesVisible` ("Show NCP, SCP, 0h circle, and equator").

---

## 3. Controls / UI — `HorizonSystemScreenView.ts:104-196`

The control panel is a `RotatingSkyPanel` wrapping a `VBox`, right-aligned to the layout bounds (`:174-196`). In order (`:178-192`):

1. **Latitude `NumberControl`** (`:105-117`) — range −90..90 (`LATITUDE_RANGE`), `delta: 1`, integer degrees, pattern `"{{value}}°"`.
2. **Add Star** button (`:130`) → `sky.addRandomStar()`.
3. **`TimeControlNode`** (`:134-144`) — play/pause/step bound to `sky.timer.isPlayingProperty`; speed radio bound to `sky.timeSpeedProperty`; step-forward calls `sky.stepForward()`.
4. **Reset Star Trails** button (`:131`) → `sky.resetStarTrails()`.
5. **Star Trails** checkbox (`:159`).
6. **Remove All Stars** button (`:132`).
7. **Show rise and set stars** checkbox (`:160`).
8. **Show circumpolar stars** checkbox (`:161`).
9. **Show never-rise stars** checkbox (`:162`).
10. **Hide below horizon** checkbox (`:163`).
11. **Show Labels** checkbox (`:164-167`) — zenith/nadir.
12. **Show Meridian** checkbox (`:168`).
13. **Show NCP, SCP, 0h circle, and equator** checkbox (`:169-172`).

Plus a **Reset All** button bottom-right (`:327-336`) calling `model.reset()` + `this.reset()` (which resets the projection camera, `:362-364`).

**Notably absent from this screen** (present on other screens): no star-pattern picker/ComboBox, no longitude slider/map, no animation-rate slider, no animation-duration combo. Those are Explorer/Celestial-Sphere features. The push buttons use flat-styled presets (`FLAT_RECTANGULAR_BUTTON_OPTIONS`, `RotatingSkyButtonOptions.ts:32`); checkboxes use `ROTATING_SKY_CHECKBOX_OPTIONS` (`RotatingSkyControlOptions.ts:42-47`).

---

## 4. Astronomy engine — `src/common/`

### Coordinate frames (`SkyCoordinates.ts:8-21`)
Two right-handed unit-sphere frames:
- **Equatorial** (world frame for the celestial sphere): `+Z` → North Celestial Pole, equator in the XY-plane, `+X` at RA 0ʰ.
- **Horizon** (world frame for the dome): `+Z` → zenith, `+X` → North, `+Y` → East.

Conventions (`SkyCoordinates.ts:8-15`): RA in hours [0,24); Dec in degrees; latitude +N/−S; LST in hours; altitude above horizon in degrees; azimuth in degrees from North through East (N=0°, E=90°, S=180°, W=270°); hour angle `H = LST − RA`.

### Core transforms (`SkyCoordinates.ts`)
- `equatorialToHorizontal` (`:73-93`) — the standard transform:
  ```ts
  sinAlt = sin(lat)·sin(dec) + cos(lat)·cos(dec)·cos(H)
  az = atan2(−cos(dec)·sin(H)/cos(alt), (sin(dec) − sin(lat)·sinAlt)/(cos(lat)·cos(alt)))   // N through E
  ```
- `horizontalToEquatorial` (`:121-140`) — inverse; used for shift-click/drag star creation.
- `equatorialToHorizonVector` (`:100-115`) — same maths but returns a unit vector directly, avoiding alt/az singularities at the zenith/nadir (used by the 0ʰ hour circle).
- `altAzToVector3` (`:62-67`), `raDecToVector3` (`:54-59`) — frame → unit vector.
- `declinationBand` (`:156-166`) — classifies circumpolar / risesAndSets / neverRises by checking culmination altitudes at H=0 and H=12ʰ against the horizon.

### Projection — orthographic (`SkyProjection.ts`)
- Camera frame (`SkyProjection.ts:6-16`): screen-right = −X′, toward-viewer = Y′, screen-up = Z′.
- `viewMatrix = rotationX(elevation) ∘ rotationZ(azimuth) ∘ frameMatrix` (`:76-81`). For the Horizon System, `frameMatrix` is identity (only the Celestial Sphere morphs it via `skyMorph`).
- `projectWithDepth` (`:85-91`):
  ```ts
  screenX = center.x − p′.x · radius
  screenY = center.y − p′.z · radius   // screen Y grows downward
  depth   = p′.y                       // ≥ 0 ⇒ front hemisphere (not occluded)
  ```
- `unproject` (`:108-120`) — inverse for picking; clamps outside the disc to the limb.
- Elevation clamped to ±(π/2 − 1e-3) so the sphere never flips (`:40, :123-126`).

### Graphics helpers (`skyGraphics.ts`)
- `smallCirclePoints` (`:31-47`) — samples a small/great circle about an axis.
- `addSplitPolyline` / `projectSplitPolyline` (`:218-244`) — route each segment to a `front` or `back` shape by mean camera depth, enabling **solid-front / dashed-back occlusion**.
- `addFrontHemispherePolyline` / `addFrontHemisphereSphericalPolygon` (`:97-211`) — clip at the view horizon (ported from NAAP `Globe.updateGlobe`).
- `projectDeclinationBand` (`:296-321`) — tiles a declination band with quads given a `toVector` frame mapping; used by `DeclinationRegionsNode` in **either** frame.

### Frame morph (`skyMorph.ts`) — **not used by this screen**
`frameMatrixForBlend` rotates the up-direction along the NCP→zenith great circle; it is the Celestial Sphere screen's equatorial↔horizon morph. The Horizon System always renders directly in the horizon frame.

### How time drives the sky
`SkyModel.step(dt)` (`SkyModel.ts:293-298`):
```ts
this.timer.step(dt);
if (this.timer.isPlayingProperty.value) {
  this.advancePlayingTime(dt * SIDEREAL_HOURS_PER_SECOND * this.speedMultiplier);
}
```
`advanceSiderealTime` wraps into [0,24) (`:274-276`). View nodes observe `siderealTimeProperty` and recompute positions via `equatorialToHorizontal`. No date, no calendar — purely continuous sidereal hours.

---

## 5. Accessibility

### Screen summary (`HorizonSystemScreenSummaryContent.ts`)
Extends `ScreenSummaryContent` with four regions (`:39-44`). `currentDetailsContent` is a **live `PatternStringProperty`** (`:29-37`) over `latitude`, `stars.lengthProperty`, and `siderealTimeProperty`, formatted to 0/0/1 decimal places. Wired into the `ScreenView` at `HorizonSystemScreenView.ts:92`.

### a11y strings (`src/i18n/strings_en.json:76-83`, exposed via `StringManager.getHorizonSystemA11yStrings()`, `StringManager.ts:97-99`)
- `screenSummary.playArea`: *"The play area shows the local sky from an observer's horizon, with the cardinal directions and the Sun and stars rising and setting as the sky rotates."*
- `screenSummary.controlArea`: lists every control (latitude, add stars, animate time, trails, rise-and-set/circumpolar/never-rise regions, below-horizon, zenith/nadir labels, meridian, celestial-pole references, remove all, reset).
- `currentDetails`: *"The observer is at latitude {{latitude}} degrees. Stars shown: {{starCount}}. The local sidereal time is {{time}} hours."*
- `interactionHint`: *"Explore how the sky looks from your location above the horizon."*

> ⚠️ **Note**: the playArea string mentions "the Sun", but **no Sun is modeled or rendered** (see §6). This is an aspirational/inaccurate string, not a description of actual behavior.

### pdomOrder (`HorizonSystemScreenView.ts:338-359`)
Explicit reading order: latitudeControl → addStarButton → timeControl → resetTrailsButton → trailsCheckbox → removeAllButton → riseSetCheckbox → circumpolarCheckbox → neverRiseCheckbox → hideBelowHorizonCheckbox → labelsCheckbox → meridianCheckbox → celestialReferencesCheckbox → **starsNode** → **starReadout** → resetAllButton.

### Keyboard help (`HorizonSystemKeyboardHelpContent.ts`)
`TwoColumnKeyboardHelpContent` with a single `BasicActionsKeyboardHelpSection` in the left column and an empty right column (`:14`). No slider/combo sections. Registered as the "?" dialog in `HorizonSystemScreen.ts:43`.

### Per-control a11y
Push buttons and checkboxes carry `accessibleName` (= their label property) (`HorizonSystemScreenView.ts:127, 155`). Each star dot is a focusable `div` with `accessibleName` "Star" (`SkyStarsNode.ts:54-59`).

---

## 6. What the Horizon System does NOT have

This is important for cross-comparison. The Horizon System screen **does not model or render the Sun, the Moon, planets, date, or seasons**. Specifically:

- **No Sun.** There is no `Sun` class, no sun-position computation, no sun daily path, no analemma. Verified by grep across `src/horizon-system/`: the only "sun"/"Sun" hits are (a) the `scenerystack/sun` UI-library import (`HorizonSystemScreenView.ts:15`) and (b) the word "sidereal". The single textual mention of "the Sun" is in the a11y `playArea` string (`strings_en.json:78`), which is descriptive only — no Sun is drawn.
- **No ecliptic on this screen.** `eclipticColorProperty` exists (`RotatingSkyColors.ts:95-99`) and the ecliptic is drawn by `CelestialSphereNode` (`common/view/CelestialSphereNode.ts:82-83,135-137`) and the screen icon (`RotatingSkyScreenIcons.ts:177-178`), but `CelestialSphereNode` is **not imported** by `HorizonSystemScreenView`. The Horizon System renders only stars and reference circles on the dome.
- **No date / calendar / seasons.** Time is a single scalar `siderealTimeProperty` in hours [0,24) (`SkyModel.ts:106`). There is no day-of-year, month, or date control anywhere; the model cannot represent a date.
- **No sunrise/sunset computation.** No code computes rising/setting times or azimuths for any object.
- **No day/night sky background.** The background is a static deep-navy `Rectangle` (`HorizonSystemScreenView.ts:99-102`); the ground is a static green disk. Neither changes with time.
- **No declination bands tied to the Sun.** The three shaded regions (`DeclinationRegionsNode`) are functions of the **observer's latitude** and declination only (`DeclinationRegionsNode.ts:66-78`, boundary = `90 − |latitude|`), classifying stars as circumpolar / rise-and-set / never-rise. They have nothing to do with the Sun.
- **No star magnitudes/brightness/colors.** All stars share one size (`STAR_RADIUS = 5`, `RotatingSkyConstants.ts:111`) and one fill (`starColorProperty`, yellow), selected除外. Star "types" are purely positional (RA/Dec).
- **No longitude effect on this screen.** `longitudeProperty` exists and resets (`SkyModel.ts:188, 329`) but is not bound to any control or node in `HorizonSystemScreenView` (the `equatorialToHorizontal` calls pass the model's `siderealTimeProperty` directly, e.g. `:214, :247, :266`). Longitude only matters on the Explorer, where it offsets local sidereal time via the map.
- **No Moon, no planets, no Milky Way, no constellation art.** Constellations exist only as "star patterns" (stick-figure edges, `SkyModel.ts:217-230`, `StarPatterns.ts`) and the pattern picker is **not** wired into this screen.

In short: **the Horizon System is a stars-only diurnal-rotation simulator.** Its only moving "astronomical" quantity is the local sidereal time.

---

## 7. Animation — how `TimeModel` drives the sky

### TimeModel (`src/common/TimeModel.ts`)
A composable clock (`TimeModel.ts:50-77`):
- `isPlayingProperty` (`:52`) — starts **paused** (`initiallyPlaying = false`, `:57`).
- `timeProperty` (`:55`) — elapsed seconds, units "s".
- `step(dt)` (`:66-70`) — only advances `timeProperty` while playing.

It is composed into `SkyModel` as `this.timer` (`SkyModel.ts:88`), not subclassed.

### Sidereal advance (`SkyModel.ts`)
- `SIDEREAL_HOURS_PER_SECOND = 1` (`RotatingSkyConstants.ts:91`) — at baseline, **one sidereal hour per real second**, i.e. a full sky rotation (24 sidereal hours) in **24 real seconds**.
- `speedMultiplier` (`:279-281`) = `SPEED_MULTIPLIERS[timeSpeed] × animationRateProperty.value`.
- `SPEED_MULTIPLIERS` (`:80-84`): `SLOW = 0.25`, `NORMAL = 1`, `FAST = 4`.
- On the Horizon System, `animationRateProperty` is **not user-exposed** (no slider), so it stays at its default 1. Effective rates are therefore purely the radio multipliers:
  - **SLOW**: 0.25 sidereal h/s → full rotation in ~96 s
  - **NORMAL**: 1 sidereal h/s → full rotation in 24 s
  - **FAST**: 4 sidereal h/s → full rotation in 6 s
- `SkyModel.step(dt)` (`:293-298`): `timer.step(dt)`, then `advancePlayingTime(dt × 1 × speedMultiplier)`.
- `advancePlayingTime` (`:301-320`) honors `animationDurationProperty` to auto-pause after a span; the Horizon System leaves this at `"continuous"` (no limit), so it runs until the user pauses.
- **Step-forward button** (`:284-291`): advances by `speedMultiplier × 1` sidereal hour per press (wired at `HorizonSystemScreenView.ts:140-142`).

The view's `step` (`HorizonSystemScreenView.ts:366-368`) is a no-op — all updates are **property-driven**: the view nodes multilink on `sky.siderealTimeProperty`, `latitudeProperty`, `hideBelowHorizonProperty`, and `projection.viewMatrixProperty` (e.g. `SkyStarsNode` redraw properties at `:278-283`, `SkyTrailsNode` at `:253-258`), so advancing sidereal time in the model automatically moves every star, trail, arc, and the 0ʰ hour circle.

---

## Quick reference — key file paths

- Screen wrapper: `/home/veillette/OpenPhysics/RotatingSky/src/horizon-system/HorizonSystemScreen.ts`
- Model: `/home/veillette/OpenPhysics/RotatingSky/src/horizon-system/model/HorizonSystemModel.ts`
- View: `/home/veillette/OpenPhysics/RotatingSky/src/horizon-system/view/HorizonSystemScreenView.ts`
- Summary: `/home/veillette/OpenPhysics/RotatingSky/src/horizon-system/view/HorizonSystemScreenSummaryContent.ts`
- Keyboard help: `/home/veillette/OpenPhysics/RotatingSky/src/horizon-system/view/HorizonSystemKeyboardHelpContent.ts`
- Shared model: `/home/veillette/OpenPhysics/RotatingSky/src/common/model/SkyModel.ts`
- Star: `/home/veillette/OpenPhysics/RotatingSky/src/common/model/Star.ts`
- Coordinates: `/home/veillette/OpenPhysics/RotatingSky/src/common/SkyCoordinates.ts`
- Projection: `/home/veillette/OpenPhysics/RotatingSky/src/common/SkyProjection.ts`
- Time model: `/home/veillette/OpenPhysics/RotatingSky/src/common/TimeModel.ts`
- Graphics: `/home/veillette/OpenPhysics/RotatingSky/src/common/view/skyGraphics.ts`, `starGraphics.ts`
- Dome nodes: `src/common/view/HorizonDomeNode.ts`, `HorizonGroundNode.ts`, `HorizonObserverNode.ts`, `DeclinationRegionsNode.ts`, `CelestialEquatorOnHorizonNode.ts`, `HourCircleOnHorizonNode.ts`, `CelestialPoleAxisNode.ts`, `SelectedStarHorizonArcsNode.ts`, `SkyStarsNode.ts`, `SkyTrailsNode.ts`, `SkyReadoutNode.ts`
- Constants: `/home/veillette/OpenPhysics/RotatingSky/src/RotatingSkyConstants.ts`
- Colors: `/home/veillette/OpenPhysics/RotatingSky/src/RotatingSkyColors.ts`
- Strings: `/home/veillette/OpenPhysics/RotatingSky/src/i18n/strings_en.json` (a11y block lines 75-100)

I made no modifications — this was a read-only investigation.
</task_result>
</task>
```

---

## Assistant (Plan · GLM-5.1 · 1244.0s)

_Thinking:_

I now have comprehensive analyses of both. Let me think carefully about the comparison and what lessons/improvements I can draw.

The key insight: The Horizon System screen is **stars-only diurnal rotation**, while the Sun Motion Simulator is a **Sun-focused annual+daily motion** sim. They are complementary, not directly competing. But the question asks what lessons/improvements can be brought over.

Let me organize my thinking into:

1. **Conceptual/feature gaps** — things the Sun Motion Simulator has that the Horizon System doesn't (and that would be pedagogically valuable additions)
2. **Architectural/quality lessons** — where the Sun Motion Simulator is *worse* and confirms the RotatingSky approach is better (so the lesson is "keep doing this")
3. **Concrete, actionable improvements** for the Horizon System

Let me draft this as a plan (since I'm in plan mode). I should present a well-researched comparison and ask the user which improvements they want to pursue.

Let me think about the genuinely transferable ideas:

**From Sun Motion Simulator → possible Horizon System improvements:**

1. **Model the Sun itself.** The single biggest gap. The Sun Motion Simulator's entire purpose is the Sun. The Horizon System's a11y string even *mentions* "the Sun" but none is modeled. Adding a Sun (with RA/Dec computed from date + ecliptic) would unlock a huge pedagogical dimension: the sun's daily arc, sunrise/sunset, seasonal change. This is the headline lesson.

2. **Date / calendar dimension.** The Sun Motion Simulator has day-of-year driving declination. The Horizon System has only a scalar sidereal time. Adding a date would let the Sun's declination change and make the sim teach seasons.

3. **Sun's daily path (declination circle).** A drawn arc showing where the Sun travels across the sky on a given day — extremely pedagogical. The Horizon System already has the machinery to draw great/small circles (`smallCirclePoints`), so this would be a natural fit.

4. **Day/night sky background tied to sun altitude.** Currently the Horizon System has a static navy background. A sky color that lerps blue→dark by sun altitude is a cheap, high-impact pedagogical cue. (The Sun Motion Simulator does exactly this in `getSkyColor`.)

5. **Sunrise/sunset markers on the horizon.** Where the sun's daily arc crosses the horizon. Cheap to compute and visually striking.

6. **Analemma.** More advanced; the Sun Motion Simulator's implementation is buggy (the invisible-unless-t hack, inconsistent ephemerides). The Horizon System could do it *correctly* in the equatorial frame.

7. **Ecliptic on the dome.** Already exists in `CelestialSphereNode` for the other screen but isn't drawn on the Horizon System. Could be ported — would show the sun's path among the stars and is a natural companion to modeling the Sun.

8. **Sun's stickfigure shadow.** The Horizon System already has a `HorizonObserverNode` (the NAAP stickfigure). A shadow that points away from the sun would be a lovely, embodied cue. (Scenery can do this; it's not WebGL-dependent.)

9. **Direct manipulation of time by dragging the sun.** The Sun Motion Simulator lets you drag the sun along its declination circle to set time-of-day. The Horizon System already supports dragging to *create* stars; adding drag-to-scrub-time on a sun would be a nice interaction.

10. **Step-by-day animation mode.** Keep time-of-day fixed, advance the date — to trace the noon-sun path over the year. This is a genuinely thoughtful educational feature. The Horizon System's `TimeModel` + `animationDurationProperty` machinery could support a second mode.

11. **Hourly/altitude readouts.** The Sun Motion Simulator has a live information panel (altitude, azimuth, RA, dec, hour angle, sidereal time, equation of time). The Horizon System has a star readout (Az/Alt) but nothing for the whole-sky context. A small sun readout would pair well with modeling the sun.

**Quality lessons (where Sun Motion Simulator is worse — confirming RotatingSky's approach):**

1. **Inconsistent ephemerides.** Sun Motion Simulator uses `solar-calculator` for the sun but Siedell's gist for the analemma — they disagree. Lesson: keep ONE astronomy engine (`SkyCoordinates.ts`), unit-tested.

2. **No longitude.** Sun Motion Simulator ignores longitude entirely; sidereal time is a linear fit. RotatingSky already models longitude (used on Explorer). Lesson: keep the full lat/long model.

3. **Hardcoded obliquity 24°.** Sun Motion Simulator hardcodes 24°. If RotatingSky adds the sun/ecliptic, use 23.44° (or proper epoch value) from a constant.

4. **Magic numbers / visual fudges.** `cos(dec)^1.25`, the `141` offset, the analemma invisible-unless-t hack. Lesson: RotatingSky's geometrically-honest `smallCirclePoints` (true small circles) is the right approach; don't carry over the fudges.

5. **Non-responsive hardcoded layout.** Sun Motion Simulator is 1140px fixed, Bootstrap CDN (no offline). RotatingSky is a PWA with `layoutBounds`. Lesson: keep responsive, keep PWA.

6. **No accessibility.** Sun Motion Simulator's canvas widgets are not keyboard/screen-reader accessible. RotatingSky has PDOM summaries, pdomOrder, keyboard help, a11y strings. Lesson: any new feature must come with a11y strings and pdomOrder updates.

7. **Two different rendering paradigms (Three.js + PixiJS).** Sun Motion Simulator mixes them. RotatingSky uses one projection (`SkyProjection`) shared across screens. Lesson: keep the single-projection architecture; render the sun through the same `SkyProjection` as stars.

8. **Imperative scene mutation in componentDidUpdate.** Brittle. RotatingSky uses property-driven multilink redraws. Lesson: keep reactive.

**Architectural lesson for HOW to add the sun:**

The Sun Motion Simulator's sun is a 3D object in Three.js. The RotatingSky way: add a `Sun` model (parallel to `Star`, but with RA/Dec derived from date via ecliptic math), draw it with a `SunNode` that uses the same `SkyProjection.projectWithDepth` as stars, drive it from the same `siderealTimeProperty` + a new `dateProperty`. Keep all math in `SkyCoordinates.ts` with unit tests.

Now, I'm in plan mode. I should present this comparison and the candidate improvements, and ask the user which direction(s) they want to pursue. The user said "draw Lessons... and improvement that you can bring" — so they want recommendations. But I should confirm scope before any implementation (and plan mode forbids implementation anyway).

Let me write up the comparison concisely but with enough depth, then present a prioritized set of candidate improvements and ask which to pursue. I should be careful about verbosity but this is a substantive analytical task that warrants detail. I'll use the question tool to ask about direction.

Actually, let me reconsider the format. The user asked me to "compare and try to draw Lessons... and improvement that you can bring." This is primarily an analytical/advisory request. I should deliver the comparison and recommendations as the primary output. Then I can offer to turn any of them into a concrete plan.

Let me structure it as:
1. Short framing of the fundamental difference (stars-only diurnal vs sun-focused annual+daily)
2. Lessons that CONFIRM the RotatingSky approach (quality anti-patterns in Sun Motion Simulator)
3. Lessons/improvements to BRING OVER (the feature/UX ideas), prioritized by impact and effort
4. How each would fit RotatingSky's architecture idiomatically
5. Ask the user which to pursue

I'll keep it tight but substantive. Then ask the question.

Both explorations are complete. Here's the comparison and the lessons I'd draw.

## The fundamental difference

The two sims are **complementary, not competing**. The Sun Motion Simulator (SMS) is a **Sun-focused annual + daily motion** lab (date, ecliptic, analemma, equation of time, day/night). Your **Horizon System is a stars-only diurnal rotation** lab — it advances a single scalar `siderealTimeProperty` and has no Sun, no date, no ecliptic, no sunrise/sunset, and a static navy background. Ironically, your own a11y string at `strings_en.json:78` *says* "the Sun and stars rising and setting" — but no Sun is modeled. That gap is the headline.

SMS is also a lower-quality codebase in several ways that **confirm your architecture is the right one**. I'll separate "lessons that validate your approach" from "improvements worth bringing over."

---

## A. Lessons that VALIDATE the RotatingSky approach (don't copy these)

| SMS weakness | RotatingSky does it right |
|---|---|
| **Two inconsistent ephemerides** — `solar-calculator` for the sun, a Siedell gist for the analemma; they disagree at the margins (`main.jsx:89-90,247-248` vs `utils.js:200-236`) | One unit-tested engine: `SkyCoordinates.ts` |
| **No longitude**; sidereal time is a linear empirical fit with no longitude term (`utils.js:107-112`) | Full lat/long model (`SkyModel.ts:100-106`), longitude drives LST on the Explorer |
| **Hardcoded obliquity 24°** (`CelestialSphere.jsx:586`), `cos(dec)^1.25` fudge for declination-circle radius (`:846`), analemma invisible-unless-`t`-in-coords hack (`:716-721`), magic `141`/`47` offsets | Geometrically honest `smallCirclePoints` (`skyGraphics.ts:31-47`) draws true small circles |
| **Hardcoded 1140px layout**, Bootstrap/jQuery from CDN → no offline | Responsive `layoutBounds` + Workbox PWA |
| **Canvas widgets not keyboard/SR accessible** | PDOM summaries, `pdomOrder`, keyboard help, a11y strings per screen |
| **Three.js + PixiJS hybrid, imperative `componentDidUpdate` scene mutation** | Single `SkyProjection`, property-driven multilink redraws shared across all three screens |

**Takeaway:** when porting any SMS idea, render it through your existing `SkyProjection`, keep the math in `SkyCoordinates.ts`, and add a11y strings + pdomOrder alongside it. Don't import SMS's math verbatim.

---

## B. Improvements worth bringing over (prioritized)

### Tier 1 — high impact, fits your engine naturally

1. **Model the Sun.** The single biggest gap. A `Sun` (RA/Dec derived from date via ecliptic geometry), drawn by a `SunNode` that reuses `SkyProjection.projectWithDepth` exactly like `SkyStarsNode`. This alone makes the screen teach daily solar motion and silences the inaccurate a11y string. *Effort: medium — new `Sun` model + `SunNode`, ecliptic math in `SkyCoordinates.ts`.*

2. **Add a date / calendar dimension.** SMS's day-of-year drives solar declination (`utils.js:139-236`). Your `SkyModel` has only `siderealTimeProperty`; adding a `dateProperty` unlocks seasons, the Sun's annual declination swing, and (later) the analemma. Keep one engine — don't pull in `solar-calculator`.

3. **Sun's daily path arc.** Draw the small circle at the Sun's declination — the "where does the Sun go today" line. You already have `smallCirclePoints` and `projectSplitPolyline` (front-solid/back-dashed occlusion), so this is nearly free once the Sun exists. SMS draws this but with the `^1.25` fudge; you can do it *correctly*.

4. **Day/night sky background tied to Sun altitude.** SMS's `getSkyColor` (`CelestialSphere.jsx:827-839`) lerps blue→dark by sun altitude. Your static navy `Rectangle` (`HorizonSystemScreenView.ts:99-102`) could become a `PaintColorProperty` linked to sun altitude. Cheap, enormous pedagogical payoff — "sun below horizon = night" reads instantly without numbers.

5. **Ecliptic on the dome.** Already implemented in `CelestialSphereNode.ts:82-83,135-137` for another screen but not imported here. Port it (or add a `showEcliptic` toggle) — it's the Sun's path among the stars and pairs naturally with modeling the Sun.

### Tier 2 — pedagogically nice, more work

6. **Sunrise/sunset horizon markers.** Where the Sun's daily arc crosses the horizon — cheap to compute from dec + latitude, visually striking. Reinforces the seasonal swing of sunrise azimuth.

7. **Stickfigure shadow pointing away from the Sun.** SMS uses a Three.js directional light; you can compute the shadow direction analytically from sun azimuth and draw a rotated shadow polygon under your existing `HorizonObserverNode`. Embodied, intuitive cue.

8. **Step-by-day animation mode.** Genuinely thoughtful SMS feature: hold time-of-day fixed, advance the date, to trace the noon-Sun path over the year (`main.jsx:295-311`). Your `TimeModel` + `animationDurationProperty` machinery could host a sibling "advance date" mode.

9. **Sun readout panel** (altitude, azimuth, RA, dec, hour angle, LST). Mirrors SMS's Information panel. You already have `SkyReadoutNode`; a sun-scoped readout is a small addition once the Sun exists.

### Tier 3 — advanced, do it right where SMS did it wrong

10. **Analemma.** SMS's is buggy (inconsistent ephemeris, visibility hack, scale fudges). In your equatorial frame you can build it correctly as a sampled curve of Sun RA/Dec + equation-of-time offset. Good capstone feature, but only after 1–3 exist.

11. **Drag-the-Sun-to-scrub-time.** SMS raycasts to a math plane and brute-force nearest-vertex-searches the torus (`CelestialSphere.jsx:948-1050`). You can do it analytically with `SkyProjection.unproject` (you already use it for star creation at `SkyStarsNode.ts:272-277`) — far cleaner.

---

## How it would fit your architecture (the idiomatic pattern)

- **Model:** a `Sun` class parallel to `Star.ts`, composed into `SkyModel` next to `stars`; a new `dateProperty` (NumberProperty, day-of-year or epoch) alongside `siderealTimeProperty`.
- **Math:** ecliptic→equatorial (obliquity **23.44°**, not 24°), equation of time — all in `SkyCoordinates.ts`, all unit-tested like the existing transforms.
- **View:** `SunNode` using the same `SkyProjection`; daily-path arc via `smallCirclePoints`; ecliptic ported from `CelestialSphereNode`.
- **Time:** extend `TimeModel`/`SkyModel.step` so a sidereal step and a date step are independent, enabling the step-by-day mode.
- **A11y:** fix the inaccurate "the Sun" string, add a live sun-position `currentDetailsContent` line, add the sun node to `pdomOrder`, add keyboard-help for any new slider (date).

---

**Caveats worth flagging:**

- Adding a real **date** is a bigger conceptual change than it looks — sidereal time and solar time diverge by the equation of time, and your current `siderealTimeProperty` model conflates them. You'll need to decide whether the date drives solar *or* sidereal time, which affects every screen (the screens are independent, but `SkyModel` is shared code). Worth deciding up front.
- SMS's ephemerides are **low-precision approximations** (Fourier series fit to ~year 2000). For a teaching sim that's fine, but if you want it to stay correct over decades you'd want a proper epoch. I'd match SMS's precision target unless you want to over-engineer.

Which direction would you like to take this?

**Tool: question**

**Input:**
```json
{
  "questions": [
    {
      "question": "Which improvement(s) should I turn into a concrete implementation plan? (I'm in plan mode — no edits yet.)",
      "header": "Improvement scope",
      "multiple": true,
      "options": [
        {
          "label": "Tier 1 bundle (1-5)",
          "description": "Model the Sun + date dimension + daily path arc + day/night background + ecliptic on the dome. The highest-impact, most coherent set; makes the Horizon System Sun-aware."
        },
        {
          "label": "Just the Sun + daily path",
          "description": "Items 1 & 3 only: add a Sun model and its daily-arc, no date/seasons yet. Smallest step that fixes the inaccurate a11y string."
        },
        {
          "label": "Sun + date + seasons",
          "description": "Items 1-3 plus a date control: Sun whose declination changes over the year, enabling seasons/solstice teaching. Requires resolving the sidereal-vs-solar-time question."
        },
        {
          "label": "Tier 2 extras too",
          "description": "Tier 1 plus sunrise/sunset markers, stickfigure shadow, step-by-day mode, and sun readout panel."
        },
        {
          "label": "Analemma (Tier 3)",
          "description": "The advanced capstone — only sensible after the Sun + date exist. I'd recommend deferring this."
        },
        {
          "label": "Analysis only, no plan",
          "description": "You only wanted the comparison and lessons; stop here without an implementation plan."
        }
      ]
    }
  ]
}
```

**Output:**
```
User has answered your questions: "Which improvement(s) should I turn into a concrete implementation plan? (I'm in plan mode — no edits yet.)"="Tier 1 bundle (1-5), Tier 2 extras too". You can now continue with the user's answers in mind.
```

---

## Assistant (Plan · GLM-5.1)

---

## User

implement the plan described aboved

---

## User

attempt the plan from tier 1 and tier 2 described above

---

