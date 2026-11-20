import { PrivacyError } from "./errors";
import type { PhotoFormat } from "./contracts";

const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const EXIF = Buffer.from("Exif\0\0", "binary");
const XMP = "http://ns.adobe.com/xap/1.0/\0";

function invalid(): never {
  throw new PrivacyError("invalid_photo", "Choose a complete, readable JPEG or PNG image.");
}

function unsupported(): never {
  throw new PrivacyError(
    "unsupported_metadata",
    "This photo contains metadata this demo cannot verify. Try another JPEG or PNG.",
  );
}

export function photoFormat(bytes: Buffer): PhotoFormat {
  if (bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216) return "jpeg";
  if (bytes.subarray(0, 8).equals(PNG_MAGIC)) return "png";
  throw new PrivacyError("unsupported_format", "Only JPEG and PNG images are supported.");
}

/** Reject ambiguous metadata containers instead of treating unsupported data as absent. */
export function metadataContainers(bytes: Buffer, format: PhotoFormat): Buffer[] {
  return format === "jpeg" ? jpegMetadata(bytes) : pngMetadata(bytes);
}

function jpegMetadata(bytes: Buffer): Buffer[] {
  const segments: Buffer[] = [];
  let offset = 2;
  let scanStarted = false;
  while (offset < bytes.length) {
    if (bytes[offset] !== 255) {
      if (!scanStarted) invalid();
      offset += 1;
      continue;
    }
    while (bytes[offset] === 255) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0 || (marker >= 208 && marker <= 215)) continue;
    if (marker === 217) {
      if (offset !== bytes.length) unsupported();
      return segments;
    }
    if (offset + 2 > bytes.length) invalid();
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) invalid();
    const payload = bytes.subarray(offset + 2, offset + length);
    if (marker === 225) {
      if (scanStarted) unsupported();
      if (!payload.subarray(0, 6).equals(EXIF) && !payload.toString("utf8", 0, XMP.length).startsWith(XMP)) unsupported();
      segments.push(payload);
    }
    // Photoshop/IPTC is parsed too; other application segments can hide unsupported data.
    if (marker === 237) segments.push(payload);
    if (marker >= 227 && marker <= 239 && marker !== 237 && marker !== 238) unsupported();
    if (marker === 218) scanStarted = true;
    offset += length;
  }
  return invalid();
}

function pngMetadata(bytes: Buffer): Buffer[] {
  const segments: Buffer[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    if (offset + length + 12 > bytes.length) invalid();
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const payload = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "acTL") throw new PrivacyError("animated_photo", "Use a still image, not an animated PNG.");
    if (type === "eXIf") segments.push(payload);
    if (["tEXt", "zTXt", "iTXt"].includes(type)) {
      if (type !== "iTXt" || !payload.toString("utf8").startsWith("XML:com.adobe.xmp\0")) unsupported();
      segments.push(payload);
    }
    offset += length + 12;
    if (type === "IEND") {
      if (offset !== bytes.length) unsupported();
      return segments;
    }
  }
  return invalid();
}
