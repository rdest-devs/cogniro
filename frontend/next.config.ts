import type { NextConfig } from 'next';

// Allow /_next/* HMR resources from the LAN IP when using pnpm dev on a local network.
// Uses NEXT_PUBLIC_ALLOWED_DEV_ORIGIN first, then falls back to NEXT_PUBLIC_BACKEND_URL.
function devOrigins(): string[] {
  const explicit = process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGIN;
  if (explicit) {
    try {
      return [new URL(explicit).hostname];
    } catch {
      console.warn(
        '[next.config] Ignoring invalid NEXT_PUBLIC_ALLOWED_DEV_ORIGIN value; expected a URL.',
      );
      return [];
    }
  }
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!raw) return [];
  try {
    const { hostname } = new URL(raw);
    return hostname && hostname !== 'localhost' && hostname !== '127.0.0.1'
      ? [hostname]
      : [];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',

  // Optional: Change links `/me` -> `/me/` and emit `/me.html` -> `/me/index.html`
  trailingSlash: true,

  // Image optimization
  images: {
    loader: 'custom',
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  allowedDevOrigins: devOrigins(),
  transpilePackages: ['next-image-export-optimizer'],
  env: {
    nextImageExportOptimizer_imageFolderPath: 'public/images',
    nextImageExportOptimizer_exportFolderPath: 'out',
    nextImageExportOptimizer_quality: '75',
    nextImageExportOptimizer_storePicturesInWEBP: 'true',
    nextImageExportOptimizer_exportFolderName: 'nextImageExportOptimizer',
    nextImageExportOptimizer_generateAndUseBlurImages: 'true',
    nextImageExportOptimizer_remoteImageCacheTTL: '0',
  },
};

export default nextConfig;
