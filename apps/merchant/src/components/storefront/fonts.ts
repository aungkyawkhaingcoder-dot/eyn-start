export const storefrontFonts = [
  { key: "inter", name: "Inter", family: '"Inter", system-ui, sans-serif' },
  {
    key: "figtree",
    name: "Figtree",
    family: '"Figtree", system-ui, sans-serif',
  },
  {
    key: "hanken",
    name: "Hanken Grotesk",
    family: '"Hanken Grotesk", system-ui, sans-serif',
  },
  { key: "geist", name: "Geist", family: '"Geist", system-ui, sans-serif' },
  {
    key: "dm-sans",
    name: "DM Sans",
    family: '"DM Sans", system-ui, sans-serif',
  },
  {
    key: "public-sans",
    name: "Public Sans",
    family: '"Public Sans", system-ui, sans-serif',
  },
  { key: "system", name: "System sans", family: "system-ui, sans-serif" },
  { key: "arial", name: "Arial", family: "Arial, Helvetica, sans-serif" },
  { key: "georgia", name: "Georgia", family: "Georgia, serif" },
];
export function fontFamily(key?: string) {
  return (
    storefrontFonts.find((font) => font.key === key)?.family ||
    "system-ui, sans-serif"
  );
}
// Load only the selected font in the storefront document. Picker previews need just “Ag”.
export function loadStorefrontFont(
  doc: Document,
  key?: string,
  preview = false,
) {
  const font = storefrontFonts.find((item) => item.key === key);
  if (!font || ["system", "arial", "georgia"].includes(font.key)) return;
  const id = `eyn-font-${font.key}${preview ? "-preview" : ""}`;
  if (doc.getElementById(id)) return;
  const link = doc.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.name)}:wght@400;500;600;700&display=swap${preview ? "&text=Ag" : ""}`;
  doc.head.appendChild(link);
}
