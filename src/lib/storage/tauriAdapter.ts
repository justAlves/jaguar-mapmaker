import { open, save } from "@tauri-apps/plugin-dialog";
import { mkdir, writeTextFile, readTextFile, writeFile, copyFile, exists, readDir } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { appConfigDir } from "@tauri-apps/api/path";
import type { DirEntry, FilterSpec, StorageAdapter } from "./types";

function join(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/");
}

export const tauriStorageAdapter: StorageAdapter = {
  join,

  readTextFile: (path) => readTextFile(path),
  writeTextFile: (path, contents) => writeTextFile(path, contents),
  writeBinaryFile: (path, contents) => writeFile(path, contents),
  copyFile: (source, destination) => copyFile(source, destination),
  exists: (path) => exists(path),
  mkdir: (path) => mkdir(path, { recursive: true }),
  readDir: async (path): Promise<DirEntry[]> => {
    const entries = await readDir(path);
    return entries.map((e) => ({ name: e.name ?? "", isFile: e.isFile }));
  },

  configDir: () => appConfigDir(),

  fileUrl: (path) => convertFileSrc(path),

  pickFolder: async (title) => {
    const selected = await open({ directory: true, multiple: false, title });
    return typeof selected === "string" ? selected : null;
  },

  pickFile: async (title, filters: FilterSpec[]) => {
    const selected = await open({ multiple: false, title, filters });
    return typeof selected === "string" ? selected : null;
  },

  pickFiles: async (title, filters: FilterSpec[]) => {
    const selected = await open({ multiple: true, title, filters });
    if (!selected) return null;
    return Array.isArray(selected) ? selected : [selected];
  },

  pickSaveFile: async (title, defaultPath, filters: FilterSpec[]) => {
    const destPath = await save({ title, defaultPath, filters });
    return destPath ?? null;
  },
};
