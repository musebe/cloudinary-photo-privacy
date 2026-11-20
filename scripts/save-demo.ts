import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ExifTool } from "exiftool-vendored";
import { resultSchema } from "../src/lib/privacy/contracts";
import { inspectPhoto } from "../src/lib/privacy/inspect";

const origin = "http://localhost:3000";
const rotated = process.argv.includes("--rotated");
const input = `fixtures/inputs/jpeg-exif-gps-orientation-${rotated ? 6 : 1}.jpg`;
const resultPath = rotated ? ".private/rotated-live-result.json" : ".private/first-live-result.json";

async function main() {
  await mkdir(".private", { recursive: true });
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(resultPath, "utf8"));
  } catch {
    const bytes = await readFile(input);
    const form = new FormData();
    form.set("file", new File([bytes], "synthetic-location.jpg", { type: "image/jpeg" }));
    const response = await fetch(`${origin}/api/sanitize`, { method: "POST", headers: { origin }, body: form });
    raw = await response.json();
    if (!response.ok) throw new Error(`Live processing failed: ${JSON.stringify(raw)}`);
    await writeFile(resultPath, JSON.stringify(raw));
  }
  const captured = resultSchema.parse(raw);
  const output = Buffer.from(captured.image.src.split(",")[1], "base64");
  const report = { ...captured, before: await inspectPhoto(await readFile(input)), after: await inspectPhoto(output) };
  const sha256 = createHash("sha256").update(output).digest("hex");
  if (sha256 !== report.verification.sha256 || !report.before.gpsFields.length || report.after.gpsFields.length) throw new Error("Invalid live evidence");
  const destination = path.resolve(rotated ? ".private/rotated-demo" : "public/demo");
  await mkdir(destination, { recursive: true });
  const checkedPath = path.join(destination, "after.jpg");
  await writeFile(checkedPath, output);
  const tool = new ExifTool({ maxProcs: 1 });
  try {
    const tags = await tool.readRaw(checkedPath, { readArgs: ["-G0", "-n", "-a"] });
    const residualGpsFields = Object.keys(tags).filter(key => /:GPS/.test(key));
    if (residualGpsFields.length) throw new Error("Independent ExifTool found GPS fields");
    await copyFile(input, path.join(destination, "before.jpg"));
    const saved = { ...report, source: "saved", image: { ...report.image, src: "/demo/after.jpg" } };
    await writeFile(path.join(destination, "result.json"), JSON.stringify(saved, null, 2) + "\n");
    await mkdir("docs/evidence", { recursive: true });
    await writeFile(`docs/evidence/${rotated ? "rotated-demo" : "saved-demo"}.json`, JSON.stringify({
      checkedAt: report.verification.checkedAt, fixture: input, operation: "Real Next.js route -> incoming Cloudinary force_strip -> persisted readback -> protected original download", sourceSha256: createHash("sha256").update(await readFile(input)).digest("hex"), outputSha256: sha256, before: report.before, after: report.after,
      independentOracle: { tool: "ExifTool", version: await tool.version(), residualGpsFields },
      rawSourceUploadedAsPublicAsset: false, cloudinaryUploadCount: 1, liveBenchmarkComplete: false,
    }, null, 2) + "\n");
    console.log(JSON.stringify({ saved: true, beforeFields: report.before.gpsFields.length, afterFields: report.after.gpsFields.length, independentResidualGps: residualGpsFields.length, bytes: output.length }));
  } finally { await tool.end(); }
}

main().catch((error: unknown) => {
  // This script handles synthetic fixtures only; never echo vendor response bodies.
  const category = error instanceof Error ? error.name : "UnknownError";
  console.error(`Could not save a verified live example (${category}). No private URL or credential was logged.`);
  process.exitCode = 1;
});
