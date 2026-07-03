# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-03

Initial release.

### Added

**Map editor**
- Grid-based projects with configurable columns, rows, and tile size.
- Floor painting, cell by cell, using your own imported PNG assets.
- Wall painting snapped to a specific cell edge (top/right/bottom/left) instead of filling the whole cell — auto-detected from cursor position, or pinned manually, with a rotate-edge shortcut.
- Erase tool that removes a wall edge if one is under the cursor, otherwise the floor cell.
- Free-form prop placement, via click-to-place or drag-and-drop from the asset panel.
- Photoshop-style transform handles for props: corner/edge resize and a rotation handle, with proportional scaling on `Alt`.
- Canvas pan and zoom.
- Undo/redo for painting and prop transforms.
- Live preview ("ghost") while painting floor, walls, or dragging a prop into place.

**Assets**
- Asset library organized by category (floor / wall / props).
- Import PNGs via the native file dialog; imported files are copied into the project's `assets/` folder.
- Organize assets into folders, with a popover to move existing assets between them.
- Search/filter assets by filename and folder.

**Projects**
- Local-first storage: a project is just a `project.json` file plus an `assets/` folder — no database, no account.
- Manual save (`Ctrl+S`) and PNG export sized exactly to the map's grid dimensions, ready for any VTT (Owlbear Rodeo, Foundry, Roll20, etc.).
- Autosave, debounced after edits with a maximum wait cap, toggleable from Settings.
- Recent projects list on the start screen with live-generated thumbnails.

**Interface**
- Full keyboard shortcut set: tool switching, undo/redo, save, duplicate, delete, nudge, deselect, grid toggle.
- Photoshop/Clip Studio-style icon tool rail with hover tooltips showing each shortcut.
- Contextual options bar (e.g. the wall-edge picker only appears while the wall tool is active).
- Canvas status bar showing grid size, tile size, hovered cell, and zoom level.
- Settings dialog: theme (light / dark / system) and language (English / Português / Español), both switchable live.
- Full interface translation across English, Português, and Español.

**Branding**
- Project renamed to **Jaguar**, with a custom vector icon and full desktop icon set (Windows `.ico`, macOS `.icns`, and all required PNG sizes).

**Project infrastructure**
- MIT license, README, CONTRIBUTING, CODE_OF_CONDUCT, and SECURITY docs (English / Português / Español).
- GitHub Actions release pipeline building Windows and Linux installers on tag push.
