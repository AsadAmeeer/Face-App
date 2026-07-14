import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth, optionalSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Selfie upload URL (attendee scope: uid/<uuid> or anonymous/<uuid>)
export const createSelfieUploadUrl = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      filename: z.string().min(1).max(200),
      content_type: z.string().min(3).max(60),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = userId ? `${userId}/${crypto.randomUUID()}-${safe}` : `anonymous/${crypto.randomUUID()}-${safe}`;
    const { data: signed, error } = await supabase.storage.from("selfies").createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, signedUrl: signed.signedUrl };
  });

// Run search: find event by share_code, batch-compare selfie against event photos with Gemini.
export const runSearch = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      share_code: z.string().trim().min(4).max(16),
      selfie_path: z.string().min(3),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Resolve event
    const { data: event, error: eErr } = await supabase
      .from("events")
      .select("id, name, share_code")
      .eq("share_code", data.share_code.toUpperCase())
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (!event) throw new Error("Event not found.");

    // Sign selfie URL for Gemini access
    const { data: selfieSigned, error: sErr } = await supabase.storage
      .from("selfies")
      .createSignedUrl(data.selfie_path, 60 * 30);
    if (sErr || !selfieSigned?.signedUrl) throw new Error("Could not read selfie.");

    // Load event photos
    const { data: photos } = await supabase
      .from("event_photos")
      .select("id, photo_url, storage_path")
      .eq("event_id", event.id);
    const photoList = photos ?? [];

    // Insert session
    const { data: session, error: siErr } = await supabase
      .from("search_sessions")
      .insert({
        event_id: event.id,
        attendee_id: userId,
        selfie_url: selfieSigned.signedUrl,
        status: "processing",
      })
      .select("*")
      .single();
    if (siErr) throw new Error(siErr.message);

    if (photoList.length === 0) {
      await supabase.from("search_sessions").update({ status: "done", match_count: 0 }).eq("id", session.id);
      return { session_id: session.id, event: { id: event.id, name: event.name }, matches: [], total_scanned: 0 };
    }

    // Refresh photo signed URLs (they might be stale)
    const refreshed: Array<{ id: string; photo_url: string }> = [];
    for (const p of photoList) {
      const { data: s } = await supabase.storage
        .from("event-photos")
        .createSignedUrl(p.storage_path, 60 * 60);
      refreshed.push({ id: p.id, photo_url: s?.signedUrl ?? p.photo_url });
    }

    // One-by-one strict face verification for maximum accuracy.
    const { matchSelfieAgainstPhotos } = await import("./facematch.server");
    const rawMatches = await matchSelfieAgainstPhotos(
      selfieSigned.signedUrl,
      refreshed,
    );

    // Persist matches
    if (rawMatches.length > 0) {
      await supabase.from("matches").insert(
        rawMatches.map((m) => ({ session_id: session.id, photo_id: m.photo_id, confidence: m.confidence })),
      );
    }

    await supabase
      .from("search_sessions")
      .update({ status: "done", match_count: rawMatches.length })
      .eq("id", session.id);

    // Return with fresh signed URLs
    const byId = new Map(refreshed.map((r) => [r.id, r.photo_url]));
    const results = rawMatches
      .sort((a, b) => b.confidence - a.confidence)
      .map((m) => ({
        photo_id: m.photo_id,
        photo_url: byId.get(m.photo_id) ?? "",
        confidence: m.confidence,
      }));

    return {
      session_id: session.id,
      event: { id: event.id, name: event.name },
      matches: results,
      total_scanned: refreshed.length,
    };
  });

export const listMySearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("search_sessions")
      .select("id, event_id, match_count, created_at, events(name, share_code)")
      .eq("attendee_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data;
  });
