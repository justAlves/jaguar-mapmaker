import { create } from "zustand";
import { nanoid } from "nanoid";
import type { AssetRef, LightInstance, MapProject, ProjectLocation, PropInstance, ToolMode, WallEdge } from "../types";
import { canonicalizeWallEdge, cellKey, emptyProject, wallKey } from "../types";
import { touchRecentProject } from "../lib/recentProjects";

/** A reversible unit of change to the project. Undo/redo replays these against the store. */
export type Command =
  | { type: "paintCell"; layer: "floor" | "wall"; key: string; prevAssetId: string | null; nextAssetId: string | null }
  | { type: "addProp"; prop: PropInstance }
  | { type: "removeProp"; prop: PropInstance }
  | { type: "updateProp"; id: string; prev: Partial<PropInstance>; next: Partial<PropInstance> }
  | { type: "addLight"; light: LightInstance }
  | { type: "removeLight"; light: LightInstance }
  | { type: "updateLight"; id: string; prev: Partial<LightInstance>; next: Partial<LightInstance> }
  | { type: "batch"; commands: Command[] };

interface EditorState {
  project: MapProject | null;
  location: ProjectLocation | null;

  tool: ToolMode;
  selectedAssetId: string | null;
  selectedPropId: string | null;
  selectedLightId: string | null;
  showGrid: boolean;
  /** "auto" detects the nearest edge from cursor position; a specific edge pins painting to that side. */
  wallEdgeMode: "auto" | WallEdge;
  /** Asset currently being dragged from the AssetPanel, if any (dataTransfer isn't readable during dragover). */
  draggingAssetId: string | null;
  /** Transient toolbar feedback (e.g. "Projeto salvo."), settable from anywhere (toolbar button or keyboard shortcuts). */
  statusMessage: string | null;

  undoStack: Command[];
  redoStack: Command[];

  setProjectAndLocation: (project: MapProject, location: ProjectLocation) => void;
  closeProject: () => void;

  setTool: (tool: ToolMode) => void;
  setSelectedAssetId: (id: string | null) => void;
  setSelectedPropId: (id: string | null) => void;
  setSelectedLightId: (id: string | null) => void;
  toggleGrid: () => void;
  setWallEdgeMode: (mode: "auto" | WallEdge) => void;
  cycleWallEdgeMode: () => void;
  setDraggingAssetId: (id: string | null) => void;
  setStatusMessage: (message: string | null) => void;

  addAssets: (assets: AssetRef[]) => void;
  setAssetFolder: (assetId: string, folder: string | null) => void;
  toggleAssetFavorite: (assetId: string) => void;

  paintCell: (layer: "floor" | "wall", x: number, y: number, assetId: string | null) => void;
  paintWallEdge: (x: number, y: number, edge: WallEdge, assetId: string | null) => void;
  /** Applies many cell paints (e.g. rectangle/line/bucket fill) as a single undo step. */
  paintCellsBatch: (layer: "floor" | "wall", entries: { key: string; assetId: string | null }[]) => void;
  /** Applies many wall-edge paints (e.g. a straight wall line) as a single undo step. */
  paintWallEdgesBatch: (edges: { x: number; y: number; edge: WallEdge; assetId: string | null }[]) => void;
  addProp: (partial: Omit<PropInstance, "id" | "zIndex">) => void;
  updateProp: (id: string, next: Partial<PropInstance>) => void;
  removeProp: (id: string) => void;

  addLight: (partial: Omit<LightInstance, "id">) => void;
  updateLight: (id: string, next: Partial<LightInstance>) => void;
  removeLight: (id: string) => void;

  undo: () => void;
  redo: () => void;
}

function applyCommand(project: MapProject, command: Command, direction: "do" | "undo"): MapProject {
  switch (command.type) {
    case "paintCell": {
      const cells = { ...project[command.layer === "floor" ? "floorCells" : "wallCells"] };
      const assetId = direction === "do" ? command.nextAssetId : command.prevAssetId;
      if (assetId === null) {
        delete cells[command.key];
      } else {
        cells[command.key] = assetId;
      }
      return {
        ...project,
        [command.layer === "floor" ? "floorCells" : "wallCells"]: cells,
      };
    }
    case "addProp": {
      if (direction === "do") {
        return { ...project, props: [...project.props, command.prop] };
      }
      return { ...project, props: project.props.filter((p) => p.id !== command.prop.id) };
    }
    case "removeProp": {
      if (direction === "do") {
        return { ...project, props: project.props.filter((p) => p.id !== command.prop.id) };
      }
      return { ...project, props: [...project.props, command.prop] };
    }
    case "updateProp": {
      const patch = direction === "do" ? command.next : command.prev;
      return {
        ...project,
        props: project.props.map((p) => (p.id === command.id ? { ...p, ...patch } : p)),
      };
    }
    case "addLight": {
      if (direction === "do") {
        return { ...project, lights: [...project.lights, command.light] };
      }
      return { ...project, lights: project.lights.filter((l) => l.id !== command.light.id) };
    }
    case "removeLight": {
      if (direction === "do") {
        return { ...project, lights: project.lights.filter((l) => l.id !== command.light.id) };
      }
      return { ...project, lights: [...project.lights, command.light] };
    }
    case "updateLight": {
      const patch = direction === "do" ? command.next : command.prev;
      return {
        ...project,
        lights: project.lights.map((l) => (l.id === command.id ? { ...l, ...patch } : l)),
      };
    }
    case "batch": {
      const ordered = direction === "do" ? command.commands : [...command.commands].reverse();
      return ordered.reduce((proj, cmd) => applyCommand(proj, cmd, direction), project);
    }
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  location: null,

  tool: "paintFloor",
  selectedAssetId: null,
  selectedPropId: null,
  selectedLightId: null,
  showGrid: true,
  wallEdgeMode: "auto",
  draggingAssetId: null,
  statusMessage: null,

  undoStack: [],
  redoStack: [],

  setProjectAndLocation: (project, location) => {
    set({ project, location, undoStack: [], redoStack: [], selectedPropId: null, selectedLightId: null });
    touchRecentProject({
      name: project.name,
      filePath: location.filePath,
      folderPath: location.folderPath,
      gridWidth: project.gridWidth,
      gridHeight: project.gridHeight,
      tileSize: project.tileSize,
    }).catch((err) => console.error("Failed to register recent project:", err));
  },

  closeProject: () => set({ project: null, location: null, undoStack: [], redoStack: [] }),

  setTool: (tool) =>
    set({
      tool,
      selectedPropId: tool === "props" ? get().selectedPropId : null,
      selectedLightId: tool === "light" ? get().selectedLightId : null,
    }),
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
  setSelectedPropId: (id) => set({ selectedPropId: id }),
  setSelectedLightId: (id) => set({ selectedLightId: id }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  setWallEdgeMode: (mode) => set({ wallEdgeMode: mode }),
  cycleWallEdgeMode: () =>
    set((s) => {
      const order: ("auto" | WallEdge)[] = ["auto", "N", "E", "S", "W"];
      const next = order[(order.indexOf(s.wallEdgeMode) + 1) % order.length];
      return { wallEdgeMode: next };
    }),
  setDraggingAssetId: (id) => set({ draggingAssetId: id }),
  setStatusMessage: (message) => set({ statusMessage: message }),

  addAssets: (assets) =>
    set((s) => (s.project ? { project: { ...s.project, assets: [...s.project.assets, ...assets] } } : s)),

  setAssetFolder: (assetId, folder) =>
    set((s) => {
      if (!s.project) return s;
      const assets = s.project.assets.map((a) =>
        a.id === assetId ? { ...a, folder: folder ?? undefined } : a,
      );
      return { project: { ...s.project, assets } };
    }),

  toggleAssetFavorite: (assetId) =>
    set((s) => {
      if (!s.project) return s;
      const assets = s.project.assets.map((a) => (a.id === assetId ? { ...a, favorite: !a.favorite } : a));
      return { project: { ...s.project, assets } };
    }),

  paintCell: (layer, x, y, assetId) => {
    const { project } = get();
    if (!project) return;
    const key = cellKey(x, y);
    const cells = layer === "floor" ? project.floorCells : project.wallCells;
    const prevAssetId = cells[key] ?? null;
    if (prevAssetId === assetId) return;
    const command: Command = { type: "paintCell", layer, key, prevAssetId, nextAssetId: assetId };
    const nextProject = applyCommand(project, command, "do");
    set({ project: nextProject, undoStack: [...get().undoStack, command], redoStack: [] });
  },

  paintWallEdge: (x, y, edge, assetId) => {
    const { project } = get();
    if (!project) return;
    const canon = canonicalizeWallEdge(x, y, edge, project.gridWidth, project.gridHeight);
    const key = wallKey(canon.x, canon.y, canon.edge);
    const prevAssetId = project.wallCells[key] ?? null;
    if (prevAssetId === assetId) return;
    const command: Command = { type: "paintCell", layer: "wall", key, prevAssetId, nextAssetId: assetId };
    const nextProject = applyCommand(project, command, "do");
    set({ project: nextProject, undoStack: [...get().undoStack, command], redoStack: [] });
  },

  paintCellsBatch: (layer, entries) => {
    const { project } = get();
    if (!project) return;
    const cells = layer === "floor" ? project.floorCells : project.wallCells;
    const commands: Command[] = [];
    const seen = new Set<string>();
    for (const { key, assetId } of entries) {
      if (seen.has(key)) continue;
      seen.add(key);
      const prevAssetId = cells[key] ?? null;
      if (prevAssetId === assetId) continue;
      commands.push({ type: "paintCell", layer, key, prevAssetId, nextAssetId: assetId });
    }
    if (commands.length === 0) return;
    const command: Command = commands.length === 1 ? commands[0] : { type: "batch", commands };
    const nextProject = applyCommand(project, command, "do");
    set({ project: nextProject, undoStack: [...get().undoStack, command], redoStack: [] });
  },

  paintWallEdgesBatch: (edges) => {
    const { project } = get();
    if (!project) return;
    const commands: Command[] = [];
    const seen = new Set<string>();
    for (const e of edges) {
      const canon = canonicalizeWallEdge(e.x, e.y, e.edge, project.gridWidth, project.gridHeight);
      const key = wallKey(canon.x, canon.y, canon.edge);
      if (seen.has(key)) continue;
      seen.add(key);
      const prevAssetId = project.wallCells[key] ?? null;
      if (prevAssetId === e.assetId) continue;
      commands.push({ type: "paintCell", layer: "wall", key, prevAssetId, nextAssetId: e.assetId });
    }
    if (commands.length === 0) return;
    const command: Command = commands.length === 1 ? commands[0] : { type: "batch", commands };
    const nextProject = applyCommand(project, command, "do");
    set({ project: nextProject, undoStack: [...get().undoStack, command], redoStack: [] });
  },

  addProp: (partial) => {
    const { project } = get();
    if (!project) return;
    const maxZ = project.props.reduce((m, p) => Math.max(m, p.zIndex), -1);
    const prop: PropInstance = { ...partial, id: nanoid(), zIndex: maxZ + 1 };
    const command: Command = { type: "addProp", prop };
    const nextProject = applyCommand(project, command, "do");
    set({ project: nextProject, undoStack: [...get().undoStack, command], redoStack: [], selectedPropId: prop.id });
  },

  updateProp: (id, next) => {
    const { project } = get();
    if (!project) return;
    const current = project.props.find((p) => p.id === id);
    if (!current) return;
    const prev: Partial<PropInstance> = {};
    for (const k of Object.keys(next) as (keyof PropInstance)[]) {
      (prev as Record<string, unknown>)[k] = current[k];
    }
    const command: Command = { type: "updateProp", id, prev, next };
    const nextProject = applyCommand(project, command, "do");
    set({ project: nextProject, undoStack: [...get().undoStack, command], redoStack: [] });
  },

  removeProp: (id) => {
    const { project } = get();
    if (!project) return;
    const prop = project.props.find((p) => p.id === id);
    if (!prop) return;
    const command: Command = { type: "removeProp", prop };
    const nextProject = applyCommand(project, command, "do");
    set({
      project: nextProject,
      undoStack: [...get().undoStack, command],
      redoStack: [],
      selectedPropId: get().selectedPropId === id ? null : get().selectedPropId,
    });
  },

  addLight: (partial) => {
    const { project } = get();
    if (!project) return;
    const light: LightInstance = { ...partial, id: nanoid() };
    const command: Command = { type: "addLight", light };
    const nextProject = applyCommand(project, command, "do");
    set({ project: nextProject, undoStack: [...get().undoStack, command], redoStack: [], selectedLightId: light.id });
  },

  updateLight: (id, next) => {
    const { project } = get();
    if (!project) return;
    const current = project.lights.find((l) => l.id === id);
    if (!current) return;
    const prev: Partial<LightInstance> = {};
    for (const k of Object.keys(next) as (keyof LightInstance)[]) {
      (prev as Record<string, unknown>)[k] = current[k];
    }
    const command: Command = { type: "updateLight", id, prev, next };
    const nextProject = applyCommand(project, command, "do");
    set({ project: nextProject, undoStack: [...get().undoStack, command], redoStack: [] });
  },

  removeLight: (id) => {
    const { project } = get();
    if (!project) return;
    const light = project.lights.find((l) => l.id === id);
    if (!light) return;
    const command: Command = { type: "removeLight", light };
    const nextProject = applyCommand(project, command, "do");
    set({
      project: nextProject,
      undoStack: [...get().undoStack, command],
      redoStack: [],
      selectedLightId: get().selectedLightId === id ? null : get().selectedLightId,
    });
  },

  undo: () => {
    const { project, undoStack, redoStack } = get();
    if (!project || undoStack.length === 0) return;
    const command = undoStack[undoStack.length - 1];
    const nextProject = applyCommand(project, command, "undo");
    set({ project: nextProject, undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, command] });
  },

  redo: () => {
    const { project, undoStack, redoStack } = get();
    if (!project || redoStack.length === 0) return;
    const command = redoStack[redoStack.length - 1];
    const nextProject = applyCommand(project, command, "do");
    set({ project: nextProject, undoStack: [...undoStack, command], redoStack: redoStack.slice(0, -1) });
  },
}));

export function createNewProjectState(name: string, gridWidth: number, gridHeight: number, tileSize: number): MapProject {
  return emptyProject(name, gridWidth, gridHeight, tileSize);
}
