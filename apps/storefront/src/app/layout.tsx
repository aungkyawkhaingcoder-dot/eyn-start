import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";
export const metadata: Metadata = {title: "EYN Storefront"};
export default function Layout({children}: {children:React.ReactNode}) {return <html lang="en"><body><Providers>{children}</Providers></body></html>;}
