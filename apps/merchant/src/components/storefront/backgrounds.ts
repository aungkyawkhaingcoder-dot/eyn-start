import type { StorefrontConfig } from "../../types/store";
export const backgroundOptions = [
  { id: "theme", name: "Theme background" },
  { id: "blobs", name: "Soft Color Blobs" },
  { id: "mesh", name: "Ambient Mesh" },
] as const;
export function backgroundEffect(value?: string) {
  return backgroundOptions.find((option) => option.id === value)?.id || "theme";
}
export function ambientColors(config: StorefrontConfig, dark = false) {
  const hex = config.primary || config.accent || "#c8a46b";
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  const fallback =
    delta === 0
      ? 0
      : max === r
        ? 60 * ((g - b) / delta)
        : max === g
          ? 60 * ((b - r) / delta + 2)
          : 60 * ((r - g) / delta + 4);
  const hue = Number(config.themeHue ?? (fallback + 360) % 360);
  const base = Math.min(0.02, Math.max(0, Number(config.themeBase || 0.006)));
  const chroma = Math.min(
    0.14,
    Math.max(0.04, Number(config.themeChroma || 0.1)),
  );
  const color = (offset: number, scale: number) =>
    `oklch(${dark ? 0.65 : 0.86} ${chroma * scale + base} ${(hue + offset + 360) % 360} / ${(dark ? 0.2 : 0.23) + base * 3})`;
  return {
    "--sf-ambient-a": color(0, 1),
    "--sf-ambient-b": color(dark ? 65 : 42, 0.8),
    "--sf-ambient-c": color(dark ? -65 : -42, 0.7),
  };
}
