<p align="center">
  <img src="public/jaguar-mark.svg" width="120" alt="Jaguar logo" />
</p>

<h1 align="center">Jaguar</h1>
<p align="center"><strong>RPG maps, straight to your favorite VTT.</strong></p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.pt-BR.md">Português</a> ·
  <a href="README.es.md">Español</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
</p>

---

Paint a grid map with your own art, drop in props, export a clean PNG sized exactly to your grid. That's it — Jaguar doesn't try to be a live VTT, it just gets a map onto the table fast.

## Why Jaguar

- **Your art, not a built-in tileset.** Import whatever floor/wall/prop PNGs you already have. No bitmask rules to satisfy, no autotile format to convert to.
- **Walls that actually look like walls.** They snap to a cell's edge instead of filling the whole tile, so a room reads as a room instead of a block of bricks. The edge is auto-detected from where you're painting, or you can pin it manually.
- **Props you can actually pose.** Corner/edge/rotation handles right on the canvas, Photoshop-style — hold **Alt** to scale proportionally.
- **It's just files.** A project is a folder with a `project.json` and an `assets/` directory. No account, no cloud, nothing you can't back up with a copy-paste.

Beyond that: an asset library with folders and search, autosave, recent projects with live thumbnails, light/dark/system theme, and English/Português/Español — the stuff you'd expect from any decent editor, present and out of the way.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `F` / `W` / `X` / `P` / `H` | Paint floor / Paint wall / Erase / Props / Pan |
| `R` | Cycle wall edge mode (while painting walls) |
| `G` | Toggle grid |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+S` | Save |
| `Ctrl+D` | Duplicate selected prop |
| `Delete` | Delete selected prop |
| Arrow keys (+ `Shift`) | Nudge selected prop |
| `Escape` | Deselect |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Platform build dependencies for Tauri — see the [official prerequisites guide](https://v2.tauri.app/start/prerequisites/) (on Linux this means `webkit2gtk`, `libsoup3`, and friends)

### Run in development

```bash
npm install
npm run tauri dev
```

### Build a release binary

```bash
npm run tauri build
```

The bundled app (and installer, where applicable) will be under `src-tauri/target/release/bundle/`.

## Project structure

```
src/                React + TypeScript frontend
  components/        UI components (editor, canvas, panels, dialogs)
  store/              Zustand stores (map/editor state, app settings)
  lib/                Project I/O, PNG export, autosave, theming, etc.
  i18n/               Translation dictionaries (en / pt / es)
src-tauri/           Rust backend (Tauri shell, capabilities, icons)
```

Projects are plain folders on disk: a `project.json` describing the grid, painted cells, and props, plus an `assets/` subfolder holding the imported images. Nothing is hidden away in an app-specific database.

## Out of scope (for now)

Jaguar is intentionally a map *creation* tool, not a live VTT:

- No accounts, cloud sync, or real-time collaboration.
- No autotile/bitmask wall connections (edge-based painting covers most needs without it).
- No fog of war, dynamic lighting, or other live-session features — export a PNG and run your session in the VTT of your choice.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for how to get set up, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community guidelines. Found a security issue? Please follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

MIT — see [LICENSE](LICENSE). See [CHANGELOG.md](CHANGELOG.md) for release history.
