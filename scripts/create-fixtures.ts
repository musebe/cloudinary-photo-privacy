import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ExifTool, type WriteTags } from "exiftool-vendored";
import sharp from "sharp";

const ROOT = process.cwd();
const INPUT_DIRECTORY = path.join(ROOT, "fixtures", "inputs");
const WIDTH = 1200;
const HEIGHT = 800;
const MAX_FIXTURE_BYTES = 300_000;
const ORIENTATIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
type Orientation = (typeof ORIENTATIONS)[number];
type Format = "jpeg" | "png";
type GpsContainer = "EXIF" | "XMP" | "none";

interface FixtureSpec {
  id: string;
  format: Format;
  orientation: Orientation;
  gpsContainer: GpsContainer;
}

const imageSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#e6c8a8"/><stop offset="1" stop-color="#f5ead6"/></linearGradient>
    <linearGradient id="water" x2="1" y2="1"><stop stop-color="#a7c9c5"/><stop offset="1" stop-color="#557b7c"/></linearGradient>
    <linearGradient id="sand" x2="1" y2="0"><stop stop-color="#e5c397"/><stop offset="1" stop-color="#f6dfb5"/></linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#sky)"/>
  <circle cx="900" cy="240" r="74" fill="#f9f0ce"/>
  <path d="M0 430 180 280 360 390 570 260 780 430 1200 360V800H0Z" fill="#7b9991"/>
  <path d="M0 470 220 400 470 460 690 410 960 470 1200 415V800H0Z" fill="#597e79"/>
  <path d="M0 500Q300 470 600 500T1200 490V800H0Z" fill="url(#water)"/>
  <path d="M1200 460Q935 490 880 600T640 800H1200Z" fill="url(#sand)"/>
  <path d="M1190 501Q972 528 930 632T755 800" fill="none" stroke="#fff4da" stroke-width="8" opacity=".7"/>
  <path d="M80 590H450M140 640H550M55 700H390M415 550H700" stroke="#d9e6d9" stroke-width="5" opacity=".38"/>
  <rect x="75" y="76" width="565" height="128" rx="16" fill="#fffaf1" opacity=".94"/>
  <text x="105" y="126" fill="#173f3f" font-family="Arial,sans-serif" font-size="32" font-weight="700">A quiet place to pause.</text>
  <text x="105" y="167" fill="#49605b" font-family="Arial,sans-serif" font-size="18" letter-spacing="2">SYNTHETIC TEST IMAGE</text>
  <g font-family="Arial,sans-serif" font-size="19" font-weight="700" fill="#fff">
    <rect x="20" y="20" width="43" height="43" rx="9" fill="#b44842"/><text x="28" y="49">TL</text>
    <rect x="1137" y="20" width="43" height="43" rx="9" fill="#3556a2"/><text x="1145" y="49">TR</text>
    <rect x="20" y="737" width="43" height="43" rx="9" fill="#b76c23"/><text x="28" y="766">BL</text>
    <rect x="1137" y="737" width="43" height="43" rx="9" fill="#2b7652"/><text x="1144" y="766">BR</text>
  </g>
  <path d="M600 85V35M582 53 600 35 618 53" fill="none" stroke="#173f3f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="573" y="114" fill="#173f3f" font-family="Arial,sans-serif" font-size="16" font-weight="700">UP</text>
</svg>`;

const specifications: FixtureSpec[] = [
  ...ORIENTATIONS.map((orientation) => ({
    id: `jpeg-exif-gps-orientation-${orientation}`,
    format: "jpeg" as const,
    orientation,
    gpsContainer: "EXIF" as const,
  })),
  ...ORIENTATIONS.slice(0, 6).map((orientation) => ({
    id: `png-exif-gps-orientation-${orientation}`,
    format: "png" as const,
    orientation,
    gpsContainer: "EXIF" as const,
  })),
  ...ORIENTATIONS.slice(0, 6).map((orientation) => ({
    id: `jpeg-xmp-gps-orientation-${orientation}`,
    format: "jpeg" as const,
    orientation,
    gpsContainer: "XMP" as const,
  })),
  ...(["jpeg", "png"] as const).flatMap((format) =>
    ([1, 3, 6, 8] as const).map((orientation) => ({
      id: `${format}-no-gps-orientation-${orientation}`,
      format,
      orientation,
      gpsContainer: "none" as const,
    })),
  ),
];

function tagsFor(specification: FixtureSpec): WriteTags {
  const base: Record<string, string | number> = {
    "IFD0:Orientation": specification.orientation,
    "EXIF:ImageDescription": "Synthetic fixture. No customer photograph or real location.",
  };
  if (specification.gpsContainer === "EXIF") {
    return {
      ...base,
      "GPS:GPSLatitude": 1.2345,
      "GPS:GPSLatitudeRef": "N",
      "GPS:GPSLongitude": 2.3456,
      "GPS:GPSLongitudeRef": "E",
      "GPS:GPSAltitude": 123,
      "GPS:GPSAltitudeRef": 0,
    } as WriteTags;
  }
  if (specification.gpsContainer === "XMP") {
    return {
      ...base,
      "XMP-exif:GPSLatitude": "1,14.07N",
      "XMP-exif:GPSLongitude": "2,20.736E",
      "XMP-exif:GPSAltitude": 123,
      "XMP-exif:GPSAltitudeRef": 0,
    } as WriteTags;
  }
  return base as WriteTags;
}

async function createFixture(specification: FixtureSpec, exiftool: ExifTool) {
  const extension = specification.format === "jpeg" ? "jpg" : "png";
  const file = path.join(INPUT_DIRECTORY, `${specification.id}.${extension}`);
  const image = sharp(Buffer.from(imageSvg));
  if (specification.format === "jpeg") {
    await image.jpeg({ quality: 86 }).toFile(file);
  } else {
    await image.png({ compressionLevel: 9 }).toFile(file);
  }
  await exiftool.write(file, tagsFor(specification), {
    writeArgs: ["-overwrite_original", "-n"],
  });
  // Raw numeric, group-prefixed reads avoid convenience GPS normalization.
  const oracle = await exiftool.readRaw(file, { readArgs: ["-G0", "-n", "-a"] });
  const gpsFields = Object.keys(oracle).filter((name) => /:GPS/.test(name)).sort();
  const bytes = await readFile(file);
  const expectedGpsPresent = specification.gpsContainer !== "none";
  if ((gpsFields.length > 0) !== expectedGpsPresent) {
    throw new Error(`Independent GPS oracle disagrees for ${specification.id}`);
  }
  if (bytes.length > MAX_FIXTURE_BYTES) throw new Error(`Fixture exceeds 300 KB: ${specification.id}`);
  if ((oracle as Record<string, unknown>)["EXIF:Orientation"] !== specification.orientation) {
    throw new Error(`Independent orientation oracle disagrees for ${specification.id}`);
  }
  const swapsDimensions = specification.orientation >= 5;
  return {
    ...specification,
    input: path.relative(ROOT, file),
    expected: "accept",
    goal: expectedGpsPresent ? "remove_gps" : "no_gps_control",
    sourceDimensions: { width: WIDTH, height: HEIGHT },
    expectedNormalizedDimensions: {
      width: swapsDimensions ? HEIGHT : WIDTH,
      height: swapsDimensions ? WIDTH : HEIGHT,
    },
    expectedGpsPresent,
    oracleGpsFields: gpsFields,
    oracleOrientation: specification.orientation,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function main() {
  await mkdir(INPUT_DIRECTORY, { recursive: true });
  const exiftool = new ExifTool({ maxProcs: 1 });
  try {
    const fixtures = [];
    for (const specification of specifications) {
      fixtures.push(await createFixture(specification, exiftool));
    }
    const malformed = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x20, 0x45, 0x78, 0x69, 0x66]);
    const unsupported = Buffer.from(imageSvg);
    await writeFile(path.join(INPUT_DIRECTORY, "malformed-truncated.jpg"), malformed);
    await writeFile(path.join(INPUT_DIRECTORY, "unsupported-vector.svg"), unsupported);
    const rejectFixtures = [
      { id: "malformed-truncated", input: "fixtures/inputs/malformed-truncated.jpg", expected: "reject", reason: "Truncated JPEG with an incomplete EXIF container", bytes: malformed.length },
      { id: "unsupported-vector", input: "fixtures/inputs/unsupported-vector.svg", expected: "reject", reason: "SVG is outside the accepted JPEG/PNG formats", bytes: unsupported.length },
    ];
    const manifest = {
      version: "photo-privacy-fixtures-v1",
      createdAt: new Date().toISOString(),
      provenance: "Original SVG illustration rendered locally with Sharp. All GPS metadata is fictitious, injected only for testing. No camera photograph or customer data is included.",
      oracle: { tool: "ExifTool", version: await exiftool.version(), mode: "Raw numeric group-prefixed metadata read, not runtime exifr" },
      sourceReferences: ["https://photostructure.github.io/exiftool-vendored.js/", "https://exiftool.org/TagNames/GPS.html", "https://exiftool.org/TagNames/XMP.html"],
      scope: "Prepared offline inputs only. No Cloudinary uploads, sanitization benchmark, or live pass rate is established by this manifest.",
      summary: { total: fixtures.length + rejectFixtures.length, supportedRasterInputs: fixtures.length, gpsPresent: fixtures.filter((fixture) => fixture.expectedGpsPresent).length, noGpsControls: fixtures.filter((fixture) => !fixture.expectedGpsPresent).length, rejectInputs: rejectFixtures.length },
      liveDemoCandidates: { default: "jpeg-exif-gps-orientation-1", rotated: "jpeg-exif-gps-orientation-6" },
      fixtures: [...fixtures, ...rejectFixtures],
    };
    if (manifest.summary.total !== 30) throw new Error("Expected exactly 30 fixtures");
    await writeFile(path.join(ROOT, "fixtures", "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify({ ...manifest.summary, independentOracle: manifest.oracle.tool, largestFixtureBytes: Math.max(...fixtures.map((fixture) => fixture.bytes)) }));
  } finally {
    await exiftool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Fixture generation failed");
  process.exitCode = 1;
});
