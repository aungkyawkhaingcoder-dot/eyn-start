"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useSelector } from "@legendapp/state/react";
import type { Storefront, Product } from "../../types/store";
import { useCart, money, cents } from "./CartProvider";
import { CheckoutForm } from "./CheckoutForm";

export function CartCount() {
  const cart = useCart();
  const count = useSelector(() =>
    Object.values(cart.quantities.get()).reduce((a, b) => a + b, 0),
  );
  return <span aria-live="polite">{count}</span>;
}
export function CartTotal({ store }: { store: Storefront }) {
  const cart = useCart();
  const total = useSelector(() =>
    store.products.reduce(
      (sum, p) => sum + cents(p.price) * (cart.quantities[p.id].get() || 0),
      0,
    ),
  );
  return (
    <strong aria-live="polite">{money(total / 100, store.currency)}</strong>
  );
}
export function CartSummary({ store }: { store: Storefront }) {
  const cart = useCart();
  const items = useSelector(cart.quantities);
  return (
    <ul className="sf-order-summary">
      {Object.entries(items).map(([id, quantity]) => {
        const product = store.products.find((p) => p.id === Number(id));
        return (
          <li key={id}>
            <span>
              {quantity} × {product?.name || "Unavailable product"}
            </span>
            <strong>
              {product
                ? money((cents(product.price) * quantity) / 100, store.currency)
                : "—"}
            </strong>
          </li>
        );
      })}
    </ul>
  );
}
function CartLine({
  product,
  id,
  currency,
}: {
  product?: Product;
  id: string;
  currency: string;
}) {
  const cart = useCart();
  const quantity = useSelector(cart.quantities[id]);
  const busy = useSelector(cart.busy);
  return (
    <div className="sf-cart-line">
      <div>
        <strong>{product?.name || "Unavailable product"}</strong>
        <p>
          {product
            ? money(product.price, currency)
            : "Remove this item to continue."}
        </p>
        {product && quantity > product.inventory && (
          <p className="sf-error">Only {product.inventory} available.</p>
        )}
      </div>
      <div className="sf-quantity">
        <Button
          variant="ghost"
          isIconOnly
          aria-label={`Decrease ${product?.name || "quantity"}`}
          isDisabled={busy || quantity <= 1}
          onPress={() => cart.quantities[id].set(quantity - 1)}
        >
          <Minus size={16} />
        </Button>
        <span aria-live="polite">{quantity}</span>
        <Button
          variant="ghost"
          isIconOnly
          aria-label={`Increase ${product?.name || "quantity"}`}
          isDisabled={
            busy || !product || quantity >= Math.min(product.inventory, 999)
          }
          onPress={() => cart.quantities[id].set(quantity + 1)}
        >
          <Plus size={16} />
        </Button>
        <Button
          variant="ghost"
          isIconOnly
          aria-label={`Remove ${product?.name || "item"}`}
          isDisabled={busy}
          onPress={() => cart.quantities[id].delete()}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}
function CartContents({
  store,
  close,
}: {
  store: Storefront;
  close: () => void;
}) {
  const cart = useCart();
  // Item identities subscribe separately from quantities, so sibling rows stay stable.
  const ids = useSelector(() => Object.keys(cart.quantities.get()).join(","));
  const busy = useSelector(cart.busy);
  const [checkout, setCheckout] = useState(false);
  useEffect(() => {
    // A previously committed order may have exhausted stock. Recovery must not
    // be blocked by the fresh inventory check or an empty local cart.
    try {
      const pending = JSON.parse(
        sessionStorage.getItem(`eyn-checkout:${store.id}`) || "null",
      );
      if (pending?.key && pending?.payload?.items) setCheckout(true);
    } catch {
      /* No valid pending checkout. */
    }
  }, [store.id]);
  const invalid = useSelector(() =>
    Object.entries(cart.quantities.get()).some(([id, q]) => {
      const p = store.products.find((p) => p.id === Number(id));
      return !p || q > p.inventory;
    }),
  );
  if (checkout)
    return (
      <CheckoutForm
        store={store}
        back={() => setCheckout(false)}
        close={close}
      />
    );
  if (!ids)
    return (
      <div className="sf-empty">
        <ShoppingBag size={40} />
        <h3>Your bag is waiting.</h3>
        <p>Find something you love in the collection.</p>
        <Button onPress={close}>Explore products</Button>
      </div>
    );
  return (
    <>
      <div>
        {ids.split(",").map((id) => (
          <CartLine
            key={id}
            id={id}
            product={store.products.find((p) => p.id === Number(id))}
            currency={store.currency}
          />
        ))}
      </div>
      <div className="sf-total">
        <span>Subtotal</span>
        <CartTotal store={store} />
      </div>
      <p className="sf-muted">
        No payment is collected online. The store will contact you to confirm
        delivery and any delivery charges.
      </p>
      <Button
        className="sf-primary"
        isDisabled={invalid || busy}
        onPress={() => setCheckout(true)}
      >
        Continue to checkout
      </Button>
    </>
  );
}
export function CartPanel({ store }: { store: Storefront }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const cart = useCart();
  const busy = useSelector(cart.busy);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <>
      <Button
        variant="secondary"
        aria-label="Open shopping bag"
        onPress={() => setOpen(true)}
      >
        <ShoppingBag size={18} />
        Bag <CartCount />
      </Button>
      <dialog
        ref={dialog}
        className="sf-dialog sf-cart-dialog"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setOpen(false);
        }}
        onClose={() => setOpen(false)}
      >
        <div className="sf-dialog-heading">
          <h2>Your bag</h2>
          <Button
            variant="ghost"
            isIconOnly
            aria-label="Close shopping bag"
            isDisabled={busy}
            onPress={() => setOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>
        {open && <CartContents store={store} close={() => setOpen(false)} />}
      </dialog>
    </>
  );
}
