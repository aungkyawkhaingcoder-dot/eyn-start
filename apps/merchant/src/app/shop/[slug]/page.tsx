"use client";
import { use } from "react";
import { useRequest } from "ahooks";
import { storefrontApi } from "../../../services/storefrontApi";
import { Loading, Failure } from "../../../components/Feedback";
import { StorefrontView } from "../../../components/storefront/StorefrontView";
export default function Shop({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const store = useRequest(() => storefrontApi.get(slug), {
    cacheKey: `storefront:${slug}`,
    staleTime: 0,
    cacheTime: 120000,
    refreshDeps: [slug],
    refreshOnWindowFocus: true,
  });
  if (!store.data && store.loading) return <Loading />;
  if (store.error) return <Failure error={store.error} retry={store.refresh} />;
  return store.data ? (
    <StorefrontView key={store.data.id} store={store.data} />
  ) : null;
}
