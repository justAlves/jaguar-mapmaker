export type AssetCategory = "floor" | "wall" | "prop";

export interface AssetRef {
  id: string;
  category: AssetCategory;
  fileName: string;
  /** Path relative to the project's assets/<category>/ folder, i.e. just the file name. */
  relativePath: string;
  /** Optional user-defined grouping label for organizing the asset library (not a filesystem path). */
  folder?: string;
  /** User-starred assets, surfaced first and filterable in the asset panel. */
  favorite?: boolean;
  /** If this asset was copied in from the global library, the id of its library source (for dedup on re-add). */
  libraryId?: string;
}

export interface PropInstance {
  id: string;
  assetId: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  zIndex: number;
}

export type LightKind = "radial" | "cone";

export interface LightInstance {
  id: string;
  kind: LightKind;
  x: number;
  y: number;
  /** Hex color, e.g. "#ffaa33". */
  color: string;
  /** How far the light reaches, in world (px) units. */
  radius: number;
  /** Overall brightness/opacity of the light, 0-1. */
  intensity: number;
  /** Direction the cone points, in degrees (0 = right, clockwise). Unused for radial lights. */
  rotation: number;
  /** Full width of the cone, in degrees. Unused for radial lights. */
  coneAngle: number;
}

/** "x,y" grid coordinate -> assetId */
export type CellMap = Record<string, string>;

export interface MapProject {
  name: string;
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  floorCells: CellMap;
  wallCells: CellMap;
  props: PropInstance[];
  lights: LightInstance[];
  assets: AssetRef[];
}

/** Runtime-only info about where a project lives on disk. Not persisted inside the JSON. */
export interface ProjectLocation {
  /** Absolute path to the project's root folder. */
  folderPath: string;
  /** Absolute path to the project's .json file. */
  filePath: string;
}

/** An imported token image available to place characters from, scoped to a single VTT session. */
export interface TokenAsset {
  id: string;
  /** File name inside the session's tokens/ folder. */
  fileName: string;
  name: string;
}

/** A torch/lantern/lamp carried by a character: a light source that moves with its token. */
export interface CharacterLight {
  enabled: boolean;
  kind: LightKind;
  color: string;
  radius: number;
  intensity: number;
  /** Direction the cone points, in degrees (0 = right, clockwise). Unused for radial lights. */
  rotation: number;
  /** Full width of the cone, in degrees. Unused for radial lights. */
  coneAngle: number;
}

/** A character token placed on the VTT tabletop. Purely visual for now (no stats/HP). */
export interface CharacterToken {
  id: string;
  tokenAssetId: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  /** null until the GM turns on a torch/lantern for this character. */
  light: CharacterLight | null;
}

/** One row in a map's initiative tracker. `characterId` links it to a token on the same map, if any (lets clicking it select the token); freeform entries (e.g. an unmapped monster) leave it null. */
export interface InitiativeEntry {
  id: string;
  name: string;
  characterId: string | null;
  initiative: number;
}

/**
 * One map within a session: references an existing map project (read-only, never modified by
 * play) and layers map-local characters and movable props on top. Props start as free-standing
 * instances the player places during play — session state never touches the underlying map's own
 * baked-in props. Fog/ambient light are per-map since a session can mix dark dungeons with lit
 * outdoor scenes.
 */
export interface VttMapSlot {
  id: string;
  /** Display name shown on the map's tab (defaults to the referenced map project's own name). */
  name: string;
  /** Absolute path to the referenced map project's .json file. */
  mapFilePath: string;
  characters: CharacterToken[];
  props: PropInstance[];
  /**
   * How dark the fog-of-war overlay is for the GM's own view, 0 (fully see-through) to 1 (opaque).
   * A future player-facing screen would ignore this and always render unseen areas fully opaque.
   */
  fogAlpha: number;
  /**
   * How brightly this map is ambiently lit regardless of light sources/walls, 0 (pitch black,
   * needs lights) to 1 (fully lit outdoor/daytime scene, fog effectively disabled). Scales fogAlpha down.
   */
  ambientLight: number;
  initiative: InitiativeEntry[];
  /** id of the InitiativeEntry whose turn it currently is; null when combat hasn't been started. */
  activeTurnId: string | null;
  round: number;
}

/** A playable VTT session: a shared token-art library plus one or more maps, switchable without leaving the session. */
export interface VttSession {
  name: string;
  tokenAssets: TokenAsset[];
  maps: VttMapSlot[];
  /** Which of `maps` is currently loaded/being played. */
  activeMapId: string;
}

/** Runtime-only info about where a session lives on disk. Not persisted inside the JSON. */
export interface SessionLocation {
  folderPath: string;
  filePath: string;
}

export type ToolMode =
  | "paintFloor"
  | "paintWall"
  | "floorRect"
  | "floorLine"
  | "wallLine"
  | "floorBucket"
  | "erase"
  | "props"
  | "light"
  | "pan";

/** Which edge of a grid cell a wall segment sits on. */
export type WallEdge = "N" | "E" | "S" | "W";

/** Thickness of a wall segment, as a fraction of tileSize. */
export const WALL_THICKNESS_RATIO = 0.18;

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseCellKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

export function wallKey(x: number, y: number, edge: WallEdge): string {
  return `${x},${y},${edge}`;
}

export function parseWallKey(key: string): { x: number; y: number; edge: WallEdge } {
  const [xs, ys, edge] = key.split(",");
  return { x: Number(xs), y: Number(ys), edge: edge as WallEdge };
}

/**
 * Every physical edge in the grid is shared by up to two cells (e.g. the N edge of
 * (x,y) is the same line as the S edge of (x,y-1)). To store each physical edge
 * exactly once, S/E edges are rewritten as the neighboring cell's N/W edge whenever
 * that neighbor exists in-bounds. Only boundary S/E edges (last row/column) remain as-is.
 */
export function canonicalizeWallEdge(
  x: number,
  y: number,
  edge: WallEdge,
  gridWidth: number,
  gridHeight: number,
): { x: number; y: number; edge: WallEdge } {
  if (edge === "S" && y + 1 < gridHeight) return { x, y: y + 1, edge: "N" };
  if (edge === "E" && x + 1 < gridWidth) return { x: x + 1, y, edge: "W" };
  return { x, y, edge };
}

export function emptyProject(name: string, gridWidth: number, gridHeight: number, tileSize: number): MapProject {
  return {
    name,
    gridWidth,
    gridHeight,
    tileSize,
    floorCells: {},
    wallCells: {},
    props: [],
    lights: [],
    assets: [],
  };
}
