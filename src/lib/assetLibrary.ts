import { nanoid } from "nanoid";
import type { AssetCategory, AssetRef, ProjectLocation } from "../types";
import { importAssets, assetFileUrl } from "./projectIO";
import { storage } from "./storage";

const LIBRARY_DIR_NAME = "asset-library";
const LIBRARY_FILE_NAME = "library.json";

let cachedLocation: ProjectLocation | null = null;

/**
 * The global library is stored under the app config dir and reuses the exact same
 * on-disk layout as a project (assets/<category>/...), so it can be read/written with
 * the same helpers (importAssets, assetFileUrl, thumbnailUrl) as a regular project.
 */
export async function libraryLocation(): Promise<ProjectLocation> {
  if (cachedLocation) return cachedLocation;
  const configDir = await storage.configDir();
  const folderPath = storage.join(configDir, LIBRARY_DIR_NAME);
  const filePath = storage.join(folderPath, LIBRARY_FILE_NAME);
  await storage.mkdir(storage.join(folderPath, "assets", "floor"));
  await storage.mkdir(storage.join(folderPath, "assets", "wall"));
  await storage.mkdir(storage.join(folderPath, "assets", "prop"));
  cachedLocation = { folderPath, filePath };
  return cachedLocation;
}

export async function loadLibraryAssets(): Promise<AssetRef[]> {
  const location = await libraryLocation();
  if (!(await storage.exists(location.filePath))) return [];
  try {
    return JSON.parse(await storage.readTextFile(location.filePath)) as AssetRef[];
  } catch {
    return [];
  }
}

async function saveLibraryAssets(assets: AssetRef[]): Promise<void> {
  const location = await libraryLocation();
  await storage.writeTextFile(location.filePath, JSON.stringify(assets, null, 2));
}

export async function importToLibrary(category: AssetCategory, folder?: string): Promise<AssetRef[]> {
  const location = await libraryLocation();
  const created = await importAssets(category, location, folder);
  if (created.length === 0) return loadLibraryAssets();
  const next = [...(await loadLibraryAssets()), ...created];
  await saveLibraryAssets(next);
  return next;
}

export async function setLibraryAssetFolder(assetId: string, folder: string | null): Promise<AssetRef[]> {
  const next = (await loadLibraryAssets()).map((a) => (a.id === assetId ? { ...a, folder: folder ?? undefined } : a));
  await saveLibraryAssets(next);
  return next;
}

export async function toggleLibraryAssetFavorite(assetId: string): Promise<AssetRef[]> {
  const next = (await loadLibraryAssets()).map((a) => (a.id === assetId ? { ...a, favorite: !a.favorite } : a));
  await saveLibraryAssets(next);
  return next;
}

export async function removeLibraryAsset(assetId: string): Promise<AssetRef[]> {
  const next = (await loadLibraryAssets()).filter((a) => a.id !== assetId);
  await saveLibraryAssets(next);
  return next;
}

export function libraryAssetFileUrl(libLocation: ProjectLocation, asset: AssetRef): string {
  return assetFileUrl(libLocation, asset);
}

/**
 * Copies a library asset's file into a project's assets folder and returns a fresh
 * AssetRef local to that project (tagged with libraryId so re-clicking it later can
 * detect it's already been added instead of copying a duplicate).
 */
export async function addLibraryAssetToProject(
  libLocation: ProjectLocation,
  projectLocation: ProjectLocation,
  asset: AssetRef,
): Promise<AssetRef> {
  const destDir = storage.join(projectLocation.folderPath, "assets", asset.category);
  await storage.mkdir(destDir);
  const sourcePath = storage.join(libLocation.folderPath, "assets", asset.category, asset.relativePath);

  let destName = asset.relativePath;
  let destPath = storage.join(destDir, destName);
  let counter = 1;
  while (await storage.exists(destPath)) {
    const dotIdx = asset.relativePath.lastIndexOf(".");
    const base = dotIdx >= 0 ? asset.relativePath.slice(0, dotIdx) : asset.relativePath;
    const ext = dotIdx >= 0 ? asset.relativePath.slice(dotIdx) : "";
    destName = `${base}_${counter}${ext}`;
    destPath = storage.join(destDir, destName);
    counter++;
  }
  await storage.copyFile(sourcePath, destPath);

  return {
    id: nanoid(),
    category: asset.category,
    fileName: destName,
    relativePath: destName,
    folder: asset.folder,
    libraryId: asset.id,
  };
}
