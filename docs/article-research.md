# Article research and evidence

**Source and assets:** [Article](./article.md) · [Short handoff](./article-handoff.md) · [Media](./article-media.json) · [Evidence](./evidence/). Checked November 21, 2026, Africa/Nairobi.

## Primary documentation and implementation decisions

| Source | Decision supported |
| --- | --- |
| [Incoming transformations](https://cloudinary.com/documentation/eager_and_incoming_transformations#incoming_transformations) | Process the original before storing it, rather than relying on a delivery rendition |
| [force_strip reference](https://cloudinary.com/documentation/transformation_reference#fl_force_strip) | Use the incoming flag for embedded metadata; explain broader stripping and DigitalSourceType exception |
| [Metadata stripping](https://cloudinary.com/documentation/image_optimization#metadata_stripping) | A transformed delivery output does not establish the state of the stored original |
| [Media access](https://cloudinary.com/documentation/control_access_to_media) | Distinguish authenticated original/derivative access from public delivery; keep retrieval URLs server-side |
| [Admin API](https://cloudinary.com/documentation/admin_api#get_resources_by_asset_ids) | Read persisted identity/properties by immutable asset ID; account for rate limits |
| [Folder modes](https://cloudinary.com/documentation/folder_modes) | Dynamic asset_folder differs from fixed public-ID-based folders; readback can return either folder key |
| [UGC upload](https://cloudinary.com/documentation/user_generated_content_upload) | Metadata stripping fits user-photo ingestion; format acceptance is not a full security policy |
| [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables) | Keep server secrets out of NEXT_PUBLIC_ variables and restart local runtime after changes |

The Cloudinary Image & Video APIs documentation index and relevant Markdown pages were fetched directly. Human-facing article links use the canonical HTML pages; a discovered Markdown-only subpage returned 404 without its extension and was replaced with the canonical Admin API anchor.

## Scope of the original evidence

Two live JPEG runs are documented in `docs/evidence`: ordinary EXIF orientation 1 and orientation 6. Both changed seven detected GPS fields to zero; ExifTool 13.64 independently checked outputs. The rotated result has normalized dimensions 800 × 1200. No additional live image run was performed for article production.

The 30 offline fixtures cover 20 GPS-bearing inputs, eight no-GPS controls, and two rejects. They validate detection/rejection behavior; they do not prove live PNG/XMP stripping or a general success rate. There are 53 automated tests. Separate desktop/mobile tests exercise saved load, refresh, checked downloads, corruption blocking, and local invalid-file handling.

The seven public article-media originals were uploaded into one folder, read back, and delivered byte-for-byte with matching SHA-256 values. The final embedded video and WebVTT were tested together. Its music-only descriptive captions are not a generated speech transcript.

## Search intent and overlap

Representative searches covered Next.js GPS removal, Cloudinary EXIF stripping, and Cloudinary's metadata tools. Existing material includes the [metadata-removal tool](https://cloudinary.com/tools/remove-metadata-from-image), [UGC guide](https://cloudinary.com/documentation/user_generated_content_upload), and metadata discussion within [website-image mistakes](https://cloudinary.com/blog/top_10_mistakes_in_handling_website_images_and_how_to_solve_them).

The article's distinction is the verified application boundary: authenticated storage, stored-original inspection, and checksum-bound download with explicit rejection cases. This is not a claim that metadata removal is new, nor an exhaustive claim that no similar tutorial exists.

[Google's AI features guidance](https://developers.google.com/search/docs/appearance/ai-features) reinforces standard SEO fundamentals, helpful text, useful media, and matching visible structured data, without special AI markup. The draft uses a direct answer, specific headings, scoped results tables, nearby primary links, and visible FAQs. No rankings or citations are guaranteed.

## Publisher checks

Use appropriate BlogPosting metadata, a real canonical URL, byline, dates, and representative cover. If adding [VideoObject](https://developers.google.com/search/docs/appearance/structured-data/video), use the visible video, uploaded poster, duration PT49.6S, matching title/description, and actual publication metadata. Do not invent the article publication date or promise FAQ rich results. Verify the publisher retains the video embed and its captions; three static-auditor bare-URL warnings come from required HTML media attributes, not unlabeled prose links. Final listening and full video review remain open.
