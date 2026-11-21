**Source and assets:** [Live demo](https://cloudinary-photo-privacy.vercel.app/) · [GitHub repository](https://github.com/musebe/cloudinary-photo-privacy) · [Captured evidence](https://github.com/musebe/cloudinary-photo-privacy/tree/main/docs/evidence) · [Article media](./article-media.json) · [Article brief](./article-handoff.md)

**Cloudinary media folder:** `article-screenshots/cloudinary-photo-privacy`.

# Remove GPS Metadata From Uploaded Photos With Next.js and Cloudinary

To remove embedded GPS metadata from uploaded photos, apply Cloudinary's `force_strip` flag as an incoming transformation, retrieve the stored image on your server, and inspect its bytes before offering a download. Return the file you inspected, not a separately optimized preview. Incoming transformations change the image before Cloudinary stores it. [Cloudinary incoming transformations](https://cloudinary.com/documentation/eager_and_incoming_transformations#incoming_transformations).

This tutorial implements that workflow in Next.js. You will validate a JPEG or PNG, use authenticated Cloudinary storage, check the stored result, and show a before-and-after comparison with shadcn/ui. The application removes embedded metadata, not information visible in the picture, and its checks do not guarantee anonymity.

## Why uploaded photos can reveal a location

A photo of a used bicycle can reveal more than its condition. If the camera saved location information, the file may contain coordinates for the seller's home even when the address is absent from the picture.

Exchangeable Image File Format (EXIF) metadata can include camera settings, orientation, and Global Positioning System (GPS) fields. Other embedded metadata containers, including Extensible Metadata Platform (XMP), can carry location-related information too. Renaming the file does not remove these fields.

Cloudinary recommends stripping embedded metadata in user-generated-content upload workflows when privacy requires it. Our additional requirement is verification: do not release a download merely because an upload succeeded. [Cloudinary UGC upload guidance](https://cloudinary.com/documentation/user_generated_content_upload#strip_metadata).

## Try the saved before-and-after demo

Open [Photo Privacy](https://cloudinary-photo-privacy.vercel.app/). The saved synthetic example loads automatically. Its input has seven detected GPS fields; the Cloudinary-processed output has zero detected fields under the implemented checks.

Expand **See the field names and download checksum**, then select **Download checked image**. The browser checks the downloaded bytes against the recorded SHA-256 checksum before saving them.

![Photo Privacy saved comparison showing seven GPS fields before Cloudinary processing and no tested GPS fields after processing.](https://res.cloudinary.com/demo-article-projects/image/upload/v1795246680/article-screenshots/cloudinary-photo-privacy/01-before-after-2026-11-21.png)

*The same synthetic scene before and after the real Cloudinary pipeline. Counts describe detected metadata, not visible differences.*

The public demo serves a captured real result without uploading another photo or making another Cloudinary processing request. New uploads are disabled publicly to bound account usage. Local configuration enables the full upload path. The included input has fictitious coordinates and contains no customer data.

<video controls playsinline preload="metadata" crossorigin="anonymous" width="1920" height="1080" poster="https://res.cloudinary.com/demo-article-projects/image/upload/v1795246687/article-screenshots/cloudinary-photo-privacy/05-walkthrough-poster-2026-11-21-r3.png" aria-label="Photo Privacy saved-result and Cloudinary code walkthrough" style="width:100%;height:auto">
  <source src="https://res.cloudinary.com/demo-article-projects/video/upload/v1795246691/article-screenshots/cloudinary-photo-privacy/06-photo-privacy-walkthrough-2026-11-21-r3.mp4" type="video/mp4">
  <track kind="captions" src="https://res.cloudinary.com/demo-article-projects/raw/upload/v1795246693/article-screenshots/cloudinary-photo-privacy/07-photo-privacy-walkthrough.en.vtt" srclang="en" label="English" default>
  Your browser does not support embedded video. Read the linked walkthrough transcript below.
</video>

*The 50-second walkthrough shows the saved result, real upload/readback code, and an independent file check. It includes quiet instrumental music, no spoken narration, and no new photo upload. [Read the walkthrough transcript](./video-transcript.md).*

## How the verified photo workflow works

Cloudinary performs metadata stripping and stores the processed image. Next.js validates the input, retrieves the stored file, and decides whether to release it.

```text
Browser photo
  → bounded Next.js Node.js route
  → input decode and metadata inspection
  → authenticated Cloudinary upload with incoming force_strip
  → stored-asset readback and protected original download
  → output inspection and checksum
  → preview and download of those same checked bytes
```

A delivery transformation can strip metadata from a generated image while leaving the stored original unchanged. That is useful for ordinary delivery, but it does not prove the stored original meets this application's policy. Incoming transformations address storage; inspecting the downloaded stored original verifies the result. [Cloudinary metadata stripping](https://cloudinary.com/documentation/image_optimization#metadata_stripping).

## Prerequisites and local setup

Use Node.js 24, pnpm 10, and a Cloudinary product environment. The tested project uses Next.js 16.4.6, React 19.3, the Cloudinary Node.js SDK v2, exifr for metadata inspection, and Sharp for raster validation. No AI model, beta API, or paid AI add-on is needed. Standard Cloudinary account usage and limits still apply.

Clone the implementation rather than rebuilding its supporting validators from partial excerpts:

```bash
git clone https://github.com/musebe/cloudinary-photo-privacy.git
cd cloudinary-photo-privacy
pnpm install --frozen-lockfile
cp .env.example .env.local
```

In Cloudinary, open **Settings → API Keys** for the intended product environment. Fill these server-only variables in the ignored `.env.local`:

```dotenv
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_ASSET_FOLDER=article-demos/photo-privacy
ENABLE_LIVE_UPLOADS=true
```

Run `pnpm dev` and open the printed local URL. Restart the server after environment changes. Never add `NEXT_PUBLIC_` to the API secret or include credentials in screenshots. Leave live uploads disabled when you only need the saved example. [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables).

`CLOUDINARY_ASSET_FOLDER` organizes assets in dynamic-folder environments. In fixed-folder environments, the public-ID prefix determines the folder instead; this implementation uses `photo-privacy/`. Folder organization and restricted delivery are separate settings. [Cloudinary folder modes](https://cloudinary.com/documentation/folder_modes).

The excerpts below highlight the important boundaries; their linked source files contain the complete implementations.

## Validate the photo and detect GPS metadata

Check the actual bytes, not only the filename or browser-declared MIME type. This demo accepts one JPEG or PNG up to 3,000,000 bytes and 16 megapixels. Those are application limits, not Cloudinary platform limits.

The [request reader](https://github.com/musebe/cloudinary-photo-privacy/blob/main/src/lib/privacy/request.ts) bounds the body while reading it, validates multipart structure, and rejects extra fields or files. The [container validator](https://github.com/musebe/cloudinary-photo-privacy/blob/main/src/lib/privacy/containers.ts) checks supported structures and rejects unsupported or trailing content.

Sharp then verifies that the raster actually decodes:

```typescript
const decoder = sharp(bytes, {
  failOn: "warning",
  limitInputPixels: MAX_PIXELS,
});
const metadata = await decoder.metadata();
if (!metadata.width || !metadata.height || metadata.format !== format) {
  throw new Error("invalid dimensions");
}
if ((metadata.pages ?? 1) !== 1) throw new Error("multiple frames");
await decoder.raw().toBuffer();
```

Sharp does not remove GPS metadata in this pipeline. It validates the input. The inspection function uses exifr with strict error handling and supported EXIF, GPS, XMP, and IPTC parsing, supplemented by container checks. It returns field names and counts, never coordinate values. [Complete inspector](https://github.com/musebe/cloudinary-photo-privacy/blob/main/src/lib/privacy/inspect.ts).

An unreadable metadata block is an inspection failure, not evidence that the image has no GPS fields. Keep that distinction in the error handling and interface.

## Strip embedded metadata during the Cloudinary upload

Set the transformation on the server-owned upload request. The following excerpt comes from the Cloudinary storage adapter:

```typescript
cloudinary.uploader.upload_stream({
  resource_type: "image", type: "authenticated",
  overwrite: false, backup: false,
  public_id: `${PHOTO_NAMESPACE}${randomUUID()}`,
  asset_folder: process.env.CLOUDINARY_ASSET_FOLDER
    || "article-demos/photo-privacy",
  transformation: { flags: "force_strip" },
  tags: ["photo-privacy-demo"], timeout: 15_000,
}, (error, response) => error || !response
  ? reject(error || new Error("No asset"))
  : resolve(response)).end(bytes);
```

`force_strip` is the documented incoming-transformation flag for clearing embedded metadata. It is not selective GPS-only removal: other EXIF, IPTC, and XMP data are affected. Cloudinary documents an exception for `DigitalSourceType`, so do not describe this as removing every possible metadata field. `strip_profile`, which concerns color profiles, is not a substitute. [Cloudinary force_strip](https://cloudinary.com/documentation/transformation_reference#fl_force_strip).

The `authenticated` delivery type restricts both the original and derived assets. It does not replace application authentication. Keep retrieval URLs and Cloudinary credentials on the server. The unprocessed input is not uploaded as a separate public original. [Media access methods](https://cloudinary.com/documentation/control_access_to_media#authenticated_media_assets), [complete storage adapter](https://github.com/musebe/cloudinary-photo-privacy/blob/main/src/lib/privacy/cloudinary-store.ts).

## Read back and verify the stored image

Read the persisted asset using its immutable asset ID. Validate the returned identity, namespace, delivery type, format, size, and dimensions before downloading the original through a short-lived server-only URL. The Admin API is rate-limited, so budget for these reads. [Cloudinary asset-ID readback](https://cloudinary.com/documentation/admin_api#get_resources_by_asset_ids).

The pipeline makes the sequence explicit:

```typescript
const before = await inspectPhoto(bytes);
const uploaded = await store.upload(bytes);
const stored = await store.readback(uploaded);
if (stored.assetId !== uploaded.assetId
  || stored.publicId !== uploaded.publicId
  || stored.bytes <= 0 || stored.bytes > MAX_PHOTO_BYTES) {
  throw new PrivacyError("readback_mismatch",
    "The stored asset could not be verified. No download was released.", 502);
}
const cleanBytes = await store.download(stored);
const after = await inspectPhoto(cleanBytes);
assertOutput(before, after, stored);
```

The [Cloudinary adapter](https://github.com/musebe/cloudinary-photo-privacy/blob/main/src/lib/privacy/cloudinary-store.ts) uses `resources_by_asset_ids()` for readback and `private_download_url()` for retrieval. It applies timeouts, forbids redirects, and bounds downloaded bytes. The URL is used server-side and is not returned to the browser.

`assertOutput()` rejects residual detected GPS fields, unexpected format or dimensions, and disagreement between asset properties and the downloaded image. It also accounts for EXIF orientations that swap width and height. Stripping an orientation tag without handling orientation can leave an incorrectly displayed image; testing the stored output matters.

This is fail-closed behavior: when inspection or retrieval is uncertain, no download is released. See the [complete pipeline](https://github.com/musebe/cloudinary-photo-privacy/blob/main/src/lib/privacy/pipeline.ts).

## Preview and download the exact checked file

Bind the download to the output inspection. The server computes a SHA-256 checksum over `cleanBytes` and returns those bytes with the report. The saved example instead references the bundled captured file and its matching checksum.

Before creating a download, the client checks the file again:

```typescript
const response = await fetch(result.image.src);
if (!response.ok) {
  throw new Error("The checked image is unavailable. Please try again.");
}
const bytes = await response.arrayBuffer();
const digest = await crypto.subtle.digest("SHA-256", bytes);
const hash = Array.from(new Uint8Array(digest),
  byte => byte.toString(16).padStart(2, "0")).join("");
if (hash !== result.verification.sha256) {
  throw new Error("The download did not match the checked image. No file was saved.");
}
```

A matching checksum establishes that the bytes match the inspected result. It does not independently establish privacy; the metadata inspection supplies that evidence.

The shadcn/ui screen shows before/after counts, dimensions, orientation, and an expandable field list. It uses the exact local or returned bytes for previews, avoiding an image optimizer that would create another rendition. Selecting a new file clears the previous result, so an old success state cannot approve a different photo. [Complete comparison and download component](https://github.com/musebe/cloudinary-photo-privacy/blob/main/src/components/photo-privacy-demo.tsx).

![Stored-image verification report with GPS field names, dimensions, orientation and download checksum; no coordinate values are displayed.](https://res.cloudinary.com/demo-article-projects/image/upload/v1795246681/article-screenshots/cloudinary-photo-privacy/02-checked-report-2026-11-21.png)

*The report identifies the checked output. The checksum binds the download to that file; it is not itself a privacy test.*

## Check the results and failure cases

Two live synthetic JPEG cases passed through the actual Next.js route, Cloudinary upload, persisted readback, and protected download on November 21, 2026, Africa/Nairobi. ExifTool 13.64 independently found no residual GPS fields in either output.

| Live input | Detected GPS fields before → after | Stored output dimensions | Output size |
| --- | --- | --- | --- |
| JPEG, EXIF orientation 1 | 7 → 0 | 1200 × 800 | 32,421 bytes |
| JPEG, EXIF orientation 6 | 7 → 0 | 800 × 1200 | 35,590 bytes |

Both inputs were 1200 × 800 with 43,380 bytes. The rotated case verified normalized dimensions and an orientation reference, not universal visual fidelity or lossless encoding. The size difference is an observation, not a metadata-only savings measurement.

![Actual terminal output from ExifTool 13.64 showing seven EXIF GPS fields in the synthetic input and zero in the checked image, with a matching SHA-256 checksum.](https://res.cloudinary.com/demo-article-projects/image/upload/v1795246685/article-screenshots/cloudinary-photo-privacy/04-independent-check-2026-11-21-r2.png)

*An independent check of the saved input and output. EXIF GPS tags are counted here; ExifTool's derived composite fields are not treated as additional stored tags.*

The repository separates evidence by what it proves:

| Evidence | What was checked | What it does not establish |
| --- | --- | --- |
| Two live Cloudinary JPEG runs | Stored bytes, detected GPS removal, orientation, independent readback | Broad format coverage or a production success rate |
| 30 offline synthetic fixtures | 20 GPS-bearing inputs, eight no-GPS controls, two rejected inputs | 30 live Cloudinary results; live PNG or XMP stripping |
| 53 automated tests | Inspection, boundaries, rejection paths, and saved-file integrity | A complete security audit |
| Desktop/mobile browser checks | Saved load and refresh, decoded images, exact download, corrupted-file blocking | Every browser or accessibility configuration |

Run `pnpm test` for the automated suite. With the app running, use `pnpm test:e2e` for browser checks. See the [fixture manifest](https://github.com/musebe/cloudinary-photo-privacy/blob/main/fixtures/manifest.json), [test sources](https://github.com/musebe/cloudinary-photo-privacy/tree/main/tests), and [recorded evidence](https://github.com/musebe/cloudinary-photo-privacy/tree/main/docs/evidence).

Expected outcomes are explicit:

| Condition | Outcome |
| --- | --- |
| Input decodes and has no tested GPS fields | Report no GPS detected; do not invent a removal claim |
| Input is malformed, oversized, or unsupported | Reject before uploading |
| Cloudinary readback fails or identifies a different asset | Withhold output |
| Detected GPS remains or normalized dimensions disagree | Withhold output |
| Download checksum differs | Save no file |

## Limitations: what GPS removal does not protect

Removing embedded GPS fields does not hide a face, house number, landmark, reflection, or address visible in the picture. This is a technical control for supported metadata, not an anonymity or legal-compliance guarantee.

The input leaves the device in the live workflow. If photos must never leave the device before cleaning, use a local-only approach and evaluate its format and orientation handling. Cloudinary's [metadata-removal tool](https://cloudinary.com/tools/remove-metadata-from-image) is another starting point for one-off use; this article addresses an application-controlled storage and verification workflow.

Authenticated processed assets remain in Cloudinary after the page closes. Set a retention and deletion policy, including cleanup of rejected outputs. Before exposing live uploads publicly, add appropriate identity checks, durable quotas or rate limits, monitoring, and abuse controls. A same-origin request check alone is not authentication.

Test more cameras, formats, metadata containers, and orientation cases before broadening the claim. Preserve source-attribution information when your policy requires it, and do not assume this stripping workflow is appropriate for every licensing or provenance requirement.

## Conclusion

Cloudinary removes embedded metadata during ingestion; Next.js verifies the stored file and binds its download to the inspected bytes. That division makes the result testable: not merely an upload success message, but a checked file with explainable failure conditions.

Start with the saved demo, inspect the linked evidence, then run a synthetic local upload before accepting personal photos.

## Frequently asked questions

### How do I remove GPS metadata from a photo in Next.js?

Validate the input in a Node.js Route Handler, upload it to Cloudinary with incoming `force_strip`, retrieve the stored original on the server, and inspect it for supported GPS fields before returning a download.

### Does a Cloudinary delivery transformation clean the stored original?

No. Delivery transformations produce a derived image; they do not replace the stored original. Use an incoming transformation when the stored asset itself must be processed, then verify its bytes. [Incoming transformations](https://cloudinary.com/documentation/eager_and_incoming_transformations#incoming_transformations).

### Does force_strip remove only GPS or affect orientation?

It removes broader embedded metadata, not GPS alone. Test normalized dimensions and visual orientation rather than assuming deleting an EXIF tag preserves display. This project verified one rotated JPEG case; it does not claim every camera behaves identically.

### How can I verify the downloaded file has no GPS metadata?

Inspect the actual downloaded file with a metadata parser and independently check representative outputs with a tool such as ExifTool. Compare its checksum with the verified output so you know which bytes you inspected. A zero count means no GPS fields were detected within the checks' scope.

### Does removing GPS metadata make a photo anonymous?

No. Visible content and other context can still identify a person or place. Metadata removal is one privacy control, not a complete anonymization process.
