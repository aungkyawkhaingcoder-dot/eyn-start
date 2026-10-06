export type StorefrontConfig = Partial<
  Record<
    | "themeHue"
    | "themeChroma"
    | "themeLightness"
    | "themeBase"
    | "backgroundEffect"
    | "designStyle"
    | "fontFamily"
    | "radius"
    | "formRadius"
    | "heroTitle"
    | "heroText"
    | "buttonLabel"
    | "collectionTitle"
    | "featuredTitle"
    | "bestTitle"
    | "aboutTitle"
    | "aboutText"
    | "background"
    | "surface"
    | "text"
    | "muted"
    | "primary"
    | "buttonText"
    | "accent",
    string
  >
> &
  Partial<
    Record<"themeVibrant" | "showHero" | "showFeatured" | "showBest" | "showAbout", boolean>
  >;

export const DEFAULT_TEMPLATE = "default" as const;
export type VersionedStorefrontConfig = StorefrontConfig & { version: 1; template: typeof DEFAULT_TEMPLATE };
export function normalizeStorefrontConfig(config?: StorefrontConfig | null): VersionedStorefrontConfig {
  return { ...config, version: 1, template: DEFAULT_TEMPLATE };
}
