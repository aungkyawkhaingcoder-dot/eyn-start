"use client";
import { use } from "react";
import { Shell } from "../../../components/Shell";
import { StoreWorkspace } from "../../../components/StoreWorkspace";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Shell storeId={Number(id)}>
      {(userId) => (
        <StoreWorkspace
          key={id}
          id={Number(id)}
          userId={userId}
          view="overview"
        />
      )}
    </Shell>
  );
}
