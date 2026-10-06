"use client";
import { useState } from "react";
import { useSelector } from "@legendapp/state/react";
import type { Observable } from "@legendapp/state";
import { Button, Popover } from "@heroui/react";
import { ChevronDown, Blend } from "lucide-react";
import type { StoreDraft } from "../types/store";
import { backgroundEffect, backgroundOptions } from "./storefront/backgrounds";
export function StorefrontBackgroundPicker({
  draft,
}: {
  draft: Observable<StoreDraft>;
}) {
  const [open, setOpen] = useState(false);
  const selected = useSelector(() =>
    backgroundEffect(draft.storefrontConfig.backgroundEffect.get()),
  );
  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button variant="secondary" aria-label="Choose storefront background">
        <Blend size={16} aria-hidden="true" />
        {backgroundOptions.find((option) => option.id === selected)?.name}
        <ChevronDown size={16} />
      </Button>
      <Popover.Content
        placement="top end"
        className="storefront-background-popover"
      >
        <Popover.Dialog aria-label="Storefront background">
          <Popover.Heading>Background</Popover.Heading>
          <p>
            Soft color on a white or dark canvas. Accent and Base shape the gradients.
          </p>
          <div role="group" aria-label="Background options">
            {backgroundOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                aria-label={`Use ${option.name} background`}
                aria-pressed={selected === option.id}
                onClick={() => {
                  draft.storefrontConfig.backgroundEffect.set(option.id);
                  setOpen(false);
                }}
              >
                <span
                  className="background-option-preview"
                  data-effect={option.id}
                  aria-hidden="true"
                />
                <span>{option.name}</span>
              </button>
            ))}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
