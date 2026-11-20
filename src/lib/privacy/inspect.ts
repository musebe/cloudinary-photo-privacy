import exifr from "exifr";
import sharp from "sharp";
import { MAX_PHOTO_BYTES, MAX_PIXELS, type PhotoInspection } from "./contracts";
import { metadataContainers, photoFormat } from "./containers";
import { PrivacyError } from "./errors";

// exifr supports these strict runtime options; its bundled types omit two of them.
const parserOptions = {
  tiff: true, ifd1: true, exif: true, gps: true,
  xmp: true, iptc: true, icc: false, jfif: false, ihdr: false,
  mergeOutput: false, silentErrors: false, multiSegment: true,
  translateKeys: true, translateValues: false, reviveValues: false,
  sanitize: false, chunked: false,
};

function gpsKeys(value: unknown, inGpsBlock = false): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value) || ArrayBuffer.isView(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const gpsBlock = inGpsBlock || key.toLowerCase() === "gps";
    const own = /gps/i.test(key) && !["gps", "gpsifd"].includes(key.toLowerCase())
      ? [key]
      : inGpsBlock && /^\d+$/.test(key) ? [`GPS tag ${key}`] : [];
    return [...own, ...gpsKeys(child, gpsBlock)];
  });
}

export async function inspectPhoto(bytes: Buffer): Promise<PhotoInspection> {
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) {
    throw new PrivacyError("photo_too_large", "Choose an image no larger than 3 MB.", 413);
  }
  const format = photoFormat(bytes);
  const containers = metadataContainers(bytes, format);
  try {
    const decoder = sharp(bytes, { failOn: "warning", limitInputPixels: MAX_PIXELS });
    const metadata = await decoder.metadata();
    if (!metadata.width || !metadata.height || metadata.format !== format) throw new Error("invalid dimensions");
    if ((metadata.pages ?? 1) !== 1) throw new Error("multiple frames");
    // Decode, not merely header sniff, so truncated image data never passes inspection.
    await decoder.raw().toBuffer();
    const parsed: unknown = await exifr.parse(bytes, parserOptions);
    if (containers.length && (!parsed || typeof parsed !== "object")) throw new Error("unreadable metadata");
    const rawGpsKeys = containers.flatMap(segment => [...segment.toString("utf8").matchAll(/\bGPS[A-Za-z_]+/g)].map(match => match[0]));
    const orientation = metadata.orientation ?? null;
    if (orientation !== null && (orientation < 1 || orientation > 8)) throw new Error("invalid orientation");
    return {
      format, bytes: bytes.length, width: metadata.width, height: metadata.height, orientation,
      gpsFields: [...new Set([...gpsKeys(parsed), ...rawGpsKeys])].filter(key => key.toLowerCase() !== "gps").sort(),
    };
  } catch (error) {
    if (error instanceof PrivacyError) throw error;
    throw new PrivacyError("inspection_failed", "This image or its metadata could not be inspected. No download was released.");
  }
}
