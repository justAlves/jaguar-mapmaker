import { tauriStorageAdapter } from "./tauriAdapter";
import type { StorageAdapter } from "./types";

/** The active storage backend. Swap this line (or make it a runtime check) when a web/cloud adapter exists. */
export const storage: StorageAdapter = tauriStorageAdapter;

export type { DirEntry, FilterSpec, StorageAdapter } from "./types";
