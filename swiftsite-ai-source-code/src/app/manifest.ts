import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/chat",
    name: "SwiftSite Assistant",
    short_name: "SwiftSite",
    description: "Chat, create and build in your own private SwiftSite workspace.",
    start_url: "/chat?source=app",
    scope: "/",
    display: "standalone",
    background_color: "#eff6e9",
    theme_color: "#376f28",
    orientation: "any",
    icons: [
      { src: "/icons/swiftsite-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/swiftsite-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
