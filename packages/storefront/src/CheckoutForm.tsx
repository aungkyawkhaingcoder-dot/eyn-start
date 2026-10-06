"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { CheckCircle2 } from "lucide-react";
import { useObservable, useSelector } from "@legendapp/state/react";
import type { Observable } from "@legendapp/state";
import { useRequest } from "ahooks";
import toast from "react-hot-toast";
import { storefrontApi } from "./api";
import type {
  CheckoutInput,
  OrderReceipt,
  Storefront,
} from "@eyn/contracts/store";
import { useCart, money } from "./CartProvider";
import { CartTotal, CartSummary } from "./CartPanel";
type Customer = Omit<CheckoutInput, "items">;
type Attempt = { key: string; payload: CheckoutInput };
function CustomerField({
  state,
  name,
  label,
  max,
  optional = false,
}: {
  state: Observable<Customer>;
  name: keyof Customer;
  label: string;
  max: number;
  optional?: boolean;
}) {
  const value = useSelector(state[name]);
  return (
    <label className="sf-field">
      {label}
      <input
        name={name}
        autoComplete={
          name === "customerName"
            ? "name"
            : name === "phone"
              ? "tel"
              : name === "address"
                ? "street-address"
                : "off"
        }
        type={name === "phone" ? "tel" : "text"}
        maxLength={max}
        required={!optional}
        value={value}
        onChange={(e) => state[name].set(e.target.value)}
      />
    </label>
  );
}
export function CheckoutForm({
  store,
  back,
  close,
}: {
  store: Storefront;
  back: () => void;
  close: () => void;
}) {
  const [ownerBlocked, setOwnerBlocked] = useState(false);
  const customer = useObservable<Customer>({
    customerName: "",
    phone: "",
    address: "",
    notes: "",
  });
  const cart = useCart(),
    lock = useRef(false),
    attempt = useRef<Attempt | null>(null);
  const [uncertain, setUncertain] = useState(false),
    [receipt, setReceipt] = useState<OrderReceipt | null>(null),
    [error, setError] = useState("");
  const storageKey = `eyn-checkout:${store.id}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (saved?.key && saved?.payload?.items) {
        attempt.current = saved;
        const { items: _, ...fields } = saved.payload;
        customer.set(fields);
        setUncertain(true);
      }
    } catch {
      /* In-memory retry is available when storage is blocked. */
    }
  }, [storageKey, customer]);
  const order = useRequest(
    async () => {
      if (!attempt.current) {
        attempt.current = {
          key: crypto.randomUUID(),
          payload: {
            ...customer.peek(),
            items: Object.entries(cart.quantities.peek()).map(
              ([id, quantity]) => ({ productId: Number(id), quantity }),
            ),
          },
        };
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(attempt.current));
        } catch {
          /* Optional persistence. */
        }
      }
      return storefrontApi.checkout(
        store.slug,
        attempt.current.payload,
        attempt.current.key,
      );
    },
    { manual: true },
  );
  if (receipt)
    return (
      <div className="sf-confirmation" role="status">
        <CheckCircle2 size={44} />
        <span className="sf-overline">ORDER RECEIVED</span>
        <h2>Thank you, {customer.customerName.peek()}.</h2>
        <p>
          Your order has been sent to {store.name}. The store will contact you
          to confirm the details.
        </p>
        <div className="sf-receipt">
          <span>Order reference</span>
          <strong>{receipt.code}</strong>
          <span>Product total</span>
          <strong>{money(receipt.totalPrice, receipt.currency)}</strong>
        </div>
        <p>No payment has been collected.</p>
        <Button className="sf-primary" onPress={close}>
          Continue shopping
        </Button>
      </div>
    );
  return (
    <form
      className="sf-checkout"
      onSubmit={async (e) => {
        e.preventDefault();
        if (lock.current || ownerBlocked) return;
        lock.current = true;
        cart.busy.set(true);
        setError("");
        try {
          const result = await toast.promise(order.runAsync(), {
            loading: "Placing your order…",
            success: "Order received",
            error: (e: Error) => e.message,
          });
          // A restored attempt may have been submitted before other cart edits.
          // Remove only quantities belonging to the successful order.
          for (const item of attempt.current?.payload.items || []) {
            const remaining =
              (cart.quantities[item.productId].peek() || 0) - item.quantity;
            if (remaining > 0) cart.quantities[item.productId].set(remaining);
            else cart.quantities[item.productId].delete();
          }
          setReceipt(result);
          attempt.current = null;
          try {
            sessionStorage.removeItem(storageKey);
          } catch {
            /* Optional storage. */
          }
        } catch (e) {
          const failure = e as Error & { status?: number; code?: string };
          setError(failure.message);
          setOwnerBlocked(failure.code === "Error_OwnerCheckout");
          const unknown =
            !failure.status ||
            failure.status >= 500 ||
            failure.status === 429 ||
            failure.status === 408 ||
            (uncertain && failure.status === 404);
          setUncertain(unknown);
          if (!unknown) {
            attempt.current = null;
            try {
              sessionStorage.removeItem(storageKey);
            } catch {}
          }
        } finally {
          lock.current = false;
          cart.busy.set(false);
        }
      }}
    >
      <h3>Delivery details</h3>
      <p className="sf-muted">Checkout as a guest. No account required.</p>
      <fieldset disabled={order.loading || uncertain}>
        <CustomerField
          state={customer}
          name="customerName"
          label="Full name"
          max={120}
        />
        <CustomerField
          state={customer}
          name="phone"
          label="Phone number"
          max={30}
        />
        <CustomerField
          state={customer}
          name="address"
          label="Delivery address"
          max={1000}
        />
        <CustomerField
          state={customer}
          name="notes"
          label="Order notes (optional)"
          max={1000}
          optional
        />
      </fieldset>
      <h3>Order summary</h3>
      <CartSummary store={store} />
      <div className="sf-total">
        <span>Product total</span>
        <CartTotal store={store} />
      </div>
      <p className="sf-muted">
        Delivery charges will be confirmed by the store. You will not be charged
        online.
      </p>
      {error && (
        <p role="alert" className="sf-error">
          {error}
        </p>
      )}
      {uncertain && (
        <p role="status">
          The result of your last attempt is not confirmed. Retry the same order
          safely below.
        </p>
      )}
      {ownerBlocked && <a className="sf-primary" href={`${(process.env.NEXT_PUBLIC_MERCHANT_URL || "").replace(/\/$/, "")}/stores/${store.id}/editor`}>Manage your store</a>}
      <Button className="sf-primary" type="submit" isDisabled={ownerBlocked} isPending={order.loading}>
        {order.loading && <Spinner size="sm" />}
        {uncertain ? "Retry this order" : "Place order"}
      </Button>
      <Button
        variant="ghost"
        isDisabled={order.loading || uncertain}
        onPress={back}
      >
        Back to bag
      </Button>
    </form>
  );
}
