export const storefrontStyles = [
  {
    id: "glassmorphism",
    name: "Glassmorphism",
    description: "Translucent panels with a soft color glow.",
  },
  {
    id: "neumorphism",
    name: "Neumorphism",
    description: "Soft surfaces with raised and inset details.",
  },
  {
    id: "claymorphism",
    name: "Claymorphism",
    description: "Cushioned cards with rounded, sculpted depth.",
  },
  {
    id: "flat",
    name: "Flat Design",
    description: "Crisp shapes and clear, direct browsing.",
  },
  {
    id: "spatial",
    name: "Spatial UI",
    description: "Layered composition with room for each product.",
  },
] as const;
export function designStyle(value?: string) {
  return storefrontStyles.find((style) => style.id === value)?.id || "flat";
}
