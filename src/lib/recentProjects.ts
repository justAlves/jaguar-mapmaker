import { storage } from "./storage";

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
  const dir = await storage.configDir();
  await storage.mkdir(dir);
  return storage.join(dir, RECENTS_FILE_NAME);
}

export async function getRecentProjects(): Promise<RecentProjectEntry[]> {
  try {
    const filePath = await recentsFilePath();
    if (!(await storage.exists(filePath))) return [];
    const text = await storage.readTextFile(filePath);
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
  await storage.writeTextFile(filePath, JSON.stringify(trimmed, null, 2));
}

export async function removeRecentProject(filePath: string): Promise<void> {
  const list = await getRecentProjects();
  const filtered = list.filter((e) => e.filePath !== filePath);
  const target = await recentsFilePath();
  await storage.writeTextFile(target, JSON.stringify(filtered, null, 2));
}
