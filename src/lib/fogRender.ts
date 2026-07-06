import { Container, Graphics, RenderTexture, type Renderer, type Sprite } from "pixi.js";
import type { LightKind, MapProject, VttMapSlot } from "../types";
import { computeVisibilityPolygon, type Segment } from "./visibility";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface FogPolygon {
  x: number;
  y: number;
}

/**
 * Gathers every light source that illuminates this map (static map lights + lit character
 * torches) and runs shadow-casting for each, returning the resulting visibility polygons.
 * This is the expensive step — callers should compute it once (the GM side) and ship the
 * result to anyone else who needs to render the same fog (the player window), rather than
 * re-running shadow-casting from scratch for identical geometry.
 */
export function computeFogPolygons(map: MapProject, slot: VttMapSlot, wallSegs: Segment[]): FogPolygon[][] {
  const lightSources: { x: number; y: number; radius: number; kind: LightKind; rotationRad: number; coneAngleRad: number }[] = [];
  for (const light of map.lights) {
    lightSources.push({
      x: light.x,
      y: light.y,
      radius: light.radius,
      kind: light.kind,
      rotationRad: degToRad(light.rotation),
      coneAngleRad: degToRad(light.coneAngle),
    });
  }
  for (const character of slot.characters) {
    if (!character.light?.enabled) continue;
    const light = character.light;
    lightSources.push({
      x: character.x,
      y: character.y,
      radius: light.radius,
      kind: light.kind,
      rotationRad: degToRad(character.rotation) + degToRad(light.rotation),
      coneAngleRad: degToRad(light.coneAngle),
    });
  }

  const polygons: FogPolygon[][] = [];
  for (const light of lightSources) {
    const coneRange =
      light.kind === "cone" ? { from: light.rotationRad - light.coneAngleRad / 2, to: light.rotationRad + light.coneAngleRad / 2 } : undefined;
    const polygon = computeVisibilityPolygon({ x: light.x, y: light.y }, light.radius, wallSegs, coneRange);
    if (polygon.length >= 3) polygons.push(polygon);
  }
  return polygons;
}

/**
 * Renders the fog-of-war texture: a dark rectangle covering the map, with the given
 * (already-computed) visibility polygons "erased" out of it. Shared by the GM's semi-transparent
 * preview and the player's fully-opaque view — they only differ in `darkAlpha` and in who computed
 * `polygons`, not in how the texture itself is built.
 */
export function renderFogTexture(
  renderer: Renderer,
  mapW: number,
  mapH: number,
  darkAlpha: number,
  polygons: FogPolygon[][],
  textureRef: { current: RenderTexture | null },
  fogSprite: Sprite | null,
): void {
  const buildContainer = new Container();
  const dark = new Graphics().rect(0, 0, mapW, mapH).fill({ color: 0x000000, alpha: darkAlpha });
  buildContainer.addChild(dark);

  for (const polygon of polygons) {
    if (polygon.length < 3) continue;
    const gfx = new Graphics();
    gfx.poly(polygon.flatMap((p) => [p.x, p.y])).fill({ color: 0xffffff });
    gfx.blendMode = "erase";
    buildContainer.addChild(gfx);
  }

  let texture = textureRef.current;
  if (!texture || texture.width !== mapW || texture.height !== mapH) {
    texture?.destroy(true);
    texture = RenderTexture.create({ width: mapW, height: mapH });
    textureRef.current = texture;
    if (fogSprite) fogSprite.texture = texture;
  }
  renderer.render({ container: buildContainer, target: texture, clear: true });
  buildContainer.destroy({ children: true });
}
