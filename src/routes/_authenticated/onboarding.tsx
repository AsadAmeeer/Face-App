import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { chooseRole } from "@/lib/roles.functions";
import { Users, Camera } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const pick = useServerFn(chooseRole);
  const [loading, setLoading] = useState<null | "organizer" | "attendee">(null);

  const choose = async (role: "organizer" | "attendee") => {
    setLoading(role);
    try {
      await pick({ data: { role } });
      toast.success("You're all set!");
      navigate({ to: role === "organizer" ? "/organizer" : "/attendee" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h1 className="text-4xl font-black">How will you use EventFace?</h1>
          <p className="mt-3 text-muted-foreground">Choose your role. You can add another later.</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <button
            disabled={!!loading}
            onClick={() => choose("attendee")}
            className="group rounded-2xl border-2 border-border bg-card p-8 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-glow disabled:opacity-60"
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-soft">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-bold">I'm an Attendee</h2>
            <p className="mt-1 text-sm text-muted-foreground">Find photos of yourself from events you attended.</p>
            <div className="mt-6 text-sm font-semibold text-primary">
              {loading === "attendee" ? "Setting up…" : "Continue as attendee →"}
            </div>
          </button>

          <button
            disabled={!!loading}
            onClick={() => choose("organizer")}
            className="group rounded-2xl border-2 border-border bg-card p-8 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-organizer hover:shadow-glow disabled:opacity-60"
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-organizer text-organizer-foreground shadow-soft">
              <Camera className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-bold">I'm an Organizer</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create events and upload photos for attendees to discover.</p>
            <div className="mt-6 text-sm font-semibold text-organizer">
              {loading === "organizer" ? "Setting up…" : "Continue as organizer →"}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
