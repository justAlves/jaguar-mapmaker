# Contributing to Jaguar

*[Português](CONTRIBUTING.pt-BR.md) · [Español](CONTRIBUTING.es.md)*

Thanks for considering a contribution! Jaguar is a small, focused tool, so the bar for "does this fit" matters more than the bar for code polish — feel free to open an issue to discuss a feature before investing time in a big PR.

## Getting set up

You'll need:

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Tauri's platform build dependencies — see the [official prerequisites guide](https://v2.tauri.app/start/prerequisites/)

Then:

```bash
npm install
npm run tauri dev
```

This starts the app with hot-reload for the frontend (React/TypeScript changes apply instantly) and automatic rebuilds for the Rust side (changes to `src-tauri/` trigger a recompile + relaunch).

## Before opening a PR

- Run `npm run build` — this runs the TypeScript compiler in strict mode followed by the production Vite build. There's no separate lint step configured, so this is the baseline check.
- If you touched Rust code, run `cargo check` inside `src-tauri/`.
- **Actually exercise the change** in the running app. This project doesn't have an automated test suite yet, so manual verification (open a project, do the thing, confirm it works) is the main safety net. Mention what you tested in the PR description.
- Keep PRs scoped to one change. Drive-by refactors mixed into a feature PR make review much harder.

## Code style

- TypeScript strict mode is on; keep it that way (no `any` escape hatches without a good reason).
- Match the existing patterns: Zustand for state, plain CSS with the design tokens in `src/App.css` (no CSS-in-JS, no utility framework), functional React components with hooks.
- New user-facing strings must go through the i18n system (`useT()` + `src/i18n/translations.ts`) with all three languages (`en`, `pt`, `es`) filled in — TypeScript will fail the build if a key is missing from any dictionary.
- Comments should explain *why*, not *what* — see the existing codebase for the tone.

## Reporting bugs / requesting features

Open a GitHub issue. For bugs, include your OS, what you expected, what happened instead, and steps to reproduce. For features, a short description of the use case is more useful than a full design — happy to iterate together on the approach.

## Security issues

Please don't open a public issue for security vulnerabilities — see [SECURITY.md](SECURITY.md) instead.
