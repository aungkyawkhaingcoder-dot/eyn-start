"use client";
import { StorefrontView as Renderer } from "@eyn/storefront/StorefrontView";
import type { Storefront } from "@eyn/contracts/store";
import { EditableCopy } from "./EditableCopy";
export function StorefrontView(props: {store: Storefront; preview?: boolean}) {
 return <Renderer {...props} Copy={EditableCopy} />;
}
