"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { observable } from "@legendapp/state";
import type { Storefront } from "../../types/store";

export function createCart() {
  return observable({
    quantities: {} as Record<string, number>,
    ready: false,
    busy: false,
  });
}
type Cart = ReturnType<typeof createCart>;
const CartContext = createContext<Cart | null>(null);
export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("CartProvider is required");
  return cart;
}
export function CartProvider({
  store,
  children,
}: {
  store: Storefront;
  children: React.ReactNode;
}) {
  const [cart] = useState(createCart);
  useEffect(() => {
    const key = `eyn-cart-v1:${store.id}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      const valid: Record<string, number> = {};
      for (const [id, q] of Object.entries(saved)) {
        if (
          /^[1-9]\d*$/.test(id) &&
          Number.isInteger(q) &&
          Number(q) > 0 &&
          Number(q) <= 999 &&
          Object.keys(valid).length < 50
        )
          valid[id] = Number(q);
      }
      cart.quantities.set(valid);
    } catch {
      /* Storage is optional; checkout still works in memory. */
    }
    cart.ready.set(true);
    const dispose = cart.quantities.onChange(({ value }) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* Quota/private mode. */
      }
    });
    return dispose;
  }, [cart, store.id]);
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}
export function money(value: string | number, currency: string) {
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}
export function cents(price: string) {
  const [whole, fraction = ""] = price.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}
