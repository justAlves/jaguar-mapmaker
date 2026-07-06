import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, RenderTexture, Sprite, Texture } from "pixi.js";
import { emit, listen } from "@tauri-apps/api/event";
import { useT } from "../../i18n/useT";
import { assetFileUrl } from "../../lib/projectIO";
import { tokenAssetFileUrl } from "../../lib/vttSessionIO";
import { loadTexture } from "../../lib/textureCache";
import { buildMapContainer } from "../../lib/exportPng";
import { drawLightGlow } from "../../lib/lightRender";
import { renderFogTexture } from "../../lib/fogRender";
import {
  PLAYER_MAP_EVENT,
  PLAYER_REQUEST_SYNC_EVENT,
  PLAYER_STATE_EVENT,
  type PlayerCamera,
  type PlayerMapPayload,
  type PlayerStatePayload,
} from "../../lib/playerWindow";
import type { MapProject, ProjectLocation, SessionLocation } from "../../types";

const BACKGROUND = "#111214";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

interface MapData {
  map: MapProject;
  mapLocation: ProjectLocation;
  sessionLocation: SessionLocation;
}

/**
 * Read-only mirror of the GM's VttCanvas: no selection, no transform handles, no local pan/zoom —
 * everything is driven by `vtt-player-map`/`vtt-player-state` events emitted from the GM's window.
 * Unlike the GM's own fog (semi-transparent, so they can see through it), unseen areas here are
 * fully opaque: players should only ever see what their characters can currently see.
 */
export function PlayerCanvas() {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const mapLayerRef = useRef<Container | null>(null);
  const gridLayerRef = useRef<Graphics | null>(null);
  const propsLayerRef = useRef<Container | null>(null);
  const torchLayerRef = useRef<Container | null>(null);
  const charactersLayerRef = useRef<Container | null>(null);
  const fogSpriteRef = useRef<Sprite | null>(null);
  const fogTextureRef = useRef<RenderTexture | null>(null);
  const loadedMapKeyRef = useRef<string | null>(null);
  const renderGenerationRef = useRef(0);

  const mapDataRef = useRef<MapData | null>(null);
  const cameraRef = useRef<PlayerCamera | null>(null);
  const stateRef = useRef<PlayerStatePayload | null>(null);

  const [connected, setConnected] = useState(false);

  function drawGrid(gfx: Graphics, p: MapProject) {
    gfx.clear();
    for (let x = 0; x <= p.gridWidth; x++) {
      gfx.moveTo(x * p.tileSize, 0).lineTo(x * p.tileSize, p.gridHeight * p.tileSize);
    }
    for (let y = 0; y <= p.gridHeight; y++) {
      gfx.moveTo(0, y * p.tileSize).lineTo(p.gridWidth * p.tileSize, y * p.tileSize);
    }
    gfx.stroke({ width: 1, color: 0xffffff, alpha: 0.08 });
  }

  function applyCamera() {
    const world = worldRef.current;
    const el = containerRef.current;
    const camera = cameraRef.current;
    if (!world || !el || !camera) return;
    world.scale.set(camera.scale);
    world.position.set(
      el.clientWidth / 2 - camera.worldCenterX * camera.scale,
      el.clientHeight / 2 - camera.worldCenterY * camera.scale,
    );
  }

  async function ensureMapLoaded() {
    const data = mapDataRef.current;
    const mapLayer = mapLayerRef.current;
    const gridLayer = gridLayerRef.current;
    if (!data || !mapLayer || !gridLayer) return;
    const key = data.mapLocation.filePath;
    if (loadedMapKeyRef.current === key) return;
    loadedMapKeyRef.current = key;
    mapLayer.removeChildren();
    const built = await buildMapContainer(data.map, data.mapLocation);
    mapLayer.addChild(built);
    drawGrid(gridLayer, data.map);
  }

  /**
   * Renders the fog using the visibility polygons the GM already computed (shadow-casting is
   * expensive — no need to run it again here for identical geometry). Players always get fully
   * opaque fog outside what's lit (unlike the GM's semi-transparent preview); ambientLight is the
   * one exception, same as for the GM: a fully-lit outdoor/daytime map has no fog at all.
   */
  function recomputeFog(data: MapData, state: PlayerStatePayload) {
    const app = appRef.current;
    if (!app) return;
    const mapW = data.map.gridWidth * data.map.tileSize;
    const mapH = data.map.gridHeight * data.map.tileSize;
    if (mapW <= 0 || mapH <= 0) return;

    const darkAlpha = 1 - state.slot.ambientLight;
    renderFogTexture(app.renderer, mapW, mapH, darkAlpha, state.fogPolygons, fogTextureRef, fogSpriteRef.current);
  }

  async function render() {
    const data = mapDataRef.current;
    const state = stateRef.current;
    const charactersLayer = charactersLayerRef.current;
    const propsLayer = propsLayerRef.current;
    const torchLayer = torchLayerRef.current;
    if (!data || !state || !charactersLayer || !propsLayer || !torchLayer || !appRef.current) return;

    await ensureMapLoaded();
    applyCamera();

    const generation = ++renderGenerationRef.current;
    const tokenAssetById = new Map(state.tokenAssets.map((a) => [a.id, a]));
    const mapAssetById = new Map(data.map.assets.map((a) => [a.id, a]));

    charactersLayer.removeChildren();
    await Promise.all(
      state.slot.characters.map(async (character) => {
        const tokenAsset = tokenAssetById.get(character.tokenAssetId);
        if (!tokenAsset) return;
        const texture = await loadTexture(tokenAssetFileUrl(data.sessionLocation, tokenAsset));
        if (generation !== renderGenerationRef.current) return;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.x = character.x;
        sprite.y = character.y;
        sprite.rotation = degToRad(character.rotation);
        sprite.scale.set(character.scaleX, character.scaleY);
        charactersLayer.addChild(sprite);
      }),
    );
    if (generation !== renderGenerationRef.current) return;

    propsLayer.removeChildren();
    for (const prop of [...state.slot.props].sort((a, b) => a.zIndex - b.zIndex)) {
      const asset = mapAssetById.get(prop.assetId);
      if (!asset) continue;
      const texture = await loadTexture(assetFileUrl(data.mapLocation, asset));
      if (generation !== renderGenerationRef.current) return;
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = prop.x;
      sprite.y = prop.y;
      sprite.rotation = degToRad(prop.rotation);
      sprite.scale.set(prop.scaleX, prop.scaleY);
      propsLayer.addChild(sprite);
    }
    if (generation !== renderGenerationRef.current) return;

    torchLayer.removeChildren();
    for (const character of state.slot.characters) {
      if (!character.light?.enabled) continue;
      const gfx = new Graphics();
      gfx.x = character.x;
      gfx.y = character.y;
      gfx.rotation = degToRad(character.rotation) + degToRad(character.light.rotation);
      drawLightGlow(gfx, character.light);
      torchLayer.addChild(gfx);
    }

    recomputeFog(data, state);
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let destroyed = false;
    let initialized = false;

    const app = new Application();
    appRef.current = app;

    app.init({ background: BACKGROUND, resizeTo: el, antialias: true }).then(() => {
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
      const charactersLayer = new Container();
      world.addChild(mapLayer, gridLayer, propsLayer, torchLayer, fogSprite, charactersLayer);

      mapLayerRef.current = mapLayer;
      gridLayerRef.current = gridLayer;
      propsLayerRef.current = propsLayer;
      torchLayerRef.current = torchLayer;
      fogSpriteRef.current = fogSprite;
      charactersLayerRef.current = charactersLayer;

      void render();
    });

    function onResize() {
      applyCamera();
    }
    window.addEventListener("resize", onResize);

    const unlistenMap = listen<PlayerMapPayload>(PLAYER_MAP_EVENT, (event) => {
      mapDataRef.current = {
        map: event.payload.mapProject,
        mapLocation: event.payload.mapLocation,
        sessionLocation: event.payload.sessionLocation,
      };
      loadedMapKeyRef.current = null;
      setConnected(true);
      void render();
    });
    const unlistenState = listen<PlayerStatePayload>(PLAYER_STATE_EVENT, (event) => {
      stateRef.current = event.payload;
      cameraRef.current = event.payload.camera;
      setConnected(true);
      void render();
    });

    // ask the GM window for a fresh snapshot — covers opening this window mid-session, when we'd
    // otherwise just sit on "waiting for the GM" until their next incidental state change
    void emit(PLAYER_REQUEST_SYNC_EVENT);

    return () => {
      destroyed = true;
      window.removeEventListener("resize", onResize);
      void unlistenMap.then((fn) => fn());
      void unlistenState.then((fn) => fn());
      if (initialized) app.destroy(true, { children: true });
      appRef.current = null;
      fogTextureRef.current?.destroy(true);
      fogTextureRef.current = null;
    };
  }, []);

  return (
    <div className="player-canvas" ref={containerRef}>
      {!connected && <div className="player-waiting">{t("player.waiting")}</div>}
    </div>
  );
}
