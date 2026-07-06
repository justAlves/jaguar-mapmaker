import type { AssetRef, ProjectLocation } from "../types";
import { storage } from "./storage";

const THUMB_MAX_SIZE = 160;
// Deliberately not dot-prefixed: Tauri's fs scope matcher requires a literal leading
// dot in the glob pattern to match hidden files, which our broad "**" scope doesn't have.
const THUMB_DIR_NAME = "thumbs";
const MAX_CONCURRENT_GENERATIONS = 3;

function thumbDir(location: ProjectLocation, asset: AssetRef): string {
  return storage.join(location.folderPath, "assets", asset.category, THUMB_DIR_NAME);
}

function thumbPath(location: ProjectLocation, asset: AssetRef): string {
  return storage.join(thumbDir(location, asset), asset.relativePath);
}

const urlCache = new Map<string, Promise<string>>();
let activeGenerations = 0;
const queue: (() => void)[] = [];

function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeGenerations++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          activeGenerations--;
          queue.shift()?.();
        });
    };
    if (activeGenerations < MAX_CONCURRENT_GENERATIONS) run();
    else queue.push(run);
  });
}

async function generateThumbnail(sourceUrl: string, destPath: string, destDir: string): Promise<void> {
  const img = new Image();
  img.src = sourceUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`failed to load image: ${sourceUrl}`));
  });

  const scale = Math.min(1, THUMB_MAX_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("failed to encode thumbnail");

  await storage.mkdir(destDir);
  await storage.writeBinaryFile(destPath, new Uint8Array(await blob.arrayBuffer()));
}

/**
 * Returns a URL for a small cached thumbnail of the asset, generating and
 * persisting it to disk on first use. Falls back to the full-res URL if
 * generation fails so the grid never ends up blank.
 */
export function thumbnailUrl(location: ProjectLocation, asset: AssetRef, fullResUrl: string): Promise<string> {
  const dest = thumbPath(location, asset);
  const cached = urlCache.get(dest);
  if (cached) return cached;

  const promise = withConcurrencyLimit(async () => {
    if (await storage.exists(dest)) return storage.fileUrl(dest);
    await generateThumbnail(fullResUrl, dest, thumbDir(location, asset));
    return storage.fileUrl(dest);
  }).catch((err) => {
    urlCache.delete(dest);
    throw err;
  });

  urlCache.set(dest, promise);
  return promise;
}
