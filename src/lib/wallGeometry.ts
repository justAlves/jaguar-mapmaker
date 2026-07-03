import type { WallEdge } from "../types";

/** Position + rotation for a wall segment sprite (length = tileSize, thickness = tileSize * WALL_THICKNESS_RATIO). */
export function wallGeometry(x: number, y: number, edge: WallEdge, tileSize: number) {
  const half = tileSize / 2;
  switch (edge) {
    case "N":
      return { cx: x * tileSize + half, cy: y * tileSize, rotation: 0 };
    case "S":
      return { cx: x * tileSize + half, cy: (y + 1) * tileSize, rotation: 0 };
    case "W":
      return { cx: x * tileSize, cy: y * tileSize + half, rotation: Math.PI / 2 };
    case "E":
      return { cx: (x + 1) * tileSize, cy: y * tileSize + half, rotation: Math.PI / 2 };
  }
}

/** Which of the 4 edges of a cell is closest to a point given as fractional (0..1) coords within the cell. */
export function nearestEdge(fracX: number, fracY: number): WallEdge {
  const distN = fracY;
  const distS = 1 - fracY;
  const distW = fracX;
  const distE = 1 - fracX;
  const min = Math.min(distN, distS, distW, distE);
  if (min === distN) return "N";
  if (min === distS) return "S";
  if (min === distW) return "W";
  return "E";
}
