import { storage } from "./storage";

const RECENTS_FILE_NAME = "recent-sessions.json";
const MAX_RECENTS = 12;

export interface RecentSessionEntry {
  name: string;
  filePath: string;
  folderPath: string;
  mapFilePath: string;
  lastOpened: number;
}

async function recentsFilePath(): Promise<string> {
  const dir = await storage.configDir();
  await storage.mkdir(dir);
  return storage.join(dir, RECENTS_FILE_NAME);
}

export async function getRecentSessions(): Promise<RecentSessionEntry[]> {
  try {
    const filePath = await recentsFilePath();
    if (!(await storage.exists(filePath))) return [];
    const text = await storage.readTextFile(filePath);
    const list = JSON.parse(text) as RecentSessionEntry[];
    return [...list].sort((a, b) => b.lastOpened - a.lastOpened);
  } catch (err) {
    console.error("Failed to read recent sessions:", err);
    return [];
  }
}

export async function touchRecentSession(entry: Omit<RecentSessionEntry, "lastOpened">): Promise<void> {
  const list = await getRecentSessions();
  const filtered = list.filter((e) => e.filePath !== entry.filePath);
  filtered.unshift({ ...entry, lastOpened: Date.now() });
  const trimmed = filtered.slice(0, MAX_RECENTS);
  const filePath = await recentsFilePath();
  await storage.writeTextFile(filePath, JSON.stringify(trimmed, null, 2));
}

export async function removeRecentSession(filePath: string): Promise<void> {
  const list = await getRecentSessions();
  const filtered = list.filter((e) => e.filePath !== filePath);
  const target = await recentsFilePath();
  await storage.writeTextFile(target, JSON.stringify(filtered, null, 2));
}
