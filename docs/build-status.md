# Build status

Checked November 21, 2026, Africa/Nairobi. The application is implemented; article drafting has not started.

## Completed

- One-screen Next.js 16.4.6, React 19.3, shadcn/ui comparison, with one Node.js processing endpoint and no database.
- Copied only the required Cloudinary configuration into ignored `.env.local` with owner-only permissions. Actual values are absent from tracked source and frontend props.
- Validated bounded JPEG/PNG intake, authenticated upload, server-owned incoming `force_strip`, persisted readback, protected retrieval, and fail-closed release of the exact checked bytes.
- Prepared 30 synthetic offline inputs with independently recorded ExifTool expectations: 20 GPS-bearing cases, eight no-GPS controls, two rejected formats/corruptions. These are inputs, not 30 live results.
- Two real Cloudinary cases passed: ordinary JPEG and EXIF orientation 6. Both stored outputs have zero detected GPS fields, independently checked with ExifTool. The rotated output also matches a locally normalized visual reference: mean absolute RGB error 0.2405/255 at 48 × 72 sampling, below the development threshold of 3/255. This is a limited fixture check, not a general visual-quality metric.
- Saved the actual ordinary result in `public/demo/`, with a checksum and source/output metadata. Default page load needs no account call or fresh upload. The publicly included input is synthetic and has fictitious coordinates.
- 53 unit/fixture checks, eight local browser checks, lint, type check, and production build passed. The browser checks include refresh, decoded images, no overflow, no processing/account requests on saved load, exact download hash, corrupt-download blocking, and invalid-file handling.
- GitHub repository created and pushed with commits per completed stage. Vercel project linked; production keeps live upload disabled.

## Remaining

- Verify the final public deployment's health response, saved page, image bytes, download checksum, and disabled upload endpoint.
- Write the article later from the evidence, then conduct its editorial/media review. Do not describe the offline fixture matrix as a completed live benchmark.
- Before enabling anonymous uploads, add appropriate identity, quotas/rate limits, monitoring, and retention/deletion controls. The demo does not claim anonymity, removal of visible information, or legal compliance.
