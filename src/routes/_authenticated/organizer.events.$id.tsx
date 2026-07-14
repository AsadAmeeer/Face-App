import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { getMyEvent, deleteEvent } from "@/lib/events.functions";
import { createPhotoUploadUrl, registerPhoto, deletePhoto } from "@/lib/photos.functions";
import { compressImage, runWithConcurrency } from "@/lib/image-compress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, ImagePlus, Trash2, ImageIcon, Share2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/organizer/events/$id")({
  component: EventDetail,
});

function EventDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getEv = useServerFn(getMyEvent);
  const del = useServerFn(deleteEvent);
  const getUpload = useServerFn(createPhotoUploadUrl);
  const register = useServerFn(registerPhoto);
  const delPhoto = useServerFn(deletePhoto);

  const { data, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEv({ data: { id } }),
  });

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList) => {
    if (!files.length) return;
    setUploading(true);
    const fileArray = Array.from(files);
    setProgress({ done: 0, total: fileArray.length });
    
    let uploadedCount = 0;

    const uploadSingleFile = async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}: not an image`);
        setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        return;
      }

      try {
        const compressedFile = await compressImage(file, { maxWidth: 2048, maxHeight: 2048, quality: 0.82 });
        const { path, signedUrl } = await getUpload({
          data: {
            event_id: id,
            filename: compressedFile.name,
            content_type: compressedFile.type,
          },
        });
        const put = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": compressedFile.type },
          body: compressedFile,
        });
        if (!put.ok) throw new Error(await put.text());
        await register({ data: { event_id: id, path } });
        uploadedCount++;
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
      } finally {
        setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    };

    await runWithConcurrency(4, fileArray, uploadSingleFile);

    setUploading(false);
    toast.success(`Uploaded ${uploadedCount} photo${uploadedCount === 1 ? "" : "s"}`);
    qc.invalidateQueries({ queryKey: ["event", id] });
  };

  const removePhoto = useMutation({
    mutationFn: (photo_id: string) => delPhoto({ data: { photo_id } }),
    onSuccess: () => { toast.success("Photo removed"); qc.invalidateQueries({ queryKey: ["event", id] }); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const deleteEv = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => { toast.success("Event deleted"); window.location.href = "/organizer"; },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6"><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div>
      </div>
    );
  }

  const { event, photos, searchCount } = data;
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.share_code}`;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link to="/organizer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All events
        </Link>

        <div className="mt-4 grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-black">{event.name}</h1>
            {event.description && <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              {event.event_date && <span>📅 {new Date(event.event_date).toLocaleDateString()}</span>}
              {event.location && <span>📍 {event.location}</span>}
              <span>🖼️ {photos.length} photos</span>
              <span>🔍 {searchCount} searches</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:min-w-[240px]">
            <div className="rounded-xl bg-primary-soft p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">Share code</div>
              <div className="mt-1 font-mono text-2xl font-black tracking-widest text-primary">{event.share_code}</div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(event.share_code); toast.success("Code copied"); }}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); }}>
                  <Share2 className="mr-1 h-3.5 w-3.5" /> Link
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Upload */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Photos</h2>
            <div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
              <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-gradient-hero text-primary-foreground shadow-soft hover:opacity-95">
                <ImagePlus className="mr-1.5 h-4 w-4" />
                {uploading ? `Uploading ${progress.done}/${progress.total}…` : "Upload photos"}
              </Button>
            </div>
          </div>

          {photos.length === 0 ? (
            <div
              className="mt-6 grid place-items-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center cursor-pointer hover:bg-muted/50"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files); }}
            >
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-semibold">Drop photos here or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">JPG or PNG · Any size, auto-optimized</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <img src={p.photo_url} alt="Event photo" className="h-full w-full object-cover" loading="lazy" />
                  <button
                    onClick={() => removePhoto.mutate(p.id)}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-black/60 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { if (confirm("Delete this event and all photos?")) deleteEv.mutate(); }}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete event
          </Button>
        </div>
      </div>
    </div>
  );
}
