import { Container, Graphics, Sprite } from "pixi.js";
import type { MapProject, ProjectLocation } from "../types";
import { parseWallKey, WALL_THICKNESS_RATIO } from "../types";
import { assetFileUrl, thumbnailPath } from "./projectIO";
import { loadTexture } from "./textureCache";
import { getSharedRenderer } from "./sharedRenderer";
import { wallGeometry } from "./wallGeometry";
import { drawLightGlow } from "./lightRender";
import { storage } from "./storage";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Floor/wall sprites are stretched to fill exactly one tileSize cell on screen, so a
// source art asset with more pixels than the tile is worth is being downsampled at
// resolution 1 — the editor never shows that loss because zooming in re-renders
// straight from the (still-loaded) source texture, but a flat PNG export bakes the
// resolution in. We pick an export resolution that matches the highest-resolution
// tile art actually used, so the exported file holds as much detail as the editor
// can show.
const MIN_EXPORT_SCALE = 4;
const MAX_EXPORT_SCALE = 16;
// Keep the output within common GPU render-target/texture size limits.
const MAX_EXPORT_DIMENSION = 16384;

async function computeExportScale(project: MapProject, location: ProjectLocation): Promise<number> {
  const assetById = new Map(project.assets.map((a) => [a.id, a]));
  const usedAssetIds = new Set<string>([...Object.values(project.floorCells), ...Object.values(project.wallCells)]);

  let maxRatio = MIN_EXPORT_SCALE;
  await Promise.all(
    [...usedAssetIds].map(async (assetId) => {
      const asset = assetById.get(assetId);
      if (!asset) return;
      const texture = await loadTexture(assetFileUrl(location, asset));
      const ratio = Math.max(texture.width, texture.height) / project.tileSize;
      if (ratio > maxRatio) maxRatio = ratio;
    }),
  );

  const scale = Math.min(MAX_EXPORT_SCALE, maxRatio);
  const fullWidth = project.gridWidth * project.tileSize * scale;
  const fullHeight = project.gridHeight * project.tileSize * scale;
  const overshoot = Math.max(fullWidth, fullHeight, 1) / MAX_EXPORT_DIMENSION;
  return overshoot > 1 ? scale / overshoot : scale;
}

// Renders offscreen using the map canvas's existing WebGL renderer instead of
// spinning up a second PixiJS Application (i.e. a second WebGL context) — see
// sharedRenderer.ts for why that was crashing the visible canvas.
//
// The container is always built at native (1:1 tileSize) world-unit coordinates.
// Output pixel density is controlled separately via `extract`'s `resolution` option
// (see extractPngBytes) — generateTexture computes the capture region from the
// container's *local* bounds, which do not include the container's own transform,
// so scaling this root would silently be ignored rather than resizing the output.
export async function buildMapContainer(project: MapProject, location: ProjectLocation): Promise<Container> {
  const root = new Container();
  root.sortableChildren = true;

  const floorLayer = new Container();
  floorLayer.zIndex = 0;
  const wallLayer = new Container();
  wallLayer.zIndex = 1;
  const propsLayer = new Container();
  propsLayer.zIndex = 2;
  propsLayer.sortableChildren = true;
  const lightsLayer = new Container();
  lightsLayer.zIndex = 3;
  lightsLayer.blendMode = "add";
  root.addChild(floorLayer, wallLayer, propsLayer, lightsLayer);

  const assetById = new Map(project.assets.map((a) => [a.id, a]));

  const cellJobs: Promise<void>[] = [];
  for (const [key, assetId] of Object.entries(project.floorCells)) {
    const asset = assetById.get(assetId);
    if (!asset) continue;
    const [x, y] = key.split(",").map(Number);
    cellJobs.push(
      loadTexture(assetFileUrl(location, asset)).then((texture) => {
        const sprite = new Sprite(texture);
        sprite.x = x * project.tileSize;
        sprite.y = y * project.tileSize;
        sprite.width = project.tileSize;
        sprite.height = project.tileSize;
        floorLayer.addChild(sprite);
      }),
    );
  }
  for (const [key, assetId] of Object.entries(project.wallCells)) {
    const asset = assetById.get(assetId);
    if (!asset) continue;
    const { x, y, edge } = parseWallKey(key);
    const geo = wallGeometry(x, y, edge, project.tileSize);
    cellJobs.push(
      loadTexture(assetFileUrl(location, asset)).then((texture) => {
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.x = geo.cx;
        sprite.y = geo.cy;
        sprite.rotation = geo.rotation;
        sprite.width = project.tileSize;
        sprite.height = project.tileSize * WALL_THICKNESS_RATIO;
        wallLayer.addChild(sprite);
      }),
    );
  }
  for (const prop of project.props) {
    const asset = assetById.get(prop.assetId);
    if (!asset) continue;
    cellJobs.push(
      loadTexture(assetFileUrl(location, asset)).then((texture) => {
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.x = prop.x;
        sprite.y = prop.y;
        sprite.rotation = degToRad(prop.rotation);
        sprite.scale.set(prop.scaleX, prop.scaleY);
        sprite.zIndex = prop.zIndex;
        propsLayer.addChild(sprite);
      }),
    );
  }

  await Promise.all(cellJobs);
  propsLayer.sortChildren();

  for (const light of project.lights) {
    const gfx = new Graphics();
    gfx.x = light.x;
    gfx.y = light.y;
    gfx.rotation = degToRad(light.rotation);
    drawLightGlow(gfx, light);
    lightsLayer.addChild(gfx);
  }

  return root;
}

async function extractPngBytes(root: Container, resolution: number): Promise<Uint8Array> {
  const renderer = getSharedRenderer();
  if (!renderer) throw new Error("Map renderer is not ready yet");
  const dataUrl = renderer.extract.base64({ target: root, format: "png", resolution });
  const resolved = dataUrl instanceof Promise ? await dataUrl : dataUrl;
  const base64 = resolved.slice(resolved.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function renderProjectToPngBytes(project: MapProject, location: ProjectLocation): Promise<Uint8Array> {
  const resolution = await computeExportScale(project, location);
  const root = await buildMapContainer(project, location);
  try {
    return await extractPngBytes(root, resolution);
  } finally {
    root.destroy({ children: true });
  }
}

/** Renders a small preview (longest side capped at maxDim) for use in the recent-projects list. */
export async function renderProjectThumbnailBytes(
  project: MapProject,
  location: ProjectLocation,
  maxDim = 320,
): Promise<Uint8Array> {
  const fullWidth = project.gridWidth * project.tileSize;
  const fullHeight = project.gridHeight * project.tileSize;
  const resolution = Math.min(1, maxDim / Math.max(fullWidth, fullHeight, 1));
  const root = await buildMapContainer(project, location);
  try {
    return await extractPngBytes(root, resolution);
  } finally {
    root.destroy({ children: true });
  }
}

export async function saveProjectThumbnail(project: MapProject, location: ProjectLocation): Promise<void> {
  const bytes = await renderProjectThumbnailBytes(project, location);
  await storage.writeBinaryFile(thumbnailPath(location.folderPath), bytes);
}
