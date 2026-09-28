import { createError } from "../../utils";
const invalid = (message: string) =>
  createError(message, 422, "Error_Validation");
export function checkoutInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw invalid("JSON body required.");
  const body = input as Record<string, unknown>;
  const text = (key: string, max: number, required = true) => {
    const value = body[key] ?? "";
    if (
      typeof value !== "string" ||
      value.trim().length > max ||
      (required && !value.trim())
    )
      throw invalid(`Invalid ${key}.`);
    return value.trim();
  };
  const customerName = text("customerName", 120),
    phone = text("phone", 30),
    address = text("address", 1000),
    notes = text("notes", 1000, false);
  if (!/^\+?[\d ()-]{6,30}$/.test(phone))
    throw invalid("Enter a valid phone number.");
  if (
    !Array.isArray(body.items) ||
    !body.items.length ||
    body.items.length > 50
  )
    throw invalid("Cart must contain 1–50 products.");
  const seen = new Set<number>();
  const items = body.items
    .map((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        !Number.isSafeInteger(item.productId) ||
        item.productId < 1 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 999 ||
        seen.has(item.productId)
      )
        throw invalid("Invalid or duplicate cart item.");
      // Explicitly whitelist. Client prices, totals and store IDs are never trusted.
      seen.add(item.productId);
      return {
        productId: item.productId as number,
        quantity: item.quantity as number,
      };
    })
    .sort((a, b) => a.productId - b.productId);
  return { customerName, phone, address, notes, items };
}
export function requestKey(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{16,80}$/.test(value))
    throw invalid("A valid Idempotency-Key header is required.");
  return value;
}
