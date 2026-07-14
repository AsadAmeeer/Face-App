# EventFace — Full Build Plan

Redesign the whole app to match the EventFace reference layout and ship a production-ready photo-discovery platform.

## Auth & Roles

- Lovable Cloud (Supabase) auth: email/password + Google.
- Every signup creates a `profiles` row (display name, avatar) via trigger.
- Separate `user_roles` table with enum `app_role` = `organizer | attendee | admin`. Users pick their role on first login; a `has_role()` security-definer function drives RLS.

## Data Model (Postgres + RLS + GRANTs)

- `profiles` — id → auth.users, full_name, avatar_url.
- `user_roles` — user_id, role.
- `events` — id (uuid), organizer_id, name, description, event_date, cover_url, share_code (short 8-char unique code shown to attendees), created_at.
- `event_photos` — id, event_id, storage_path, public_url, uploaded_by, faceset_synced (bool), created_at.
- `face_tokens` — id, photo_id, event_id, facepp_face_token, bbox jsonb — one row per detected face.
- `search_sessions` — id, event_id, attendee_id, selfie_path, created_at.
- `matches` — id, session_id, photo_id, confidence.

RLS:
- Events: public SELECT (so attendees can look up by share_code), organizer-only INSERT/UPDATE/DELETE.
- Photos: public SELECT (needed to render matched thumbnails), organizer-only write scoped to their events.
- face_tokens: service-role only (private).
- search_sessions & matches: attendee owns their rows; organizers of the event can also read (analytics).

## Storage

- Bucket `event-photos` (public read) — organizers upload originals here.
- Bucket `selfies` (private) — attendee selfie uploads, signed URL access.

## Face Recognition — Face++

Face++ FaceSet-per-event pattern:
1. On event create, server fn calls Face++ `/facesetv2/create` → stores `faceset_token` on `events`.
2. On each photo upload: server fn calls `/detect` on the uploaded image URL → for every face token, `POST /facesetv2/addface` to the event's faceset, insert `face_tokens` row.
3. On selfie search: server fn calls `/detect` on selfie → takes largest face → `POST /searchv2` against event's faceset → for each result above threshold (75), join to `face_tokens` → return matched photos with confidence.

FACEPP_API_KEY and FACEPP_API_SECRET stored as secrets.

## Server Functions (createServerFn, all auth-gated as needed)

- `createEvent` — organizer creates event + Face++ faceset.
- `listMyEvents` — organizer's events.
- `getEventByCode` — public, resolves share_code → event summary.
- `getSignedPhotoUpload` — returns signed Supabase upload URL (organizer only).
- `registerPhoto` — after client upload, records row + runs Face++ detect/enroll.
- `deletePhoto` — organizer only, cleans up Face++ faceset + storage.
- `getSignedSelfieUpload` — attendee only.
- `searchFaces` — attendee submits selfie path + share_code → runs Face++ search → returns matched photo URLs.
- `getMySearchHistory` — attendee's past searches.

Public API route `src/routes/api/public/webhook-facepp.ts` reserved for async callbacks (not required by v1 but scaffolded).

## Frontend — Apply EventFace layout throughout

Design tokens rewritten in `src/styles.css`:
- Purple primary (`oklch(0.55 0.24 285)`), green accent, orange organizer accent.
- Plus Jakarta Sans / Inter typography via link tag in `__root.tsx`.
- Custom button variants: `hero` (gradient purple), `outlineSoft`, `organizer` (orange gradient).
- Card with soft purple tint variant.

Routes:
- `/` — landing (hero + Why + How it Works + For Organizers + footer) exactly matching reference composition.
- `/auth` — sign in / sign up with Google + email.
- `/find` — attendee flow: enter event code → upload selfie → results grid with download.
- `/_authenticated/onboarding` — pick role on first login.
- `/_authenticated/organizer` — dashboard listing events + stats (events, photos, matches).
- `/_authenticated/organizer/events/new` — create event.
- `/_authenticated/organizer/events/$id` — event detail: bulk photo upload (drag-drop), photos grid, share code display, delete.
- `/_authenticated/attendee` — attendee dashboard: past searches + saved photos.
- Public shareable `/e/$code` — event landing page for attendees to jump into search.

Shared components: `SiteHeader`, `SiteFooter`, `SectionHeading`, `FeatureCard`, `StepCard`, `StatCard`, `PhotoDropzone`, `MatchGrid`.

## Assets

Generate hero collage image (selfie card + attendee photo cards) and any needed icons; use lucide-react everywhere else.

## SEO

Per-route `head()` with unique title/description; sitemap.xml + robots.txt.

## Production polish

- Zod validation on every server fn input.
- Toast feedback (sonner) on all mutations.
- Loading states + skeletons on lists.
- Empty states for zero events / photos / matches.
- Error boundaries per route with retry.
- File-size limit (10MB) and MIME check on uploads.
- Confidence threshold configurable per event (default 75).

## Technical Details

- Face++ base URL: `https://api-us.faceapp.com/facepp/v3`.
- All Face++ calls in `src/lib/facepp.server.ts`, invoked only via `.handler()` bodies (lazy import).
- Photos uploaded straight to Supabase storage from the browser using signed URL; server fn then calls Face++ with the resulting public URL.
- Matches returned with public URL + confidence; results page offers "Download all" via JSZip.

Build proceeds in this order once approved: Cloud enable → schema → auth pages + role gate → design tokens → landing → organizer flow → attendee flow → polish.