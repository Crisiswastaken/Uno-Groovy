import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Serve images as their raw files (no /_next/image transform). The loading
  // splash preloads these exact URLs, so <Image> renders straight from cache —
  // each asset is downloaded exactly once and reused. See src/lib/preload.ts.
  images: {
    unoptimized: true,
  },
  // Pin the workspace root so a stray lockfile in a parent dir isn't picked up.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
