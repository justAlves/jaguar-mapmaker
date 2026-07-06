import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  CharacterLight,
  CharacterToken,
  InitiativeEntry,
  MapProject,
  ProjectLocation,
  PropInstance,
  SessionLocation,
  TokenAsset,
  VttMapSlot,
  VttSession,
} from "../types";
import { touchRecentSession } from "../lib/recentSessions";

const DEFAULT_CHARACTER_LIGHT: CharacterLight = {
  enabled: true,
  kind: "radial",
  color: "#ffaa55",
  radius: 180,
  intensity: 0.6,
  rotation: 0,
  coneAngle: 60,
};

const MAX_HISTORY = 100;

/** The map slot currently loaded/being played, or null if the session somehow has none. */
export function activeMapSlot(session: VttSession | null): VttMapSlot | null {
  if (!session) return null;
  return session.maps.find((m) => m.id === session.activeMapId) ?? null;
}

function updateActiveMap(session: VttSession, updater: (slot: VttMapSlot) => VttMapSlot): VttSession {
  return { ...session, maps: session.maps.map((m) => (m.id === session.activeMapId ? updater(m) : m)) };
}

interface VttState {
  session: VttSession | null;
  sessionLocation: SessionLocation | null;
  /** Runtime project data for the currently active map slot (not persisted; reloaded from disk on session open / map switch). */
  map: MapProject | null;
  mapLocation: ProjectLocation | null;

  selectedCharacterId: string | null;
  selectedPropId: string | null;
  statusMessage: string | null;

  /** Snapshots of `session` from before each mutating action. Safe to keep by reference: every mutation replaces `session` with a new object rather than mutating the old one in place. */
  undoStack: VttSession[];
  redoStack: VttSession[];

  setSessionAndMap: (session: VttSession, sessionLocation: SessionLocation, map: MapProject, mapLocation: ProjectLocation) => void;
  closeSession: () => void;
  setStatusMessage: (message: string | null) => void;
  /** Refreshes the runtime `map`/`mapLocation` without touching `session` — used after undo/redo crosses a map switch, since those only restore `session` and the caller must reload the now-active map's project data from disk. */
  setLoadedMap: (map: MapProject, mapLocation: ProjectLocation) => void;

  addMapSlot: (slot: VttMapSlot, map: MapProject, mapLocation: ProjectLocation) => void;
  switchActiveMap: (mapId: string, map: MapProject, mapLocation: ProjectLocation) => void;
  renameMapSlot: (mapId: string, name: string) => void;
  /** No-ops if `mapId` is the active map (switch away first) or the last remaining map. */
  removeMapSlot: (mapId: string) => void;

  setSelectedCharacterId: (id: string | null) => void;
  setSelectedPropId: (id: string | null) => void;

  addTokenAssets: (assets: TokenAsset[]) => void;

  addCharacter: (partial: Omit<CharacterToken, "id">) => void;
  updateCharacter: (id: string, next: Partial<CharacterToken>) => void;
  removeCharacter: (id: string) => void;
  toggleCharacterLight: (id: string) => void;
  updateCharacterLight: (id: string, next: Partial<CharacterLight>) => void;

  setFogAlpha: (alpha: number) => void;
  setAmbientLight: (level: number) => void;

  addProp: (partial: Omit<PropInstance, "id" | "zIndex">) => void;
  updateProp: (id: string, next: Partial<PropInstance>) => void;
  removeProp: (id: string) => void;

  addInitiativeEntry: (name: string, initiative: number, characterId: string | null) => void;
  updateInitiativeEntry: (id: string, next: Partial<InitiativeEntry>) => void;
  removeInitiativeEntry: (id: string) => void;
  startCombat: () => void;
  endCombat: () => void;
  nextTurn: () => void;

  undo: () => void;
  redo: () => void;
}

export const useVttStore = create<VttState>((set, get) => ({
  session: null,
  sessionLocation: null,
  map: null,
  mapLocation: null,

  selectedCharacterId: null,
  selectedPropId: null,
  statusMessage: null,

  undoStack: [],
  redoStack: [],

  setSessionAndMap: (session, sessionLocation, map, mapLocation) => {
    set({
      session,
      sessionLocation,
      map,
      mapLocation,
      selectedCharacterId: null,
      selectedPropId: null,
      undoStack: [],
      redoStack: [],
    });
    touchRecentSession({
      name: session.name,
      filePath: sessionLocation.filePath,
      folderPath: sessionLocation.folderPath,
      mapFilePath: activeMapSlot(session)?.mapFilePath ?? "",
    }).catch((err) => console.error("Failed to register recent session:", err));
  },

  closeSession: () =>
    set({
      session: null,
      sessionLocation: null,
      map: null,
      mapLocation: null,
      selectedCharacterId: null,
      selectedPropId: null,
      undoStack: [],
      redoStack: [],
    }),

  setStatusMessage: (message) => set({ statusMessage: message }),

  setLoadedMap: (map, mapLocation) => set({ map, mapLocation }),

  addMapSlot: (slot, map, mapLocation) =>
    set((s) => {
      if (!s.session) return s;
      return {
        session: { ...s.session, maps: [...s.session.maps, slot], activeMapId: slot.id },
        map,
        mapLocation,
        selectedCharacterId: null,
        selectedPropId: null,
      };
    }),

  switchActiveMap: (mapId, map, mapLocation) =>
    set((s) => {
      if (!s.session || !s.session.maps.some((m) => m.id === mapId)) return s;
      return {
        session: { ...s.session, activeMapId: mapId },
        map,
        mapLocation,
        selectedCharacterId: null,
        selectedPropId: null,
      };
    }),

  renameMapSlot: (mapId, name) =>
    set((s) => {
      if (!s.session) return s;
      return { session: { ...s.session, maps: s.session.maps.map((m) => (m.id === mapId ? { ...m, name } : m)) } };
    }),

  removeMapSlot: (mapId) =>
    set((s) => {
      if (!s.session) return s;
      if (s.session.activeMapId === mapId || s.session.maps.length <= 1) return s;
      return {
        session: { ...s.session, maps: s.session.maps.filter((m) => m.id !== mapId) },
        undoStack: [...s.undoStack, s.session].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }),

  setSelectedCharacterId: (id) => set({ selectedCharacterId: id, selectedPropId: id ? null : get().selectedPropId }),
  setSelectedPropId: (id) => set({ selectedPropId: id, selectedCharacterId: id ? null : get().selectedCharacterId }),

  addTokenAssets: (assets) =>
    set((s) => {
      if (!s.session) return s;
      return {
        session: { ...s.session, tokenAssets: [...s.session.tokenAssets, ...assets] },
        undoStack: [...s.undoStack, s.session].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }),

  addCharacter: (partial) => {
    const { session } = get();
    if (!session) return;
    const character: CharacterToken = { ...partial, id: nanoid() };
    const nextSession = updateActiveMap(session, (slot) => ({ ...slot, characters: [...slot.characters, character] }));
    set((s) => ({
      session: nextSession,
      selectedCharacterId: character.id,
      undoStack: [...s.undoStack, session].slice(-MAX_HISTORY),
      redoStack: [],
    }));
  },

  updateCharacter: (id, next) =>
    set((s) => {
      if (!s.session) return s;
      const nextSession = updateActiveMap(s.session, (slot) => ({
        ...slot,
        characters: slot.characters.map((c) => (c.id === id ? { ...c, ...next } : c)),
      }));
      return { session: nextSession, undoStack: [...s.undoStack, s.session].slice(-MAX_HISTORY), redoStack: [] };
    }),

  removeCharacter: (id) =>
    set((s) => {
      if (!s.session) return s;
      const nextSession = updateActiveMap(s.session, (slot) => ({
        ...slot,
        characters: slot.characters.filter((c) => c.id !== id),
        // unlink (not remove) any initiative row that referenced this character — it becomes a freeform entry
        initiative: slot.initiative.map((entry) => (entry.characterId === id ? { ...entry, characterId: null } : entry)),
      }));
      return {
        session: nextSession,
        selectedCharacterId: s.selectedCharacterId === id ? null : s.selectedCharacterId,
        undoStack: [...s.undoStack, s.session].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }),

  toggleCharacterLight: (id) =>
    set((s) => {
      if (!s.session) return s;
      const nextSession = updateActiveMap(s.session, (slot) => ({
        ...slot,
        characters: slot.characters.map((c) =>
          c.id === id ? { ...c, light: c.light ? { ...c.light, enabled: !c.light.enabled } : { ...DEFAULT_CHARACTER_LIGHT } } : c,
        ),
      }));
      return { session: nextSession, undoStack: [...s.undoStack, s.session].slice(-MAX_HISTORY), redoStack: [] };
    }),

  updateCharacterLight: (id, next) =>
    set((s) => {
      if (!s.session) return s;
      const nextSession = updateActiveMap(s.session, (slot) => ({
        ...slot,
        characters: slot.characters.map((c) => (c.id === id && c.light ? { ...c, light: { ...c.light, ...next } } : c)),
      }));
      return { session: nextSession, undoStack: [...s.undoStack, s.session].slice(-MAX_HISTORY), redoStack: [] };
    }),

  setFogAlpha: (alpha) =>
    set((s) => (s.session ? { session: updateActiveMap(s.session, (slot) => ({ ...slot, fogAlpha: alpha })) } : s)),
  setAmbientLight: (level) =>
    set((s) => (s.session ? { session: updateActiveMap(s.session, (slot) => ({ ...slot, ambientLight: level })) } : s)),

  addProp: (partial) => {
    const { session } = get();
    if (!session) return;
    const slot = activeMapSlot(session);
    const maxZ = slot?.props.reduce((m, p) => Math.max(m, p.zIndex), -1) ?? -1;
    const prop: PropInstance = { ...partial, id: nanoid(), zIndex: maxZ + 1 };
    const nextSession = updateActiveMap(session, (s) => ({ ...s, props: [...s.props, prop] }));
    set((s) => ({
      session: nextSession,
      selectedPropId: prop.id,
      undoStack: [...s.undoStack, session].slice(-MAX_HISTORY),
      redoStack: [],
    }));
  },

  updateProp: (id, next) =>
    set((s) => {
      if (!s.session) return s;
      const nextSession = updateActiveMap(s.session, (slot) => ({
        ...slot,
        props: slot.props.map((p) => (p.id === id ? { ...p, ...next } : p)),
      }));
      return { session: nextSession, undoStack: [...s.undoStack, s.session].slice(-MAX_HISTORY), redoStack: [] };
    }),

  removeProp: (id) =>
    set((s) => {
      if (!s.session) return s;
      const nextSession = updateActiveMap(s.session, (slot) => ({ ...slot, props: slot.props.filter((p) => p.id !== id) }));
      return {
        session: nextSession,
        selectedPropId: s.selectedPropId === id ? null : s.selectedPropId,
        undoStack: [...s.undoStack, s.session].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }),

  addInitiativeEntry: (name, initiative, characterId) => {
    const { session } = get();
    if (!session) return;
    const entry: InitiativeEntry = { id: nanoid(), name, initiative, characterId };
    const nextSession = updateActiveMap(session, (slot) => ({ ...slot, initiative: [...slot.initiative, entry] }));
    set((s) => ({ session: nextSession, undoStack: [...s.undoStack, session].slice(-MAX_HISTORY), redoStack: [] }));
  },

  updateInitiativeEntry: (id, next) =>
    set((s) => {
      if (!s.session) return s;
      const nextSession = updateActiveMap(s.session, (slot) => ({
        ...slot,
        initiative: slot.initiative.map((entry) => (entry.id === id ? { ...entry, ...next } : entry)),
      }));
      return { session: nextSession, undoStack: [...s.undoStack, s.session].slice(-MAX_HISTORY), redoStack: [] };
    }),

  removeInitiativeEntry: (id) =>
    set((s) => {
      if (!s.session) return s;
      const nextSession = updateActiveMap(s.session, (slot) => {
        const remaining = slot.initiative.filter((entry) => entry.id !== id);
        const activeTurnId = slot.activeTurnId === id ? (remaining[0]?.id ?? null) : slot.activeTurnId;
        return { ...slot, initiative: remaining, activeTurnId };
      });
      return { session: nextSession, undoStack: [...s.undoStack, s.session].slice(-MAX_HISTORY), redoStack: [] };
    }),

  // Turn/round flow is ephemeral session bookkeeping, not undo-tracked (same reasoning as fog/ambient sliders).
  startCombat: () =>
    set((s) => {
      if (!s.session) return s;
      const nextSession = updateActiveMap(s.session, (slot) => {
        const ordered = [...slot.initiative].sort((a, b) => b.initiative - a.initiative);
        return { ...slot, activeTurnId: ordered[0]?.id ?? null, round: ordered.length > 0 ? 1 : 0 };
      });
      return { session: nextSession };
    }),

  endCombat: () =>
    set((s) => {
      if (!s.session) return s;
      return { session: updateActiveMap(s.session, (slot) => ({ ...slot, activeTurnId: null, round: 0 })) };
    }),

  nextTurn: () =>
    set((s) => {
      if (!s.session) return s;
      const nextSession = updateActiveMap(s.session, (slot) => {
        if (slot.initiative.length === 0) return slot;
        const ordered = [...slot.initiative].sort((a, b) => b.initiative - a.initiative);
        const currentIdx = ordered.findIndex((entry) => entry.id === slot.activeTurnId);
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % ordered.length;
        const wrapped = currentIdx !== -1 && nextIdx <= currentIdx;
        return { ...slot, activeTurnId: ordered[nextIdx]?.id ?? null, round: wrapped ? slot.round + 1 : slot.round };
      });
      return { session: nextSession };
    }),

  undo: () =>
    set((s) => {
      if (!s.session || s.undoStack.length === 0) return s;
      const prev = s.undoStack[s.undoStack.length - 1];
      return {
        session: prev,
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, s.session].slice(-MAX_HISTORY),
        selectedCharacterId: null,
        selectedPropId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.session || s.redoStack.length === 0) return s;
      const next = s.redoStack[s.redoStack.length - 1];
      return {
        session: next,
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, s.session].slice(-MAX_HISTORY),
        selectedCharacterId: null,
        selectedPropId: null,
      };
    }),
}));
