import { MAX_PHOTO_BYTES, MAX_REQUEST_BYTES } from "./contracts";
import { PrivacyError } from "./errors";

export async function readBounded(stream: ReadableStream<Uint8Array> | null, limit: number): Promise<Buffer> {
  if (!stream) throw new PrivacyError("empty_body", "Choose a photo to process.");
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new PrivacyError("photo_too_large", "Choose an image no larger than 3 MB.", 413);
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}

export function assertRequestOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new PrivacyError("invalid_origin", "Use the photo form on this site.", 403);
  }
}

export async function readPhotoUpload(request: Request): Promise<Buffer> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data;")) throw new PrivacyError("invalid_upload", "Use the photo upload form.");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_REQUEST_BYTES)) throw new PrivacyError("photo_too_large", "Choose an image no larger than 3 MB.", 413);
  const body = await readBounded(request.body, MAX_REQUEST_BYTES);
  let form: FormData;
  try {
    form = await new Response(new Uint8Array(body), { headers: { "content-type": contentType } }).formData();
  } catch {
    throw new PrivacyError("invalid_upload", "The photo upload could not be read.");
  }
  const entries = [...form.entries()];
  const file = form.get("file");
  if (entries.length !== 1 || !(file instanceof File) || entries[0][0] !== "file") throw new PrivacyError("invalid_upload", "Upload one photo at a time.");
  if (!["image/jpeg", "image/png"].includes(file.type)) throw new PrivacyError("unsupported_format", "Only JPEG and PNG images are supported.");
  if (!file.size || file.size > MAX_PHOTO_BYTES) throw new PrivacyError("photo_too_large", "Choose an image no larger than 3 MB.", 413);
  return Buffer.from(await file.arrayBuffer());
}
