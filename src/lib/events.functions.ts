import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CreateEventInput = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  event_date: z.string().optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
});

function randCode(n = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateEventInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Ensure organizer role
    await supabase.from("user_roles").upsert({ user_id: userId, role: "organizer" }, { onConflict: "user_id,role" });

    // Retry a few times in case of code collision
    let attempts = 0;
    let inserted;
    while (attempts++ < 5) {
      const code = randCode(8);
      const { data: row, error } = await supabase
        .from("events")
        .insert({
          organizer_id: userId,
          name: data.name,
          description: data.description ?? null,
          event_date: data.event_date || null,
          location: data.location ?? null,
          share_code: code,
        })
        .select("*")
        .single();
      if (!error) { inserted = row; break; }
      if (!/share_code/.test(error.message)) throw new Error(error.message);
    }
    if (!inserted) throw new Error("Could not generate a unique event code, please retry.");
    return inserted;
  });

export const listMyEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("events")
      .select("id, name, description, event_date, location, share_code, created_at")
      .eq("organizer_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getMyEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", data.id)
      .eq("organizer_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) throw new Error("Event not found");

    const { data: photos } = await supabase
      .from("event_photos")
      .select("id, photo_url, storage_path, created_at")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false });

    const { count: searchCount } = await supabase
      .from("search_sessions")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);

    return { event, photos: photos ?? [], searchCount: searchCount ?? 0 };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("events").delete().eq("id", data.id).eq("organizer_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public: look up event by share_code (no auth)
export const lookupEventByCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().trim().min(4).max(16) }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data: event, error } = await supabase
      .from("events")
      .select("id, name, description, event_date, location, share_code, cover_url")
      .eq("share_code", data.code.trim().toUpperCase())
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!event) throw new Error("Event not found");

    // Count how many photos are in this event
    const { count } = await supabase
      .from("event_photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id);

    return { ...event, photo_count: count ?? 0 };
  });