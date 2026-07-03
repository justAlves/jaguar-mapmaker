import type { Renderer } from "pixi.js";

// Creating a second PixiJS Application means a second WebGL context. On systems
// where GPU compositing is already fragile (see the WEBKIT_DISABLE_* workarounds
// in src-tauri/src/main.rs), spinning up a second context to render a thumbnail
// can knock out the main canvas's context, leaving it blank. Reusing the main
// canvas's renderer for offscreen extraction avoids creating that second context.
let currentRenderer: Renderer | null = null;

export function registerSharedRenderer(renderer: Renderer | null): void {
  currentRenderer = renderer;
}

export function getSharedRenderer(): Renderer | null {
  return currentRenderer;
}
