# Photo Privacy

A small Next.js application that uses Cloudinary to remove embedded GPS metadata from JPEG and PNG photos, then checks the stored image before making it available to download.

[Live demo](https://cloudinary-photo-privacy.vercel.app/) · [Source code](https://github.com/musebe/cloudinary-photo-privacy)

The page shows the original and checked output side by side, with the detected GPS field names, dimensions, and file sizes. It does not show coordinates. A saved synthetic example makes the public demo usable without uploading a personal photo.

## How it works

1. Validate one photo and inspect its metadata in memory.
2. Upload through the server to Cloudinary with authenticated delivery and the incoming `force_strip` transformation.
3. Read the stored asset back and download its original bytes on the server.
4. Inspect those bytes again. Return a download only if the checks pass.

The browser downloads the same bytes that were checked. An optimized preview alone is not evidence that the stored original is clean. Credentials and signed retrieval URLs never reach browser code. The unprocessed input is not stored as a separate public Cloudinary original.

## Run locally

Requires Node.js 24 and pnpm 10.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open the URL printed by Next.js. The included saved example requires no Cloudinary credentials or new uploads. To process your own photos locally, fill the three Cloudinary values in `.env.local` and set `ENABLE_LIVE_UPLOADS=true`. Restart the server after changing environment variables.

| Variable | Purpose |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary product environment |
| `CLOUDINARY_API_KEY` | Server SDK authentication |
| `CLOUDINARY_API_SECRET` | Server-only secret; never use a `NEXT_PUBLIC_` prefix |
| `CLOUDINARY_ASSET_FOLDER` | Media Library destination for processed assets |
| `ENABLE_LIVE_UPLOADS` | Explicit opt-in; disabled by default |

Never commit `.env.local`. Use a development environment and synthetic photos when testing. Standard Cloudinary storage, upload, delivery, and transformation usage applies; no paid AI provider is used.

## Boundaries

- One JPEG or PNG at a time, up to 3,000,000 bytes and 16 megapixels. Malformed, animated, unsupported, or uncertain inputs are rejected.
- The result describes the GPS fields covered by the parser and test fixtures, not a guarantee of anonymity or removal of every possible metadata field. Cloudinary may preserve `DigitalSourceType` intentionally.
- Removing embedded coordinates does not hide faces, signs, addresses, landmarks, or other information visible in the photo.
- The public demo keeps live upload disabled to avoid unbounded account usage. Before enabling public uploads, add authentication, durable quotas/rate limits, monitoring, and a retention/deletion policy.
- Processed assets remain authenticated in the configured Cloudinary environment. Closing the page does not delete them. The app has no automatic bulk-deletion operation.
- Preview and report state stay in browser memory. There is no database, background queue, account system, or upload gallery.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

`pnpm fixtures` recreates the synthetic input matrix using Sharp and ExifTool. ExifTool is an offline development tool, not a production service. The matrix is not a completed live Cloudinary benchmark; live results must be recorded separately.

Browser checks use an installed Google Chrome and a running application. Start `pnpm dev` first, or set `TEST_BASE_URL` to the running instance you want to check. The browser tests do not upload photos to Cloudinary.

The included saved example was produced through the real Cloudinary pipeline, not by stripping metadata locally. Its input contains seven detected GPS fields; the stored, downloaded output contains zero. ExifTool independently checks the result. A second live EXIF-orientation-6 case normalized from 1200 × 800 to 800 × 1200. These two checks are not a 30-image live benchmark. See [evidence](docs/evidence/).

## Project map

- `src/app/`: one demo page and Node.js API handlers.
- `src/lib/privacy/`: inspection, Cloudinary boundary, and fail-closed pipeline.
- `src/components/`: the comparison screen and shadcn/ui components.
- `public/demo/`: intentionally public synthetic before/after example and captured report.
- `fixtures/`: synthetic test inputs and expectations.
- `docs/build-brief.md`: scope, decisions, and build checkpoints.
- `docs/article.md`: the source-linked tutorial, embedded walkthrough, and verified results.
- `docs/article-media.json`: public Cloudinary article assets and integrity checks; capture notes and a video transcript sit beside it.

## References

[Cloudinary incoming transformations](https://cloudinary.com/documentation/eager_and_incoming_transformations#incoming_transformations), [force_strip](https://cloudinary.com/documentation/transformation_reference_fl_flag_force_strip.md), [media access control](https://cloudinary.com/documentation/control_access_to_media), [exifr](https://github.com/MikeKovarik/exifr), and [Next.js](https://nextjs.org/docs).
