import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Get a signed URL an organizer can PUT a photo file to.
export const createPhotoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      event_id: z.string().uuid(),
      filename: z.string().min(1).max(200),
      content_type: z.string().min(3).max(60),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify organizer owns event
    const { data: event, error: eErr } = await supabase
      .from("events")
      .select("id")
      .eq("id", data.event_id)
      .eq("organizer_id", userId)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (!event) throw new Error("Not your event.");

    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.event_id}/${crypto.randomUUID()}-${safe}`;

    const { data: signed, error } = await supabase.storage
      .from("event-photos")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);

    return { path, signedUrl: signed.signedUrl, token: signed.token };
  });

// After the file is uploaded, register it in the DB.
export const registerPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ event_id: z.string().uuid(), path: z.string().min(3) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", data.event_id)
      .eq("organizer_id", userId)
      .maybeSingle();
    if (!event) throw new Error("Not your event.");

    // Create a 7-day signed URL to store for display
    const { data: signed, error: sErr } = await supabase.storage
      .from("event-photos")
      .createSignedUrl(data.path, 60 * 60 * 24 * 7);
    if (sErr) throw new Error(sErr.message);

    const { data: row, error } = await supabase
      .from("event_photos")
      .insert({
        event_id: data.event_id,
        storage_path: data.path,
        photo_url: signed.signedUrl,
        uploaded_by: userId,
        processed: true,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// Rotate all signed URLs for an event when displaying to organizer.
export const refreshPhotoUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ event_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: event } = await supabase
      .from("events")
      .select("id, organizer_id")
      .eq("id", data.event_id)
      .maybeSingle();
    if (!event || event.organizer_id !== userId) throw new Error("Not your event.");

    const { data: photos } = await supabase
      .from("event_photos")
      .select("id, storage_path")
      .eq("event_id", data.event_id);

    if (!photos) return { updated: 0 };

    for (const p of photos) {
      const { data: signed } = await supabase.storage
        .from("event-photos")
        .createSignedUrl(p.storage_path, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) {
        await supabase.from("event_photos").update({ photo_url: signed.signedUrl }).eq("id", p.id);
      }
    }
    return { updated: photos.length };
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ photo_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: photo } = await supabase
      .from("event_photos")
      .select("id, storage_path, event_id, events!inner(organizer_id)")
      .eq("id", data.photo_id)
      .maybeSingle() as { data: null | { id: string; storage_path: string; event_id: string; events: { organizer_id: string } } };
    if (!photo || photo.events.organizer_id !== userId) throw new Error("Not your photo.");
    await supabase.storage.from("event-photos").remove([photo.storage_path]);
    const { error } = await supabase.from("event_photos").delete().eq("id", data.photo_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
