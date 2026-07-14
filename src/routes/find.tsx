import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupEventByCode } from "@/lib/events.functions";
import { createSelfieUploadUrl, runSearch } from "@/lib/search.functions";
import { compressImage } from "@/lib/image-compress";
import { useAuth } from "@/hooks/use-auth";
import { UploadCloud, Search, Download, ScanFace, Sparkles, ArrowRight } from "lucide-react";

const searchSchema = z.object({ code: z.string().optional() });
export const Route = createFileRoute("/find")({
  head: () => ({ meta: [{ title: "Find your photos — EventFace" }, { name: "description", content: "Enter an event code and upload a selfie to find your photos." }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: FindPage,
});

type Match = { photo_id: string; photo_url: string; confidence: number };

function FindPage() {
  const search = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const lookup = useServerFn(lookupEventByCode);
  const getSelfieUpload = useServerFn(createSelfieUploadUrl);
  const runFn = useServerFn(runSearch);

  const [step, setStep] = useState<"code" | "upload" | "results">("code");
  const [code, setCode] = useState(search.code ?? "");
  const [eventInfo, setEventInfo] = useState<{ id: string; name: string; share_code: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ matches: Match[]; total_scanned: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const info = await lookup({ data: { code: code.trim() } });
      setEventInfo({ id: info.id, name: info.name, share_code: info.share_code });
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
    setLoading(true);
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
    } finally {
      setLoading(false);
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

        {step === "upload" && eventInfo && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Step 2 of 2
            </div>
            <h1 className="mt-4 text-3xl font-black">Upload your selfie</h1>
            <p className="mt-1 text-sm text-muted-foreground">Searching in <b>{eventInfo.name}</b> · code <span className="font-mono">{eventInfo.share_code}</span></p>

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
                  className="mt-6 grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 text-center hover:bg-muted/50"
                  onClick={() => !loading && fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) submitSelfie(f); }}
                >
                  {loading ? (
                    <>
                      <ScanFace className="h-10 w-10 animate-pulse text-primary" />
                      <p className="mt-3 font-semibold">Scanning event photos…</p>
                      <p className="mt-1 text-xs text-muted-foreground">This may take up to a minute for large events.</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-10 w-10 text-muted-foreground" />
                      <p className="mt-3 font-semibold">Click or drop your selfie here</p>
                      <p className="mt-1 text-xs text-muted-foreground">A clear photo of your face works best · auto-optimized</p>
                    </>
                  )}
                </div>
                <button className="mt-3 text-xs text-muted-foreground hover:text-foreground" onClick={() => setStep("code")}>← Change event</button>
              </>
            )}
          </div>
        )}

        {step === "results" && results && (
          <div>
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
