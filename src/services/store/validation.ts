import { createError } from "../../utils";
const invalid = (message: string) =>
  createError(message, 422, "Error_Validation");
export function positiveId(value: unknown): number {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  )
    throw invalid("Invalid resource ID.");
  return Number(value);
}
function text(
  body: Record<string, unknown>,
  key: string,
  max: number,
  required = false,
) {
  const value = body[key];
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw invalid(`Invalid ${key}.`);
  return value.trim();
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalid("JSON body required.");
  return value as Record<string, unknown>;
}
export function storeInput(value: unknown) {
  const body = object(value);
  const name = text(body, "name", 80, true);
  const slug = text(body, "slug", 60, true).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3)
    throw invalid(
      "Store URL must be 3–60 lowercase letters, numbers or hyphens.",
    );
  const currency = text(body, "currency", 3);
  if (!["MMK", "USD", "THB"].includes(currency))
    throw invalid("Unsupported currency.");
  if (typeof body.published !== "boolean") throw invalid("Invalid visibility.");
  return {
    name,
    slug,
    currency,
    description: text(body, "description", 1000),
    published: body.published,
  };
}
export function productInput(value: unknown) {
  const body = object(value);
  if (
    typeof body.price !== "string" ||
    !/^\d{1,10}(\.\d{1,2})?$/.test(body.price)
  )
    throw invalid(
      "Price must be a positive amount with at most two decimal places.",
    );
  if (
    typeof body.inventory !== "number" ||
    !Number.isInteger(body.inventory) ||
    body.inventory < 0 ||
    body.inventory > 2147483647
  )
    throw invalid("Invalid inventory.");
  if (typeof body.published !== "boolean") throw invalid("Invalid visibility.");
  const imageUrl = text(body, "imageUrl", 2000);
  if (imageUrl) {
    try {
      if (new URL(imageUrl).protocol !== "https:") throw Error();
    } catch {
      throw invalid("Image URL must use HTTPS.");
    }
  }
  return {
    name: text(body, "name", 160, true),
    description: text(body, "description", 3000),
    price: body.price,
    inventory: body.inventory,
    imageUrl,
    published: body.published,
  };
}
