import { contrast } from "./design";
import type { StorefrontConfig } from "../../types/store";

export type ThemeSeed = {
  hue: number;
  chroma: number;
  lightness: number;
  base: number;
};
export const themePresets = {
  EYN: { hue: 80, chroma: 0.085, lightness: 0.74, base: 0.006 },
  Lavender: {
    hue: 281.6396234331059,
    chroma: 0.11949973822037381,
    lightness: 0.7712331152153334,
    base: 0.016,
  },
  Mint: { hue: 155, chroma: 0.12, lightness: 0.82, base: 0.012 },
  Ocean: { hue: 250, chroma: 0.15, lightness: 0.65, base: 0.01 },
  Rose: { hue: 15, chroma: 0.16, lightness: 0.72, base: 0.012 },
} satisfies Record<string, ThemeSeed>;

// OKLab -> linear sRGB. Reduce chroma, preserving hue/lightness, when out of gamut.
export function oklchHex(lightness: number, chroma: number, hue: number) {
  const radians = (hue * Math.PI) / 180;
  const rgb = (c: number) => {
    const a = c * Math.cos(radians),
      b = c * Math.sin(radians);
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
  };
  const fits = (v: number[]) => v.every((n) => n >= -0.000001 && n <= 1.000001);
  let out = rgb(chroma);
  if (!fits(out)) {
    let low = 0,
      high = chroma;
    for (let i = 0; i < 18; i++) {
      const mid = (low + high) / 2;
      if (fits(rgb(mid))) low = mid;
      else high = mid;
    }
    out = rgb(low);
  }
  return (
    "#" +
    out
      .map((n) => {
        n = Math.max(0, Math.min(1, n));
        return Math.round(
          255 * (n <= 0.0031308 ? 12.92 * n : 1.055 * n ** (1 / 2.4) - 0.055),
        )
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}
export function hexSeed(hex: string): Omit<ThemeSeed, "base"> {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    lightness: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    chroma: Math.hypot(a, bb),
    hue: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}
export function seedFromConfig(config: StorefrontConfig): ThemeSeed {
  const fallback = hexSeed(config.primary || config.accent || "#c8a46b");
  return {
    hue: Number(config.themeHue ?? fallback.hue),
    chroma: Number(config.themeChroma ?? fallback.chroma),
    lightness: Number(config.themeLightness ?? fallback.lightness),
    base: Number(config.themeBase ?? 0.006),
  };
}
export function generatedTheme(
  seed: ThemeSeed,
  dark: boolean,
): StorefrontConfig {
  const { hue, chroma, lightness, base } = seed;
  const background = oklchHex(dark ? 0.145 : 0.985, dark ? base : base * 0.15, hue),
    surface = oklchHex(dark ? 0.205 : 0.993, dark ? base : base * 0.04, hue);
  const text = oklchHex(dark ? 0.97 : 0.18, Math.min(base, 0.01), hue);
  let muted = oklchHex(dark ? 0.72 : 0.46, base, hue);
  if (Math.min(contrast(muted, background), contrast(muted, surface)) < 4.5)
    muted = text;
  const primary = oklchHex(lightness, chroma, hue);
  let accent = primary;
  for (
    let i = 1;
    i <= 30 &&
    Math.min(contrast(accent, background), contrast(accent, surface)) < 4.5;
    i++
  ) {
    accent = oklchHex(
      lightness + (((dark ? 0.96 : 0.2) - lightness) * i) / 30,
      chroma,
      hue,
    );
  }
  return {
    background,
    surface,
    text,
    muted,
    primary,
    accent,
    buttonText:
      contrast(primary, "#ffffff") >= contrast(primary, "#080808")
        ? "#ffffff"
        : "#080808",
    themeHue: String(hue),
    themeChroma: String(chroma),
    themeLightness: String(lightness),
    themeBase: String(base),
  };
}
