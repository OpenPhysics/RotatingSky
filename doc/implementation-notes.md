# Implementation Notes - Rotating Sky

## Architecture Overview

TemplateSingleSim is a minimal starter scaffold for forking new single-screen SceneryStack simulations. It demonstrates the Model-View pattern, color profiles, localization, reset behavior, and reusable common components without domain-specific physics.

### High-Level Architecture

```
main.ts
  └─ RotatingSkyScreen             (Screen<RotatingSkyModel, RotatingSkyScreenView>)
       ├─ RotatingSkyModel          state + logic  (src/rotating-sky-screen/model/)
       └─ RotatingSkyScreenView     visuals        (src/rotating-sky-screen/view/)
            ├─ RotatingSkyScreenSummaryContent     (PDOM overview)
            └─ RotatingSkyKeyboardHelpContent      (keyboard help dialog)

src/common/
  ├─ SimPanel.ts           pre-themed panel (all screens share RotatingSkyColors)
  └─ TimeModel.ts          composable play/pause + elapsed time

src/preferences/
  ├─ RotatingSkyPreferencesModel   sim-specific pref state
  ├─ RotatingSkyPreferencesNode    pref UI shown in Preferences → Simulation
  └─ rotatingSkyQueryParameters    query-parameter declarations
```

Data flows Model → View through AXON `Property` objects. The view observes
properties via `.link()` or `.lazyLink()` and updates reactively.

## Model Components

### RotatingSkyModel

An empty coordinator with documented hooks for `step(dt)` and `reset()`.
Add physics state as `BooleanProperty`, `NumberProperty`, etc. from
`scenerystack/axon`.

### TimeModel (common)

`src/common/TimeModel.ts` is a reusable play/pause + elapsed-time model for
animated sims. Compose it into your screen model rather than subclassing:

```typescript
export class YourModel implements TModel {
  public readonly timer = new TimeModel();

  public step(dt: number): void {
    this.timer.step(dt);
    // physics driven by this.timer.timeProperty.value
  }
  public reset(): void { this.timer.reset(); }
}
```

## View Components

### RotatingSkyScreenView as Coordinator

The screen view demonstrates layout using `layoutBounds`, background fill from
`RotatingSkyColors.ts`, and a `ResetAllButton` wired to `model.reset()`. Add
specialized sub-nodes under `src/rotating-sky-screen/view/`.

### SimPanel (common)

`src/common/SimPanel.ts` wraps SceneryStack's `Panel` with the sim's color
scheme baked in. All control panels should use `SimPanel` so projector-mode
switching is automatic:

```typescript
const panel = new SimPanel(content);            // defaults
const panel = new SimPanel(content, { xMargin: 20 }); // any PanelOption override
```

### Color Scheme

`RotatingSkyColors.ts` defines `ProfileColorProperty` instances for "default" (dark)
and "projector" (light) profiles. SceneryStack switches profiles automatically
when the user toggles Projector Mode in Preferences.

## Forking this template

### Automated rename

```sh
npm run rename -- --id friction --name "Friction"
npm run check
```

`scripts/rename-sim.ts` replaces all template identifiers in file content and
renames files and folders in one pass.

### Manual fork checklist

- Update `package.json` name, `init.ts` name/version, `brand.ts`
- Replace placeholder view content with play area and control panels
- Replace `RotatingSkyColors.ts` colors with sim-specific palette
- Update locale JSON files: title, screen names, a11y strings
- Regenerate PWA icons (`npm run icons`) after editing `public/icons/icon.svg`
- Add `doc/implementation-notes.md` describing the new sim's architecture

## Multi-screen simulations

See `doc/multi-screen.md` for a complete guide covering:
- Independent vs. shared-model architectures
- File structure for each screen
- StringManager and locale changes
- Home-screen icon requirements
- Per-screen accessibility strings

## Known gaps / TODOs

- No dispose() calls yet — add them once Properties gain external listeners.
- `RotatingSkyModel.step()` and `reset()` bodies are stubs — fill in with real physics.
- `RotatingSkyScreenView` pdomOrder TODO comment — add interactive nodes as they are created.
