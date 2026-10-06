"use client";
import Link from "next/link";
import { useRequest } from "ahooks";
import { Card, Button } from "@heroui/react";
import { storeApi } from "../services/storeApi";
import { Loading, Failure } from "./Feedback";
export function MerchantDashboard({
  id,
  cacheScope,
}: {
  id: number;
  cacheScope: string;
}) {
  const query = useRequest(() => storeApi.dashboard(id), {
    cacheKey: `merchant-dashboard:${cacheScope}:${id}`,
    refreshDeps: [id, cacheScope],
    staleTime: 0,
    cacheTime: 60000,
    refreshOnWindowFocus: true,
    onError: () => {},
  });
  if (query.error) return <Failure error={query.error} retry={query.refresh} />;
  if (!query.data) return <Loading />;
  const data = query.data;
  return (
    <section className="merchant-dashboard" aria-label="Order overview">
      <div className="section-heading">
        <h2>Your orders at a glance</h2>
        <Button
          variant="secondary"
          onPress={query.refresh}
          isDisabled={query.loading}
        >
          Refresh orders
        </Button>
      </div>
      <div className="stats">
        {[
          ["Total orders", data.totalOrders],
          ["Awaiting confirmation", data.pendingOrders],
          ["Completed orders", data.completedOrders],
        ].map(([label, value]) => (
          <Card key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </Card>
        ))}
      </div>
      <Card className="dashboard-value">
        <h3>Completed order value</h3>
        {data.completedValue.length ? (
          data.completedValue.map((row) => (
            <p key={row.currency}>
              <strong>
                {row.amount} {row.currency}
              </strong>
            </p>
          ))
        ) : (
          <p>No completed orders yet.</p>
        )}
        <small>
          Product totals from completed orders, grouped by currency. This is not
          a payment collection report.
        </small>
      </Card>
      <Card className="dashboard-recent">
        <div className="section-heading">
          <h3>Recent orders</h3>
          <Link href={`/stores/${id}/orders`}>Manage orders →</Link>
        </div>
        {data.recentOrders.length ? (
          <ul>
            {data.recentOrders.map((order) => (
              <li key={order.id}>
                <Link href={`/stores/${id}/orders`}>{order.code}</Link>
                <span>{order.status.toLowerCase()}</span>
                <strong>
                  {order.totalPrice} {order.currency}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>Your first order will appear here when a customer checks out.</p>
        )}
      </Card>
    </section>
  );
}
