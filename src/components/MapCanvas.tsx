import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, Sprite, type FederatedPointerEvent } from "pixi.js";
import { useEditorStore } from "../store/editorStore";
import { assetFileUrl } from "../lib/projectIO";
import { loadTexture } from "../lib/textureCache";
import { canonicalizeWallEdge, parseWallKey, wallKey, WALL_THICKNESS_RATIO } from "../types";
import type { AssetRef, MapProject, ProjectLocation, WallEdge } from "../types";
import { nearestEdge, wallGeometry } from "../lib/wallGeometry";
import { useT } from "../i18n/useT";
import { useResolvedTheme } from "../lib/applyTheme";

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

const CANVAS_THEME_COLORS = {
  dark: { background: "#2b2b2b", gridColor: 0xffffff, gridAlpha: 0.25 },
  light: { background: "#d3d3d8", gridColor: 0x000000, gridAlpha: 0.15 },
} as const;

/** Photoshop-style transform handle geometry, in screen pixels (converted to world units by dividing by zoom). */
const HANDLE_HIT_PX = 14;
const HANDLE_VISUAL_PX = 8;
const ROTATE_HANDLE_DISTANCE_PX = 26;
const MIN_PROP_SIZE_PX = 4;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

interface WallTarget {
  cx: number;
  cy: number;
  edge: WallEdge;
}

/** dx/dy encode which corner/edge this handle is: -1/0/1 along each local (unrotated) axis. "rotate" has dx=dy=0. */
interface PropHandle {
  kind: "corner" | "edge" | "rotate";
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
}

const PROP_HANDLES: PropHandle[] = [
  { kind: "corner", dx: -1, dy: -1 },
  { kind: "corner", dx: 1, dy: -1 },
  { kind: "corner", dx: 1, dy: 1 },
  { kind: "corner", dx: -1, dy: 1 },
  { kind: "edge", dx: 0, dy: -1 },
  { kind: "edge", dx: 1, dy: 0 },
  { kind: "edge", dx: 0, dy: 1 },
  { kind: "edge", dx: -1, dy: 0 },
];

interface DragState {
  mode: "none" | "pan" | "paintFloor" | "paintWall" | "erase" | "propMove" | "propTransform";
  lastPaintedKey: string | null;
  panStart: { sx: number; sy: number; wx: number; wy: number } | null;
  propId: string | null;
  propStart: { sx: number; sy: number; px: number; py: number } | null;
  transform: {
    handle: PropHandle;
    /** World-local point that stays fixed during a corner/edge resize (the opposite corner/edge). */
    anchor: { x: number; y: number };
    /** Rotated local axis unit vectors, fixed for the duration of the drag. */
    ux: { x: number; y: number };
    uy: { x: number; y: number };
    baseWidth: number;
    baseHeight: number;
    /** Box size (world units) at drag start, used as the reference for Alt-key proportional scaling. */
    width0: number;
    height0: number;
    center0: { x: number; y: number };
    rotation0: number;
  } | null;
}

export function MapCanvas() {
  const t = useT();
  const [status, setStatus] = useState<{ zoomPct: number; cell: { x: number; y: number } | null }>({
    zoomPct: 100,
    cell: null,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const floorLayerRef = useRef<Container | null>(null);
  const wallLayerRef = useRef<Container | null>(null);
  const propsLayerRef = useRef<Container | null>(null);
  const gridLayerRef = useRef<Graphics | null>(null);
  const selectionLayerRef = useRef<Graphics | null>(null);
  const hoverLayerRef = useRef<Graphics | null>(null);
  const floorGhostRef = useRef<Sprite | null>(null);
  const propGhostRef = useRef<Sprite | null>(null);

  const floorSpritesRef = useRef<Map<string, Sprite>>(new Map());
  const wallSpritesRef = useRef<Map<string, Sprite>>(new Map());
  const propSpritesRef = useRef<Map<string, Sprite>>(new Map());

  // Snapshots of the cell maps as of the last sync, so unchanged cells never get re-touched.
  const prevFloorCellsRef = useRef<Record<string, string>>({});
  const prevWallCellsRef = useRef<Record<string, string>>({});

  const dragRef = useRef<DragState>({
    mode: "none",
    lastPaintedKey: null,
    panStart: null,
    propId: null,
    propStart: null,
    transform: null,
  });

  const project = useEditorStore((s) => s.project);
  const location = useEditorStore((s) => s.location);
  const tool = useEditorStore((s) => s.tool);
  const selectedAssetId = useEditorStore((s) => s.selectedAssetId);
  const showGrid = useEditorStore((s) => s.showGrid);
  const selectedPropId = useEditorStore((s) => s.selectedPropId);
  const setSelectedPropId = useEditorStore((s) => s.setSelectedPropId);
  const wallEdgeMode = useEditorStore((s) => s.wallEdgeMode);
  const cycleWallEdgeMode = useEditorStore((s) => s.cycleWallEdgeMode);
  const draggingAssetId = useEditorStore((s) => s.draggingAssetId);
  const paintCell = useEditorStore((s) => s.paintCell);
  const paintWallEdge = useEditorStore((s) => s.paintWallEdge);
  const addProp = useEditorStore((s) => s.addProp);
  const updateProp = useEditorStore((s) => s.updateProp);
  const resolvedTheme = useResolvedTheme();

  const latestRef = useRef({
    project,
    location,
    tool,
    selectedAssetId,
    selectedPropId,
    wallEdgeMode,
    cycleWallEdgeMode,
    draggingAssetId,
    resolvedTheme,
    paintCell,
    paintWallEdge,
    addProp,
    updateProp,
    setSelectedPropId,
  });
  latestRef.current = {
    project,
    location,
    tool,
    selectedAssetId,
    selectedPropId,
    wallEdgeMode,
    cycleWallEdgeMode,
    draggingAssetId,
    resolvedTheme,
    paintCell,
    paintWallEdge,
    addProp,
    updateProp,
    setSelectedPropId,
  };

  function computeWallTarget(local: { x: number; y: number }, project: MapProject): WallTarget | null {
    const cx = Math.floor(local.x / project.tileSize);
    const cy = Math.floor(local.y / project.tileSize);
    if (cx < 0 || cy < 0 || cx >= project.gridWidth || cy >= project.gridHeight) return null;
    const { wallEdgeMode } = latestRef.current;
    let edge: WallEdge;
    if (wallEdgeMode === "auto") {
      const fracX = local.x / project.tileSize - cx;
      const fracY = local.y / project.tileSize - cy;
      edge = nearestEdge(fracX, fracY);
    } else {
      edge = wallEdgeMode;
    }
    return { cx, cy, edge };
  }

  /** Finds the transform handle (if any) under a world-local point for the given prop, accounting for its rotation. */
  function hitTestPropHandle(
    prop: { x: number; y: number; rotation: number; scaleX: number; scaleY: number },
    sprite: Sprite,
    worldPoint: { x: number; y: number },
    worldScale: number,
  ): PropHandle | null {
    const rot = degToRad(prop.rotation);
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const dx0 = worldPoint.x - prop.x;
    const dy0 = worldPoint.y - prop.y;
    // un-rotate the point into the sprite's own local (axis-aligned) frame
    const lx = cos * dx0 - sin * dy0;
    const ly = sin * dx0 + cos * dy0;

    const halfW = (sprite.texture.width * prop.scaleX) / 2;
    const halfH = (sprite.texture.height * prop.scaleY) / 2;
    const tol = HANDLE_HIT_PX / worldScale;

    const rotateHandleY = -halfH - ROTATE_HANDLE_DISTANCE_PX / worldScale;
    if (Math.hypot(lx, ly - rotateHandleY) <= tol) {
      return { kind: "rotate", dx: 0, dy: 0 };
    }

    for (const handle of PROP_HANDLES) {
      const hx = handle.dx * halfW;
      const hy = handle.dy * halfH;
      if (Math.hypot(lx - hx, ly - hy) <= tol) return handle;
    }
    return null;
  }

  /** Erases the wall edge under the cursor if one exists there, otherwise the floor cell. Returns a dedup key. */
  function performErase(local: { x: number; y: number }, project: MapProject): string | null {
    const target = computeWallTarget(local, project);
    if (!target) return null;
    const canon = canonicalizeWallEdge(target.cx, target.cy, target.edge, project.gridWidth, project.gridHeight);
    const key = wallKey(canon.x, canon.y, canon.edge);
    if (project.wallCells[key]) {
      latestRef.current.paintWallEdge(target.cx, target.cy, target.edge, null);
      return `wall:${key}`;
    }
    latestRef.current.paintCell("floor", target.cx, target.cy, null);
    return `floor:${target.cx},${target.cy}`;
  }

  // --- init Pixi application once ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let destroyed = false;

    const app = new Application();
    appRef.current = app;

    app
      .init({
        background: CANVAS_THEME_COLORS[latestRef.current.resolvedTheme].background,
        resizeTo: el,
        antialias: true,
      })
      .then(() => {
        if (destroyed) {
          app.destroy(true, { children: true });
          return;
        }
        el.appendChild(app.canvas);

        const world = new Container();
        world.sortableChildren = true;
        app.stage.addChild(world);
        worldRef.current = world;

        const floorLayer = new Container();
        floorLayer.zIndex = 0;
        const wallLayer = new Container();
        wallLayer.zIndex = 1;
        const propsLayer = new Container();
        propsLayer.zIndex = 2;
        propsLayer.sortableChildren = true;
        const gridLayer = new Graphics();
        gridLayer.zIndex = 3;
        const selectionLayer = new Graphics();
        selectionLayer.zIndex = 4;
        const hoverLayer = new Graphics();
        hoverLayer.zIndex = 5;
        const ghostLayer = new Container();
        ghostLayer.zIndex = 6;
        const floorGhost = new Sprite();
        floorGhost.alpha = 0;
        floorGhost.eventMode = "none";
        const propGhost = new Sprite();
        propGhost.anchor.set(0.5);
        propGhost.alpha = 0;
        propGhost.eventMode = "none";
        ghostLayer.addChild(floorGhost, propGhost);

        world.addChild(floorLayer, wallLayer, propsLayer, gridLayer, selectionLayer, hoverLayer, ghostLayer);
        floorLayerRef.current = floorLayer;
        wallLayerRef.current = wallLayer;
        propsLayerRef.current = propsLayer;
        gridLayerRef.current = gridLayer;
        selectionLayerRef.current = selectionLayer;
        hoverLayerRef.current = hoverLayer;
        floorGhostRef.current = floorGhost;
        propGhostRef.current = propGhost;

        app.stage.eventMode = "static";
        app.stage.hitArea = app.screen;

        setupInteraction(app);
        syncEverything();
      });

    function setupInteraction(app: Application) {
      const stage = app.stage;

      function toWorld(global: { x: number; y: number }) {
        const world = worldRef.current!;
        return world.toLocal(global);
      }

      stage.on("pointerdown", (e: FederatedPointerEvent) => {
        const { tool, project } = latestRef.current;
        if (!project) return;
        const world = worldRef.current!;
        const drag = dragRef.current;

        if (e.button === 1 || e.button === 2 || tool === "pan") {
          drag.mode = "pan";
          drag.panStart = { sx: e.global.x, sy: e.global.y, wx: world.position.x, wy: world.position.y };
          return;
        }

        if (tool === "paintFloor") {
          const local = toWorld(e.global);
          const cx = Math.floor(local.x / project.tileSize);
          const cy = Math.floor(local.y / project.tileSize);
          if (cx < 0 || cy < 0 || cx >= project.gridWidth || cy >= project.gridHeight) return;
          const { selectedAssetId, paintCell } = latestRef.current;
          if (!selectedAssetId) return;
          paintCell("floor", cx, cy, selectedAssetId);
          drag.mode = "paintFloor";
          drag.lastPaintedKey = `${cx},${cy}`;
          return;
        }

        if (tool === "paintWall") {
          const local = toWorld(e.global);
          const target = computeWallTarget(local, project);
          if (!target) return;
          const { selectedAssetId, paintWallEdge } = latestRef.current;
          if (!selectedAssetId) return;
          paintWallEdge(target.cx, target.cy, target.edge, selectedAssetId);
          drag.mode = "paintWall";
          drag.lastPaintedKey = wallKey(target.cx, target.cy, target.edge);
          return;
        }

        if (tool === "erase") {
          const local = toWorld(e.global);
          const dedupKey = performErase(local, project);
          if (dedupKey === null) return;
          drag.mode = "erase";
          drag.lastPaintedKey = dedupKey;
          return;
        }

        if (tool === "props") {
          const local = toWorld(e.global);

          // if a prop is already selected, check its transform handles before anything else
          const { selectedPropId } = latestRef.current;
          if (selectedPropId) {
            const selectedProp = project.props.find((p) => p.id === selectedPropId);
            const selectedSprite = propSpritesRef.current.get(selectedPropId);
            if (selectedProp && selectedSprite) {
              const handle = hitTestPropHandle(selectedProp, selectedSprite, local, world.scale.x);
              if (handle) {
                const rotation0 = degToRad(selectedProp.rotation);
                const ux = { x: Math.cos(rotation0), y: Math.sin(rotation0) };
                const uy = { x: -Math.sin(rotation0), y: Math.cos(rotation0) };
                const baseWidth = selectedSprite.texture.width;
                const baseHeight = selectedSprite.texture.height;
                const halfW0 = (baseWidth * selectedProp.scaleX) / 2;
                const halfH0 = (baseHeight * selectedProp.scaleY) / 2;
                const anchorLocalX = -handle.dx * halfW0;
                const anchorLocalY = -handle.dy * halfH0;
                const anchor = {
                  x: selectedProp.x + anchorLocalX * ux.x + anchorLocalY * uy.x,
                  y: selectedProp.y + anchorLocalX * ux.y + anchorLocalY * uy.y,
                };
                drag.mode = "propTransform";
                drag.propId = selectedPropId;
                drag.transform = {
                  handle,
                  anchor,
                  ux,
                  uy,
                  baseWidth,
                  baseHeight,
                  width0: halfW0 * 2,
                  height0: halfH0 * 2,
                  center0: { x: selectedProp.x, y: selectedProp.y },
                  rotation0,
                };
                return;
              }
            }
          }

          const target = e.target;
          let hitPropId: string | null = null;
          for (const [id, sprite] of propSpritesRef.current) {
            if (target === sprite) {
              hitPropId = id;
              break;
            }
          }
          latestRef.current.setSelectedPropId(hitPropId);
          if (hitPropId) {
            const prop = project.props.find((p) => p.id === hitPropId);
            if (prop) {
              drag.mode = "propMove";
              drag.propId = hitPropId;
              drag.propStart = { sx: e.global.x, sy: e.global.y, px: prop.x, py: prop.y };
            }
          } else if (!selectedPropId) {
            // only stamp a new prop when nothing was selected yet; otherwise a miss just deselects
            const { selectedAssetId, addProp } = latestRef.current;
            const asset = selectedAssetId ? assetById(project, selectedAssetId) : undefined;
            if (asset && asset.category === "prop") {
              addProp({ assetId: asset.id, x: local.x, y: local.y, rotation: 0, scaleX: 1, scaleY: 1 });
            }
          }
        }
      });

      stage.on("pointermove", (e: FederatedPointerEvent) => {
        const drag = dragRef.current;
        const { project, tool } = latestRef.current;
        if (!project) return;
        const local = toWorld(e.global);

        if (tool === "paintWall" || tool === "erase") {
          drawWallHover(computeWallTarget(local, project));
        } else if (hoverLayerRef.current) {
          hoverLayerRef.current.clear();
        }

        const cx = Math.floor(local.x / project.tileSize);
        const cy = Math.floor(local.y / project.tileSize);
        const inBounds = cx >= 0 && cy >= 0 && cx < project.gridWidth && cy < project.gridHeight;
        setStatus((s) => {
          const nextCell = inBounds ? { x: cx, y: cy } : null;
          if (s.cell?.x === nextCell?.x && s.cell?.y === nextCell?.y) return s; // bail out: no re-render
          return { ...s, cell: nextCell };
        });

        if (tool === "paintFloor") {
          updateFloorGhost(inBounds ? { cx, cy } : null);
        } else {
          updateFloorGhost(null);
        }

        if (tool === "props" && !latestRef.current.selectedPropId) {
          // only preview a new placement when nothing is already selected (matches click-to-place behavior)
          updatePropGhost(local);
        } else {
          updatePropGhost(null);
        }

        if (drag.mode === "pan" && drag.panStart) {
          const world = worldRef.current!;
          const dx = e.global.x - drag.panStart.sx;
          const dy = e.global.y - drag.panStart.sy;
          world.position.set(drag.panStart.wx + dx, drag.panStart.wy + dy);
          return;
        }

        if (drag.mode === "paintFloor") {
          const cx = Math.floor(local.x / project.tileSize);
          const cy = Math.floor(local.y / project.tileSize);
          if (cx < 0 || cy < 0 || cx >= project.gridWidth || cy >= project.gridHeight) return;
          const key = `${cx},${cy}`;
          if (key === drag.lastPaintedKey) return;
          const { selectedAssetId, paintCell } = latestRef.current;
          if (!selectedAssetId) return;
          paintCell("floor", cx, cy, selectedAssetId);
          drag.lastPaintedKey = key;
          return;
        }

        if (drag.mode === "paintWall") {
          const target = computeWallTarget(local, project);
          if (!target) return;
          const canon = canonicalizeWallEdge(target.cx, target.cy, target.edge, project.gridWidth, project.gridHeight);
          const key = wallKey(canon.x, canon.y, canon.edge);
          if (key === drag.lastPaintedKey) return;
          const { selectedAssetId, paintWallEdge } = latestRef.current;
          if (!selectedAssetId) return;
          paintWallEdge(target.cx, target.cy, target.edge, selectedAssetId);
          drag.lastPaintedKey = key;
          return;
        }

        if (drag.mode === "erase") {
          const dedupKey = performErase(local, project);
          if (dedupKey !== null && dedupKey !== drag.lastPaintedKey) {
            drag.lastPaintedKey = dedupKey;
          }
          return;
        }

        if (drag.mode === "propMove" && drag.propStart && drag.propId) {
          const world = worldRef.current!;
          const dx = (e.global.x - drag.propStart.sx) / world.scale.x;
          const dy = (e.global.y - drag.propStart.sy) / world.scale.y;
          const sprite = propSpritesRef.current.get(drag.propId);
          if (sprite) {
            sprite.x = drag.propStart.px + dx;
            sprite.y = drag.propStart.py + dy;
            drawSelection();
          }
        }

        if (drag.mode === "propTransform" && drag.propId && drag.transform) {
          const sprite = propSpritesRef.current.get(drag.propId);
          if (!sprite) return;
          const { handle, anchor, ux, uy, baseWidth, baseHeight, width0, height0, center0, rotation0 } = drag.transform;

          if (handle.kind === "rotate") {
            const measured = Math.atan2(local.y - center0.y, local.x - center0.x);
            let newRotation = measured + Math.PI / 2;
            if (e.shiftKey) {
              const step = Math.PI / 12; // 15deg
              newRotation = Math.round(newRotation / step) * step;
            }
            sprite.rotation = newRotation;
          } else {
            const deltaX = local.x - anchor.x;
            const deltaY = local.y - anchor.y;
            const projX = deltaX * ux.x + deltaY * ux.y;
            const projY = deltaX * uy.x + deltaY * uy.y;
            let newW = handle.dx !== 0 ? Math.max(MIN_PROP_SIZE_PX, handle.dx * projX) : width0;
            let newH = handle.dy !== 0 ? Math.max(MIN_PROP_SIZE_PX, handle.dy * projY) : height0;

            if (e.altKey) {
              // proportional scaling: pick whichever axis moved further from its original size and drive both from it
              const scaleW = newW / width0;
              const scaleH = newH / height0;
              const driver = Math.abs(scaleW - 1) >= Math.abs(scaleH - 1) ? scaleW : scaleH;
              newW = Math.max(MIN_PROP_SIZE_PX, driver * width0);
              newH = Math.max(MIN_PROP_SIZE_PX, driver * height0);
            }

            const centerX = anchor.x + ((handle.dx * newW) / 2) * ux.x + ((handle.dy * newH) / 2) * uy.x;
            const centerY = anchor.y + ((handle.dx * newW) / 2) * ux.y + ((handle.dy * newH) / 2) * uy.y;
            sprite.x = centerX;
            sprite.y = centerY;
            sprite.rotation = rotation0;
            sprite.scale.set(newW / baseWidth, newH / baseHeight);
          }
          drawSelection();
        }
      });

      function endDrag() {
        const drag = dragRef.current;
        if (drag.mode === "propMove" && drag.propId) {
          const sprite = propSpritesRef.current.get(drag.propId);
          if (sprite) {
            latestRef.current.updateProp(drag.propId, { x: sprite.x, y: sprite.y });
          }
        }
        if (drag.mode === "propTransform" && drag.propId) {
          const sprite = propSpritesRef.current.get(drag.propId);
          if (sprite) {
            latestRef.current.updateProp(drag.propId, {
              x: sprite.x,
              y: sprite.y,
              rotation: radToDeg(sprite.rotation),
              scaleX: sprite.scale.x,
              scaleY: sprite.scale.y,
            });
          }
        }
        drag.mode = "none";
        drag.lastPaintedKey = null;
        drag.panStart = null;
        drag.propId = null;
        drag.propStart = null;
        drag.transform = null;
      }

      stage.on("pointerup", endDrag);
      stage.on("pointerupoutside", endDrag);

      el!.addEventListener("wheel", (e: WheelEvent) => {
        e.preventDefault();
        const world = worldRef.current;
        if (!world) return;
        const rect = app.canvas.getBoundingClientRect();
        const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const beforeLocal = world.toLocal(pointer);
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, world.scale.x * factor));
        world.scale.set(newScale);
        const afterGlobal = world.toGlobal(beforeLocal);
        world.position.x += pointer.x - afterGlobal.x;
        world.position.y += pointer.y - afterGlobal.y;
        drawSelection();
        setStatus((s) => {
          const zoomPct = Math.round(newScale * 100);
          return s.zoomPct === zoomPct ? s : { ...s, zoomPct };
        });
      }, { passive: false });

      el!.addEventListener("contextmenu", (e) => e.preventDefault());

      el!.addEventListener("pointerleave", () => {
        hoverLayerRef.current?.clear();
        updateFloorGhost(null);
        updatePropGhost(null);
        setStatus((s) => (s.cell === null ? s : { ...s, cell: null }));
      });
    }

    return () => {
      destroyed = true;
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true });
        } catch {
          /* app may not have finished initializing */
        }
      }
      appRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- keyboard shortcut: "R" cycles the wall edge mode (auto -> N -> E -> S -> W -> auto) ---
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key.toLowerCase() === "r" && latestRef.current.tool === "paintWall") {
        latestRef.current.cycleWallEdgeMode();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function drawGrid() {
    const grid = gridLayerRef.current;
    const p = latestRef.current.project;
    grid?.clear();
    if (!grid || !p || !showGrid) return;
    const { gridColor, gridAlpha } = CANVAS_THEME_COLORS[latestRef.current.resolvedTheme];
    grid.setStrokeStyle({ width: 1, color: gridColor, alpha: gridAlpha });
    for (let x = 0; x <= p.gridWidth; x++) {
      grid.moveTo(x * p.tileSize, 0).lineTo(x * p.tileSize, p.gridHeight * p.tileSize);
    }
    for (let y = 0; y <= p.gridHeight; y++) {
      grid.moveTo(0, y * p.tileSize).lineTo(p.gridWidth * p.tileSize, y * p.tileSize);
    }
    grid.stroke();
  }

  function drawSelection() {
    const sel = selectionLayerRef.current;
    sel?.clear();
    if (!sel) return;
    const { selectedPropId, tool } = latestRef.current;
    if (tool !== "props" || !selectedPropId) return;
    const sprite = propSpritesRef.current.get(selectedPropId);
    const world = worldRef.current;
    if (!sprite || !world) return;

    const rotation = sprite.rotation;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const halfW = sprite.texture.width * Math.abs(sprite.scale.x) / 2;
    const halfH = sprite.texture.height * Math.abs(sprite.scale.y) / 2;
    const worldScale = world.scale.x;

    function toWorldLocal(lx: number, ly: number) {
      return { x: sprite!.x + lx * cos - ly * sin, y: sprite!.y + lx * sin + ly * cos };
    }

    // oriented bounding box outline
    const corners = [
      toWorldLocal(-halfW, -halfH),
      toWorldLocal(halfW, -halfH),
      toWorldLocal(halfW, halfH),
      toWorldLocal(-halfW, halfH),
    ];
    sel.setStrokeStyle({ width: 1.5 / worldScale, color: 0x4dabf7, alpha: 1 });
    sel.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) sel.lineTo(corners[i].x, corners[i].y);
    sel.closePath().stroke();

    // rotate handle + connecting line
    const rotateHandleLocal = { x: 0, y: -halfH - ROTATE_HANDLE_DISTANCE_PX / worldScale };
    const rotateHandleWorld = toWorldLocal(rotateHandleLocal.x, rotateHandleLocal.y);
    const topMid = toWorldLocal(0, -halfH);
    sel.moveTo(topMid.x, topMid.y).lineTo(rotateHandleWorld.x, rotateHandleWorld.y).stroke();
    sel.circle(rotateHandleWorld.x, rotateHandleWorld.y, HANDLE_VISUAL_PX / 2 / worldScale).fill({ color: 0xffffff }).stroke();

    // corner + edge handles
    const handleSize = HANDLE_VISUAL_PX / worldScale;
    for (const handle of PROP_HANDLES) {
      const p = toWorldLocal(handle.dx * halfW, handle.dy * halfH);
      sel
        .rect(p.x - handleSize / 2, p.y - handleSize / 2, handleSize, handleSize)
        .fill({ color: 0xffffff })
        .stroke();
    }
  }

  function updateFloorGhost(cell: { cx: number; cy: number } | null) {
    const ghost = floorGhostRef.current;
    const { project, location, selectedAssetId } = latestRef.current;
    if (!ghost) return;
    const asset = project && selectedAssetId ? assetById(project, selectedAssetId) : undefined;
    if (!cell || !project || !location || !asset) {
      ghost.alpha = 0;
      return;
    }
    ghost.x = cell.cx * project.tileSize;
    ghost.y = cell.cy * project.tileSize;
    ghost.width = project.tileSize;
    ghost.height = project.tileSize;
    ghost.alpha = 0.55;
    void loadTexture(assetFileUrl(location, asset)).then((texture) => {
      if (floorGhostRef.current) floorGhostRef.current.texture = texture;
    });
  }

  function updatePropGhost(worldPos: { x: number; y: number } | null) {
    const ghost = propGhostRef.current;
    const { project, location, draggingAssetId, selectedAssetId } = latestRef.current;
    if (!ghost) return;
    const assetId = draggingAssetId ?? selectedAssetId;
    const asset = project && assetId ? assetById(project, assetId) : undefined;
    if (!worldPos || !project || !location || !asset || asset.category !== "prop") {
      ghost.alpha = 0;
      return;
    }
    ghost.x = worldPos.x;
    ghost.y = worldPos.y;
    ghost.alpha = 0.6;
    void loadTexture(assetFileUrl(location, asset)).then((texture) => {
      if (propGhostRef.current) propGhostRef.current.texture = texture;
    });
  }

  function drawWallHover(target: WallTarget | null) {
    const hover = hoverLayerRef.current;
    const { project, tool } = latestRef.current;
    hover?.clear();
    if (!hover || !project || !target) return;
    const { cx, cy, rotation } = wallGeometry(target.cx, target.cy, target.edge, project.tileSize);
    const thickness = project.tileSize * WALL_THICKNESS_RATIO;
    const color = tool === "erase" ? 0xff6b6b : 0x4dabf7;
    hover.rect(-project.tileSize / 2, -thickness / 2, project.tileSize, thickness).fill({ color, alpha: 0.5 });
    hover.position.set(cx, cy);
    hover.rotation = rotation;
  }

  function assetById(project: MapProject, id: string | undefined | null): AssetRef | undefined {
    if (!id) return undefined;
    return project.assets.find((a) => a.id === id);
  }

  async function ensureCellSprite(
    map: Map<string, Sprite>,
    layerContainer: Container,
    key: string,
    x: number,
    y: number,
    tileSize: number,
    url: string,
  ) {
    let sprite = map.get(key);
    if (!sprite) {
      sprite = new Sprite();
      sprite.x = x * tileSize;
      sprite.y = y * tileSize;
      sprite.width = tileSize;
      sprite.height = tileSize;
      layerContainer.addChild(sprite);
      map.set(key, sprite);
    }
    const texture = await loadTexture(url);
    sprite.texture = texture;
  }

  function syncFloorLayer(project: MapProject, location: ProjectLocation) {
    const layerContainer = floorLayerRef.current;
    if (!layerContainer) return;
    const next = project.floorCells;
    const prev = prevFloorCellsRef.current;
    if (prev === next) return; // nothing changed since last sync (common case: only wall/props changed)
    const map = floorSpritesRef.current;

    for (const key of Object.keys(prev)) {
      if (!(key in next)) {
        const sprite = map.get(key);
        if (sprite) {
          layerContainer.removeChild(sprite);
          sprite.destroy();
          map.delete(key);
        }
      }
    }

    for (const key of Object.keys(next)) {
      if (prev[key] === next[key]) continue; // this cell didn't change; skip re-touching its sprite
      const assetId = next[key];
      const asset = assetById(project, assetId);
      if (!asset) continue;
      const [xs, ys] = key.split(",");
      const url = assetFileUrl(location, asset);
      void ensureCellSprite(map, layerContainer, key, Number(xs), Number(ys), project.tileSize, url);
    }

    prevFloorCellsRef.current = next;
  }

  async function ensureWallSprite(key: string, x: number, y: number, edge: WallEdge, tileSize: number, url: string) {
    const layerContainer = wallLayerRef.current;
    if (!layerContainer) return;
    const map = wallSpritesRef.current;
    let sprite = map.get(key);
    const geo = wallGeometry(x, y, edge, tileSize);
    const thickness = tileSize * WALL_THICKNESS_RATIO;
    if (!sprite) {
      sprite = new Sprite();
      sprite.anchor.set(0.5);
      layerContainer.addChild(sprite);
      map.set(key, sprite);
    }
    sprite.x = geo.cx;
    sprite.y = geo.cy;
    sprite.rotation = geo.rotation;
    sprite.width = tileSize;
    sprite.height = thickness;
    const texture = await loadTexture(url);
    sprite.texture = texture;
  }

  function syncWallLayer(project: MapProject, location: ProjectLocation) {
    const layerContainer = wallLayerRef.current;
    if (!layerContainer) return;
    const next = project.wallCells;
    const prev = prevWallCellsRef.current;
    if (prev === next) return; // nothing changed since last sync (common case: only floor/props changed)
    const map = wallSpritesRef.current;

    for (const key of Object.keys(prev)) {
      if (!(key in next)) {
        const sprite = map.get(key);
        if (sprite) {
          layerContainer.removeChild(sprite);
          sprite.destroy();
          map.delete(key);
        }
      }
    }

    for (const key of Object.keys(next)) {
      if (prev[key] === next[key]) continue; // this edge didn't change; skip re-touching its sprite
      const assetId = next[key];
      const asset = assetById(project, assetId);
      if (!asset) continue;
      const { x, y, edge } = parseWallKey(key);
      const url = assetFileUrl(location, asset);
      void ensureWallSprite(key, x, y, edge, project.tileSize, url);
    }

    prevWallCellsRef.current = next;
  }

  async function ensurePropSprite(project: MapProject, location: ProjectLocation, propId: string) {
    const prop = project.props.find((p) => p.id === propId);
    if (!prop) return;
    const asset = assetById(project, prop.assetId);
    if (!asset) return;
    const layer = propsLayerRef.current;
    if (!layer) return;

    let sprite = propSpritesRef.current.get(propId);
    if (!sprite) {
      sprite = new Sprite();
      sprite.anchor.set(0.5);
      sprite.eventMode = "static";
      sprite.cursor = "pointer";
      layer.addChild(sprite);
      propSpritesRef.current.set(propId, sprite);
    }
    sprite.x = prop.x;
    sprite.y = prop.y;
    sprite.rotation = degToRad(prop.rotation);
    sprite.scale.set(prop.scaleX, prop.scaleY);
    sprite.zIndex = prop.zIndex;
    const url = assetFileUrl(location, asset);
    const texture = await loadTexture(url);
    sprite.texture = texture;
  }

  function syncPropsLayer(project: MapProject, location: ProjectLocation) {
    const layer = propsLayerRef.current;
    if (!layer) return;
    const idsNeeded = new Set(project.props.map((p) => p.id));
    for (const [id, sprite] of propSpritesRef.current) {
      if (!idsNeeded.has(id)) {
        layer.removeChild(sprite);
        sprite.destroy();
        propSpritesRef.current.delete(id);
      }
    }
    for (const prop of project.props) {
      const sprite = propSpritesRef.current.get(prop.id);
      if (sprite) {
        sprite.x = prop.x;
        sprite.y = prop.y;
        sprite.rotation = degToRad(prop.rotation);
        sprite.scale.set(prop.scaleX, prop.scaleY);
        sprite.zIndex = prop.zIndex;
      } else {
        void ensurePropSprite(project, location, prop.id);
      }
    }
  }

  function syncEverything() {
    const { project, location } = latestRef.current;
    if (!project || !location) return;
    syncFloorLayer(project, location);
    syncWallLayer(project, location);
    syncPropsLayer(project, location);
    drawGrid();
    drawSelection();
  }

  useEffect(() => {
    syncEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.floorCells, project?.wallCells, project?.props, project?.assets, location]);

  useEffect(() => {
    drawGrid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrid, project?.gridWidth, project?.gridHeight, project?.tileSize]);

  useEffect(() => {
    const app = appRef.current;
    // app.init() is async: appRef.current is set synchronously to `new Application()` before
    // .renderer exists, so this effect can fire mid-init on mount. Guard on .renderer too.
    if (!app || !app.renderer) return;
    app.renderer.background.color = CANVAS_THEME_COLORS[resolvedTheme].background;
    drawGrid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme]);

  useEffect(() => {
    drawSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropId, tool]);

  // --- drop target for adding props from the asset panel ---
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const { project } = latestRef.current;
    if (!project) return;
    const assetId = e.dataTransfer.getData("application/x-asset-id");
    const category = e.dataTransfer.getData("application/x-asset-category");
    if (!assetId || category !== "prop") return;
    const app = appRef.current;
    const world = worldRef.current;
    if (!app || !world) return;
    const rect = app.canvas.getBoundingClientRect();
    const local = world.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    latestRef.current.addProp({ assetId, x: local.x, y: local.y, rotation: 0, scaleX: 1, scaleY: 1 });
    updatePropGhost(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    const app = appRef.current;
    const world = worldRef.current;
    if (!app || !world) return;
    const rect = app.canvas.getBoundingClientRect();
    const local = world.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    updatePropGhost(local);
  }

  return (
    <div
      ref={containerRef}
      className="map-canvas"
      onDragOver={handleDragOver}
      onDragLeave={() => updatePropGhost(null)}
      onDrop={handleDrop}
    >
      {project && (
        <div className="canvas-statusbar">
          <span>
            {t("canvas.grid")} <strong>{project.gridWidth}×{project.gridHeight}</strong>
          </span>
          <span>
            {t("canvas.tile")} <strong>{project.tileSize}px</strong>
          </span>
          {status.cell && (
            <span>
              {t("canvas.cell")} <strong>{status.cell.x}, {status.cell.y}</strong>
            </span>
          )}
          <span>
            {t("canvas.zoom")} <strong>{status.zoomPct}%</strong>
          </span>
        </div>
      )}
    </div>
  );
}
