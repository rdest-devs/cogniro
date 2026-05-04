# cogniro

Quiz app for WI

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

- **Node.js 24** — With nvm: `nvm use` (run `nvm install` if needed)
- **pnpm 10+** — `corepack enable` then `corepack prepare pnpm@latest --activate`
- **GitHub CLI** — optional, for skills; `brew install gh` then `gh auth login`
- **CodeRabbit CLI** — optional, for skills; `brew install coderabbit` then `coderabbit auth login`

### Quick commands

Run these from the **repository root** (monorepo).

| Command                       | Description                                           |
| ----------------------------- | ----------------------------------------------------- |
| `pnpm -C frontend dev`        | Run the local development server.                     |
| `pnpm -C frontend build`      | Build the static export into `frontend/out/`.         |
| `pnpm -C frontend start`      | Serve the exported `frontend/out/` directory locally. |
| `pnpm -C frontend lint`       | Run ESLint and fail on any warnings or errors.        |
| `pnpm -C frontend lint:fix`   | Run ESLint and automatically fix fixable issues.      |
| `pnpm -C frontend format`     | Check formatting with Prettier.                       |
| `pnpm -C frontend format:fix` | Rewrite files to match Prettier formatting.           |
| `pnpm -C frontend type-check` | Run Next typegen and TypeScript type checking.        |
| `pnpm -C frontend validate`   | Run lint, format check, and type-check together.      |

First, install packages from the repo root:

```bash
pnpm install
```

Second, run the development server from the repo root:

```bash
pnpm -C frontend dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment variables

For admin API integration (Quiz Editor), configure:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

If not provided, frontend falls back to `NEXT_PUBLIC_BACKEND_URL` (or `http://127.0.0.1:8000`).

You can start editing the page by modifying `frontend/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Static export & images

This app builds as a fully static site (`output: 'export'`) so it can be hosted on any plain HTTP server (Apache, Nginx, GitHub Pages, S3, etc.) without a Node runtime. Image optimization is handled at build time by [`next-image-export-optimizer`](https://github.com/Niels-IO/next-image-export-optimizer), which generates a responsive `srcset` (resized + WEBP-converted variants) and tiny blurred placeholders into `frontend/out/nextImageExportOptimizer/`.

`pnpm -C frontend build` runs `next build` and then the optimizer in sequence. The optimizer hashes source images, so unchanged images are skipped on subsequent builds.

### Using images in components

**Always import `ExportedImage` instead of `next/image`:**

```tsx
import ExportedImage from 'next-image-export-optimizer';
```

#### 1. Static import (recommended)

Place the file anywhere in the repo and import it. The bundler picks it up, the optimizer processes it, and the component receives the intrinsic width/height automatically — no `width`/`height` props needed.

```tsx
import ExportedImage from 'next-image-export-optimizer';
import heroImage from '@/assets/hero.jpg';

export function Hero() {
  return <ExportedImage src={heroImage} alt="Hero illustration" priority />;
}
```

Use this form whenever possible — it gives the browser correct dimensions, avoids layout shift, and lets the optimizer pick the best size from `deviceSizes`.

#### 2. Path string

For images that must be referenced by URL (e.g. dynamic filenames), put the file in `frontend/public/images/` (the path configured by `nextImageExportOptimizer_imageFolderPath`) and pass an explicit `width` and `height`:

```tsx
import ExportedImage from 'next-image-export-optimizer';

<ExportedImage
  src="images/avatar.png"
  alt="User avatar"
  width={128}
  height={128}
/>;
```

Note: with this form the optimizer duplicates the source image for every entry in `deviceSizes` larger than the original, so prefer static imports for large hero/banner images.

#### 3. Remote images

To optimize images hosted elsewhere at build time, list every URL in `frontend/remoteOptimizedImages.js` (next to `frontend/next.config.ts`):

```js
// remoteOptimizedImages.js
module.exports = ['https://example.com/banner.jpg'];
```

Then use the URL as `src`:

```tsx
<ExportedImage src="https://example.com/banner.jpg" alt="Banner" width={1200} height={600} />
```

The optimizer downloads each URL during `pnpm -C frontend build` and bakes the optimized variants into the static export. Adjust `nextImageExportOptimizer_remoteImageCacheTTL` in [`frontend/next.config.ts`](./next.config.ts) if you want the local cache to expire (default `0` = always re-fetch).

### Common props

| Prop          | When to use                                                                              |
| ------------- | ---------------------------------------------------------------------------------------- |
| `priority`    | Above-the-fold images (LCP candidates). Disables lazy loading.                           |
| `sizes`       | Tells the browser which `srcset` entry to pick. Required for `fill` or responsive sizes. |
| `placeholder` | Defaults to `"blur"` (auto-generated). Pass `"empty"` to skip the blur preview.          |
| `unoptimized` | Emit the original file untouched — escape hatch for SVGs or pre-optimized assets.        |

### Deploying to Apache / GitHub Pages

After `pnpm -C frontend build`, upload the contents of `frontend/out/` to the document root. With `trailingSlash: true` the optimizer emits each route as `route/index.html`, so directory-based servers resolve URLs without rewrite rules.

If you deploy under a sub-path (e.g. `username.github.io/cogniro/`), set `basePath: '/cogniro'` in [`frontend/next.config.ts`](./next.config.ts) **and** pass `basePath="/cogniro"` to every `<ExportedImage />` instance.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
