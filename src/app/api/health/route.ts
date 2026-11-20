export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json({
    status: "ok",
    cloudinaryConfigured: [process.env.CLOUDINARY_CLOUD_NAME, process.env.CLOUDINARY_API_KEY, process.env.CLOUDINARY_API_SECRET].every(Boolean),
    liveUploadsEnabled: process.env.ENABLE_LIVE_UPLOADS === "true",
  }, { headers: { "Cache-Control": "no-store" } });
}
