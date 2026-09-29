"use client";
import { useState } from "react";
import { Button, Card } from "@heroui/react";
import { Package, Plus } from "lucide-react";
import { useSelector } from "@legendapp/state/react";
import toast from "react-hot-toast";
import type { Product } from "../../types/store";
import { useCart, money } from "./CartProvider";
export function ProductImage({ product }: { product: Product }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return product.imageUrl && failedUrl !== product.imageUrl ? (
    <img
      src={product.imageUrl}
      alt={product.name}
      onError={() => setFailedUrl(product.imageUrl)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  ) : (
    <Package size={48} strokeWidth={1} aria-hidden="true" />
  );
}
export function AddToCart({ product }: { product: Product }) {
  const cart = useCart();
  const disabled = useSelector(
    () =>
      !cart.ready.get() ||
      cart.busy.get() ||
      (cart.quantities[product.id].get() || 0) >=
        Math.min(product.inventory, 999),
  );
  return (
    <Button
      className="sf-add"
      isDisabled={disabled}
      onPress={() => {
        if (
          Object.keys(cart.quantities.peek()).length >= 50 &&
          !cart.quantities[product.id].peek()
        ) {
          toast.error("Your cart can contain up to 50 products.");
          return;
        }
        cart.quantities[product.id].set(
          (cart.quantities[product.id].peek() || 0) + 1,
        );
        toast.success(`${product.name} added to cart`);
      }}
    >
      <Plus size={16} />
      {product.inventory ? "Add to cart" : "Sold out"}
    </Button>
  );
}
export function ProductCard({
  product,
  currency,
  open,
}: {
  product: Product;
  currency: string;
  open: (p: Product) => void;
}) {
  return (
    <Card className="sf-product">
      <button
        className="sf-product-open"
        onClick={() => open(product)}
        aria-label={`View ${product.name}`}
      >
        <div className="sf-product-image">
          <ProductImage product={product} />
        </div>
        <div className="sf-product-copy">
          <span className="sf-overline">
            {product.category?.name || "The collection"}
          </span>
          <h3>{product.name}</h3>
          <p>{money(product.price, currency)}</p>
        </div>
      </button>
      <AddToCart product={product} />
    </Card>
  );
}
