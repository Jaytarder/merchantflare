import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MerchantFlare",
    short_name: "MerchantFlare",
    description:
      "Commerce Intelligence Platform powered by the Mercury Commerce Intelligence Engine.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0B0B0D",
    theme_color: "#0B0B0D",
    icons: [
      {
        src: "/brand/merchantflare-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/merchantflare-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
