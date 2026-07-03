import { Assets, Texture } from "pixi.js";

const cache = new Map<string, Promise<Texture>>();

export function loadTexture(url: string): Promise<Texture> {
  let promise = cache.get(url);
  if (!promise) {
    promise = Assets.load(url);
    cache.set(url, promise);
  }
  return promise;
}

export function clearTextureCache(): void {
  cache.clear();
}
