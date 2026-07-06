import { FillGradient, Graphics } from "pixi.js";
import type { LightKind } from "../types";

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Everything drawLightGlow needs to know about a light's look — satisfied by both map LightInstance and a character's torch/lantern. */
export interface LightGlowShape {
  kind: LightKind;
  color: string;
  radius: number;
  intensity: number;
  coneAngle: number;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Draws a light's glow (radial disc or cone wedge) with no editor handle, for use anywhere a map's lighting needs to be rendered (editor, PNG export, VTT). */
export function drawLightGlow(gfx: Graphics, light: LightGlowShape) {
  gfx.clear();
  const gradient = new FillGradient({
    type: "radial",
    center: { x: 0, y: 0 },
    innerRadius: 0,
    outerCenter: { x: 0, y: 0 },
    outerRadius: light.radius,
    colorStops: [
      { offset: 0, color: hexToRgba(light.color, light.intensity) },
      { offset: 1, color: hexToRgba(light.color, 0) },
    ],
    textureSpace: "global",
  });
  if (light.kind === "radial") {
    gfx.circle(0, 0, light.radius).fill(gradient);
  } else {
    const half = degToRad(light.coneAngle) / 2;
    gfx.moveTo(0, 0);
    gfx.arc(0, 0, light.radius, -half, half);
    gfx.lineTo(0, 0);
    gfx.closePath();
    gfx.fill(gradient);
  }
}
