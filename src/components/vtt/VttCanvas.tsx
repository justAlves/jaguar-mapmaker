import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, RenderTexture, Sprite, Text, Texture, type FederatedPointerEvent } from "pixi.js";
import { activeMapSlot, useVttStore } from "../../store/vttStore";
import { useSettingsStore } from "../../store/settingsStore";
import { assetFileUrl } from "../../lib/projectIO";
import { tokenAssetFileUrl } from "../../lib/vttSessionIO";
import { loadTexture } from "../../lib/textureCache";
import { buildMapContainer } from "../../lib/exportPng";
import { useResolvedTheme } from "../../lib/applyTheme";
import { drawLightGlow } from "../../lib/lightRender";
import { wallSegments, type Segment } from "../../lib/visibility";
import { computeFogPolygons, renderFogTexture, type FogPolygon } from "../../lib/fogRender";
import { translate } from "../../i18n/translations";
import { listen } from "@tauri-apps/api/event";
import { emitPlayerMap, emitPlayerState, PLAYER_REQUEST_SYNC_EVENT } from "../../lib/playerWindow";
import {
  applyTransformDrag,
  beginTransformDrag,
  drawTransformHandles,
  hitTestTransformHandle,
  type TransformDragInfo,
} from "../../lib/transformHandles";
import type { CharacterToken, MapProject, PropInstance } from "../../types";

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
/** How fast Q/E spin the selected token while held, in degrees per second. */
const ROTATE_DEG_PER_SEC = 150;

const CANVAS_THEME_COLORS = {
  dark: { background: "#2b2b2b", gridColor: 0xffffff, gridAlpha: 0.2, selection: 0x4da3ff },
  light: { background: "#d3d3d8", gridColor: 0x000000, gridAlpha: 0.12, selection: 0x2563eb },
} as const;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

type DragMode = "none" | "pan" | "moveCharacter" | "moveProp" | "transformCharacter" | "transformProp" | "measure";

interface DragState {
  mode: DragMode;
  panStart: { sx: number; sy: number; wx: number; wy: number } | null;
  moveId: string | null;
  moveStart: { sx: number; sy: number; ox: number; oy: number } | null;
  transform: TransformDragInfo | null;
  measureStart: { x: number; y: number } | null;
}

export function VttCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const mapLayerRef = useRef<Container | null>(null);
  const gridLayerRef = useRef<Graphics | null>(null);
  const propsLayerRef = useRef<Container | null>(null);
  const torchLayerRef = useRef<Container | null>(null);
  const charactersLayerRef = useRef<Container | null>(null);
  const selectionLayerRef = useRef<Graphics | null>(null);
  const rulerLineRef = useRef<Graphics | null>(null);
  const rulerLabelRef = useRef<Text | null>(null);
  const fogSpriteRef = useRef<Sprite | null>(null);
  const fogTextureRef = useRef<RenderTexture | null>(null);
  const characterSpritesRef = useRef<Map<string, Sprite>>(new Map());
  const propSpritesRef = useRef<Map<string, Sprite>>(new Map());
  const torchGraphicsRef = useRef<Map<string, Graphics>>(new Map());
  const wallSegsRef = useRef<Segment[]>([]);
  const loadedMapKeyRef = useRef<string | null>(null);
  const syncGenerationRef = useRef(0);
  const lastFogRecomputeAtRef = useRef(0);
  const lastFogPolygonsRef = useRef<FogPolygon[][]>([]);
  const lastStateEmitAtRef = useRef(0);
  const rotateKeysRef = useRef({ q: false, e: false });
  const rotateAnimFrameRef = useRef<number | null>(null);
  const rotatingRef = useRef<{ kind: "character" | "prop"; id: string } | null>(null);
  const rotateLastTsRef = useRef(0);

  const resolvedTheme = useResolvedTheme();
  const language = useSettingsStore((s) => s.language);
  const [zoomPct, setZoomPct] = useState(100);

  const session = useVttStore((s) => s.session);
  const sessionLocation = useVttStore((s) => s.sessionLocation);
  const map = useVttStore((s) => s.map);
  const mapLocation = useVttStore((s) => s.mapLocation);
  const selectedCharacterId = useVttStore((s) => s.selectedCharacterId);
  const selectedPropId = useVttStore((s) => s.selectedPropId);
  const activeSlot = activeMapSlot(session);

  const dragRef = useRef<DragState>({
    mode: "none",
    panStart: null,
    moveId: null,
    moveStart: null,
    transform: null,
    measureStart: null,
  });

  const latestRef = useRef({
    session,
    sessionLocation,
    map,
    mapLocation,
    selectedCharacterId,
    selectedPropId,
    resolvedTheme,
    language,
    setSelectedCharacterId: useVttStore.getState().setSelectedCharacterId,
    setSelectedPropId: useVttStore.getState().setSelectedPropId,
    updateCharacter: useVttStore.getState().updateCharacter,
    updateProp: useVttStore.getState().updateProp,
    addCharacter: useVttStore.getState().addCharacter,
    addProp: useVttStore.getState().addProp,
  });
  latestRef.current = {
    session,
    sessionLocation,
    map,
    mapLocation,
    selectedCharacterId,
    selectedPropId,
    resolvedTheme,
    language,
    setSelectedCharacterId: useVttStore.getState().setSelectedCharacterId,
    setSelectedPropId: useVttStore.getState().setSelectedPropId,
    updateCharacter: useVttStore.getState().updateCharacter,
    updateProp: useVttStore.getState().updateProp,
    addCharacter: useVttStore.getState().addCharacter,
    addProp: useVttStore.getState().addProp,
  };

  function drawGrid(gfx: Graphics, p: MapProject) {
    gfx.clear();
    const { gridColor, gridAlpha } = CANVAS_THEME_COLORS[latestRef.current.resolvedTheme];
    for (let x = 0; x <= p.gridWidth; x++) {
      gfx.moveTo(x * p.tileSize, 0).lineTo(x * p.tileSize, p.gridHeight * p.tileSize);
    }
    for (let y = 0; y <= p.gridHeight; y++) {
      gfx.moveTo(0, y * p.tileSize).lineTo(p.gridWidth * p.tileSize, y * p.tileSize);
    }
    gfx.stroke({ width: 1, color: gridColor, alpha: gridAlpha });
  }

  function drawSelection() {
    const gfx = selectionLayerRef.current;
    const world = worldRef.current;
    if (!gfx) return;
    gfx.clear();
    const { selectedCharacterId: charId, selectedPropId: propId, resolvedTheme: theme } = latestRef.current;
    const sprite = charId ? characterSpritesRef.current.get(charId) : propId ? propSpritesRef.current.get(propId) : null;
    if (!sprite || !world) return;
    drawTransformHandles(gfx, sprite, world.scale.x, CANVAS_THEME_COLORS[theme].selection);
  }

  /** Draws (or updates) the measurement ruler between two world-space points, with a distance readout in grid squares. */
  function drawRuler(start: { x: number; y: number }, end: { x: number; y: number }) {
    const gfx = rulerLineRef.current;
    const label = rulerLabelRef.current;
    const world = worldRef.current;
    const { map: m, language: lang } = latestRef.current;
    if (!gfx || !label || !world || !m) return;

    const worldScale = world.scale.x;
    const color = 0xffee55;
    gfx.clear();
    gfx.setStrokeStyle({ width: 2 / worldScale, color, alpha: 0.9 });
    gfx.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke();
    gfx.circle(start.x, start.y, 4 / worldScale).fill({ color });
    gfx.circle(end.x, end.y, 4 / worldScale).fill({ color });

    const squares = Math.hypot(end.x - start.x, end.y - start.y) / m.tileSize;
    label.text = translate(lang, "vtt.measureSquares", { n: squares.toFixed(1) });
    label.scale.set(1 / worldScale);
    label.x = (start.x + end.x) / 2;
    label.y = (start.y + end.y) / 2 - 20 / worldScale;
    label.visible = true;
    gfx.visible = true;
  }

  function clearRuler() {
    rulerLineRef.current?.clear();
    if (rulerLabelRef.current) rulerLabelRef.current.visible = false;
  }

  async function syncTokensAndProps() {
    const { session: s, sessionLocation: sLoc, map: m, mapLocation: mLoc } = latestRef.current;
    const slot = activeMapSlot(s);
    const charactersLayer = charactersLayerRef.current;
    const propsLayer = propsLayerRef.current;
    const torchLayer = torchLayerRef.current;
    if (!s || !slot || !sLoc || !m || !mLoc || !charactersLayer || !propsLayer || !torchLayer) return;

    const generation = ++syncGenerationRef.current;
    const tokenAssetById = new Map(s.tokenAssets.map((a) => [a.id, a]));
    const mapAssetById = new Map(m.assets.map((a) => [a.id, a]));

    const characterSprites = new Map<string, Sprite>();
    await Promise.all(
      slot.characters.map(async (character: CharacterToken) => {
        const tokenAsset = tokenAssetById.get(character.tokenAssetId);
        if (!tokenAsset) return;
        const texture = await loadTexture(tokenAssetFileUrl(sLoc, tokenAsset));
        if (generation !== syncGenerationRef.current) return;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.eventMode = "static";
        sprite.x = character.x;
        sprite.y = character.y;
        sprite.rotation = degToRad(character.rotation);
        sprite.scale.set(character.scaleX, character.scaleY);
        characterSprites.set(character.id, sprite);
      }),
    );
    if (generation !== syncGenerationRef.current) return;
    charactersLayer.removeChildren();
    for (const character of slot.characters) {
      const sprite = characterSprites.get(character.id);
      if (sprite) charactersLayer.addChild(sprite);
    }
    characterSpritesRef.current = characterSprites;

    const propSprites = new Map<string, Sprite>();
    await Promise.all(
      slot.props.map(async (prop: PropInstance) => {
        const asset = mapAssetById.get(prop.assetId);
        if (!asset) return;
        const texture = await loadTexture(assetFileUrl(mLoc, asset));
        if (generation !== syncGenerationRef.current) return;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.eventMode = "static";
        sprite.x = prop.x;
        sprite.y = prop.y;
        sprite.rotation = degToRad(prop.rotation);
        sprite.scale.set(prop.scaleX, prop.scaleY);
        sprite.zIndex = prop.zIndex;
        propSprites.set(prop.id, sprite);
      }),
    );
    if (generation !== syncGenerationRef.current) return;
    propsLayer.removeChildren();
    for (const prop of [...slot.props].sort((a, b) => a.zIndex - b.zIndex)) {
      const sprite = propSprites.get(prop.id);
      if (sprite) propsLayer.addChild(sprite);
    }
    propSpritesRef.current = propSprites;

    torchLayer.removeChildren();
    const torchGraphics = new Map<string, Graphics>();
    for (const character of slot.characters) {
      if (!character.light?.enabled) continue;
      const gfx = new Graphics();
      gfx.x = character.x;
      gfx.y = character.y;
      // the cone direction is relative to the token's own facing, so rotating the token carries the torch with it
      gfx.rotation = degToRad(character.rotation) + degToRad(character.light.rotation);
      drawLightGlow(gfx, character.light);
      torchLayer.addChild(gfx);
      torchGraphics.set(character.id, gfx);
    }
    torchGraphicsRef.current = torchGraphics;

    drawSelection();
    void recomputeFog();
    emitState(true);
  }

  /** Recomputes the fog at most ~12x/sec — used while a lit character is being dragged/rotated live, so shadow-casting doesn't run on every single pointer/animation frame. */
  function recomputeFogThrottled() {
    const now = performance.now();
    if (now - lastFogRecomputeAtRef.current < 80) return;
    lastFogRecomputeAtRef.current = now;
    void recomputeFog();
  }

  /** Overrides a slot's characters/props with their live sprite positions, so the player window mirrors an in-progress drag/rotate instead of only snapping once the GM releases it. */
  function liveSlotSnapshot(slot: NonNullable<ReturnType<typeof activeMapSlot>>) {
    return {
      ...slot,
      characters: slot.characters.map((c) => {
        const sprite = characterSpritesRef.current.get(c.id);
        return sprite
          ? { ...c, x: sprite.x, y: sprite.y, rotation: radToDeg(sprite.rotation), scaleX: sprite.scale.x, scaleY: sprite.scale.y }
          : c;
      }),
      props: slot.props.map((p) => {
        const sprite = propSpritesRef.current.get(p.id);
        return sprite
          ? { ...p, x: sprite.x, y: sprite.y, rotation: radToDeg(sprite.rotation), scaleX: sprite.scale.x, scaleY: sprite.scale.y }
          : p;
      }),
    };
  }

  /** Relays the GM's camera + live map state to the player window (throttled ~12x/sec unless `force`), so it can mirror drags/pans smoothly without spamming IPC on every pointer event. */
  function emitState(force = false) {
    const now = performance.now();
    if (!force && now - lastStateEmitAtRef.current < 80) return;
    lastStateEmitAtRef.current = now;

    const world = worldRef.current;
    const el = containerRef.current;
    const { session: s } = latestRef.current;
    const slot = activeMapSlot(s);
    if (!world || !el || !s || !slot) return;

    emitPlayerState({
      slot: liveSlotSnapshot(slot),
      tokenAssets: s.tokenAssets,
      // shadow-casting already ran on this side (recomputeFog) — ship the resulting polygons
      // instead of making the player window re-run the same expensive computation from scratch
      fogPolygons: lastFogPolygonsRef.current,
      camera: {
        worldCenterX: (el.clientWidth / 2 - world.position.x) / world.scale.x,
        worldCenterY: (el.clientHeight / 2 - world.position.y) / world.scale.y,
        scale: world.scale.x,
      },
    });
  }

  /** Spins the selected token live (visual only) while Q/E is held; the store is only written once, when the key is released. */
  function applyContinuousRotation(deltaDeg: number) {
    const { selectedCharacterId, selectedPropId } = latestRef.current;
    if (selectedCharacterId) {
      const sprite = characterSpritesRef.current.get(selectedCharacterId);
      if (!sprite) return;
      sprite.rotation += degToRad(deltaDeg);
      const torchGfx = torchGraphicsRef.current.get(selectedCharacterId);
      if (torchGfx) {
        const character = activeMapSlot(latestRef.current.session)?.characters.find((c) => c.id === selectedCharacterId);
        torchGfx.rotation = sprite.rotation + degToRad(character?.light?.rotation ?? 0);
        recomputeFogThrottled();
      }
      rotatingRef.current = { kind: "character", id: selectedCharacterId };
      drawSelection();
      emitState();
    } else if (selectedPropId) {
      const sprite = propSpritesRef.current.get(selectedPropId);
      if (!sprite) return;
      sprite.rotation += degToRad(deltaDeg);
      rotatingRef.current = { kind: "prop", id: selectedPropId };
      drawSelection();
      emitState();
    }
  }

  /** Writes the final rotation to the store once Q/E is released — a single undo step per hold, not one per frame. */
  function commitContinuousRotation() {
    const pending = rotatingRef.current;
    rotatingRef.current = null;
    if (!pending) return;
    if (pending.kind === "character") {
      const sprite = characterSpritesRef.current.get(pending.id);
      if (sprite) latestRef.current.updateCharacter(pending.id, { rotation: radToDeg(sprite.rotation) });
    } else {
      const sprite = propSpritesRef.current.get(pending.id);
      if (sprite) latestRef.current.updateProp(pending.id, { rotation: radToDeg(sprite.rotation) });
    }
    emitState(true);
  }

  /** Rebuilds the GM's fog-of-war overlay: darkens the whole map except the parts visible from a map light or a lit character torch, blocked by walls (shadow-casting). */
  async function recomputeFog() {
    const { map: m, session: s } = latestRef.current;
    const slot = activeMapSlot(s);
    const app = appRef.current;
    const world = worldRef.current;
    if (!app || !world || !m || !slot) return;

    const mapW = m.gridWidth * m.tileSize;
    const mapH = m.gridHeight * m.tileSize;
    if (mapW <= 0 || mapH <= 0) return;

    // ambient light scales the darkness down: a fully-lit outdoor/daytime map (ambientLight = 1) needs no fog at all
    const darkAlpha = slot.fogAlpha * (1 - slot.ambientLight);

    // live sprite positions/rotations (not the possibly-stale store values) — while a character is
    // mid-drag or mid-rotate, only the sprite is up to date; the store only catches up once the
    // gesture ends, and both the fog and the player-window sync need to track it in real time.
    const liveSlot = liveSlotSnapshot(slot);

    // fully-lit map: skip the (expensive) visibility-polygon computation entirely, nothing would be visible anyway
    const polygons = darkAlpha > 0.001 ? computeFogPolygons(m, liveSlot, wallSegsRef.current) : [];
    lastFogPolygonsRef.current = polygons;

    renderFogTexture(app.renderer, mapW, mapH, darkAlpha, polygons, fogTextureRef, fogSpriteRef.current);
  }

  async function loadMapBackground() {
    const { map: m, mapLocation: mLoc, sessionLocation: sLoc } = latestRef.current;
    const mapLayer = mapLayerRef.current;
    const gridLayer = gridLayerRef.current;
    const world = worldRef.current;
    if (!m || !mLoc || !mapLayer || !gridLayer || !world) return;

    const key = mLoc.filePath;
    if (loadedMapKeyRef.current === key) return;
    loadedMapKeyRef.current = key;
    wallSegsRef.current = wallSegments(m);
    if (sLoc) emitPlayerMap({ mapProject: m, mapLocation: mLoc, sessionLocation: sLoc });

    mapLayer.removeChildren();
    const built = await buildMapContainer(m, mLoc);
    mapLayer.addChild(built);
    drawGrid(gridLayer, m);

    // fit the map in view on first load
    const el = containerRef.current;
    if (el) {
      const mapW = m.gridWidth * m.tileSize;
      const mapH = m.gridHeight * m.tileSize;
      const scale = Math.min(MAX_SCALE, Math.min(el.clientWidth / mapW, el.clientHeight / mapH) * 0.9);
      world.scale.set(Math.max(MIN_SCALE, scale));
      world.position.set((el.clientWidth - mapW * world.scale.x) / 2, (el.clientHeight - mapH * world.scale.y) / 2);
      setZoomPct(Math.round(world.scale.x * 100));
    }
  }

  // --- init Pixi application once ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let destroyed = false;
    let initialized = false;

    const app = new Application();
    appRef.current = app;

    app
      .init({ background: CANVAS_THEME_COLORS[latestRef.current.resolvedTheme].background, resizeTo: el, antialias: true })
      .then(() => {
        initialized = true;
        if (destroyed) {
          app.destroy(true, { children: true });
          return;
        }
        el.appendChild(app.canvas);

        const world = new Container();
        app.stage.addChild(world);
        worldRef.current = world;

        const mapLayer = new Container();
        const gridLayer = new Graphics();
        const propsLayer = new Container();
        propsLayer.sortableChildren = true;
        const torchLayer = new Container();
        torchLayer.blendMode = "add";
        const fogSprite = new Sprite(Texture.EMPTY);
        fogSprite.eventMode = "none";
        const charactersLayer = new Container();
        const selectionLayer = new Graphics();
        const rulerLine = new Graphics();
        const rulerLabel = new Text({ text: "", style: { fontSize: 14, fill: 0xffee55, fontWeight: "600" } });
        rulerLabel.anchor.set(0.5);
        rulerLabel.visible = false;
        world.addChild(mapLayer, gridLayer, propsLayer, torchLayer, fogSprite, charactersLayer, selectionLayer, rulerLine, rulerLabel);

        mapLayerRef.current = mapLayer;
        gridLayerRef.current = gridLayer;
        propsLayerRef.current = propsLayer;
        torchLayerRef.current = torchLayer;
        fogSpriteRef.current = fogSprite;
        charactersLayerRef.current = charactersLayer;
        selectionLayerRef.current = selectionLayer;
        rulerLineRef.current = rulerLine;
        rulerLabelRef.current = rulerLabel;

        app.stage.eventMode = "static";
        app.stage.hitArea = app.screen;
        setupInteraction(app);

        void loadMapBackground().then(syncTokensAndProps);
      });

    function setupInteraction(app: Application) {
      const stage = app.stage;

      stage.on("pointerdown", (e: FederatedPointerEvent) => {
        const world = worldRef.current!;
        const drag = dragRef.current;
        const local = world.toLocal(e.global);

        if (e.button === 1 || e.button === 2) {
          drag.mode = "pan";
          drag.panStart = { sx: e.global.x, sy: e.global.y, wx: world.position.x, wy: world.position.y };
          return;
        }

        if (e.shiftKey && e.button === 0) {
          // measuring: snap the start point to whatever token is under the cursor, if any, so
          // "distance from this creature" is a single click instead of eyeballing its center
          const charSprite = [...characterSpritesRef.current.values()].find((sprite) => sprite === e.target);
          const propSprite = [...propSpritesRef.current.values()].find((sprite) => sprite === e.target);
          const start = charSprite ?? propSprite ?? local;
          drag.mode = "measure";
          drag.measureStart = { x: start.x, y: start.y };
          drawRuler(drag.measureStart, local);
          return;
        }

        const { selectedCharacterId, selectedPropId, session } = latestRef.current;
        const activeSlotAtDown = activeMapSlot(session);

        if (selectedCharacterId) {
          const character = activeSlotAtDown?.characters.find((c) => c.id === selectedCharacterId);
          const sprite = characterSpritesRef.current.get(selectedCharacterId);
          if (character && sprite) {
            const handle = hitTestTransformHandle(
              { x: character.x, y: character.y, rotation: degToRad(character.rotation), scaleX: character.scaleX, scaleY: character.scaleY },
              sprite.texture.width,
              sprite.texture.height,
              local,
              world.scale.x,
            );
            if (handle) {
              drag.mode = "transformCharacter";
              drag.moveId = selectedCharacterId;
              drag.transform = beginTransformDrag(
                { x: character.x, y: character.y, rotation: degToRad(character.rotation), scaleX: character.scaleX, scaleY: character.scaleY },
                handle,
                sprite.texture.width,
                sprite.texture.height,
              );
              return;
            }
          }
        } else if (selectedPropId) {
          const prop = activeSlotAtDown?.props.find((p) => p.id === selectedPropId);
          const sprite = propSpritesRef.current.get(selectedPropId);
          if (prop && sprite) {
            const handle = hitTestTransformHandle(
              { x: prop.x, y: prop.y, rotation: degToRad(prop.rotation), scaleX: prop.scaleX, scaleY: prop.scaleY },
              sprite.texture.width,
              sprite.texture.height,
              local,
              world.scale.x,
            );
            if (handle) {
              drag.mode = "transformProp";
              drag.moveId = selectedPropId;
              drag.transform = beginTransformDrag(
                { x: prop.x, y: prop.y, rotation: degToRad(prop.rotation), scaleX: prop.scaleX, scaleY: prop.scaleY },
                handle,
                sprite.texture.width,
                sprite.texture.height,
              );
              return;
            }
          }
        }

        const charEntry = [...characterSpritesRef.current.entries()].find(([, sprite]) => sprite === e.target);
        if (charEntry) {
          const [id, sprite] = charEntry;
          latestRef.current.setSelectedCharacterId(id);
          drawSelection();
          drag.mode = "moveCharacter";
          drag.moveId = id;
          drag.moveStart = { sx: e.global.x, sy: e.global.y, ox: sprite.x, oy: sprite.y };
          return;
        }

        const propEntry = [...propSpritesRef.current.entries()].find(([, sprite]) => sprite === e.target);
        if (propEntry) {
          const [id, sprite] = propEntry;
          latestRef.current.setSelectedPropId(id);
          drawSelection();
          drag.mode = "moveProp";
          drag.moveId = id;
          drag.moveStart = { sx: e.global.x, sy: e.global.y, ox: sprite.x, oy: sprite.y };
          return;
        }

        latestRef.current.setSelectedCharacterId(null);
        latestRef.current.setSelectedPropId(null);
        drawSelection();
        drag.mode = "pan";
        drag.panStart = { sx: e.global.x, sy: e.global.y, wx: world.position.x, wy: world.position.y };
      });

      stage.on("pointermove", (e: FederatedPointerEvent) => {
        const drag = dragRef.current;
        const world = worldRef.current!;
        const local = world.toLocal(e.global);

        if (drag.mode === "pan" && drag.panStart) {
          world.position.set(
            drag.panStart.wx + (e.global.x - drag.panStart.sx),
            drag.panStart.wy + (e.global.y - drag.panStart.sy),
          );
          emitState();
          return;
        }
        if (drag.mode === "moveCharacter" && drag.moveId && drag.moveStart) {
          const sprite = characterSpritesRef.current.get(drag.moveId);
          if (!sprite) return;
          const dx = (e.global.x - drag.moveStart.sx) / world.scale.x;
          const dy = (e.global.y - drag.moveStart.sy) / world.scale.y;
          sprite.x = drag.moveStart.ox + dx;
          sprite.y = drag.moveStart.oy + dy;
          const torchGfx = torchGraphicsRef.current.get(drag.moveId);
          if (torchGfx) {
            torchGfx.x = sprite.x;
            torchGfx.y = sprite.y;
            recomputeFogThrottled();
          }
          drawSelection();
          emitState();
          return;
        }
        if (drag.mode === "moveProp" && drag.moveId && drag.moveStart) {
          const sprite = propSpritesRef.current.get(drag.moveId);
          if (!sprite) return;
          const dx = (e.global.x - drag.moveStart.sx) / world.scale.x;
          const dy = (e.global.y - drag.moveStart.sy) / world.scale.y;
          sprite.x = drag.moveStart.ox + dx;
          sprite.y = drag.moveStart.oy + dy;
          drawSelection();
          emitState();
          return;
        }
        if (drag.mode === "transformCharacter" && drag.moveId && drag.transform) {
          const sprite = characterSpritesRef.current.get(drag.moveId);
          if (!sprite) return;
          applyTransformDrag(sprite, drag.transform, local, { shiftKey: e.shiftKey, altKey: e.altKey });
          const torchGfx = torchGraphicsRef.current.get(drag.moveId);
          if (torchGfx) {
            const character = activeMapSlot(latestRef.current.session)?.characters.find((c) => c.id === drag.moveId);
            torchGfx.x = sprite.x;
            torchGfx.y = sprite.y;
            if (character?.light) torchGfx.rotation = sprite.rotation + degToRad(character.light.rotation);
            recomputeFogThrottled();
          }
          drawSelection();
          emitState();
          return;
        }
        if (drag.mode === "transformProp" && drag.moveId && drag.transform) {
          const sprite = propSpritesRef.current.get(drag.moveId);
          if (!sprite) return;
          applyTransformDrag(sprite, drag.transform, local, { shiftKey: e.shiftKey, altKey: e.altKey });
          drawSelection();
          emitState();
          return;
        }
        if (drag.mode === "measure" && drag.measureStart) {
          drawRuler(drag.measureStart, local);
        }
      });

      function endDrag() {
        const drag = dragRef.current;
        if (drag.mode === "moveCharacter" && drag.moveId) {
          const sprite = characterSpritesRef.current.get(drag.moveId);
          if (sprite) latestRef.current.updateCharacter(drag.moveId, { x: sprite.x, y: sprite.y });
        }
        if (drag.mode === "moveProp" && drag.moveId) {
          const sprite = propSpritesRef.current.get(drag.moveId);
          if (sprite) latestRef.current.updateProp(drag.moveId, { x: sprite.x, y: sprite.y });
        }
        if (drag.mode === "transformCharacter" && drag.moveId) {
          const sprite = characterSpritesRef.current.get(drag.moveId);
          if (sprite) {
            latestRef.current.updateCharacter(drag.moveId, {
              x: sprite.x,
              y: sprite.y,
              rotation: radToDeg(sprite.rotation),
              scaleX: sprite.scale.x,
              scaleY: sprite.scale.y,
            });
          }
        }
        if (drag.mode === "transformProp" && drag.moveId) {
          const sprite = propSpritesRef.current.get(drag.moveId);
          if (sprite) {
            latestRef.current.updateProp(drag.moveId, {
              x: sprite.x,
              y: sprite.y,
              rotation: radToDeg(sprite.rotation),
              scaleX: sprite.scale.x,
              scaleY: sprite.scale.y,
            });
          }
        }
        if (drag.mode === "measure") {
          clearRuler();
        }
        if (drag.mode !== "none") emitState(true);
        drag.mode = "none";
        drag.panStart = null;
        drag.moveId = null;
        drag.moveStart = null;
        drag.transform = null;
        drag.measureStart = null;
      }
      stage.on("pointerup", endDrag);
      stage.on("pointerupoutside", endDrag);

      el!.addEventListener(
        "wheel",
        (e: WheelEvent) => {
          e.preventDefault();
          const world = worldRef.current!;
          const rect = el!.getBoundingClientRect();
          const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          const worldPointBefore = {
            x: (pointer.x - world.position.x) / world.scale.x,
            y: (pointer.y - world.position.y) / world.scale.y,
          };
          const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
          const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, world.scale.x * factor));
          world.scale.set(newScale);
          world.position.x = pointer.x - worldPointBefore.x * newScale;
          world.position.y = pointer.y - worldPointBefore.y * newScale;
          setZoomPct(Math.round(newScale * 100));
          drawSelection();
          emitState();
        },
        { passive: false },
      );
    }

    return () => {
      destroyed = true;
      if (initialized && appRef.current) {
        appRef.current.destroy(true, { children: true });
      }
      appRef.current = null;
      loadedMapKeyRef.current = null;
      fogTextureRef.current?.destroy(true);
      fogTextureRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // rebuild the read-only map background whenever a different map is loaded
  useEffect(() => {
    if (!appRef.current) return;
    void loadMapBackground().then(syncTokensAndProps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLocation?.filePath]);

  // resync interactive layers whenever characters/props/token art change
  useEffect(() => {
    if (!appRef.current || loadedMapKeyRef.current === null) return;
    void syncTokensAndProps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlot?.characters, activeSlot?.props, session?.tokenAssets]);

  useEffect(() => {
    drawSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCharacterId, selectedPropId]);

  // fog darkness / ambient light sliders affect only the darkness overlay, not the visibility polygons themselves
  useEffect(() => {
    if (!appRef.current || loadedMapKeyRef.current === null) return;
    void recomputeFog();
    emitState(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlot?.fogAlpha, activeSlot?.ambientLight]);

  // answer the player window's "just opened, send me a snapshot" request, so opening it mid-session
  // doesn't leave it stuck on "waiting for the GM" until the next incidental change
  useEffect(() => {
    const unlisten = listen(PLAYER_REQUEST_SYNC_EVENT, () => {
      const { map: m, mapLocation: mLoc, sessionLocation: sLoc } = latestRef.current;
      if (m && mLoc && sLoc) emitPlayerMap({ mapProject: m, mapLocation: mLoc, sessionLocation: sLoc });
      emitState(true);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Q/E: smooth, continuous rotation of the selected token while held (no fixed step), committed on release
  useEffect(() => {
    function isTypingTarget(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      return !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    }
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e) || e.ctrlKey || e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === "q") {
        rotateKeysRef.current.q = true;
        e.preventDefault();
      } else if (key === "e") {
        rotateKeysRef.current.e = true;
        e.preventDefault();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if (key === "q") rotateKeysRef.current.q = false;
      else if (key === "e") rotateKeysRef.current.e = false;
      else return;
      if (!rotateKeysRef.current.q && !rotateKeysRef.current.e) commitContinuousRotation();
    }
    function onBlur() {
      rotateKeysRef.current.q = false;
      rotateKeysRef.current.e = false;
      commitContinuousRotation();
    }

    function tick(ts: number) {
      const { q, e } = rotateKeysRef.current;
      const direction = (e ? 1 : 0) + (q ? -1 : 0);
      if (direction !== 0) {
        const dt = (ts - (rotateLastTsRef.current || ts)) / 1000;
        rotateLastTsRef.current = ts;
        applyContinuousRotation(direction * ROTATE_DEG_PER_SEC * dt);
      } else {
        rotateLastTsRef.current = 0;
      }
      rotateAnimFrameRef.current = requestAnimationFrame(tick);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    rotateAnimFrameRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      if (rotateAnimFrameRef.current !== null) cancelAnimationFrame(rotateAnimFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const world = worldRef.current;
    const el = containerRef.current;
    if (!world || !el) return;
    const rect = el.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wx = (sx - world.position.x) / world.scale.x;
    const wy = (sy - world.position.y) / world.scale.y;

    const tokenAssetId = e.dataTransfer.getData("application/x-vtt-token-asset-id");
    if (tokenAssetId) {
      const { session: s, sessionLocation: sLoc, map: m } = latestRef.current;
      const tokenAsset = s?.tokenAssets.find((a) => a.id === tokenAssetId);
      if (tokenAsset && sLoc && m) {
        void loadTexture(tokenAssetFileUrl(sLoc, tokenAsset)).then((texture) => {
          // fit the token's largest dimension into one map tile, preserving its real aspect ratio
          const fitScale = m.tileSize / Math.max(texture.width, texture.height);
          latestRef.current.addCharacter({
            tokenAssetId,
            name: tokenAsset.name,
            x: wx,
            y: wy,
            rotation: 0,
            scaleX: fitScale,
            scaleY: fitScale,
            light: null,
          });
        });
      }
      return;
    }
    const propAssetId = e.dataTransfer.getData("application/x-vtt-prop-asset-id");
    if (propAssetId) {
      latestRef.current.addProp({ assetId: propAssetId, x: wx, y: wy, rotation: 0, scaleX: 1, scaleY: 1 });
    }
  }

  return (
    <div className="map-canvas vtt-canvas" ref={containerRef} onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className="canvas-statusbar">
        <strong>{zoomPct}%</strong>
      </div>
    </div>
  );
}
