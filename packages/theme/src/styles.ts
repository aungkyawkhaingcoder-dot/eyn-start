export const storefrontStyles = [
  {
    id: "liquid-glass",
    name: "Liquid Glass",
    description: "Clear glass with luminous edges and fluid reflections.",
  },
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
] as const;
export function designStyle(value?: string) {
  return storefrontStyles.find((style) => style.id === value)?.id || "flat";
}
