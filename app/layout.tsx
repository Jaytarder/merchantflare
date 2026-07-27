import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MerchantFlare | Mercury Command Center",
  description: "AI commerce operations for modern marketplace teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
