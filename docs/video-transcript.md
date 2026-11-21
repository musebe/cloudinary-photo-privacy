# Photo Privacy walkthrough transcript

This is a music-only, 49.6-second screen walkthrough. There is no spoken narration. Descriptive captions and the text below explain the actions without requiring audio.

## 00:00–00:20.8: Inspect the saved example

The live Photo Privacy page shows a synthetic input and the actual captured Cloudinary output. The recording scrolls from the introduction to the before-and-after comparison, then to the verification report. The input has seven detected GPS fields and the output has zero under the application's checks.

Opening the details reveals field names and a SHA-256 checksum, not coordinate values. The Download checked image button checks the file against this checksum. This is a saved result: the walkthrough does not upload or process another photo.

## 00:20.8–00:28.6: See the Cloudinary upload code

A real isolated VS Code window shows an excerpt of `src/lib/privacy/cloudinary-store.ts`. The upload uses authenticated delivery and an incoming transformation with `flags: "force_strip"`. The excerpt is labeled as part of the full repository, not a standalone runnable file. Cloudinary removes broader embedded metadata, not GPS alone.

## 00:28.6–00:37.6: Verify the stored image

The editor switches to an excerpt of `src/lib/privacy/pipeline.ts`. The application inspects the input, uploads it, reads back the stored asset, downloads the stored original bytes, inspects those bytes, and checks the result before release.

## 00:37.6–00:49.6: Check the saved bytes independently

The actual integrated terminal runs a read-only ExifTool check. It reports seven stored EXIF GPS fields in the synthetic input, zero in the saved checked image, and a SHA-256 match with the captured output. ExifTool version 13.64 is shown. The terminal confirms that no new upload or transformation was performed.

The final completed terminal frame is held for reading. Navigation pauses are edited out. A matching checksum proves byte identity; the metadata inspection supplies the scoped GPS-removal evidence.

## Music and recording provenance

The quiet background is the original locally composed instrumental “Quiet Focus,” reused from the earlier tutorial production. It has no vocals, drums, external samples, paid generation service, or keyboard effects. Gain is reduced and the track fades in and out. Final subjective listening remains an editorial check.

Screens and code are real native macOS window recordings, with the complete browser/editor window contained in the video frame and captions in a separate band. The recording does not show the Cloudinary Console or claim a fresh upload. Source and delivery hashes are recorded in [the media manifest](./article-media.json).
