import type { StorefrontConfig } from "../../types/store";
export const colorKeys = [
  "background",
  "surface",
  "text",
  "muted",
  "primary",
  "buttonText",
  "accent",
] as const;
export function defaultColors(dark: boolean) {
  return dark
    ? {
        background: "#0a0a0a",
        surface: "#1f1f1f",
        text: "#ffffff",
        muted: "#aaaaaa",
        primary: "#ffffff",
        buttonText: "#080808",
        accent: "#c8a46b",
      }
    : {
        background: "#ffffff",
        surface: "#f5f4f0",
        text: "#080808",
        muted: "#65635f",
        primary: "#080808",
        buttonText: "#ffffff",
        accent: "#c8a46b",
      };
}
export function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function palette(base: string, mode: string) {
  const [r, g, b] = [1, 3, 5].map(
      (i) => parseInt(base.slice(i, i + 2), 16) / 255,
    ),
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min,
    l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h =
    d === 0
      ? 0
      : max === r
        ? 60 * (((g - b) / d) % 6)
        : max === g
          ? 60 * ((b - r) / d + 2)
          : 60 * ((r - g) / d + 4);
  const hex = (h: number, l: number) => {
    h = (h + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = l - c / 2;
    const rgb =
      h < 60
        ? [c, x, 0]
        : h < 120
          ? [x, c, 0]
          : h < 180
            ? [0, c, x]
            : h < 240
              ? [0, x, c]
              : h < 300
                ? [x, 0, c]
                : [c, 0, x];
    return (
      "#" +
      rgb
        .map((v) =>
          Math.round((v + m) * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  };
  const offsets: Record<string, number[]> = {
    Analogous: [-30, 0, 30],
    Complementary: [0, 180],
    Triadic: [0, 120, 240],
    Tetradic: [0, 90, 180, 270],
  };
  return mode === "Monochromatic"
    ? [0.2, 0.35, 0.5, 0.7, 0.85].map((light) => hex(h, light))
    : (offsets[mode] || [0]).map((offset) => hex(h + offset, l));
}
export function themeStyle(config: StorefrontConfig, dark: boolean) {
  const c = { ...defaultColors(dark), ...config };
  return {
    "--sf-font": config.fontFamily === "georgia" ? "Georgia, serif" : config.fontFamily === "arial" ? "Arial, Helvetica, sans-serif" : "system-ui, sans-serif",
    "--sf-radius": `${config.radius || "8"}px`,
    "--sf-form-radius": `${config.formRadius || "8"}px`,
    "--sf-line": `color-mix(in oklab, ${c.text} ${dark ? "18%" : "12%"}, ${c.background})`,
    "--sf-soft": `color-mix(in oklab, ${c.primary} ${dark ? "12%" : "8%"}, ${c.surface})`,
    "--sf-bg": c.background,
    "--sf-panel": c.surface,
    "--sf-ink": c.text,
    "--sf-muted": c.muted,
    "--sf-button": c.primary,
    "--sf-button-text": c.buttonText,
    "--sf-accent": c.accent,
  };
}

/** Generate all seven roles without remote services; keep text contrast >= 4.5. */
export function brandColors(base: string, mode: string, dark: boolean) {
  const mix = (a: string, b: string, weight: number) => '#' + [1,3,5].map(i => Math.round(parseInt(a.slice(i,i+2),16)*(1-weight)+parseInt(b.slice(i,i+2),16)*weight).toString(16).padStart(2,'0')).join('');
  const background = mix(base, dark ? '#000000' : '#ffffff', dark ? .94 : .97);
  const surface = mix(base, dark ? '#000000' : '#ffffff', dark ? .84 : .91);
  const text = dark ? '#ffffff' : '#080808';
  let muted = mix(text, background, .42);
  if (Math.min(contrast(muted,background),contrast(muted,surface)) < 4.5) muted = text;
  const swatches = palette(base,mode);
  const rawAccent = swatches[swatches.length-1];
  let accent = rawAccent;
  // Accent also appears as text, so adjust it against both surfaces.
  for(let step=1; step<=20 && Math.min(contrast(accent,background),contrast(accent,surface))<4.5; step++) accent=mix(rawAccent,text,step/20);
  return {background,surface,text,muted,primary:base,buttonText:contrast(base,'#ffffff')>=contrast(base,'#000000')?'#ffffff':'#000000',accent};
}
