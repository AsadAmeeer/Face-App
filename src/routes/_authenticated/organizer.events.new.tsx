import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site-header";
import { createEvent } from "@/lib/events.functions";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/organizer/events/new")({
  component: NewEvent,
});

function NewEvent() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const create = useServerFn(createEvent);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ev = await create({ data: { name, description: description || null, event_date: eventDate || null, location: location || null } });
      toast.success("Event created!");
      nav({ to: "/organizer/events/$id", params: { id: ev.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Link to="/organizer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to events
        </Link>
        <h1 className="mt-4 text-3xl font-black">Create a new event</h1>
        <p className="mt-1 text-sm text-muted-foreground">A unique share code will be generated automatically for your attendees.</p>

        <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-1.5">
            <Label htmlFor="name">Event name *</Label>
            <Input id="name" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tech Summit 2026" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco, CA" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" maxLength={1000} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell attendees what this event is about." />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-organizer text-organizer-foreground shadow-soft hover:opacity-95">
            {loading ? "Creating…" : "Create event"}
          </Button>
        </form>
      </div>
    </div>
  );
}
