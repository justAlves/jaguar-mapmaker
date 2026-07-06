import { Assets, Texture } from "pixi.js";

const cache = new Map<string, Promise<Texture>>();

export function loadTexture(url: string): Promise<Texture> {
  let promise = cache.get(url);
  if (!promise) {
    promise = Assets.load(url).then((texture: Texture) => {
      // Tile/wall textures get shrunk a lot when the map is zoomed out. Without mipmaps, that
      // minification aliases into the moiré/noise pattern seen at low zoom; mipmapping fixes it.
      const source = texture.source;
      source.autoGenerateMipmaps = true;
      source.update();
      return texture;
    });
    cache.set(url, promise);
  }
  return promise;
}

export function clearTextureCache(): void {
  cache.clear();
}
