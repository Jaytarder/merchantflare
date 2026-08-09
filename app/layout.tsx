import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./components/app-shell.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://merchantflare.com"),
  title: {
    default: "MerchantFlare | Commerce Intelligence Platform",
    template: "%s | MerchantFlare",
  },
  description:
    "MerchantFlare connects catalog, advertising, demand, compliance, creative, and executive intelligence through Mercury.",
  applicationName: "MerchantFlare",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/brand/merchantflare-favicon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    shortcut: "/brand/merchantflare-favicon.svg",
    apple: [
      {
        url: "/brand/merchantflare-app-icon.svg",
        type: "image/svg+xml",
        sizes: "1024x1024",
      },
    ],
  },
  openGraph: {
    type: "website",
    url: "https://merchantflare.com",
    siteName: "MerchantFlare",
    title: "MerchantFlare | Commerce Intelligence Platform",
    description:
      "Commerce intelligence for catalog, advertising, demand, compliance, creative, and executive operations.",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("merchantflare-appearance");if(t==="light"||t==="dark")document.documentElement.dataset.mfTheme=t}catch(e){}` }} />
        <link
          rel="mask-icon"
          href="/brand/merchantflare-mask-icon.svg"
          color="#FF6A1A"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
