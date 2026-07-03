import { Application, Container, Sprite } from "pixi.js";
import { writeFile } from "@tauri-apps/plugin-fs";
import type { MapProject, ProjectLocation } from "../types";
import { parseWallKey, WALL_THICKNESS_RATIO } from "../types";
import { assetFileUrl, thumbnailPath } from "./projectIO";
import { loadTexture } from "./textureCache";
import { wallGeometry } from "./wallGeometry";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

async function buildMapApp(
  project: MapProject,
  location: ProjectLocation,
  outputWidth: number,
  outputHeight: number,
  scale: number,
): Promise<{ app: Application; root: Container }> {
  const app = new Application();
  await app.init({ width: outputWidth, height: outputHeight, background: "#00000000", backgroundAlpha: 0, antialias: true });

  const root = new Container();
  root.sortableChildren = true;
  root.scale.set(scale);
  app.stage.addChild(root);

  const floorLayer = new Container();
  floorLayer.zIndex = 0;
  const wallLayer = new Container();
  wallLayer.zIndex = 1;
  const propsLayer = new Container();
  propsLayer.zIndex = 2;
  propsLayer.sortableChildren = true;
  root.addChild(floorLayer, wallLayer, propsLayer);

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
  app.renderer.render(app.stage);

  return { app, root };
}

async function extractPngBytes(app: Application, root: Container): Promise<Uint8Array> {
  const dataUrl = app.renderer.extract.base64({ target: root, format: "png" });
  const resolved = dataUrl instanceof Promise ? await dataUrl : dataUrl;
  const base64 = resolved.slice(resolved.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function renderProjectToPngBytes(project: MapProject, location: ProjectLocation): Promise<Uint8Array> {
  const width = project.gridWidth * project.tileSize;
  const height = project.gridHeight * project.tileSize;
  const { app, root } = await buildMapApp(project, location, width, height, 1);
  try {
    return await extractPngBytes(app, root);
  } finally {
    app.destroy(true, { children: true });
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
  const scale = Math.min(1, maxDim / Math.max(fullWidth, fullHeight, 1));
  const outputWidth = Math.max(1, Math.round(fullWidth * scale));
  const outputHeight = Math.max(1, Math.round(fullHeight * scale));
  const { app, root } = await buildMapApp(project, location, outputWidth, outputHeight, scale);
  try {
    return await extractPngBytes(app, root);
  } finally {
    app.destroy(true, { children: true });
  }
}

export async function saveProjectThumbnail(project: MapProject, location: ProjectLocation): Promise<void> {
  const bytes = await renderProjectThumbnailBytes(project, location);
  await writeFile(thumbnailPath(location.folderPath), bytes);
}
