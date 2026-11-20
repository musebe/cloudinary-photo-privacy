import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { inspectPhoto } from "../src/lib/privacy/inspect";
import manifest from "../fixtures/manifest.json";

describe("synthetic fixture inputs against independent ExifTool expectations", () => {
  test("contains 30 honest offline cases, not a fabricated live benchmark", () => {
    expect(manifest.fixtures).toHaveLength(30);
    expect(manifest.summary.gpsPresent).toBe(20);
    expect(manifest.summary.noGpsControls).toBe(8);
  });
  for (const fixture of manifest.fixtures) {
    test(fixture.id, async () => {
      const bytes = await readFile(fixture.input);
      if (fixture.expected === "reject") {
        await expect(inspectPhoto(bytes)).rejects.toThrow();
        return;
      }
      const report = await inspectPhoto(bytes);
      expect(report.gpsFields.length > 0).toBe(fixture.expectedGpsPresent);
      expect(report.orientation).toBe(fixture.orientation);
      expect(report.width).toBe(1200);
      expect(report.height).toBe(800);
    });
  }
});
