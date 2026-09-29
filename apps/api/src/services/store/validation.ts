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
    ...(body.storefrontConfig !== undefined ? { storefrontConfig: storefrontConfig(body.storefrontConfig) } : {}),
    name,
    slug,
    currency,
    description: text(body, "description", 1000),
    published: body.published,
    ...(body.logoUrl !== undefined ? { logoUrl: imageUrl(body.logoUrl) } : {}),
    ...(body.coverUrl !== undefined
      ? { coverUrl: imageUrl(body.coverUrl) }
      : {}),
    ...(body.theme !== undefined ? { theme: themeName(body.theme) } : {}),
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
    ...(body.categoryName !== undefined
      ? { categoryName: text(body, "categoryName", 80) }
      : {}),
    ...(body.tags !== undefined ? { tags: tagNames(body.tags) } : {}),
  };
}

function imageUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2000)
    throw invalid("Invalid image URL.");
  if (!value) return "";
  try {
    if (new URL(value).protocol !== "https:") throw Error();
  } catch {
    throw invalid("Images must use HTTPS.");
  }
  return value;
}
function themeName(value: unknown) {
  if (value !== "eyn-light" && value !== "eyn-dark")
    throw invalid("Invalid theme.");
  return value;
}
function tagNames(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 10 ||
    value.some(
      (t) => typeof t !== "string" || !t.trim() || t.trim().length > 40,
    )
  )
    throw invalid("Use up to 10 tags, each 1–40 characters.");
  return [...new Set(value.map((t) => t.trim().toLowerCase()))];
}

function storefrontConfig(value: unknown): Record<string, string | boolean> {
  const body = object(value);
  const result: Record<string, string | boolean> = {};
  const copy: Record<string, number> = { heroTitle: 160, heroText: 500, buttonLabel: 60, collectionTitle: 100, featuredTitle: 100, bestTitle: 100, aboutTitle: 100, aboutText: 1000 };
  const colors = ["background", "surface", "text", "muted", "primary", "buttonText", "accent"];
  for (const [key, value] of Object.entries(body)) {
    if (Object.hasOwn(copy, key)) result[key] = text(body, key, copy[key]!);
    else if (["fontFamily", "radius", "formRadius"].includes(key)) {
      const allowed = key === "fontFamily" ? ["system", "arial", "georgia"] : ["0", "4", "8", "12", "16"];
      if (typeof value !== "string" || !allowed.includes(value)) throw invalid(`Invalid ${key}.`);
      result[key] = value;
    }
    else if (colors.includes(key)) {
      if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) throw invalid(`Invalid ${key} color.`);
      result[key] = value;
    } else if (["showHero", "showFeatured", "showBest", "showAbout"].includes(key)) {
      if (typeof value !== "boolean") throw invalid(`Invalid ${key}.`);
      result[key] = value;
    } else throw invalid(`Unknown storefront setting: ${key}.`);
  }
  return result;
}
