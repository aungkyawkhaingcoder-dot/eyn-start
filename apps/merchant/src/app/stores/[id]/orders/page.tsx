"use client";
import { use } from "react";
import { Shell } from "../../../../components/Shell";
import { StoreOrders } from "../../../../components/StoreOrders";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Shell storeId={Number(id)}>
      {() => <StoreOrders key={id} storeId={Number(id)} />}
    </Shell>
  );
}
