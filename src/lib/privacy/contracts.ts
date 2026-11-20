import { z } from "zod";

export type PhotoFormat = "jpeg" | "png";

export interface PhotoInspection {
  format: PhotoFormat;
  bytes: number;
  width: number;
  height: number;
  orientation: number | null;
  gpsFields: string[];
}

export interface SanitizationResult {
  source: "live" | "saved";
  before: PhotoInspection;
  after: PhotoInspection;
  verification: {
    status: "gps_removed" | "no_gps_detected";
    checkedAt: string;
    sha256: string;
    storedAssetReadback: true;
  };
  image: {
    src: string;
    filename: string;
    mimeType: "image/jpeg" | "image/png";
  };
}

export const MAX_PHOTO_BYTES = 3_000_000;
export const MAX_REQUEST_BYTES = 3_100_000;
export const MAX_PIXELS = 16_000_000;
export const PHOTO_NAMESPACE = "photo-privacy/";

const inspectionSchema = z.object({
  format: z.enum(["jpeg", "png"]),
  bytes: z.number().int().positive().max(MAX_PHOTO_BYTES),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  orientation: z.number().int().min(1).max(8).nullable(),
  gpsFields: z.array(z.string().max(100)).max(100),
});

export const resultSchema = z.object({
  source: z.enum(["live", "saved"]),
  before: inspectionSchema,
  after: inspectionSchema.extend({ gpsFields: z.array(z.string()).length(0) }),
  verification: z.object({
    status: z.enum(["gps_removed", "no_gps_detected"]),
    checkedAt: z.iso.datetime(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    storedAssetReadback: z.literal(true),
  }),
  image: z.object({
    src: z.string().max(4_000_050).refine(value => value === "/demo/after.jpg" || value.startsWith("data:image/jpeg;base64,") || value.startsWith("data:image/png;base64,")),
    filename: z.string().regex(/^[a-zA-Z0-9-]+\.(jpg|png)$/),
    mimeType: z.enum(["image/jpeg", "image/png"]),
  }),
});
