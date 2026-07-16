import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  Sparkles, ScanFace, ShieldCheck, Zap, Calendar,
  UploadCloud, Cpu, Search, ImageIcon, ArrowRight, CheckCircle2, Users, Camera, Target,
} from "lucide-react";
import heroPortrait from "@/assets/hero-portrait.jpg";
import heroTile1 from "@/assets/hero-tile-1.jpg";
import heroTile2 from "@/assets/hero-tile-2.jpg";
import heroTile3 from "@/assets/hero-tile-3.jpg";
import heroTile4 from "@/assets/hero-tile-4.jpg";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  // SSR off: session lives in localStorage, can only be checked client-side
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      // Already logged in → go to attendee dashboard
      throw redirect({ to: "/attendee" });
    }
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen page-warm">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden flex items-center" style={{ height: "calc(100vh - 64px)" }}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-soft/40 via-transparent to-transparent" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-2">
          {/* LEFT: copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary shadow-soft">
              <Sparkles className="h-3.5 w-3.5" /> AI Powered Photo Discovery
            </div>
            <h1 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Find Your <br />
              Moments. <br />
              <span className="bg-gradient-hero bg-clip-text text-transparent">From Every Event.</span>
            </h1>
            <p className="mt-3 max-w-lg text-base text-muted-foreground">
              Upload a selfie and instantly discover all the photos where you appear.
              Powered by advanced AI face recognition.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90">
                <Link to="/find">
                  <UploadCloud className="mr-2 h-4 w-4" /> Find My Photos
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary/30 bg-card text-primary hover:bg-primary-soft">
                <Link to="/auth" search={{ mode: "signup" }}>
                  <Calendar className="mr-2 h-4 w-4" /> SignUp For Organize an Event
                </Link>
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <TrustPill icon={<ShieldCheck className="h-4 w-4" />} title="100% Secure" subtitle="Your data is private" tone="primary" />
              <TrustPill icon={<Zap className="h-4 w-4" />} title="Lightning Fast" subtitle="Results in seconds" tone="success" />
              <TrustPill icon={<Target className="h-4 w-4" />} title="Highly Accurate" subtitle="Advanced AI technology" tone="success" />
            </div>
          </div>

          {/* RIGHT: collage */}
          <div className="relative mx-auto aspect-square w-full max-w-[480px]">
            {/* Big center circular portrait with face-detection frame */}
            <div className="absolute left-1/2 top-1/2 aspect-square w-[62%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-[6px] border-white shadow-2xl ring-4 ring-primary/20">
              <img src={heroPortrait} alt="Smiling attendee portrait" className="h-full w-full object-cover" />
              <div className="absolute left-1/2 top-1/2 h-[42%] w-[42%] -translate-x-1/2 -translate-y-[45%] rounded-md border-[3px] border-primary shadow-[0_0_0_2px_rgba(255,255,255,0.4)]">
                <span className="absolute -top-[3px] -left-[3px] h-3 w-3 border-t-[3px] border-l-[3px] border-primary" />
                <span className="absolute -top-[3px] -right-[3px] h-3 w-3 border-t-[3px] border-r-[3px] border-primary" />
                <span className="absolute -bottom-[3px] -left-[3px] h-3 w-3 border-b-[3px] border-l-[3px] border-primary" />
                <span className="absolute -bottom-[3px] -right-[3px] h-3 w-3 border-b-[3px] border-r-[3px] border-primary" />
              </div>
            </div>

            {/* Corner event tiles */}
            {[
              { src: heroTile1, alt: "Group of friends at an evening party", cls: "top-[2%] left-[-4%] w-[38%] -rotate-[8deg]" },
              { src: heroTile2, alt: "Two friends laughing with confetti", cls: "top-[6%] right-[-6%] w-[36%] rotate-[7deg]" },
              { src: heroTile3, alt: "Concert crowd with stage lights", cls: "bottom-[10%] left-[-6%] w-[34%] rotate-[6deg]" },
              { src: heroTile4, alt: "Friends celebrating outdoors", cls: "bottom-[2%] right-[-4%] w-[40%] -rotate-[6deg]" },
            ].map((t, i) => (
              <div
                key={i}
                className={`absolute overflow-hidden rounded-xl border-[5px] border-white bg-white shadow-2xl ${t.cls}`}
                style={{ aspectRatio: "4 / 3" }}
              >
                <img src={t.src} alt={t.alt} loading="lazy" className="h-full w-full object-cover" />
              </div>
            ))}

            {/* Upload selfie pill button */}
            <Link
              to="/find"
              className="group absolute left-1/2 bottom-[6%] flex -translate-x-1/2 flex-col items-center gap-2"
            >
              <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-hero text-white shadow-glow transition-transform group-hover:scale-105">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="rounded-full border border-primary/25 bg-card/90 px-5 py-2 text-center shadow-soft backdrop-blur">
                <div className="text-sm font-bold text-primary">Upload Selfie</div>
                <div className="text-[11px] text-muted-foreground">or drag &amp; drop</div>
              </div>
            </Link>

            {/* Floating stats card */}
            <div className="absolute -bottom-6 -right-4 hidden w-64 rounded-2xl border border-border bg-card p-4 shadow-glow sm:block">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-black text-foreground">118</div>
                  <div className="text-xs text-muted-foreground">Photos Found</div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div className="mt-3 flex items-center gap-3 border-t border-border/60 pt-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-success">
                  <Search className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-black text-foreground">
                    388 <span className="text-sm font-semibold text-muted-foreground">Searches</span>
                  </div>
                  <div className="text-xs text-muted-foreground">This month</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section id="features" className="bg-primary-soft/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-4xl font-black sm:text-5xl">
            Why Choose <span className="bg-gradient-hero bg-clip-text text-transparent">EventFace?</span>
          </h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-primary" />
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={<ScanFace className="h-5 w-5" />} title="Advanced AI Technology"
              body="State-of-the-art face recognition ensures accurate results even in crowded events." />
            <FeatureCard icon={<ShieldCheck className="h-5 w-5" />} title="Your Privacy Matters"
              body="Your photos are secure and private. We never share your data with anyone." />
            <FeatureCard icon={<Zap className="h-5 w-5" />} title="Lightning Fast"
              body="Get results in seconds, not minutes. Optimized for speed and accuracy." />
            <FeatureCard icon={<Calendar className="h-5 w-5" />} title="Multiple Events"
              body="Search across multiple events and find all your moments in one place." />
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-4xl font-black sm:text-5xl">
            How It <span className="text-success">Works</span>
          </h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-success" />
          <div className="mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <StepCard n={1} icon={<UploadCloud className="h-6 w-6" />} title="Upload Selfie"
              body="Upload a clear selfie photo of yourself." />
            <StepCard n={2} icon={<Cpu className="h-6 w-6" />} title="AI Analysis"
              body="Our AI analyzes your face features securely." />
            <StepCard n={3} icon={<Search className="h-6 w-6" />} title="Search Photos"
              body="We search through all event photos for matches." />
            <StepCard n={4} icon={<ImageIcon className="h-6 w-6" />} title="Get Results"
              body="View all photos where you appear, instantly!" />
          </div>

          <div className="mt-16 grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Users className="h-5 w-5" />} value="10K+" label="Events Processed" tint="bg-primary-soft text-primary" />
            <Stat icon={<Camera className="h-5 w-5" />} value="2M+" label="Photos Analyzed" tint="bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300" />
            <Stat icon={<CheckCircle2 className="h-5 w-5" />} value="50K+" label="Happy Users" tint="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300" />
            <Stat icon={<Target className="h-5 w-5" />} value="99.9%" label="Accuracy Rate" tint="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300" />
          </div>
        </div>
      </section>

      {/* ORGANIZERS */}
      <section id="organizers" className="bg-gradient-to-br from-orange-50 to-amber-50 py-20 dark:from-orange-950/20 dark:to-amber-950/20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-700">
              <Sparkles className="h-3.5 w-3.5" /> For Event Organizers
            </div>
            <h2 className="mt-6 text-4xl font-black sm:text-5xl">
              Elevate Your Events <br /> with <span className="bg-gradient-organizer bg-clip-text text-transparent">AI</span>
            </h2>
            <p className="mt-4 max-w-lg text-muted-foreground">
              Provide an amazing experience for your attendees with our advanced photo discovery system.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Easy event management",
                "Bulk photo upload",
                "Attendee insights",
                "White-label solutions",
              ].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-organizer" /> {b}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button asChild size="lg" className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Explore for Organizers <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-glow">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Camera className="h-4 w-4 text-primary" /> EventFace
              </div>
              <div className="text-xs text-muted-foreground">Dashboard</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { l: "Total Events", v: "24" },
                { l: "Total Photos", v: "15,320" },
                { l: "Attendees", v: "8,450" },
                { l: "Matches Found", v: "12,890" },
              ].map((c) => (
                <div key={c.l} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">{c.l}</div>
                  <div className="mt-1 text-lg font-black">{c.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function FeaturePill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-primary-soft text-accent-foreground">{icon}</span>
      {children}
    </span>
  );
}

function TrustPill({
  icon,
  title,
  subtitle,
  tone = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone?: "primary" | "success";
}) {
  const toneClass =
    tone === "success"
      ? "bg-muted text-success"
      : "bg-primary-soft text-primary";
  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-10 w-10 place-items-center rounded-full ${toneClass}`}>{icon}</span>
      <div className="leading-tight">
        <div className="text-sm font-bold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}



function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-transform hover:-translate-y-0.5">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-accent-foreground">{icon}</div>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function StepCard({ n, icon, title, body }: { n: number; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="relative text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-success/40 bg-success/5 text-success">
        {icon}
      </div>
      <h3 className="mt-5 font-bold">{n}. {title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Stat({ icon, value, label, tint }: { icon: React.ReactNode; value: string; label: string; tint: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${tint}`}>{icon}</div>
      <div>
        <div className="text-xl font-black">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
