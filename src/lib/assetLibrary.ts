import { appConfigDir } from "@tauri-apps/api/path";
import { mkdir, readTextFile, writeTextFile, exists, copyFile } from "@tauri-apps/plugin-fs";
import { nanoid } from "nanoid";
import type { AssetCategory, AssetRef, ProjectLocation } from "../types";
import { importAssets, assetFileUrl } from "./projectIO";

const LIBRARY_DIR_NAME = "asset-library";
const LIBRARY_FILE_NAME = "library.json";

function join(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/");
}

let cachedLocation: ProjectLocation | null = null;

/**
 * The global library is stored under the app config dir and reuses the exact same
 * on-disk layout as a project (assets/<category>/...), so it can be read/written with
 * the same helpers (importAssets, assetFileUrl, thumbnailUrl) as a regular project.
 */
export async function libraryLocation(): Promise<ProjectLocation> {
  if (cachedLocation) return cachedLocation;
  const configDir = await appConfigDir();
  const folderPath = join(configDir, LIBRARY_DIR_NAME);
  const filePath = join(folderPath, LIBRARY_FILE_NAME);
  await mkdir(join(folderPath, "assets", "floor"), { recursive: true });
  await mkdir(join(folderPath, "assets", "wall"), { recursive: true });
  await mkdir(join(folderPath, "assets", "prop"), { recursive: true });
  cachedLocation = { folderPath, filePath };
  return cachedLocation;
}

export async function loadLibraryAssets(): Promise<AssetRef[]> {
  const location = await libraryLocation();
  if (!(await exists(location.filePath))) return [];
  try {
    return JSON.parse(await readTextFile(location.filePath)) as AssetRef[];
  } catch {
    return [];
  }
}

async function saveLibraryAssets(assets: AssetRef[]): Promise<void> {
  const location = await libraryLocation();
  await writeTextFile(location.filePath, JSON.stringify(assets, null, 2));
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
  const destDir = join(projectLocation.folderPath, "assets", asset.category);
  await mkdir(destDir, { recursive: true });
  const sourcePath = join(libLocation.folderPath, "assets", asset.category, asset.relativePath);

  let destName = asset.relativePath;
  let destPath = join(destDir, destName);
  let counter = 1;
  while (await exists(destPath)) {
    const dotIdx = asset.relativePath.lastIndexOf(".");
    const base = dotIdx >= 0 ? asset.relativePath.slice(0, dotIdx) : asset.relativePath;
    const ext = dotIdx >= 0 ? asset.relativePath.slice(dotIdx) : "";
    destName = `${base}_${counter}${ext}`;
    destPath = join(destDir, destName);
    counter++;
  }
  await copyFile(sourcePath, destPath);

  return {
    id: nanoid(),
    category: asset.category,
    fileName: destName,
    relativePath: destName,
    folder: asset.folder,
    libraryId: asset.id,
  };
}
