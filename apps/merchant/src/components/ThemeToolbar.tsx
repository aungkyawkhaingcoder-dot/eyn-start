"use client";
import { useEffect, useRef } from "react";
import { useSelector } from "@legendapp/state/react";
import { batch, type Observable } from "@legendapp/state";
import {
  Button,
  Popover,
  Slider,
  ColorArea,
  ColorField,
  ColorSlider,
} from "@heroui/react";
import { Moon, Sun, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { StoreDraft, StorefrontConfig } from "../types/store";
import {
  generatedTheme,
  hexSeed,
  oklchHex,
  seedFromConfig,
  themePresets,
  type ThemeSeed,
} from "./storefront/theme-generator";

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
      <Slider.Track style={gradient ? { background: gradient } : undefined}>
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
  const frame = useRef<number | null>(null);
  const pending = useRef<{ seed: ThemeSeed; dark: boolean } | null>(null);
  const flush = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const next = pending.current;
    pending.current = null;
    if (next)
      batch(() => {
        draft.theme.set(next.dark ? "eyn-dark" : "eyn-light");
        draft.storefrontConfig.assign(generatedTheme(next.seed, next.dark));
      });
  };
  // Coalesce dragging to one draft update per animation frame; no API requests.
  const update = (patch: Partial<ThemeSeed>, isDark = dark) => {
    pending.current = {
      seed: {
        ...(pending.current?.seed ||
          seedFromConfig(draft.storefrontConfig.peek() || {})),
        ...patch,
      },
      dark: isDark,
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
  const hueGradient = `linear-gradient(to right, ${Array.from({ length: 13 }, (_, i) => oklchHex(0.82, 0.115, i * 30)).join(",")})`;
  return (
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
                <Popover.Heading>Accent color</Popover.Heading>
                <div
                  className="theme-preset-swatches"
                  role="group"
                  aria-label="Quick palettes"
                >
                  {Object.entries(themePresets).map(([name, p]) => (
                    <Button
                      key={name}
                      isIconOnly
                      variant="ghost"
                      aria-label={`Use ${name} palette`}
                      aria-pressed={preset === name}
                      onPress={() => update(p)}
                    >
                      <span
                        style={{
                          background: oklchHex(p.lightness, p.chroma, p.hue),
                        }}
                      />
                    </Button>
                  ))}
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
                <ColorSlider
                  aria-label="Picker hue"
                  channel="hue"
                  colorSpace="hsb"
                  value={
                    config.primary ||
                    oklchHex(seed.lightness, seed.chroma, seed.hue)
                  }
                  onChange={(color) => update(hexSeed(color.toString("hex")))}
                >
                  <ColorSlider.Track>
                    <ColorSlider.Thumb />
                  </ColorSlider.Track>
                </ColorSlider>
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
            max={0.04}
            step={0.001}
            gradient={`linear-gradient(to right, ${oklchHex(0.7, 0, seed.hue)}, ${oklchHex(0.7, 0.04, seed.hue)})`}
            onChange={(base) => update({ base })}
          />
        </div>
      </div>
      <div className="theme-quick-control">
        <span>Style</span>
        <Popover>
          <Button variant="secondary" aria-label="Typography and shape">
            <SlidersHorizontal size={16} />
            Typography & shape
          </Button>
          <Popover.Content
            placement="bottom start"
            className="theme-style-popover"
          >
            <Popover.Dialog>
              <Popover.Heading>Typography & shape</Popover.Heading>
              <label className="theme-quick-control">
                Font family
                <select
                  aria-label="Font family"
                  value={config.fontFamily || "system"}
                  onChange={(e) =>
                    draft.storefrontConfig.fontFamily.set(e.target.value)
                  }
                >
                  <option value="system">System sans</option>
                  <option value="arial">Arial</option>
                  <option value="georgia">Georgia</option>
                </select>
              </label>
              <label className="theme-quick-control">
                Radius
                <select
                  aria-label="Radius"
                  value={config.radius || "8"}
                  onChange={(e) =>
                    draft.storefrontConfig.radius.set(e.target.value)
                  }
                >
                  {["0", "4", "8", "12", "16"].map((v) => (
                    <option key={v} value={v}>
                      {v}px
                    </option>
                  ))}
                </select>
              </label>
              <label className="theme-quick-control">
                Form radius
                <select
                  aria-label="Form radius"
                  value={config.formRadius || "8"}
                  onChange={(e) =>
                    draft.storefrontConfig.formRadius.set(e.target.value)
                  }
                >
                  {["0", "4", "8", "12", "16"].map((v) => (
                    <option key={v} value={v}>
                      {v}px
                    </option>
                  ))}
                </select>
              </label>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      </div>
      <label className="theme-quick-control">
        Theme
        <select
          aria-label="Theme preset"
          value={preset}
          onChange={(e) =>
            update(themePresets[e.target.value as keyof typeof themePresets])
          }
        >
          <option value="Custom" disabled>
            Custom
          </option>
          {Object.keys(themePresets).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <div className="theme-toolbar-actions">
        <Button
          isIconOnly
          variant="secondary"
          aria-label={dark ? "Use light theme" : "Use dark theme"}
          onPress={() => update({}, !dark)}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        <Button variant="ghost" onPress={() => update(themePresets.EYN)}>
          <RotateCcw size={15} />
          Reset colors
        </Button>
      </div>
    </div>
  );
}
