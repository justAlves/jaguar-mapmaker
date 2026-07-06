import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emit } from "@tauri-apps/api/event";
import type { FogPolygon } from "./fogRender";
import type { MapProject, ProjectLocation, SessionLocation, TokenAsset, VttMapSlot } from "../types";

export const PLAYER_WINDOW_LABEL = "player";
/** Fired rarely: only when the GM switches maps (or first connects). Carries the heavy, mostly-static map data. */
export const PLAYER_MAP_EVENT = "vtt-player-map";
/** Fired often (throttled ~12/sec during drags/pans): the lightweight, frequently-changing bits. */
export const PLAYER_STATE_EVENT = "vtt-player-state";
/** Fired by the player window on mount (and the GM window replies with a fresh map+state pair), so opening it mid-session doesn't leave it stuck on "waiting for the GM". */
export const PLAYER_REQUEST_SYNC_EVENT = "vtt-player-request-sync";

export interface PlayerCamera {
  /** World-space point currently centered in the GM's viewport — resolution-independent, so the player window (likely a different size/monitor) centers on the same spot rather than reusing raw pixel offsets. */
  worldCenterX: number;
  worldCenterY: number;
  scale: number;
}

export interface PlayerMapPayload {
  mapProject: MapProject;
  mapLocation: ProjectLocation;
  sessionLocation: SessionLocation;
}

export interface PlayerStatePayload {
  slot: VttMapSlot;
  tokenAssets: TokenAsset[];
  /** Visibility polygons already computed (shadow-casting is expensive) by the GM — render these directly instead of recomputing them. */
  fogPolygons: FogPolygon[][];
  camera: PlayerCamera;
}

/** Opens the read-only player window (or focuses it if already open). */
export async function openPlayerWindow(): Promise<void> {
  const existing = await WebviewWindow.getByLabel(PLAYER_WINDOW_LABEL);
  if (existing) {
    await existing.setFocus();
    return;
  }
  const win = new WebviewWindow(PLAYER_WINDOW_LABEL, {
    url: "index.html?player=1",
    title: "Jaguar — Player View",
    width: 1280,
    height: 720,
  });
  win.once("tauri://error", (e) => {
    console.error("Failed to open player window:", e);
  });
}

export function emitPlayerMap(payload: PlayerMapPayload): void {
  void emit(PLAYER_MAP_EVENT, payload);
}

export function emitPlayerState(payload: PlayerStatePayload): void {
  void emit(PLAYER_STATE_EVENT, payload);
}
