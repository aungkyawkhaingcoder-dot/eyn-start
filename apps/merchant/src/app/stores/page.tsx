"use client";
import { Shell } from "../../components/Shell";
import { StoreList } from "../../components/StoreList";
export default function Stores() {
  return <Shell>{(id) => <StoreList userId={id} />}</Shell>;
}
