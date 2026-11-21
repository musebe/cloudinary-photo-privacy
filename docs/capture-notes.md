# Article capture notes

**Source and assets:** [Article](./article.md) · [Media manifest](./article-media.json) · [Transcript](./video-transcript.md) · [Original demo evidence](./evidence/). Cloudinary folder: `article-screenshots/cloudinary-photo-privacy`.

Captured November 21, 2026, Africa/Nairobi. Article media are stored in the articles product environment. No new photo sanitization, paid AI, or account-setting change was performed for these captures.

## Reproduce the capture

1. Start an isolated Chrome profile owned by Developer Tutorial Studio, fill its window, and open the public Photo Privacy demo. Wait for both saved images to decode. Confirm the saved label and disabled public-upload control.
2. Capture the full native window with Apple `screencapture -x -o -l<owned-window-id>`. Crop the actual comparison and expanded report with the existing CoreGraphics/ImageIO helper, retaining readable text. The screenshots show field names and counts, not coordinate values.
3. Record that same owned Chrome window with Apple `screencapture -v`. Scroll smoothly from the introduction to the comparison and report, expand the details, and exercise the download check. The capture context disallows automatic file saving; separate browser tests verify actual downloads and exact hashes.
4. Open a separate VS Code instance with its own user-data/extensions profile and a credential-free capture workspace. Present labeled excerpts of `cloudinary-store.ts` and `pipeline.ts`, with the complete excerpt visible. Do not present the excerpts as standalone programs. TypeScript checking is disabled only in these incomplete presentation excerpts; the real project passes type-checking.
5. In the actual integrated terminal, run a read-only ExifTool check against copies of `public/demo/before.jpg` and `after.jpg`. Count stored `EXIF:GPS` tags, excluding ExifTool's derived Composite fields. Require seven before, zero after, and the captured SHA-256 hash. The first rehearsal counted derived fields too and failed; it is retained locally and excluded from the final video.
6. Trim command-palette navigation and idle gaps. Preserve complete native browser/editor windows with contain scaling; place public URL cards and descriptive captions outside the footage. Hold only a completed verified terminal frame for readability. No result is fabricated or shown before it completed.
7. Add the original local instrumental “Quiet Focus” at half its previously normalized gain, with fades. No vocals, external samples, generated keyboard clicks, system sound, or paid music service. Technical audio measurement on the pre-final mix was mean −33.2 dB and peak −22.3 dB; final subjective listening remains editorial.
8. Export H.264/AAC MP4, 1920 × 1080, constant 30 fps, 49.6 seconds, with fast-start metadata. Fully decode the export. Retain raw takes and earlier edits instead of overwriting them.
9. Upload screenshots, poster, final video, and WebVTT to the one article folder with overwriting disabled. Read all seven assets back and compare delivered original-file hashes. This environment returns legacy `folder`, not dynamic `asset_folder`; both API response shapes are handled. No folder mode was changed.
10. Test the exact article video HTML in an isolated browser: decoded 1920 × 1080 video, 49.6-second duration, playback, seeking, four loaded caption cues, and no video error. Close the context, local check server, and both capture-owned VS Code instances. Personal windows and tabs remain untouched.

## Local production files

All raw media, isolated profiles, tools, and logs stay under:

`/Users/eugenemusebe/Documents/Developer-Tutorial-Studio/tutorials/cloudinary-photo-privacy-article/`

Scripts: `capture-demo.mjs`, `prepare-code.mjs`, `capture-code.mjs`, `edit-walkthrough.mjs`, `finalize-video.mjs`, `upload-article-media.mjs`, `check-article-links.mjs`, and `check-embed.mjs` under `scripts/`. Use the saved upload manifest for verification rather than reuploading. The uploader's `--verify-only` path never creates another asset.

Validation: native action logs, `demo-capture.json`, `code-capture.json`, `final-video.json`, `cloudinary-media.json`, `article-links.json`, and `embed-check.json` under `validation/`. The repository manifest omits credentials and private asset IDs. Images were taken from actual running software; no Cloudinary Console screenshot or newly processed photo is implied.

## Review scope

Native screenshots and sampled contact sheets were visually inspected for framing, readable code, credentials, and completion order. Full export decoding, stream properties, delivery hashes, and browser playback/captions were checked. These are not a claim of a completed full watch-and-listen review. Final subjective audio/visual review and the publisher's Markdown/video rendering remain editorial checks.
