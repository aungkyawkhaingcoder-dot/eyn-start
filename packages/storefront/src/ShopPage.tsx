"use client";
import { use } from "react";
import { useRequest } from "ahooks";
import { storefrontApi } from "./api";
import { Loading, Failure } from "./Feedback";
import { templates } from "./templates";
const StorefrontView = templates.default;
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
    // Errors are rendered below; avoid ahooks logging expected 404s as console errors.
    onError: () => {},
  });
  if (!store.data && store.loading) return <Loading />;
  if ((store.error as (Error & { status?: number }) | undefined)?.status === 404) {
    return <main className="empty" role="status">
      <h1>This storefront is not available yet.</h1>
      <p>The address may be incorrect, or the store may not be published.</p>
      <p>If you own this store, open Store settings in your merchant dashboard to preview it or publish it.</p>
    </main>;
  }
  if (store.error) return <Failure error={store.error} retry={store.refresh} />;
  return store.data ? (
    <StorefrontView key={store.data.id} store={store.data} />
  ) : null;
}
