import type { MapProject } from "../types";
import { parseWallKey } from "../types";

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Small angular nudge cast alongside every segment-endpoint ray, so a ray grazing a corner reliably lands on one side of it or the other. */
const CORNER_EPSILON = 0.00003;
/** Angular resolution (radians) of the uniform ray fan, filling in between corners for smoothly curved silhouettes against the light radius. */
const UNIFORM_STEP = (Math.PI * 2) / 180; // every 2 degrees

/** Converts a map's wall cells into full tile-edge line segments, used as light/vision occluders. Ignores wall thickness — occlusion happens at the grid line itself. */
export function wallSegments(project: MapProject): Segment[] {
  const segments: Segment[] = [];
  for (const key of Object.keys(project.wallCells)) {
    const { x, y, edge } = parseWallKey(key);
    const t = project.tileSize;
    if (edge === "N") segments.push({ x1: x * t, y1: y * t, x2: (x + 1) * t, y2: y * t });
    else if (edge === "S") segments.push({ x1: x * t, y1: (y + 1) * t, x2: (x + 1) * t, y2: (y + 1) * t });
    else if (edge === "W") segments.push({ x1: x * t, y1: y * t, x2: x * t, y2: (y + 1) * t });
    else if (edge === "E") segments.push({ x1: (x + 1) * t, y1: y * t, x2: (x + 1) * t, y2: (y + 1) * t });
  }
  return segments;
}

function normalizeAngle(a: number): number {
  const twoPi = Math.PI * 2;
  return ((a % twoPi) + twoPi) % twoPi;
}

/** Ray (origin, angle) vs. segment intersection distance, or null if they don't cross in front of the ray. */
function rayIntersectDistance(ox: number, oy: number, dx: number, dy: number, seg: Segment): number | null {
  const sx = seg.x2 - seg.x1;
  const sy = seg.y2 - seg.y1;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((seg.x1 - ox) * sy - (seg.y1 - oy) * sx) / denom;
  const u = ((seg.x1 - ox) * dy - (seg.y1 - oy) * dx) / denom;
  if (t < 0 || u < 0 || u > 1) return null;
  return t;
}

/**
 * Computes a light/vision polygon around `origin`, clipped to `radius` and blocked by `segments`
 * (2D shadow-casting via a ray fan: rays are cast at each occluder corner, ± a tiny angular nudge,
 * plus a uniform angular fan to round off the radius boundary between corners).
 * When `coneRange` is given, only rays within that angular range are cast (for cone-shaped lights).
 */
export function computeVisibilityPolygon(
  origin: { x: number; y: number },
  radius: number,
  segments: Segment[],
  coneRange?: { from: number; to: number },
): { x: number; y: number }[] {
  const angles = new Set<number>();

  const inCone = (angle: number): boolean => {
    if (!coneRange) return true;
    const a = normalizeAngle(angle - coneRange.from);
    const span = normalizeAngle(coneRange.to - coneRange.from);
    return a <= span;
  };

  if (coneRange) {
    angles.add(normalizeAngle(coneRange.from));
    angles.add(normalizeAngle(coneRange.to));
  }
  for (const seg of segments) {
    // only consider occluders that could plausibly matter for this light
    const dNear = Math.min(
      Math.hypot(seg.x1 - origin.x, seg.y1 - origin.y),
      Math.hypot(seg.x2 - origin.x, seg.y2 - origin.y),
    );
    if (dNear > radius * 1.5) continue;
    for (const [px, py] of [
      [seg.x1, seg.y1],
      [seg.x2, seg.y2],
    ]) {
      const angle = Math.atan2(py - origin.y, px - origin.x);
      if (!inCone(angle)) continue;
      angles.add(normalizeAngle(angle - CORNER_EPSILON));
      angles.add(angle);
      angles.add(normalizeAngle(angle + CORNER_EPSILON));
    }
  }

  if (coneRange) {
    const span = normalizeAngle(coneRange.to - coneRange.from);
    const steps = Math.max(4, Math.ceil(span / UNIFORM_STEP));
    for (let i = 0; i <= steps; i++) {
      angles.add(normalizeAngle(coneRange.from + (span * i) / steps));
    }
  } else {
    const steps = Math.ceil((Math.PI * 2) / UNIFORM_STEP);
    for (let i = 0; i < steps; i++) {
      angles.add((i * (Math.PI * 2)) / steps);
    }
  }

  const relevantSegments = segments.filter(
    (seg) =>
      Math.min(Math.hypot(seg.x1 - origin.x, seg.y1 - origin.y), Math.hypot(seg.x2 - origin.x, seg.y2 - origin.y)) <=
      radius * 1.5,
  );

  const points: { angle: number; x: number; y: number }[] = [];
  for (const angle of angles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let nearest = radius;
    for (const seg of relevantSegments) {
      const dist = rayIntersectDistance(origin.x, origin.y, dx, dy, seg);
      if (dist !== null && dist < nearest) nearest = dist;
    }
    points.push({ angle, x: origin.x + dx * nearest, y: origin.y + dy * nearest });
  }

  // sort around the cone's start angle (or 0 for a full circle) so a cone spanning the 0/2π wraparound still sorts correctly
  const sortOrigin = coneRange ? coneRange.from : 0;
  points.sort((a, b) => normalizeAngle(a.angle - sortOrigin) - normalizeAngle(b.angle - sortOrigin));

  const result = points.map((p) => ({ x: p.x, y: p.y }));
  if (coneRange) result.unshift({ x: origin.x, y: origin.y });
  return result;
}
