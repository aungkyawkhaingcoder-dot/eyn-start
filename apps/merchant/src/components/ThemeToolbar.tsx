"use client";
import { StorefrontStylePicker } from "./StorefrontStylePicker";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "@legendapp/state/react";
import { batch, type Observable } from "@legendapp/state";
import {
  Button,
  Popover,
  Slider,
  ColorArea,
  ColorField,
  ColorSlider,
  Switch,
} from "@heroui/react";
import {
  Moon,
  Sun,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shuffle,
} from "lucide-react";
import { storefrontFonts, loadStorefrontFont } from "./storefront/fonts";
import type { StoreDraft, StorefrontConfig } from "../types/store";
import {
  generatedTheme,
  eynThemeSeed,
  hexSeed,
  oklchHex,
  seedFromConfig,
  themePresets,
  type ThemeSeed,
} from "./storefront/theme-generator";

const radiusOptions = [
  { value: "0", symbol: "–", label: "None" },
  { value: "4", symbol: "XS", label: "Extra Small" },
  { value: "8", symbol: "S", label: "Small" },
  { value: "12", symbol: "M", label: "Medium" },
  { value: "16", symbol: "L", label: "Large" },
];

function ThemeSlider({
  label,
  value,
  max,
  step,
  onChange,
  gradient,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  gradient?: string;
}) {
  return (
    <Slider
      aria-label={label}
      minValue={0}
      maxValue={max}
      step={step}
      value={value}
      onChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      className="theme-tone-slider"
    >
      <Slider.Track
        style={
          gradient
            ? {
                ...(gradient.startsWith("linear-gradient")
                  ? { backgroundImage: gradient }
                  : { backgroundColor: gradient, backgroundImage: "none" }),
                backgroundOrigin: "border-box",
                backgroundClip: "border-box",
              }
            : undefined
        }
      >
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  );
}
export function ThemeToolbar({ draft }: { draft: Observable<StoreDraft> }) {
  const snapshot = useSelector(() =>
    JSON.stringify({
      theme: draft.theme.get(),
      config: Object.fromEntries(
        (
          [
            "themeHue",
            "themeChroma",
            "themeLightness",
            "themeBase",
            "themeVibrant",
            "primary",
            "accent",
            "fontFamily",
            "radius",
            "formRadius",
          ] as const
        ).map((key) => [key, draft.storefrontConfig[key].get()]),
      ),
    }),
  );
  const { theme, config } = JSON.parse(snapshot) as {
    theme: string;
    config: StorefrontConfig;
  };
  const dark = theme === "eyn-dark",
    seed = seedFromConfig(config);
  const [presetOpen, setPresetOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [radiusOpen, setRadiusOpen] = useState(false);
  useEffect(() => {
    if (fontOpen)
      storefrontFonts.forEach((font) =>
        loadStorefrontFont(document, font.key, true),
      );
  }, [fontOpen]);
  const [swatchPage, setSwatchPage] = useState(0);
  const frame = useRef<number | null>(null);
  const pending = useRef<{
    seed: ThemeSeed;
    dark: boolean;
    vibrant: boolean;
  } | null>(null);
  const flush = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const next = pending.current;
    pending.current = null;
    if (next)
      batch(() => {
        draft.theme.set(next.dark ? "eyn-dark" : "eyn-light");
        draft.storefrontConfig.assign(
          generatedTheme(next.seed, next.dark, next.vibrant),
        );
      });
  };
  // Coalesce dragging to one draft update per animation frame; no API requests.
  const update = (
    patch: Partial<ThemeSeed>,
    isDark = dark,
    vibrant = !!draft.storefrontConfig.themeVibrant.peek(),
  ) => {
    pending.current = {
      seed: {
        ...(pending.current?.seed ||
          seedFromConfig(draft.storefrontConfig.peek() || {})),
        ...patch,
      },
      dark: isDark,
      vibrant,
    };
    if (frame.current === null) frame.current = requestAnimationFrame(flush);
  };
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const preset =
    Object.entries(themePresets).find(([, p]) =>
      Object.keys(p).every(
        (k) =>
          Math.abs(p[k as keyof ThemeSeed] - seed[k as keyof ThemeSeed]) <
          0.00001,
      ),
    )?.[0] || "Custom";
  const hueGradient = `linear-gradient(to right in oklab, ${Array.from({ length: 16 }, (_, i) => `oklch(${seed.lightness} ${seed.chroma} ${24 + i * 24})`).join(",")})`;
  const randomize = () =>
    update({
      hue: Math.floor(Math.random() * 360),
      chroma: Math.round((0.1 + Math.random() * 0.16) * 10000) / 10000,
      lightness: Math.round((0.5 + Math.random() * 0.35) * 10000) / 10000,
      base: Math.round(Math.random() * 0.02 * 10000) / 10000,
    });
  useEffect(() => {
    if (!presetOpen) return;
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing =
        target.isContentEditable ||
        /^(TEXTAREA|SELECT)$/.test(target.tagName) ||
        (target.tagName === "INPUT" &&
          !["checkbox", "radio", "range"].includes(
            (target as HTMLInputElement).type,
          ));
      if (
        event.key.toLowerCase() !== "t" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        typing
      )
        return;
      event.preventDefault();
      randomize();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [presetOpen, dark, draft]);
  return (
    <>
      <StorefrontStylePicker draft={draft} />
      <div
        className="theme-quick-toolbar"
        aria-label="Storefront theme controls"
        onPointerUp={flush}
        onKeyUp={flush}
      >
        <div className="theme-quick-control">
          <span>Accent</span>
          <div className="theme-slider-row">
            <ThemeSlider
              label="Accent hue"
              value={seed.hue}
              max={360}
              step={1}
              gradient={hueGradient}
              onChange={(hue) => update({ hue })}
            />
            <Popover>
              <Button
                isIconOnly
                variant="ghost"
                aria-label="Edit accent color"
                className="theme-accent-trigger"
              >
                <span className="theme-color-wheel" />
              </Button>
              <Popover.Content
                placement="bottom start"
                className="theme-accent-popover"
              >
                <Popover.Dialog>
                  <div
                    className="accent-swatch-row"
                    role="group"
                    aria-label="Accent swatches"
                  >
                    <Button
                      isIconOnly
                      variant="ghost"
                      aria-label="Previous colors"
                      onPress={() =>
                        setSwatchPage((page) => (page === 0 ? 1 : 0))
                      }
                    >
                      <ChevronLeft size={18} />
                    </Button>
                    {(swatchPage === 0
                      ? [
                          "#f29aba",
                          "#a775a5",
                          "#f45670",
                          "#ff8158",
                          "#f9d655",
                          "#2de59a",
                          "#6dbbd5",
                          "#272b33",
                        ]
                      : [
                          "#5278f5",
                          "#9068e8",
                          "#c79ef7",
                          "#57cbb0",
                          "#e8b96c",
                          "#ee847c",
                          "#a5b6c4",
                          "#ffffff",
                        ]
                    ).map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="accent-swatch"
                        aria-label={`Use accent ${color}`}
                        style={{ background: color }}
                        onClick={() => update(hexSeed(color))}
                      />
                    ))}
                    <Button
                      isIconOnly
                      variant="ghost"
                      aria-label="Next colors"
                      onPress={() =>
                        setSwatchPage((page) => (page === 0 ? 1 : 0))
                      }
                    >
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                  <ColorArea
                    aria-label="Accent saturation and brightness"
                    colorSpace="hsb"
                    xChannel="saturation"
                    yChannel="brightness"
                    value={
                      config.primary ||
                      oklchHex(seed.lightness, seed.chroma, seed.hue)
                    }
                    onChange={(color) => update(hexSeed(color.toString("hex")))}
                  >
                    <ColorArea.Thumb />
                  </ColorArea>
                  <div className="accent-hue-row">
                    <ColorSlider
                      aria-label="Picker hue"
                      channel="hue"
                      colorSpace="hsb"
                      value={
                        config.primary ||
                        oklchHex(seed.lightness, seed.chroma, seed.hue)
                      }
                      onChange={(color) =>
                        update(hexSeed(color.toString("hex")))
                      }
                    >
                      <ColorSlider.Track>
                        <ColorSlider.Thumb />
                      </ColorSlider.Track>
                    </ColorSlider>
                    <Button
                      isIconOnly
                      variant="secondary"
                      aria-label="Random accent color"
                      onPress={() =>
                        update({
                          hue: Math.floor(Math.random() * 360),
                          chroma: 0.16,
                          lightness: 0.7,
                        })
                      }
                    >
                      <Shuffle size={20} />
                    </Button>
                  </div>
                  <div className="accent-hex-row">
                    <ColorField
                      aria-label="Accent hex"
                      value={
                        config.primary ||
                        oklchHex(seed.lightness, seed.chroma, seed.hue)
                      }
                      onChange={(color) => {
                        if (color) update(hexSeed(color.toString("hex")));
                      }}
                    >
                      <ColorField.Group>
                        <ColorField.Input />
                      </ColorField.Group>
                    </ColorField>
                    <span className="accent-format-label">HEX</span>
                  </div>
                  <details className="accent-advanced">
                    <summary>Fine tune</summary>
                    <label>
                      <span className="theme-value-label">
                        Lightness{" "}
                        <output>{Math.round(seed.lightness * 100)}%</output>
                      </span>
                      <ThemeSlider
                        label="Accent lightness"
                        value={seed.lightness}
                        max={1}
                        step={0.005}
                        gradient={`linear-gradient(to right, ${oklchHex(0, seed.chroma, seed.hue)}, ${oklchHex(0.5, seed.chroma, seed.hue)}, ${oklchHex(1, seed.chroma, seed.hue)})`}
                        onChange={(lightness) => update({ lightness })}
                      />
                    </label>
                    <label>
                      <span className="theme-value-label">
                        Chroma <output>{seed.chroma.toFixed(3)}</output>
                      </span>
                      <ThemeSlider
                        label="Accent chroma"
                        value={seed.chroma}
                        max={0.4}
                        step={0.002}
                        gradient={`linear-gradient(to right, ${oklchHex(seed.lightness, 0, seed.hue)}, ${oklchHex(seed.lightness, 0.4, seed.hue)})`}
                        onChange={(chroma) => update({ chroma })}
                      />
                    </label>
                  </details>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
          </div>
        </div>
        <div className="theme-quick-control">
          <span title="Add a subtle accent tint to neutral backgrounds">
            Base
          </span>
          <div className="theme-slider-row">
            <ThemeSlider
              label="Base tint"
              value={seed.base}
              max={0.02}
              step={0.0002}
              gradient={`oklch(0.7 ${seed.base} ${seed.hue})`}
              onChange={(base) => update({ base })}
            />
          </div>
        </div>
        <div className="theme-quick-control">
          <span>Font Family</span>
          <Popover isOpen={fontOpen} onOpenChange={setFontOpen}>
            <Button
              variant="secondary"
              aria-label="Choose font family"
              className="theme-font-trigger"
            >
              <span aria-hidden="true">Aa</span>
              <span>
                {storefrontFonts.find(
                  (font) => font.key === (config.fontFamily || "system"),
                )?.name || "System sans"}
              </span>
              <ChevronDown size={16} />
            </Button>
            <Popover.Content
              placement="top start"
              className="theme-font-popover"
            >
              <Popover.Dialog aria-label="Choose font family">
                <Popover.Heading>Suggested</Popover.Heading>
                <div
                  className="theme-font-grid"
                  role="group"
                  aria-label="Suggested fonts"
                >
                  {storefrontFonts.map((font) => (
                    <button
                      type="button"
                      key={font.key}
                      aria-label={`Use ${font.name} font`}
                      aria-pressed={
                        (config.fontFamily || "system") === font.key
                      }
                      onClick={() => {
                        draft.storefrontConfig.fontFamily.set(font.key);
                        setFontOpen(false);
                      }}
                    >
                      <span
                        className="theme-font-sample"
                        style={{ fontFamily: font.family }}
                      >
                        Ag
                      </span>
                      <span className="theme-font-name">{font.name}</span>
                    </button>
                  ))}
                </div>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        </div>
        <div className="theme-quick-control">
          <span>Radius</span>
          <Popover isOpen={radiusOpen} onOpenChange={setRadiusOpen}>
            <Button
              variant="secondary"
              aria-label="Choose radius"
              className="theme-radius-trigger"
            >
              <span aria-hidden="true">
                {
                  radiusOptions.find(
                    (option) => option.value === (config.radius || "8"),
                  )?.symbol
                }
              </span>
              <span>
                {
                  radiusOptions.find(
                    (option) => option.value === (config.radius || "8"),
                  )?.label
                }
              </span>
              <ChevronDown size={16} />
            </Button>
            <Popover.Content
              placement="top start"
              className="theme-radius-popover"
            >
              <Popover.Dialog aria-label="Choose radius">
                <Popover.Heading>Radius</Popover.Heading>
                <p>Affects the overall UI, including menus and modals.</p>
                <div
                  className="theme-radius-grid"
                  role="group"
                  aria-label="Radius options"
                >
                  {radiusOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      aria-label={`Use ${option.label} radius`}
                      aria-pressed={(config.radius || "8") === option.value}
                      onClick={() => {
                        batch(() => {
                          draft.storefrontConfig.radius.set(option.value);
                          draft.storefrontConfig.formRadius.set(option.value);
                        });
                        setRadiusOpen(false);
                      }}
                    >
                      <strong>{option.symbol}</strong>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        </div>
        <div className="theme-quick-control">
          <span>Theme</span>
          <Popover isOpen={presetOpen} onOpenChange={setPresetOpen}>
            <Button
              variant="secondary"
              aria-label="Theme preset"
              data-preset={preset}
              className="theme-preset-trigger"
            >
              <span
                className="theme-trigger-swatch"
                style={{
                  background: oklchHex(seed.lightness, seed.chroma, seed.hue),
                }}
              />
              {preset}
              <ChevronDown size={15} />
            </Button>
            <Popover.Content
              placement="bottom end"
              className="theme-preset-popover"
            >
              <Popover.Dialog aria-label="Choose a theme">
                <div
                  className="theme-preset-grid"
                  role="group"
                  aria-label="Theme presets"
                >
                  {Object.entries(themePresets).map(([name, p]) => (
                    <Button
                      key={name}
                      variant="ghost"
                      aria-label={`Use ${name} theme`}
                      aria-pressed={preset === name}
                      onPress={() => update(p)}
                    >
                      <span
                        className="theme-preset-orb"
                        style={{
                          background: `linear-gradient(135deg, ${oklchHex(Math.min(0.88, p.lightness + 0.15), p.chroma * 0.7, p.hue - 18)}, ${oklchHex(Math.max(0.25, p.lightness - 0.12), p.chroma, p.hue + 18)})`,
                        }}
                      />
                      <span>{name}</span>
                    </Button>
                  ))}
                </div>
                <Switch
                  aria-label="Vibrant palette"
                  isSelected={!!config.themeVibrant}
                  onChange={(value) => update({}, dark, value)}
                  className="theme-vibrant-switch"
                >
                  <Switch.Content>
                    <span className="theme-vibrant-copy">
                      <strong>Vibrant palette</strong>
                      <small>More saturated, less contrast</small>
                    </span>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
                <Button
                  variant="ghost"
                  className="theme-randomize"
                  onPress={randomize}
                >
                  <Shuffle size={16} />
                  Random theme <kbd>T</kbd>
                </Button>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        </div>
        <div className="theme-toolbar-actions">
          <Button
            isIconOnly
            variant="secondary"
            aria-label={dark ? "Use light theme" : "Use dark theme"}
            onPress={() => update({}, !dark)}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button
            variant="ghost"
            onPress={() => update(eynThemeSeed, dark, false)}
          >
            <RotateCcw size={15} />
            Reset colors
          </Button>
        </div>
      </div>
    </>
  );
}
