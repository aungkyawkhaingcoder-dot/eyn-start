"use client";
import { useState } from "react";
import { useRequest } from "ahooks";
import { Button, Card, Chip, Spinner } from "@heroui/react";
import toast from "react-hot-toast";
import { storeApi } from "../services/storeApi";
import { Loading, Failure } from "./Feedback";
import { money } from "./storefront/CartProvider";
import type { StoreOrder } from "../types/store";
export function StoreOrders({ storeId }: { storeId: number }) {
  const [page, setPage] = useState(1);
  const orders = useRequest(() => storeApi.orders(storeId, page), {
    refreshDeps: [storeId, page],
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">STORE / ORDERS</span>
          <h1>Your orders.</h1>
          <p>Review customer details, confirm orders and track fulfilment.</p>
        </div>
        <Button
          variant="secondary"
          onPress={orders.refresh}
          isDisabled={orders.loading}
        >
          Refresh
        </Button>
      </div>
      {orders.loading ? (
        <Loading />
      ) : orders.error ? (
        <Failure error={orders.error} retry={orders.refresh} />
      ) : (
        <>
          <div className="merchant-orders">
            {orders.data?.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                storeId={storeId}
                refresh={orders.refresh}
              />
            ))}
            {!orders.data?.length && (
              <div className="empty">
                <h2>No orders here yet.</h2>
                <p>Orders placed through your storefront will appear here.</p>
              </div>
            )}
          </div>
          <div className="form-actions">
            <Button
              variant="secondary"
              isDisabled={page === 1}
              onPress={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              variant="secondary"
              isDisabled={(orders.data?.length || 0) < 30}
              onPress={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </>
  );
}
function OrderCard({
  order,
  storeId,
  refresh,
}: {
  order: StoreOrder;
  storeId: number;
  refresh: () => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const action = useRequest(
    (status: string) => storeApi.orderStatus(storeId, order.id, status),
    { manual: true },
  );
  async function update(status: string) {
    try {
      await toast.promise(action.runAsync(status), {
        loading: "Updating order…",
        success: "Order updated",
        error: (e: Error) => e.message,
      });
      setConfirmCancel(false);
      refresh();
    } catch {
      /* Toast displays the failure. */
    }
  }
  return (
    <Card className="merchant-order">
      <div className="section-heading">
        <h2>{order.code}</h2>
        <Chip>{order.status}</Chip>
      </div>
      <p>
        {new Date(order.createdAt).toLocaleString()} ·{" "}
        {money(order.totalPrice, order.currency)}
      </p>
      <h3>{order.customerName}</h3>
      <p>{order.phone}</p>
      <p style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
        {order.address}
      </p>
      {order.notes && <p>Note: {order.notes}</p>}
      <ul>
        {order.products.map((p) => (
          <li key={p.productId}>
            {p.quantity} × {p.productName} —{" "}
            {money(p.unitPrice, order.currency)} each
          </li>
        ))}
      </ul>
      <p className="field-help">
        No online payment was collected for this order.
      </p>
      <div className="form-actions">
        {action.loading && <Spinner size="sm" />}
        {order.status === "PENDING" && (
          <Button
            isDisabled={action.loading}
            onPress={() => void update("CONFIRMED")}
          >
            Confirm order
          </Button>
        )}
        {order.status === "CONFIRMED" && (
          <Button
            isDisabled={action.loading}
            onPress={() => void update("COMPLETED")}
          >
            Mark completed
          </Button>
        )}
        {["PENDING", "CONFIRMED"].includes(order.status) && (
          <Button
            variant="danger"
            isDisabled={action.loading}
            onPress={() => setConfirmCancel(true)}
          >
            Cancel order
          </Button>
        )}
      </div>
      {confirmCancel && (
        <div role="alert">
          <p>Cancel this order and return its items to stock?</p>
          <Button
            variant="danger"
            isDisabled={action.loading}
            onPress={() => void update("CANCELLED")}
          >
            Yes, cancel order
          </Button>
          <Button
            variant="ghost"
            isDisabled={action.loading}
            onPress={() => setConfirmCancel(false)}
          >
            Keep order
          </Button>
        </div>
      )}
    </Card>
  );
}
