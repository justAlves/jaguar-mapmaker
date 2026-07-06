import { nanoid } from "nanoid";
import type { AssetCategory, AssetRef, MapProject, ProjectLocation } from "../types";
import { storage } from "./storage";

const PROJECT_FILE_NAME = "project.json";

export async function pickFolderForNewProject(): Promise<string | null> {
  return storage.pickFolder("Escolha a pasta do projeto");
}

export async function createProjectOnDisk(
  project: MapProject,
  parentFolder: string,
): Promise<ProjectLocation> {
  const folderPath = storage.join(parentFolder, project.name);
  const filePath = storage.join(folderPath, PROJECT_FILE_NAME);

  await storage.mkdir(storage.join(folderPath, "assets", "floor"));
  await storage.mkdir(storage.join(folderPath, "assets", "wall"));
  await storage.mkdir(storage.join(folderPath, "assets", "prop"));

  await storage.writeTextFile(filePath, JSON.stringify(project, null, 2));

  return { folderPath, filePath };
}

export async function saveProject(project: MapProject, location: ProjectLocation): Promise<void> {
  await storage.writeTextFile(location.filePath, JSON.stringify(project, null, 2));
}

export async function pickProjectFileToOpen(): Promise<string | null> {
  return storage.pickFile("Abrir projeto", [{ name: "Jaguar Project", extensions: ["json"] }]);
}

export async function loadProject(filePath: string): Promise<{ project: MapProject; location: ProjectLocation }> {
  const text = await storage.readTextFile(filePath);
  const project = JSON.parse(text) as MapProject;
  project.lights = project.lights ?? []; // older saved projects predate the lighting feature
  const folderPath = filePath.slice(0, Math.max(0, filePath.length - PROJECT_FILE_NAME.length - 1));
  return { project, location: { folderPath, filePath } };
}

export async function importAssets(
  category: AssetCategory,
  location: ProjectLocation,
  folder?: string,
): Promise<AssetRef[]> {
  const paths = await storage.pickFiles("Importar imagens", [{ name: "Imagens", extensions: ["png"] }]);
  if (!paths) return [];

  const created: AssetRef[] = [];
  const destDir = storage.join(location.folderPath, "assets", category);
  await storage.mkdir(destDir);
  for (const sourcePath of paths) {
    const fileName = sourcePath.split(/[\\/]/).pop() ?? "asset.png";
    let destName = fileName;
    let destPath = storage.join(destDir, destName);
    let counter = 1;
    while (await storage.exists(destPath)) {
      const dotIdx = fileName.lastIndexOf(".");
      const base = dotIdx >= 0 ? fileName.slice(0, dotIdx) : fileName;
      const ext = dotIdx >= 0 ? fileName.slice(dotIdx) : "";
      destName = `${base}_${counter}${ext}`;
      destPath = storage.join(destDir, destName);
      counter++;
    }
    await storage.copyFile(sourcePath, destPath);
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
  const path = storage.join(location.folderPath, "assets", asset.category, asset.relativePath);
  return storage.fileUrl(path);
}

// Deliberately not dot-prefixed: Tauri's fs scope matcher requires a literal leading
// dot in the glob pattern to match hidden files, which our broad "**" scope doesn't have.
const THUMBNAIL_FILE_NAME = "thumbnail.png";

export function thumbnailPath(folderPath: string): string {
  return storage.join(folderPath, THUMBNAIL_FILE_NAME);
}

export function thumbnailFileUrl(folderPath: string): string {
  return storage.fileUrl(thumbnailPath(folderPath));
}

export async function exportMapAsPng(project: MapProject, pngBytes: Uint8Array): Promise<boolean> {
  const suggested = `${project.name}_tile${project.tileSize}.png`;
  const destPath = await storage.pickSaveFile("Exportar mapa como PNG", suggested, [{ name: "PNG", extensions: ["png"] }]);
  if (!destPath) return false;
  await storage.writeBinaryFile(destPath, pngBytes);
  return true;
}

export async function listOrphanCheck(location: ProjectLocation, category: AssetCategory): Promise<string[]> {
  const dir = storage.join(location.folderPath, "assets", category);
  if (!(await storage.exists(dir))) return [];
  const entries = await storage.readDir(dir);
  return entries.filter((e) => e.isFile).map((e) => e.name ?? "");
}
