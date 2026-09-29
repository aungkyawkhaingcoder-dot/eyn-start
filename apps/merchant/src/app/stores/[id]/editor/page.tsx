"use client";
import { use } from "react";
import { Shell } from "../../../../components/Shell";
import { StoreWorkspace } from "../../../../components/StoreWorkspace";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Shell storeId={Number(id)}>
      {(scope) => (
        <StoreWorkspace
          key={id}
          id={Number(id)}
          cacheScope={scope}
          view="editor"
        />
      )}
    </Shell>
  );
}
