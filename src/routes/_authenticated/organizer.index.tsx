import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyEvents } from "@/lib/events.functions";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Copy, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/organizer/")({
  component: OrganizerDashboard,
});

function OrganizerDashboard() {
  const list = useServerFn(listMyEvents);
  const { data, isLoading } = useQuery({ queryKey: ["my-events"], queryFn: () => list() });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Your events</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create events, upload photos, and share codes with attendees.</p>
          </div>
          <Button asChild className="bg-gradient-organizer text-organizer-foreground shadow-soft hover:opacity-95">
            <Link to="/organizer/events/new"><Plus className="mr-1.5 h-4 w-4" /> New event</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0,1,2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="mt-16 rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-bold">No events yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create your first event to start uploading photos.</p>
            <Button asChild className="mt-6 bg-gradient-organizer text-organizer-foreground shadow-soft">
              <Link to="/organizer/events/new">Create your first event</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((e) => (
              <Link
                key={e.id}
                to="/organizer/events/$id"
                params={{ id: e.id }}
                className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-glow"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {e.event_date ? new Date(e.event_date).toLocaleDateString() : "No date"}
                </div>
                <h3 className="mt-1 line-clamp-1 text-lg font-bold">{e.name}</h3>
                {e.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={(evt) => { evt.preventDefault(); navigator.clipboard.writeText(e.share_code); toast.success("Code copied"); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-mono font-bold text-accent-foreground hover:bg-primary-soft/70"
                  >
                    {e.share_code} <Copy className="h-3 w-3" />
                  </button>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
