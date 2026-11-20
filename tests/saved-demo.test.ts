import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { resultSchema } from "../src/lib/privacy/contracts";
import { inspectPhoto } from "../src/lib/privacy/inspect";

test("saved demo report matches the included real before and after files", async () => {
  const result = resultSchema.parse(JSON.parse(await readFile("public/demo/result.json", "utf8")));
  const before = await readFile("public/demo/before.jpg");
  const after = await readFile("public/demo/after.jpg");
  expect(result.source).toBe("saved");
  expect(result.image.src).toBe("/demo/after.jpg");
  expect(await inspectPhoto(before)).toEqual(result.before);
  expect(await inspectPhoto(after)).toEqual(result.after);
  expect(result.before.gpsFields.length).toBeGreaterThan(0);
  expect(result.after.gpsFields).toEqual([]);
  expect(createHash("sha256").update(after).digest("hex")).toBe(result.verification.sha256);
});
