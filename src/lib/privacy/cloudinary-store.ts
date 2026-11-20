import "server-only";

import { randomUUID } from "node:crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { MAX_PHOTO_BYTES, PHOTO_NAMESPACE } from "./contracts";
import type { PhotoStore, StoredPhoto } from "./pipeline";
import { PrivacyError } from "./errors";
import { readBounded } from "./request";

export function cloudinaryConfigured(): boolean {
  return [process.env.CLOUDINARY_CLOUD_NAME, process.env.CLOUDINARY_API_KEY, process.env.CLOUDINARY_API_SECRET].every(Boolean);
}

function storedPhoto(value: Record<string, unknown>): StoredPhoto {
  if (typeof value.asset_id !== "string" || typeof value.public_id !== "string" || !value.public_id.startsWith(PHOTO_NAMESPACE) || value.resource_type !== "image" || value.type !== "authenticated") throw new Error("Unexpected stored asset");
  if (!["jpg", "jpeg", "png"].includes(String(value.format)) || ![value.bytes, value.width, value.height].every(x => typeof x === "number" && Number.isSafeInteger(x) && x > 0)) throw new Error("Unexpected stored properties");
  return { assetId: value.asset_id, publicId: value.public_id, format: value.format === "png" ? "png" : "jpeg", bytes: value.bytes as number, width: value.width as number, height: value.height as number };
}

export function createCloudinaryStore(): PhotoStore {
  if (!cloudinaryConfigured()) throw new PrivacyError("not_configured", "Cloudinary is not configured on this server.", 503);
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
  return {
    async upload(bytes) {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader.upload_stream({
          resource_type: "image", type: "authenticated", overwrite: false, backup: false,
          public_id: `${PHOTO_NAMESPACE}${randomUUID()}`,
          asset_folder: process.env.CLOUDINARY_ASSET_FOLDER || "article-demos/photo-privacy",
          transformation: { flags: "force_strip" },
          tags: ["photo-privacy-demo"], timeout: 15_000,
        }, (error, response) => error || !response ? reject(error || new Error("No asset")) : resolve(response)).end(bytes);
      });
      return storedPhoto(result as unknown as Record<string, unknown>);
    },
    async readback(asset) {
      const response = await cloudinary.api.resources_by_asset_ids([asset.assetId], { timeout: 10_000 });
      const value: unknown = response.resources?.[0];
      if (!value || typeof value !== "object") throw new Error("Stored asset not found");
      return storedPhoto(value as Record<string, unknown>);
    },
    async download(asset) {
      const url = cloudinary.utils.private_download_url(asset.publicId, asset.format === "jpeg" ? "jpg" : "png", {
        resource_type: "image", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 60, attachment: false,
      });
      const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("Stored image unavailable");
      const contentLength = Number(response.headers.get("content-length") || 0);
      if (contentLength > MAX_PHOTO_BYTES) throw new PrivacyError("output_too_large", "The processed image exceeds this demo's 3 MB limit. No download was released.", 413);
      return readBounded(response.body, MAX_PHOTO_BYTES);
    },
  };
}
