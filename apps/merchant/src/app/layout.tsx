import type { Metadata } from "next";
import { Providers } from "../components/Providers";
import "./globals.css";
export const metadata: Metadata = {
  title: "EYN — Everything you need",
  description: "Build a home for your business with EYN.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
