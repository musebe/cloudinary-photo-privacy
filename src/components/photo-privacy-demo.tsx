"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, Check, ImageIcon, LoaderCircle, MapPinOff, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MAX_PHOTO_BYTES, resultSchema, type PhotoInspection, type SanitizationResult } from "@/lib/privacy/contracts";

const byteLabel = (bytes: number) => `${(bytes / 1000).toFixed(1)} kB`;
const checkedDate = (timestamp: string) => new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric",
}).format(new Date(timestamp));

function PhotoCard({ title, description, src, inspection }: {
  title: string; description: string; src?: string; inspection?: PhotoInspection;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {inspection ? <Badge variant={inspection.gpsFields.length ? "outline" : "secondary"}>
            {inspection.gpsFields.length ? `${inspection.gpsFields.length} GPS fields` : "No tested GPS fields"}
          </Badge> : null}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {src ? <div className="photo-frame">
          {/* Exact inspected bytes: an image optimizer would create a different derivative. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`${title}: synthetic landscape or selected photo`} width={inspection?.width ?? 1200} height={inspection?.height ?? 800} />
        </div> : <Empty className="aspect-[3/2]">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ImageIcon /></EmptyMedia>
            <EmptyTitle>{title === "Before" ? "Choose a photo" : "Your checked image"}</EmptyTitle>
            <EmptyDescription>{title === "Before" ? "JPEG or PNG, up to 3 MB." : "Available only after verification."}</EmptyDescription>
          </EmptyHeader>
        </Empty>}
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <span>{inspection ? `${inspection.width} × ${inspection.height}` : "Not inspected"}</span>
        <span>{inspection ? `${inspection.format.toUpperCase()} · ${byteLabel(inspection.bytes)}` : "No result yet"}</span>
      </CardFooter>
    </Card>
  );
}

export function PhotoPrivacyDemo({ demo, liveUploads }: { demo: SanitizationResult | null; liveUploads: boolean }) {
  const [result, setResult] = useState(demo);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(demo ? "/demo/before.jpg" : undefined);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const localUrl = useRef<string | null>(null);

  useEffect(() => () => {
    requestRef.current?.abort();
    if (localUrl.current) URL.revokeObjectURL(localUrl.current);
  }, []);

  function releasePreview() {
    if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    localUrl.current = null;
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    requestRef.current?.abort();
    releasePreview();
    setResult(null); setError(""); setBusy(false); setFile(null); setPreview(undefined);
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!["image/jpeg", "image/png"].includes(selected.type) || !selected.size || selected.size > MAX_PHOTO_BYTES) {
      setError("Choose a JPEG or PNG no larger than 3 MB.");
      return;
    }
    localUrl.current = URL.createObjectURL(selected);
    setPreview(localUrl.current); setFile(selected);
  }

  function resetDemo() {
    requestRef.current?.abort(); releasePreview();
    if (inputRef.current) inputRef.current.value = "";
    setResult(demo); setPreview(demo ? "/demo/before.jpg" : undefined);
    setFile(null); setBusy(false); setError("");
  }

  async function processPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !liveUploads || busy) return;
    const controller = new AbortController(); requestRef.current = controller;
    setBusy(true); setResult(null); setError("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/sanitize", { method: "POST", body: form, signal: controller.signal });
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("The server could not process the photo. Please try again.");
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body?.error?.message === "string" ? body.error.message : "The photo could not be verified.");
      const checked = resultSchema.safeParse(body);
      if (!checked.success) throw new Error("The verification report was invalid. No download was released.");
      if (!controller.signal.aborted) setResult(checked.data);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "The photo could not be verified.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function downloadCheckedImage() {
    if (!result || downloading) return;
    setDownloading(true); setError("");
    try {
      const response = await fetch(result.image.src);
      if (!response.ok) throw new Error("The checked image is unavailable. Please try again.");
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      if (hash !== result.verification.sha256) throw new Error("The download did not match the checked image. No file was saved.");
      const url = URL.createObjectURL(new Blob([bytes], { type: result.image.mimeType }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = result.image.filename;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The download failed.");
    } finally { setDownloading(false); }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-7 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold"><MapPinOff className="size-5" aria-hidden="true" />Photo Privacy</Link>
        <Badge variant="outline">Powered by Cloudinary</Badge>
      </header>
      <main className="flex flex-col gap-6">
        <section className="flex flex-col gap-3 pt-3 sm:pt-6">
          <p className="eyebrow">Photo sharing, with less baggage</p>
          <h1 className="max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight sm:text-6xl">Share the photo.<br /><span className="text-muted-foreground">Not the location.</span></h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">Remove embedded GPS metadata with Cloudinary. Inspect the stored result, then download the exact image that passed the check.</p>
        </section>

        <Card>
          <CardHeader><CardTitle>Try the saved example, or choose your photo</CardTitle><CardDescription>The included image is synthetic. Its GPS values are fictitious.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={processPhoto} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <FieldGroup className="min-w-0 flex-1">
                <Field data-disabled={!liveUploads || busy} data-invalid={!!error && !result}>
                  <FieldLabel htmlFor="photo">Your photo</FieldLabel>
                  <Input ref={inputRef} id="photo" type="file" accept="image/jpeg,image/png" disabled={!liveUploads || busy} onChange={choosePhoto} aria-describedby="photo-hint" aria-invalid={!!error && !result} />
                  <FieldDescription id="photo-hint">{liveUploads ? "JPEG or PNG · up to 3 MB · no coordinates displayed" : "Live uploads are off on this public demo. The saved comparison works without an upload."}</FieldDescription>
                </Field>
              </FieldGroup>
              <div className="flex flex-wrap gap-2 sm:pb-6">
                <Button type="button" variant="outline" onClick={resetDemo} disabled={!demo || busy}>Use saved demo</Button>
                {liveUploads ? <Button type="submit" disabled={!file || busy}>{busy ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <ShieldCheck data-icon="inline-start" />}{busy ? "Processing…" : "Remove GPS metadata"}</Button> : null}
              </div>
            </form>
          </CardContent>
        </Card>

        {error ? <Alert variant="destructive"><AlertTitle>Nothing was released</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <section aria-label="Photo comparison" aria-busy={busy} className="grid min-w-0 gap-4 md:grid-cols-2">
          <PhotoCard title="Before" description={result?.source === "saved" ? "Saved synthetic input, with GPS metadata." : "Your input, previewed only in this browser."} src={preview} inspection={result?.before} />
          <PhotoCard title="After" description="Stored by Cloudinary, then independently inspected." src={result?.image.src} inspection={result?.after} />
        </section>

        <div role="status" aria-live="polite" className="sr-only">{busy ? "Cloudinary processing and verification in progress." : result ? "Verification complete. The checked image is available." : "No checked image available."}</div>

        {result ? <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1"><CardTitle>{result.verification.status === "gps_removed" ? "GPS metadata removed" : "No tested GPS fields detected"}</CardTitle><CardDescription>{result.source === "saved" ? `Saved result · checked ${checkedDate(result.verification.checkedAt)}` : "Current upload · stored asset read back and checked"}</CardDescription></div>
              <Badge variant="secondary"><Check data-icon="inline-start" />Stored file verified</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Table>
              <TableHeader><TableRow><TableHead>Metadata check</TableHead><TableHead>Before</TableHead><TableHead>After</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>Detected GPS fields</TableCell><TableCell>{result.before.gpsFields.length}</TableCell><TableCell>{result.after.gpsFields.length}</TableCell></TableRow>
                <TableRow><TableCell>Dimensions</TableCell><TableCell>{result.before.width} × {result.before.height}</TableCell><TableCell>{result.after.width} × {result.after.height}</TableCell></TableRow>
                <TableRow><TableCell>EXIF orientation</TableCell><TableCell>{result.before.orientation ?? "Not present"}</TableCell><TableCell>{result.after.orientation ?? "Not present"}</TableCell></TableRow>
              </TableBody>
            </Table>
            <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">See the field names and download checksum</summary><div className="mt-3 flex flex-col gap-3"><p className="break-words">{result.before.gpsFields.join(", ") || "No tested GPS fields detected in the input."}</p><p className="text-muted-foreground">SHA-256</p><code className="break-all text-xs">{result.verification.sha256}</code></div></details>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3">
            <p className="max-w-md text-sm text-muted-foreground">The download is checked against this checksum before it is saved.</p>
            <Button onClick={downloadCheckedImage} disabled={downloading}><ArrowDownToLine data-icon="inline-start" />{downloading ? "Checking download…" : "Download checked image"}</Button>
          </CardFooter>
        </Card> : null}

        <div className="flex flex-col gap-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2"><span>Inspect input</span><ArrowRight className="size-3" aria-hidden="true" /><span>Cloudinary strips GPS</span><ArrowRight className="size-3" aria-hidden="true" /><span>Read back & verify</span></div>
          <Separator />
          <p className="max-w-3xl">This checks supported embedded GPS fields, not anonymity or every kind of metadata. Faces, signs, addresses, and landmarks visible in a photo are unchanged. Processed uploads remain authenticated in Cloudinary; closing this page does not delete them.</p>
        </div>
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>Next.js + shadcn/ui + Cloudinary</span><a className="underline underline-offset-4" href="https://cloudinary.com/documentation/eager_and_incoming_transformations#incoming_transformations" target="_blank" rel="noreferrer">About incoming transformations ↗</a></footer>
    </div>
  );
}
