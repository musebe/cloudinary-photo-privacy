import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import result from "../../public/demo/result.json" with { type: "json" };

test("loads the saved comparison with decoded images and no overflow", async ({ page }) => {
  const errors: string[] = [];
  const processingCalls: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (request.url().includes("/api/sanitize") || new URL(request.url()).hostname.endsWith("cloudinary.com")) processingCalls.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Share the photo.");
  await expect(page.getByText("GPS metadata removed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download checked image" })).toBeEnabled();
  const images = page.locator("main img");
  await expect(images).toHaveCount(2);
  await expect.poll(() => images.evaluateAll(elements => elements.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `.private/screenshots/${test.info().project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
  expect(processingCalls).toEqual([]);
  await page.reload();
  await expect(page.getByText("GPS metadata removed", { exact: true })).toBeVisible();
  expect(processingCalls).toEqual([]);
});

test("downloads the exact checked file", async ({ page }) => {
  await page.goto("/");
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download checked image" }).click();
  const download = await promise;
  expect(download.suggestedFilename()).toBe(result.image.filename);
  const file = await download.path();
  expect(file).not.toBeNull();
  expect(createHash("sha256").update(await readFile(file!)).digest("hex")).toBe(result.verification.sha256);
});

test("blocks a corrupt download without saving a file", async ({ page }) => {
  await page.goto("/");
  await page.route("**/demo/after.jpg", route => route.fulfill({ contentType: "image/jpeg", body: Buffer.from("wrong bytes") }));
  let downloaded = false;
  page.on("download", () => { downloaded = true; });
  await page.getByRole("button", { name: "Download checked image" }).click();
  await expect(page.locator('[data-slot="alert"]')).toContainText("did not match the checked image");
  expect(downloaded).toBe(false);
});

test("rejects an unsupported file before any upload", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("Your photo", { exact: true });
  if (await input.isDisabled()) { test.skip(true, "Public saved-demo mode disables new uploads."); return; }
  await input.setInputFiles({ name: "fake.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await expect(page.locator('[data-slot="alert"]')).toContainText("Choose a JPEG or PNG");
  await expect(page.getByRole("button", { name: "Download checked image" })).toHaveCount(0);
  await page.getByRole("button", { name: "Use saved demo" }).click();
  await expect(page.getByRole("button", { name: "Download checked image" })).toBeVisible();
});
