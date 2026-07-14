import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { lookupEventByCode } from "@/lib/events.functions";
import { Search, Calendar, MapPin } from "lucide-react";

export const Route = createFileRoute("/e/$code")({
  component: EventLandingPage,
});

function EventLandingPage() {
  const { code } = Route.useParams();
  const nav = useNavigate();
  const lookup = useServerFn(lookupEventByCode);
  const [event, setEvent] = useState<{ id: string; name: string; description: string | null; event_date: string | null; location: string | null; share_code: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    lookup({ data: { code } }).then((e) => setEvent(e)).catch(() => setNotFound(true));
  }, [code, lookup]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
          <h1 className="text-3xl font-black">Event not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">Double-check the code from your organizer.</p>
          <Button asChild className="mt-6"><Link to="/find">Try another code</Link></Button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6"><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Event</div>
          <h1 className="mt-2 text-4xl font-black">{event.name}</h1>
          {event.description && <p className="mt-3 text-muted-foreground">{event.description}</p>}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {event.event_date && <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(event.event_date).toLocaleDateString()}</span>}
            {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {event.location}</span>}
          </div>
          <Button
            size="lg"
            onClick={() => nav({ to: "/find", search: { code: event.share_code } })}
            className="mt-6 bg-gradient-hero text-primary-foreground shadow-soft hover:opacity-95"
          >
            <Search className="mr-1.5 h-4 w-4" /> Find my photos
          </Button>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
