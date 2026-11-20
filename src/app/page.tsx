import { readFile } from "node:fs/promises";
import path from "node:path";
import { PhotoPrivacyDemo } from "@/components/photo-privacy-demo";
import { resultSchema, type SanitizationResult } from "@/lib/privacy/contracts";

export default async function Home() {
  let demo: SanitizationResult | null = null;
  try {
    const content = await readFile(path.join(process.cwd(), "public/demo/result.json"), "utf8");
    demo = resultSchema.parse(JSON.parse(content));
  } catch {
    // Never turn a missing or invalid saved report into a passing result.
  }
  return <PhotoPrivacyDemo demo={demo} liveUploads={process.env.ENABLE_LIVE_UPLOADS === "true"} />;
}
