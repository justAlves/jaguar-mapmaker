import { open } from "@tauri-apps/plugin-dialog";
import { mkdir, writeTextFile, readTextFile, copyFile, exists } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { nanoid } from "nanoid";
import type { CharacterToken, PropInstance, SessionLocation, TokenAsset, VttMapSlot, VttSession } from "../types";

const SESSION_FILE_NAME = "session.json";
export const DEFAULT_FOG_ALPHA = 0.5;
/** Dark dungeon by default: nothing visible without a light source. Raise for outdoor/daytime maps. */
export const DEFAULT_AMBIENT_LIGHT = 0;

export function createMapSlot(mapFilePath: string, name: string): VttMapSlot {
  return {
    id: nanoid(),
    name,
    mapFilePath,
    characters: [],
    props: [],
    fogAlpha: DEFAULT_FOG_ALPHA,
    ambientLight: DEFAULT_AMBIENT_LIGHT,
    initiative: [],
    activeTurnId: null,
    round: 0,
  };
}

function join(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/");
}

export async function pickFolderForNewSession(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false, title: "Escolha a pasta da sessão" });
  return typeof selected === "string" ? selected : null;
}

export async function pickMapFileForSession(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    title: "Escolha o mapa da sessão",
    filters: [{ name: "Jaguar Project", extensions: ["json"] }],
  });
  return typeof selected === "string" ? selected : null;
}

export async function createSessionOnDisk(session: VttSession, parentFolder: string): Promise<SessionLocation> {
  const folderPath = join(parentFolder, session.name);
  const filePath = join(folderPath, SESSION_FILE_NAME);

  await mkdir(join(folderPath, "tokens"), { recursive: true });
  await writeTextFile(filePath, JSON.stringify(session, null, 2));

  return { folderPath, filePath };
}

export async function saveSession(session: VttSession, location: SessionLocation): Promise<void> {
  await writeTextFile(location.filePath, JSON.stringify(session, null, 2));
}

export async function pickSessionFileToOpen(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    title: "Abrir sessão",
    filters: [{ name: "Jaguar Session", extensions: ["json"] }],
  });
  return typeof selected === "string" ? selected : null;
}

function normalizeCharacters(characters: unknown): CharacterToken[] {
  return ((characters as Partial<CharacterToken>[]) ?? []).map((c) => ({
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    light: null,
    ...c,
  })) as CharacterToken[];
}

export async function loadSession(filePath: string): Promise<{ session: VttSession; location: SessionLocation }> {
  const text = await readTextFile(filePath);
  const raw = JSON.parse(text) as VttSession & {
    // pre-multi-map session shape, kept only for migration below
    mapFilePath?: string;
    characters?: CharacterToken[];
    props?: PropInstance[];
    fogAlpha?: number;
    ambientLight?: number;
  };

  raw.tokenAssets = raw.tokenAssets ?? [];

  if (!Array.isArray(raw.maps)) {
    const legacySlot: VttMapSlot = {
      id: nanoid(),
      name: "Map 1",
      mapFilePath: raw.mapFilePath ?? "",
      characters: normalizeCharacters(raw.characters),
      props: raw.props ?? [],
      fogAlpha: raw.fogAlpha ?? DEFAULT_FOG_ALPHA,
      ambientLight: raw.ambientLight ?? DEFAULT_AMBIENT_LIGHT,
      initiative: [],
      activeTurnId: null,
      round: 0,
    };
    raw.maps = [legacySlot];
    raw.activeMapId = legacySlot.id;
  } else {
    raw.maps = raw.maps.map((slot) => ({
      ...slot,
      characters: normalizeCharacters(slot.characters),
      props: slot.props ?? [],
      fogAlpha: slot.fogAlpha ?? DEFAULT_FOG_ALPHA,
      ambientLight: slot.ambientLight ?? DEFAULT_AMBIENT_LIGHT,
      initiative: slot.initiative ?? [],
      activeTurnId: slot.activeTurnId ?? null,
      // a slot predating the `round` field but already mid-combat (activeTurnId set) must not
      // normalize to round 0 — nextTurn() trusts round to already be >= 1 whenever a turn is active
      round: slot.round ?? (slot.activeTurnId ? 1 : 0),
    }));
    if (!raw.maps.some((m) => m.id === raw.activeMapId)) raw.activeMapId = raw.maps[0]?.id ?? "";
  }

  const session: VttSession = { name: raw.name, tokenAssets: raw.tokenAssets, maps: raw.maps, activeMapId: raw.activeMapId };
  const folderPath = filePath.slice(0, Math.max(0, filePath.length - SESSION_FILE_NAME.length - 1));
  return { session, location: { folderPath, filePath } };
}

export async function importTokenAssets(location: SessionLocation): Promise<TokenAsset[]> {
  const selected = await open({
    multiple: true,
    title: "Importar tokens",
    filters: [{ name: "Imagens", extensions: ["png"] }],
  });
  if (!selected) return [];
  const paths = Array.isArray(selected) ? selected : [selected];

  const destDir = join(location.folderPath, "tokens");
  await mkdir(destDir, { recursive: true });

  const created: TokenAsset[] = [];
  for (const sourcePath of paths) {
    const fileName = sourcePath.split(/[\\/]/).pop() ?? "token.png";
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
    const dotIdx = destName.lastIndexOf(".");
    const name = dotIdx >= 0 ? destName.slice(0, dotIdx) : destName;
    created.push({ id: nanoid(), fileName: destName, name });
  }
  return created;
}

export function tokenAssetFileUrl(location: SessionLocation, asset: TokenAsset): string {
  return convertFileSrc(join(location.folderPath, "tokens", asset.fileName));
}
