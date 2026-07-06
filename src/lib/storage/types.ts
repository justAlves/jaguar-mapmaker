/**
 * Everything the app needs to persist and pick files, behind one seam. Today the only
 * implementation is `tauriAdapter.ts` (local filesystem via Tauri's fs/dialog plugins) — the
 * app is offline-first, Obsidian-style: a project/session is just files on disk, no account
 * needed. A future paid "cloud sync" adds a second implementation of this same interface
 * (e.g. backed by an HTTP API + object storage) without the rest of the app — stores,
 * components, canvas rendering — knowing the difference.
 */

export interface DirEntry {
  name: string;
  isFile: boolean;
}

export interface FilterSpec {
  name: string;
  extensions: string[];
}

export interface StorageAdapter {
  /** Joins path segments with a forward slash, collapsing doubled slashes. Pure string logic — same on every adapter. */
  join(...parts: string[]): string;

  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, contents: string): Promise<void>;
  writeBinaryFile(path: string, contents: Uint8Array): Promise<void>;
  copyFile(source: string, destination: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /** Always recursive — nothing in this app needs a non-recursive mkdir. */
  mkdir(path: string): Promise<void>;
  readDir(path: string): Promise<DirEntry[]>;

  /** Directory for app-level config/state that isn't tied to a specific project (recent-files lists, the global asset library). */
  configDir(): Promise<string>;

  /** A URL an <img>/texture loader can use to display a local file. */
  fileUrl(path: string): string;

  pickFolder(title: string): Promise<string | null>;
  pickFile(title: string, filters: FilterSpec[]): Promise<string | null>;
  pickFiles(title: string, filters: FilterSpec[]): Promise<string[] | null>;
  pickSaveFile(title: string, defaultPath: string, filters: FilterSpec[]): Promise<string | null>;
}
