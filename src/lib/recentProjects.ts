import { appConfigDir, join as pathJoin } from "@tauri-apps/api/path";
import { mkdir, readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";

const RECENTS_FILE_NAME = "recent-projects.json";
const MAX_RECENTS = 12;

export interface RecentProjectEntry {
  name: string;
  filePath: string;
  folderPath: string;
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  lastOpened: number;
}

async function recentsFilePath(): Promise<string> {
  const dir = await appConfigDir();
  await mkdir(dir, { recursive: true });
  return pathJoin(dir, RECENTS_FILE_NAME);
}

export async function getRecentProjects(): Promise<RecentProjectEntry[]> {
  try {
    const filePath = await recentsFilePath();
    if (!(await exists(filePath))) return [];
    const text = await readTextFile(filePath);
    const list = JSON.parse(text) as RecentProjectEntry[];
    return [...list].sort((a, b) => b.lastOpened - a.lastOpened);
  } catch (err) {
    console.error("Failed to read recent projects:", err);
    return [];
  }
}

export async function touchRecentProject(entry: Omit<RecentProjectEntry, "lastOpened">): Promise<void> {
  const list = await getRecentProjects();
  const filtered = list.filter((e) => e.filePath !== entry.filePath);
  filtered.unshift({ ...entry, lastOpened: Date.now() });
  const trimmed = filtered.slice(0, MAX_RECENTS);
  const filePath = await recentsFilePath();
  await writeTextFile(filePath, JSON.stringify(trimmed, null, 2));
}

export async function removeRecentProject(filePath: string): Promise<void> {
  const list = await getRecentProjects();
  const filtered = list.filter((e) => e.filePath !== filePath);
  const target = await recentsFilePath();
  await writeTextFile(target, JSON.stringify(filtered, null, 2));
}
