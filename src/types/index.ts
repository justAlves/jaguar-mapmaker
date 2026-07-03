export type AssetCategory = "floor" | "wall" | "prop";

export interface AssetRef {
  id: string;
  category: AssetCategory;
  fileName: string;
  /** Path relative to the project's assets/<category>/ folder, i.e. just the file name. */
  relativePath: string;
  /** Optional user-defined grouping label for organizing the asset library (not a filesystem path). */
  folder?: string;
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
  assets: AssetRef[];
}

/** Runtime-only info about where a project lives on disk. Not persisted inside the JSON. */
export interface ProjectLocation {
  /** Absolute path to the project's root folder. */
  folderPath: string;
  /** Absolute path to the project's .json file. */
  filePath: string;
}

export type ToolMode = "paintFloor" | "paintWall" | "erase" | "props" | "pan";

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
    assets: [],
  };
}
