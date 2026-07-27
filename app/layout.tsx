import type { Metadata } from "next";
import "./globals.css";
import "./components/app-shell.css";

export const metadata: Metadata = {
  title: "MerchantFlare | Mercury Command Center",
  description: "AI commerce operations for modern marketplace teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
