import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lookupEventByCode } from "@/lib/events.functions";
import { createSelfieUploadUrl, runSearch } from "@/lib/search.functions";
import { compressImage } from "@/lib/image-compress";
import { useAuth } from "@/hooks/use-auth";
import {
  UploadCloud, Search, Download, ScanFace,
  Sparkles, ArrowRight, CheckCircle2, ImageIcon, Zap,
} from "lucide-react";

const searchSchema = z.object({ code: z.string().optional() });
export const Route = createFileRoute("/find")({
  head: () => ({ meta: [{ title: "Find your photos — EventFace" }, { name: "description", content: "Enter an event code and upload a selfie to find your photos." }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: FindPage,
});

type Match = { photo_id: string; photo_url: string; confidence: number };

/* ─── Circular Progress Ring ─── */
function RingProgress({ pct, size = 160 }: { pct: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={10}
        stroke="oklch(0.92 0.015 70)" fill="none" />
      {/* Progress arc */}
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={10}
        stroke="oklch(0.68 0.19 40)" fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.4s ease" }} />
    </svg>
  );
}

/* ─── Scan Line sweep overlay ─── */
function ScanOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <div className="scan-line absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
    </div>
  );
}

/* ─── Animated scanning panel ─── */
function ScanningPanel({ total, selfiePreview }: { total: number; selfiePreview: string | null }) {
  const [scanned, setScanned] = useState(0);
  const [matched, setMatched] = useState(0);

  /* Simulate scanning counter — runs until the real result arrives */
  useEffect(() => {
    if (total === 0) return;
    let current = 0;
    /* Spread scans across ~80% of a 45-second budget; slows near the end */
    const intervalMs = Math.max(120, Math.round((45_000 * 0.8) / total));
    const id = setInterval(() => {
      current++;
      setScanned((p) => Math.min(p + 1, total));
      /* Fake ~25% match rate for demo feel */
      if (Math.random() < 0.25) setMatched((p) => p + 1);
      if (current >= total) clearInterval(id);
    }, intervalMs);
    return () => clearInterval(id);
  }, [total]);

  const pct = total > 0 ? Math.round((scanned / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Top label */}
      <div className="flex items-center gap-2 text-sm font-semibold text-primary animate-pulse">
        <ScanFace className="h-4 w-4" />
        AI Face Scanning in Progress…
      </div>

      {/* Ring + selfie preview */}
      <div className="relative flex items-center justify-center">
        <RingProgress pct={pct} size={180} />
        {/* Centre: selfie thumb or icon */}
        <div className="absolute flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-muted shadow-lg">
          {selfiePreview ? (
            <>
              <img src={selfiePreview} alt="Your selfie" className="h-full w-full object-cover" />
              <ScanOverlay />
            </>
          ) : (
            <ScanFace className="h-10 w-10 text-primary animate-pulse" />
          )}
        </div>
        {/* Percentage badge */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-black text-white shadow">
          {pct}%
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-center">
        <div className="flex flex-col items-center">
          <div className="text-2xl font-black text-foreground tabular-nums">
            {scanned.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            of {total > 0 ? total.toLocaleString() : "—"} scanned
          </div>
        </div>
        <div className="w-px bg-border" />
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-2xl font-black text-primary tabular-nums">
            <CheckCircle2 className="h-5 w-5" />
            {matched}
          </div>
          <div className="text-xs text-muted-foreground">possible matches</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full overflow-hidden rounded-full bg-muted h-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-orange-400 to-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="w-full space-y-2">
        {[
          { label: "Uploading selfie", done: true },
          { label: "Extracting face embeddings", done: scanned > 0 },
          { label: `Comparing against ${total > 0 ? total : "…"} event photos`, done: false },
          { label: "Ranking matches by confidence", done: false },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            {s.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <div className={`h-4 w-4 shrink-0 rounded-full border-2 ${i === 2 && scanned > 0 ? "border-primary animate-pulse bg-primary/20" : "border-muted-foreground/30"}`} />
            )}
            <span className={s.done ? "text-foreground font-medium" : "text-muted-foreground"}>
              {s.label}
            </span>
            {i === 2 && scanned > 0 && (
              <span className="ml-auto font-mono text-xs text-primary">{scanned}/{total}</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        This may take up to a minute for large events. Please don't close this page.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════
   Main page
═══════════════════════════════════════ */
function FindPage() {
  const search = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const lookup = useServerFn(lookupEventByCode);
  const getSelfieUpload = useServerFn(createSelfieUploadUrl);
  const runFn = useServerFn(runSearch);

  const [step, setStep] = useState<"code" | "upload" | "scanning" | "results">("code");
  const [code, setCode] = useState(search.code ?? "");
  const [eventInfo, setEventInfo] = useState<{
    id: string; name: string; share_code: string; photo_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [results, setResults] = useState<{ matches: Match[]; total_scanned: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const info = await lookup({ data: { code: code.trim() } });
      setEventInfo({
        id: info.id,
        name: info.name,
        share_code: info.share_code,
        photo_count: (info as unknown as { photo_count: number }).photo_count ?? 0,
      });
      setStep("upload");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Event not found");
    } finally {
      setLoading(false);
    }
  };

  const submitSelfie = async (file: File) => {
    if (!eventInfo) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }

    /* Show selfie preview + scanning step immediately */
    const previewUrl = URL.createObjectURL(file);
    setSelfiePreview(previewUrl);
    setStep("scanning");

    try {
      const compressedFile = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.85 });
      const { path, signedUrl } = await getSelfieUpload({ data: { filename: compressedFile.name, content_type: compressedFile.type } });
      const put = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": compressedFile.type }, body: compressedFile });
      if (!put.ok) throw new Error("Selfie upload failed");
      const res = await runFn({ data: { share_code: eventInfo.share_code, selfie_path: path } });
      setResults({ matches: res.matches, total_scanned: res.total_scanned });
      setStep("results");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
      setStep("upload");
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const downloadAll = async () => {
    if (!results?.matches.length) return;
    const zip = new JSZip();
    toast.info("Preparing download…");
    await Promise.all(results.matches.map(async (m, i) => {
      try {
        const r = await fetch(m.photo_url);
        const blob = await r.blob();
        zip.file(`photo-${i + 1}.jpg`, blob);
      } catch { /* skip */ }
    }));
    const out = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(out);
    const a = document.createElement("a");
    a.href = url; a.download = `${eventInfo?.name ?? "photos"}.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">

        {/* ── STEP 1: Event Code ── */}
        {step === "code" && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Step 1 of 2
            </div>
            <h1 className="mt-4 text-3xl font-black">Enter your event code</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your organizer gave you an 8-character code.</p>
            <form onSubmit={submitCode} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Input required minLength={4} maxLength={16} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD2345" className="text-center font-mono text-2xl font-black tracking-widest sm:flex-1" />
              <Button type="submit" disabled={loading} size="lg" className="bg-gradient-hero text-primary-foreground shadow-soft hover:opacity-95">
                {loading ? "Checking…" : (<>Continue <ArrowRight className="ml-1 h-4 w-4" /></>)}
              </Button>
            </form>
          </div>
        )}

        {/* ── STEP 2: Upload Selfie ── */}
        {step === "upload" && eventInfo && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Step 2 of 2
            </div>
            <h1 className="mt-4 text-3xl font-black">Upload your selfie</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Searching in <b>{eventInfo.name}</b> · <span className="font-mono">{eventInfo.share_code}</span>
              {eventInfo.photo_count > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                  <ImageIcon className="h-3 w-3" /> {eventInfo.photo_count} photos
                </span>
              )}
            </p>

            {authLoading ? null : (
              <>
                {!user && (
                  <div className="mt-6 rounded-xl border border-border bg-muted/20 p-4 text-sm flex items-center justify-between gap-4">
                    <p className="text-muted-foreground">Searching as guest. Sign in to save your search history.</p>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/auth" search={{ mode: "signup" }}>Sign in</Link>
                    </Button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && submitSelfie(e.target.files[0])} />
                <div
                  className="mt-6 grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 text-center hover:bg-muted/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) submitSelfie(f); }}
                >
                  <UploadCloud className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 font-semibold">Click or drop your selfie here</p>
                  <p className="mt-1 text-xs text-muted-foreground">A clear photo of your face works best · auto-optimized</p>
                </div>
                <button className="mt-3 text-xs text-muted-foreground hover:text-foreground" onClick={() => setStep("code")}>← Change event</button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 2.5: Scanning Progress ── */}
        {step === "scanning" && eventInfo && (
          <div className="rounded-2xl border border-primary/30 bg-card p-8 shadow-glow">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Zap className="h-3.5 w-3.5 animate-pulse" /> Scanning · {eventInfo.name}
            </div>
            <ScanningPanel total={eventInfo.photo_count} selfiePreview={selfiePreview} />
          </div>
        )}

        {/* ── STEP 3: Results ── */}
        {step === "results" && results && (
          <div>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-black">
                  {results.matches.length} photo{results.matches.length === 1 ? "" : "s"} found
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scanned {results.total_scanned} event photo{results.total_scanned === 1 ? "" : "s"} in <b>{eventInfo?.name}</b>
                </p>
              </div>
              {results.matches.length > 0 && (
                <Button onClick={downloadAll} className="bg-gradient-hero text-primary-foreground shadow-soft hover:opacity-95">
                  <Download className="mr-1.5 h-4 w-4" /> Download all
                </Button>
              )}
            </div>

            {results.matches.length === 0 ? (
              <div className="mt-8 rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
                <Search className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-bold">No matches yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try a clearer selfie or ask the organizer if photos have been uploaded.</p>
                <Button onClick={() => setStep("upload")} className="mt-6 bg-gradient-hero text-primary-foreground shadow-soft">Try another selfie</Button>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {results.matches.map((m) => (
                  <a key={m.photo_id} href={m.photo_url} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                    <img src={m.photo_url} alt="Matched photo" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs font-semibold text-white">
                      {Math.round(m.confidence)}% match
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
