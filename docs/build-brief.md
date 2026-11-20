# Build brief: Cloudinary Photo Privacy

## Goal

Remove embedded GPS information from an uploaded photo and let the visitor download only the exact image bytes that passed verification. Keep the application to one screen, one processing endpoint, and no database.

Article: **Remove GPS Metadata From Uploaded Photos With Next.js and Cloudinary**. Requested publication: November 25, 2026. This is a build plan, not a claim that the benchmark or app already passes.

## The screen

Start with a saved synthetic example so the deployed demo is useful without new uploads. Show a compact **Before / After** comparison, the GPS-field names found or absent, format, dimensions, and byte size. Never display real coordinates. Offer **Download checked image** and **Choose another photo**. Use shadcn Card, Button, Input/Field, Table, Badge, and Alert; stack the comparison on mobile. No dashboard, map, account system, gallery, or AI chat.

When local uploads are enabled, accept one JPEG or PNG under 3,000,000 bytes. No HEIC, GIF, SVG, remote URL import, bulk upload, or browser-to-Cloudinary unsigned upload in the first version.

## One verified path

```text
Photo bytes in browser
  -> bounded Next.js Node route
  -> inspect input in memory
  -> authenticated Cloudinary upload with incoming force_strip
  -> persisted asset readback and protected original download
  -> inspect the stored file's bytes
  -> return the checked bytes and a small report
  -> preview and download those same bytes
```

The unprocessed input is not saved in the public folder or uploaded as a separate public original. Cloudinary owns the stripping step and stores the processed asset. The server owns file validation and release. Signed retrieval URLs and API credentials stay server-only.

The documented incoming flag is `force_strip`, not `strip_profile` (which concerns ICC profiles). Cloudinary normally uses EXIF orientation; do not invent `angle: "auto"`. Verify orientation with the fixtures. A clean delivery derivative alone does not establish that the stored original is clean. [Incoming metadata stripping](https://cloudinary.com/documentation/transformation_reference_fl_flag_force_strip.md), [incoming transformations](https://cloudinary.com/documentation/eager_and_incoming_transformations#incoming_transformations), [orientation](https://cloudinary.com/documentation/transformation_reference_a_angle.md).

## Small stack and boundaries

Use current stable Next.js App Router, TypeScript, Tailwind, shadcn/ui, the Cloudinary Node SDK v2, and a JavaScript metadata reader. Sharp validates actual raster decoding/dimensions; it does not do the GPS removal. Keep ExifTool in offline independent checks instead of adding a second production service. Browser previews use local/data URLs for the exact inspected bytes, not a new optimizer rendition.

Maximum input and output are 3,000,000 bytes each; bound multipart overhead and all upstream reads. A base64 result stays below Vercel's current 4.5 MB payload ceiling. Reject oversized/malformed/animated images, parser failures, remaining tested GPS fields, inconsistent asset identity, and unexpected normalized dimensions. Do not show Download on an uncertain result. [Function payload limit](https://vercel.com/docs/functions/limitations#request-body-size).

Keep live upload disabled on the public deployment. Saved fixtures and their reports are genuine captured results, clearly dated. They must not trigger Cloudinary calls on page load. Local opt-in enables the complete path with the same restrictions. Standard Cloudinary usage applies; no paid AI API, beta feature, new CMS, database, or queue is needed.

## Checkpoints and commits

1. Foundation: scaffold, private configuration, this brief. Commit.
2. Pipeline: validation, incoming stripping, readback, independent inspection, failure tests. Commit.
3. Demo: responsive comparison and actual saved fixture evidence. Commit.
4. Ship: concise README, lint/typecheck/tests/build, GitHub push, Vercel deployment, public smoke checks. Commit deployment references.

Keep the 30-fixture article benchmark separate from the minimum demo. Use only synthetic images/fictitious location values. Include GPS EXIF and XMP cases, no-GPS controls, orientation variants, corrupted and unsupported files. Measure residual tested fields and orientation against an independent oracle; do not invent completed counts or claim all metadata, anonymity, legal compliance, or removal of visible addresses/faces. `DigitalSourceType` may survive stripping by design.

## Documentation evidence

Record exact versions, fixed upload options, persisted readbacks, source/output hashes, parser scope, tests, failures, and fixture provenance as work completes. Write the article from those results later: source/assets first, literal Markdown body, short brief, conclusion before FAQs, no deployment chapter. Screenshots must hide secrets; every article video must be an embed. Public publishing and form submission remain separate from deploying the requested demo.
