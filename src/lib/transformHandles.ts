import type { Graphics, Sprite } from "pixi.js";

/** A rotated, scaled sprite anchored at its own center — the shape every drag-transform handle math operates on. */
export interface TransformTarget {
  x: number;
  y: number;
  /** Radians. */
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export type HandleKind = "corner" | "edge" | "rotate";

/** dx/dy encode which corner/edge this handle is: -1/0/1 along each local (unrotated) axis. "rotate" has dx=dy=0. */
export interface TransformHandle {
  kind: HandleKind;
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
}

const HANDLE_HIT_PX = 14;
const HANDLE_VISUAL_PX = 8;
const ROTATE_HANDLE_DISTANCE_PX = 26;
const MIN_SIZE_PX = 4;

export const TRANSFORM_HANDLES: TransformHandle[] = [
  { kind: "corner", dx: -1, dy: -1 },
  { kind: "corner", dx: 1, dy: -1 },
  { kind: "corner", dx: 1, dy: 1 },
  { kind: "corner", dx: -1, dy: 1 },
  { kind: "edge", dx: 0, dy: -1 },
  { kind: "edge", dx: 1, dy: 0 },
  { kind: "edge", dx: 0, dy: 1 },
  { kind: "edge", dx: -1, dy: 0 },
];

/** Finds the transform handle (if any) under a world-local point for the given target, accounting for its rotation. */
export function hitTestTransformHandle(
  target: TransformTarget,
  baseWidth: number,
  baseHeight: number,
  worldPoint: { x: number; y: number },
  worldScale: number,
): TransformHandle | null {
  const cos = Math.cos(-target.rotation);
  const sin = Math.sin(-target.rotation);
  const dx0 = worldPoint.x - target.x;
  const dy0 = worldPoint.y - target.y;
  // un-rotate the point into the sprite's own local (axis-aligned) frame
  const lx = cos * dx0 - sin * dy0;
  const ly = sin * dx0 + cos * dy0;

  const halfW = (baseWidth * target.scaleX) / 2;
  const halfH = (baseHeight * target.scaleY) / 2;
  const tol = HANDLE_HIT_PX / worldScale;

  const rotateHandleY = -halfH - ROTATE_HANDLE_DISTANCE_PX / worldScale;
  if (Math.hypot(lx, ly - rotateHandleY) <= tol) {
    return { kind: "rotate", dx: 0, dy: 0 };
  }
  for (const handle of TRANSFORM_HANDLES) {
    const hx = handle.dx * halfW;
    const hy = handle.dy * halfH;
    if (Math.hypot(lx - hx, ly - hy) <= tol) return handle;
  }
  return null;
}

export interface TransformDragInfo {
  handle: TransformHandle;
  anchor: { x: number; y: number };
  ux: { x: number; y: number };
  uy: { x: number; y: number };
  baseWidth: number;
  baseHeight: number;
  width0: number;
  height0: number;
  center0: { x: number; y: number };
  rotation0: number;
}

/** Captures the target's initial geometry when a drag on `handle` starts, so pointermove can compute deltas against a fixed anchor/basis. */
export function beginTransformDrag(target: TransformTarget, handle: TransformHandle, baseWidth: number, baseHeight: number): TransformDragInfo {
  const rotation0 = target.rotation;
  const ux = { x: Math.cos(rotation0), y: Math.sin(rotation0) };
  const uy = { x: -Math.sin(rotation0), y: Math.cos(rotation0) };
  const halfW0 = (baseWidth * target.scaleX) / 2;
  const halfH0 = (baseHeight * target.scaleY) / 2;
  const anchorLocalX = -handle.dx * halfW0;
  const anchorLocalY = -handle.dy * halfH0;
  return {
    handle,
    anchor: {
      x: target.x + anchorLocalX * ux.x + anchorLocalY * uy.x,
      y: target.y + anchorLocalX * ux.y + anchorLocalY * uy.y,
    },
    ux,
    uy,
    baseWidth,
    baseHeight,
    width0: halfW0 * 2,
    height0: halfH0 * 2,
    center0: { x: target.x, y: target.y },
    rotation0,
  };
}

/** Applies an in-progress transform drag directly onto the live sprite (x/y/rotation/scale), given the current pointer position in world space. */
export function applyTransformDrag(
  sprite: Sprite,
  drag: TransformDragInfo,
  local: { x: number; y: number },
  opts: { shiftKey: boolean; altKey: boolean },
): void {
  const { handle, anchor, ux, uy, baseWidth, baseHeight, width0, height0, center0, rotation0 } = drag;

  if (handle.kind === "rotate") {
    const measured = Math.atan2(local.y - center0.y, local.x - center0.x);
    let newRotation = measured + Math.PI / 2;
    if (opts.shiftKey) {
      const step = Math.PI / 12; // 15deg
      newRotation = Math.round(newRotation / step) * step;
    }
    sprite.rotation = newRotation;
    return;
  }

  const deltaX = local.x - anchor.x;
  const deltaY = local.y - anchor.y;
  const projX = deltaX * ux.x + deltaY * ux.y;
  const projY = deltaX * uy.x + deltaY * uy.y;
  let newW = handle.dx !== 0 ? Math.max(MIN_SIZE_PX, handle.dx * projX) : width0;
  let newH = handle.dy !== 0 ? Math.max(MIN_SIZE_PX, handle.dy * projY) : height0;

  if (opts.altKey) {
    // proportional scaling: pick whichever axis moved further from its original size and drive both from it
    const scaleW = newW / width0;
    const scaleH = newH / height0;
    const driver = Math.abs(scaleW - 1) >= Math.abs(scaleH - 1) ? scaleW : scaleH;
    newW = Math.max(MIN_SIZE_PX, driver * width0);
    newH = Math.max(MIN_SIZE_PX, driver * height0);
  }

  sprite.x = anchor.x + ((handle.dx * newW) / 2) * ux.x + ((handle.dy * newH) / 2) * uy.x;
  sprite.y = anchor.y + ((handle.dx * newW) / 2) * ux.y + ((handle.dy * newH) / 2) * uy.y;
  sprite.rotation = rotation0;
  sprite.scale.set(newW / baseWidth, newH / baseHeight);
}

/** Draws the oriented bounding box, rotate handle and corner/edge scale handles for the given sprite. */
export function drawTransformHandles(gfx: Graphics, sprite: Sprite, worldScale: number, color: number): void {
  const rotation = sprite.rotation;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const halfW = (sprite.texture.width * Math.abs(sprite.scale.x)) / 2;
  const halfH = (sprite.texture.height * Math.abs(sprite.scale.y)) / 2;

  function toWorldLocal(lx: number, ly: number) {
    return { x: sprite.x + lx * cos - ly * sin, y: sprite.y + lx * sin + ly * cos };
  }

  const corners = [
    toWorldLocal(-halfW, -halfH),
    toWorldLocal(halfW, -halfH),
    toWorldLocal(halfW, halfH),
    toWorldLocal(-halfW, halfH),
  ];
  gfx.setStrokeStyle({ width: 1.5 / worldScale, color, alpha: 1 });
  gfx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) gfx.lineTo(corners[i].x, corners[i].y);
  gfx.closePath().stroke();

  const rotateHandleWorld = toWorldLocal(0, -halfH - ROTATE_HANDLE_DISTANCE_PX / worldScale);
  const topMid = toWorldLocal(0, -halfH);
  gfx.moveTo(topMid.x, topMid.y).lineTo(rotateHandleWorld.x, rotateHandleWorld.y).stroke();
  gfx.circle(rotateHandleWorld.x, rotateHandleWorld.y, HANDLE_VISUAL_PX / 2 / worldScale).fill({ color: 0xffffff }).stroke();

  const handleSize = HANDLE_VISUAL_PX / worldScale;
  for (const handle of TRANSFORM_HANDLES) {
    const p = toWorldLocal(handle.dx * halfW, handle.dy * halfH);
    gfx
      .rect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize)
      .fill({ color: 0xffffff })
      .stroke();
  }
}
