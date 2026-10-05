"use client";
import { useState } from "react";
import { useSelector } from "@legendapp/state/react";
import type { Observable } from "@legendapp/state";
import { Button, Popover } from "@heroui/react";
import { ChevronDown, LayoutTemplate, Check } from "lucide-react";
import type { StoreDraft } from "../types/store";
import { designStyle, storefrontStyles } from "./storefront/styles";

export function StorefrontStylePicker({
  draft,
}: {
  draft: Observable<StoreDraft>;
}) {
  const [open, setOpen] = useState(false);
  const current = useSelector(() =>
    designStyle(draft.storefrontConfig.designStyle.get()),
  );
  return (
    <div className="storefront-design-choice">
      <div>
        <strong>Storefront design</strong>
        <span>Choose a look. Make it yours with your theme.</span>
      </div>
      <Popover isOpen={open} onOpenChange={setOpen}>
        <Button variant="secondary" aria-label="Choose storefront design">
          <LayoutTemplate size={17} />
          {storefrontStyles.find((style) => style.id === current)?.name}
          <ChevronDown size={16} />
        </Button>
        <Popover.Content
          placement="bottom end"
          className="storefront-design-popover"
        >
          <Popover.Dialog aria-label="Storefront designs">
            <Popover.Heading>Choose your storefront look</Popover.Heading>
            <div
              className="storefront-design-grid"
              role="group"
              aria-label="Design styles"
            >
              {storefrontStyles.map((style) => (
                <button
                  type="button"
                  key={style.id}
                  aria-label={`Use ${style.name} design`}
                  aria-pressed={current === style.id}
                  onClick={() => {
                    draft.storefrontConfig.designStyle.set(style.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className="design-style-preview"
                    data-design={style.id}
                    aria-hidden="true"
                  >
                    <i />
                    <span>
                      <i />
                      <i />
                      <i />
                    </span>
                  </span>
                  <strong>
                    {style.name}
                    {current === style.id && <Check size={14} />}
                  </strong>
                  <small>{style.description}</small>
                </button>
              ))}
            </div>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}
