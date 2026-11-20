import { createHash } from "node:crypto";
import type { PhotoInspection, SanitizationResult } from "./contracts";
import { MAX_PHOTO_BYTES } from "./contracts";
import { PrivacyError } from "./errors";
import { inspectPhoto } from "./inspect";

export interface StoredPhoto {
  assetId: string;
  publicId: string;
  format: "jpeg" | "png";
  bytes: number;
  width: number;
  height: number;
}

export interface PhotoStore {
  upload(bytes: Buffer): Promise<StoredPhoto>;
  readback(asset: StoredPhoto): Promise<StoredPhoto>;
  download(asset: StoredPhoto): Promise<Buffer>;
}

function assertOutput(before: PhotoInspection, after: PhotoInspection, stored: StoredPhoto): void {
  const rotated = before.orientation !== null && before.orientation >= 5;
  const width = rotated ? before.height : before.width;
  const height = rotated ? before.width : before.height;
  if (after.gpsFields.length) throw new PrivacyError("gps_remains", "GPS metadata remained after processing. No download was released.", 502);
  if (after.format !== before.format || after.width !== width || after.height !== height || (after.orientation !== null && after.orientation !== 1)) {
    throw new PrivacyError("output_mismatch", "The processed image did not match the expected format or dimensions. No download was released.", 502);
  }
  if (stored.bytes !== after.bytes || stored.width !== after.width || stored.height !== after.height || stored.format !== after.format) {
    throw new PrivacyError("readback_mismatch", "Stored asset details did not match the downloaded image. No download was released.", 502);
  }
}

export async function sanitizePhoto(bytes: Buffer, store: PhotoStore): Promise<SanitizationResult> {
  const before = await inspectPhoto(bytes);
  const uploaded = await store.upload(bytes);
  const stored = await store.readback(uploaded);
  if (stored.assetId !== uploaded.assetId || stored.publicId !== uploaded.publicId || stored.bytes <= 0 || stored.bytes > MAX_PHOTO_BYTES) {
    throw new PrivacyError("readback_mismatch", "The stored asset could not be verified. No download was released.", 502);
  }
  const cleanBytes = await store.download(stored);
  const after = await inspectPhoto(cleanBytes);
  assertOutput(before, after, stored);
  const mimeType = after.format === "jpeg" ? "image/jpeg" : "image/png";
  return {
    source: "live", before, after,
    verification: {
      status: before.gpsFields.length ? "gps_removed" : "no_gps_detected",
      checkedAt: new Date().toISOString(),
      sha256: createHash("sha256").update(cleanBytes).digest("hex"),
      storedAssetReadback: true,
    },
    image: { src: `data:${mimeType};base64,${cleanBytes.toString("base64")}`, filename: `photo-without-gps.${after.format === "jpeg" ? "jpg" : "png"}`, mimeType },
  };
}
