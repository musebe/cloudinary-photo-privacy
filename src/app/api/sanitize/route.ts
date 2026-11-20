import { createCloudinaryStore } from "@/lib/privacy/cloudinary-store";
import { PrivacyError, publicError } from "@/lib/privacy/errors";
import { sanitizePhoto } from "@/lib/privacy/pipeline";
import { assertRequestOrigin, readPhotoUpload } from "@/lib/privacy/request";

export const runtime = "nodejs";
export const maxDuration = 60;

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request): Promise<Response> {
  try {
    if (process.env.ENABLE_LIVE_UPLOADS !== "true") throw new PrivacyError("uploads_disabled", "Live uploads are disabled on this public demo. Try the saved example instead.", 403);
    assertRequestOrigin(request);
    const bytes = await readPhotoUpload(request);
    const result = await sanitizePhoto(bytes, createCloudinaryStore());
    return Response.json(result, { headers });
  } catch (error) {
    const failure = publicError(error);
    return Response.json({ error: { code: failure.code, message: failure.message } }, { status: failure.status, headers });
  }
}
