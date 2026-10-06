import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "EYN — Build your business",
  description: "Everything you need to build your business.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
