import { open, save } from "@tauri-apps/plugin-dialog";
import {
  mkdir,
  writeTextFile,
  readTextFile,
  writeFile,
  copyFile,
  exists,
  readDir,
} from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { nanoid } from "nanoid";
import type { AssetCategory, AssetRef, MapProject, ProjectLocation } from "../types";

const PROJECT_FILE_NAME = "project.json";

function join(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/");
}

export async function pickFolderForNewProject(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false, title: "Escolha a pasta do projeto" });
  return typeof selected === "string" ? selected : null;
}

export async function createProjectOnDisk(
  project: MapProject,
  parentFolder: string,
): Promise<ProjectLocation> {
  const folderPath = join(parentFolder, project.name);
  const filePath = join(folderPath, PROJECT_FILE_NAME);

  await mkdir(folderPath, { recursive: true });
  await mkdir(join(folderPath, "assets", "floor"), { recursive: true });
  await mkdir(join(folderPath, "assets", "wall"), { recursive: true });
  await mkdir(join(folderPath, "assets", "prop"), { recursive: true });

  await writeTextFile(filePath, JSON.stringify(project, null, 2));

  return { folderPath, filePath };
}

export async function saveProject(project: MapProject, location: ProjectLocation): Promise<void> {
  await writeTextFile(location.filePath, JSON.stringify(project, null, 2));
}

export async function pickProjectFileToOpen(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    title: "Abrir projeto",
    filters: [{ name: "Jaguar Project", extensions: ["json"] }],
  });
  return typeof selected === "string" ? selected : null;
}

export async function loadProject(filePath: string): Promise<{ project: MapProject; location: ProjectLocation }> {
  const text = await readTextFile(filePath);
  const project = JSON.parse(text) as MapProject;
  const folderPath = filePath.slice(0, Math.max(0, filePath.length - PROJECT_FILE_NAME.length - 1));
  return { project, location: { folderPath, filePath } };
}

export async function importAssets(
  category: AssetCategory,
  location: ProjectLocation,
  folder?: string,
): Promise<AssetRef[]> {
  const selected = await open({
    multiple: true,
    title: "Importar imagens",
    filters: [{ name: "Imagens", extensions: ["png"] }],
  });
  if (!selected) return [];
  const paths = Array.isArray(selected) ? selected : [selected];

  const created: AssetRef[] = [];
  const destDir = join(location.folderPath, "assets", category);
  await mkdir(destDir, { recursive: true });
  for (const sourcePath of paths) {
    const fileName = sourcePath.split(/[\\/]/).pop() ?? "asset.png";
    let destName = fileName;
    let destPath = join(destDir, destName);
    let counter = 1;
    while (await exists(destPath)) {
      const dotIdx = fileName.lastIndexOf(".");
      const base = dotIdx >= 0 ? fileName.slice(0, dotIdx) : fileName;
      const ext = dotIdx >= 0 ? fileName.slice(dotIdx) : "";
      destName = `${base}_${counter}${ext}`;
      destPath = join(destDir, destName);
      counter++;
    }
    await copyFile(sourcePath, destPath);
    created.push({
      id: nanoid(),
      category,
      fileName: destName,
      relativePath: destName,
      folder: folder?.trim() || undefined,
    });
  }
  return created;
}

export function assetFileUrl(location: ProjectLocation, asset: AssetRef): string {
  const path = join(location.folderPath, "assets", asset.category, asset.relativePath);
  return convertFileSrc(path);
}

// Deliberately not dot-prefixed: Tauri's fs scope matcher requires a literal leading
// dot in the glob pattern to match hidden files, which our broad "**" scope doesn't have.
const THUMBNAIL_FILE_NAME = "thumbnail.png";

export function thumbnailPath(folderPath: string): string {
  return join(folderPath, THUMBNAIL_FILE_NAME);
}

export function thumbnailFileUrl(folderPath: string): string {
  return convertFileSrc(thumbnailPath(folderPath));
}

export async function exportMapAsPng(project: MapProject, pngBytes: Uint8Array): Promise<boolean> {
  const suggested = `${project.name}_tile${project.tileSize}.png`;
  const destPath = await save({
    title: "Exportar mapa como PNG",
    defaultPath: suggested,
    filters: [{ name: "PNG", extensions: ["png"] }],
  });
  if (!destPath) return false;
  await writeFile(destPath, pngBytes);
  return true;
}

export async function listOrphanCheck(location: ProjectLocation, category: AssetCategory): Promise<string[]> {
  const dir = join(location.folderPath, "assets", category);
  if (!(await exists(dir))) return [];
  const entries = await readDir(dir);
  return entries.filter((e) => e.isFile).map((e) => e.name ?? "");
}
