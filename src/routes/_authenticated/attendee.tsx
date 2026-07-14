import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMySearches } from "@/lib/search.functions";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Search, Camera } from "lucide-react";

export const Route = createFileRoute("/_authenticated/attendee")({
  component: AttendeeDashboard,
});

function AttendeeDashboard() {
  const fn = useServerFn(listMySearches);
  const { data, isLoading } = useQuery({ queryKey: ["my-searches"], queryFn: () => fn() });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Your searches</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every event you've searched for photos in.</p>
          </div>
          <Button asChild className="bg-gradient-hero text-primary-foreground shadow-soft hover:opacity-95">
            <Link to="/find"><Search className="mr-1.5 h-4 w-4" /> New search</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="mt-8 h-40 animate-pulse rounded-2xl bg-muted" />
        ) : !data || data.length === 0 ? (
          <div className="mt-14 rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
            <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-bold">No searches yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Enter an event code to find photos of yourself.</p>
            <Button asChild className="mt-6 bg-gradient-hero text-primary-foreground shadow-soft">
              <Link to="/find">Find my photos</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {data.map((s) => {
              const eventName = (s as unknown as { events: { name: string; share_code: string } }).events;
              return (
                <li key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-soft">
                  <div>
                    <div className="font-semibold">{eventName?.name ?? "Event"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()} · {s.match_count} match{s.match_count === 1 ? "" : "es"}
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/find" search={{ code: eventName?.share_code }}>Search again</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
