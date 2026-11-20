import { describe, expect, test, vi } from "vitest";
import sharp from "sharp";
import { inspectPhoto } from "../src/lib/privacy/inspect";
import { sanitizePhoto, type PhotoStore, type StoredPhoto } from "../src/lib/privacy/pipeline";
import { PrivacyError, publicError } from "../src/lib/privacy/errors";
import { assertRequestOrigin, readBounded, readPhotoUpload } from "../src/lib/privacy/request";

async function jpeg(): Promise<Buffer> {
  return sharp({ create: { width: 32, height: 24, channels: 3, background: "#667766" } }).jpeg().toBuffer();
}

function withGps(image: Buffer, orientation = 1): Buffer {
  const tiff = Buffer.alloc(68);
  tiff.write("II"); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(2, 8);
  tiff.writeUInt16LE(0x112, 10); tiff.writeUInt16LE(3, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt16LE(orientation, 18);
  tiff.writeUInt16LE(0x8825, 22); tiff.writeUInt16LE(4, 24); tiff.writeUInt32LE(1, 26); tiff.writeUInt32LE(38, 30);
  tiff.writeUInt16LE(2, 38);
  tiff.writeUInt16LE(0, 40); tiff.writeUInt16LE(1, 42); tiff.writeUInt32LE(4, 44); tiff[48] = 2; tiff[49] = 3;
  tiff.writeUInt16LE(1, 52); tiff.writeUInt16LE(2, 54); tiff.writeUInt32LE(2, 56); tiff[60] = 78;
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const marker = Buffer.alloc(4); marker[0] = 255; marker[1] = 225; marker.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([image.subarray(0, 2), marker, payload, image.subarray(2)]);
}

async function mockStore(output: Buffer): Promise<PhotoStore> {
  const inspection = await inspectPhoto(output);
  const asset: StoredPhoto = { assetId: "fixture-asset", publicId: "photo-privacy/fixture", format: inspection.format, bytes: output.length, width: inspection.width, height: inspection.height };
  return { upload: vi.fn(async () => asset), readback: vi.fn(async () => asset), download: vi.fn(async () => output) };
}

describe("byte-level inspection", () => {
  test("reads a clean JPEG without inventing GPS data", async () => {
    expect(await inspectPhoto(await jpeg())).toMatchObject({ format: "jpeg", width: 32, height: 24, gpsFields: [] });
  });

  test("detects all GPS-IFD fields even without a latitude/longitude pair", async () => {
    const result = await inspectPhoto(withGps(await jpeg()));
    expect(result.gpsFields).toContain("GPSVersionID");
    expect(result.gpsFields).toContain("GPSLatitudeRef");
  });

  test("reads a clean PNG", async () => {
    const image = await sharp({ create: { width: 12, height: 10, channels: 4, background: "#667766" } }).png().toBuffer();
    expect(await inspectPhoto(image)).toMatchObject({ format: "png", width: 12, height: 10, gpsFields: [] });
  });

  test("rejects MIME disguise and unsupported formats", async () => {
    await expect(inspectPhoto(Buffer.from("<svg></svg>"))).rejects.toMatchObject({ code: "unsupported_format" });
  });

  test("rejects an oversized buffer before decoding", async () => {
    await expect(inspectPhoto(Buffer.alloc(3_000_001))).rejects.toMatchObject({ code: "photo_too_large" });
  });

  test("rejects truncated JPEG data", async () => {
    const image = await jpeg();
    await expect(inspectPhoto(image.subarray(0, image.length - 3))).rejects.toBeInstanceOf(PrivacyError);
  });

  test("rejects bytes appended after the image", async () => {
    await expect(inspectPhoto(Buffer.concat([await jpeg(), Buffer.from("GPSLatitude=example")]))).rejects.toMatchObject({ code: "unsupported_metadata" });
  });

  test("rejects an unknown APP1 container", async () => {
    const image = await jpeg();
    const unknown = Buffer.from([255, 225, 0, 7, 65, 66, 67, 68, 69]);
    await expect(inspectPhoto(Buffer.concat([image.subarray(0, 2), unknown, image.subarray(2)]))).rejects.toMatchObject({ code: "unsupported_metadata" });
  });
});

describe("release gate", () => {
  test("returns only exact verified bytes, with a checksum, after stored readback", async () => {
    const clean = await jpeg();
    const store = await mockStore(clean);
    const result = await sanitizePhoto(withGps(clean), store);
    expect(result.verification.status).toBe("gps_removed");
    expect(result.verification.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.verification.storedAssetReadback).toBe(true);
    expect(Buffer.from(result.image.src.split(",")[1], "base64").equals(clean)).toBe(true);
    expect(store.readback).toHaveBeenCalledOnce();
  });

  test("uses a truthful no-GPS-detected outcome for a negative control", async () => {
    const clean = await jpeg();
    const result = await sanitizePhoto(clean, await mockStore(clean));
    expect(result.verification.status).toBe("no_gps_detected");
  });

  test("blocks release when GPS fields remain", async () => {
    const source = withGps(await jpeg());
    await expect(sanitizePhoto(source, await mockStore(source))).rejects.toMatchObject({ code: "gps_remains" });
  });

  test("blocks release when readback identifies a different asset", async () => {
    const clean = await jpeg();
    const store = await mockStore(clean);
    store.readback = async asset => ({ ...asset, assetId: "different" });
    await expect(sanitizePhoto(clean, store)).rejects.toMatchObject({ code: "readback_mismatch" });
  });

  test("blocks release when stored properties differ from inspected bytes", async () => {
    const clean = await jpeg();
    const store = await mockStore(clean);
    store.readback = async asset => ({ ...asset, bytes: asset.bytes + 1 });
    await expect(sanitizePhoto(clean, store)).rejects.toMatchObject({ code: "readback_mismatch" });
  });

  test("blocks a changed crop or resolution", async () => {
    const clean = await jpeg();
    const cropped = await sharp(clean).resize(16, 12).toBuffer();
    await expect(sanitizePhoto(clean, await mockStore(cropped))).rejects.toMatchObject({ code: "output_mismatch" });
  });

  test("checks expected dimensions after orientation normalization", async () => {
    const source = withGps(await jpeg(), 6);
    const rotated = await sharp(source).rotate().jpeg().toBuffer();
    expect((await sanitizePhoto(source, await mockStore(rotated))).after).toMatchObject({ width: 24, height: 32 });
  });

  test("does not upload an invalid input", async () => {
    const store = await mockStore(await jpeg());
    await expect(sanitizePhoto(Buffer.from("invalid"), store)).rejects.toBeInstanceOf(PrivacyError);
    expect(store.upload).not.toHaveBeenCalled();
  });

  test("does not leak vendor URLs, secrets, or messages in public errors", () => {
    const failure = publicError(new Error("private cloudinary URL and secret"));
    expect(failure.message).not.toMatch(/secret|cloudinary|URL/);
    expect(failure.code).toBe("processing_failed");
  });
});

describe("request boundaries", () => {
  test("requires an exact same-origin request", () => {
    expect(() => assertRequestOrigin(new Request("https://app.test/api/sanitize", { headers: { origin: "https://other.test" } }))).toThrow(PrivacyError);
    expect(() => assertRequestOrigin(new Request("https://app.test/api/sanitize", { headers: { origin: "https://app.test" } }))).not.toThrow();
  });

  test("rejects a stream that exceeds its declared boundary", async () => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(11)); controller.close(); } });
    await expect(readBounded(stream, 10)).rejects.toMatchObject({ code: "photo_too_large" });
  });

  test("accepts one JPEG form file without trusting the filename", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array(await jpeg())], "private-location-name.jpg", { type: "image/jpeg" }));
    const bytes = await readPhotoUpload(new Request("https://app.test/api/sanitize", { method: "POST", body: form }));
    expect((await inspectPhoto(bytes)).format).toBe("jpeg");
  });

  test("rejects multiple uploads and extra client-controlled options", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array(await jpeg())], "photo.jpg", { type: "image/jpeg" }));
    form.set("public_id", "do-not-trust");
    await expect(readPhotoUpload(new Request("https://app.test/api/sanitize", { method: "POST", body: form }))).rejects.toMatchObject({ code: "invalid_upload" });
  });
});
