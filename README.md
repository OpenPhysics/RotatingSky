# Rotating Sky

An interactive astronomy simulation about how the sky appears to rotate for an
observer on Earth, built with [SceneryStack](https://scenerystack.org/),
Vite 8, TypeScript 6, and Biome 2.

## Features

- Three screens (see `doc/multi-screen.md` for the architecture):
  1. **Horizon System** (`src/horizon-system/`) — the local sky from an observer's horizon.
  2. **Celestial Sphere** (`src/celestial-sphere/`) — the celestial sphere, its equator, ecliptic, and poles.
  3. **Explorer** (`src/explorer/`) — the combined, interactive rotating-sky explorer.
- Model/view separation per screen
- English, Spanish, and French localization via `StringManager`
- Default and projector color profiles
- Programmatic, locale-aware home-screen / navigation-bar icons
- Progressive Web App (installable, offline-capable)
- Git hooks for Biome pre-commit checks
- Shared GitHub Actions CI via `OpenPhysics/Baton`

See `doc/multi-screen.md` for the multi-screen architecture and how to share state across screens.

## Quick Start

```bash
npm install
npm run icons    # generate PNG icons from public/icons/icon.svg
npm start        # dev server → http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm test` | Run Vitest unit tests |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run clean` | Remove `dist/` |

New sims start at `version: "0.0.0"` in `package.json`. Bump only when cutting a release (for example `npm version patch` and a matching git tag). Keep `name` in kebab-case; it is separate from the SceneryStack sim identifier in `src/init.ts`.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^6 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.5 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^1 | PWA + service worker |

## License

GNU Affero General Public License v3.0 — see [OpenPhysics org license](https://github.com/OpenPhysics/.github/blob/main/LICENSE).

## Contributing

See [OpenPhysics contributing guidelines](https://github.com/OpenPhysics/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
