import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "EYN — Platform console",
  description: "Everything you need to build your business.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
