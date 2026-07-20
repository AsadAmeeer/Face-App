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
      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section
        className="relative overflow-hidden flex items-center min-h-[calc(100vh-64px)] py-12 lg:py-0"
        style={{ background: "#FCFBF8" }}
      >
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* Orange blob top-right */}
          <div style={{
            position: "absolute", top: "-8%", right: "-6%",
            width: "480px", height: "480px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,146,60,0.18) 0%, rgba(251,146,60,0.04) 55%, transparent 75%)",
            filter: "blur(40px)",
          }} />
          {/* Teal blob bottom-left */}
          <div style={{
            position: "absolute", bottom: "-10%", left: "-8%",
            width: "420px", height: "420px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(20,184,166,0.13) 0%, rgba(56,189,248,0.06) 55%, transparent 75%)",
            filter: "blur(50px)",
          }} />
          {/* Subtle grid lines */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }} />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-8">

          {/* ─────────── LEFT COPY ─────────── */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left order-2 lg:order-1 mt-6 lg:mt-0" style={{ fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', system-ui, sans-serif" }}>

            {/* Badge */}
            <div className="hero-badge inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide"
              style={{
                background: "rgba(251,146,60,0.09)",
                border: "1px solid rgba(251,146,60,0.25)",
                color: "#ea580c",
                backdropFilter: "blur(8px)",
              }}>
              <Sparkles className="h-3.5 w-3.5" />
              AI Powered Photo Discovery
            </div>

            {/* Heading */}
            <h1 className="hero-heading mt-5 font-black leading-[1.04] tracking-tight"
              style={{ fontSize: "clamp(2.2rem, 5.5vw, 4rem)" }}>
              <span style={{ color: "#0f172a" }}>Find Your<br />Moments.</span>
              <br />
              <span style={{
                background: "linear-gradient(95deg, #f97316 0%, #fb923c 20%, #ef4444 45%, #14b8a6 75%, #38bdf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                From Every Event.
              </span>
            </h1>

            {/* Description */}
            <p className="hero-sub mt-4 max-w-[480px] leading-relaxed"
              style={{ fontSize: "1.0625rem", color: "#64748b" }}>
              Upload a selfie and instantly discover every photo you're in using
              advanced AI facial recognition technology. Secure, private, and lightning-fast.
            </p>

            {/* CTAs */}
            <div className="hero-cta mt-7 flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:justify-center lg:justify-start">
              {/* Primary */}
              <Link to="/find" className="group inline-flex items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-all duration-300 w-full sm:w-auto"
                style={{
                  background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
                  boxShadow: "0 4px 20px rgba(249,115,22,0.35), 0 1px 4px rgba(0,0,0,0.08)",
                }}>
                <UploadCloud className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                Find My Photos
              </Link>
              {/* Secondary */}
              <Link to="/auth" search={{ mode: "signup" }} className="group inline-flex items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all duration-300 w-full sm:w-auto"
                style={{
                  background: "#ffffff",
                  border: "1.5px solid rgba(15,23,42,0.12)",
                  color: "#0f172a",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                }}>
                <Calendar className="h-4 w-4 text-slate-500 transition-transform group-hover:-translate-y-0.5" />
                Sign Up as Organizer
              </Link>
            </div>

            {/* Trust pills */}
            <div className="hero-trust mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-4">
              {[
                { icon: <ShieldCheck className="h-4 w-4" />, title: "100% Secure", sub: "Your data stays private", color: "#f97316" },
                { icon: <Zap className="h-4 w-4" />, title: "Lightning Fast", sub: "Results in seconds", color: "#14b8a6" },
                { icon: <Target className="h-4 w-4" />, title: "Highly Accurate", sub: "AI-powered recognition", color: "#38bdf8" },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${item.color}15`, color: item.color }}>
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#0f172a" }}>{item.title}</div>
                    <div className="text-xs" style={{ color: "#94a3b8" }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─────────── RIGHT COLLAGE ─────────── */}
          <div className="relative mx-auto w-full max-w-[340px] xs:max-w-[400px] sm:max-w-[480px] lg:max-w-[520px] aspect-square order-1 lg:order-2">

            {/* Coral glow behind portrait */}
            <div aria-hidden style={{
              position: "absolute", left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
              width: "68%", height: "68%", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(251,146,60,0.30) 0%, rgba(239,68,68,0.12) 45%, transparent 70%)",
              filter: "blur(24px)", zIndex: 1,
            }} />
            {/* Teal glow */}
            <div aria-hidden style={{
              position: "absolute", left: "60%", top: "60%",
              transform: "translate(-50%, -50%)",
              width: "42%", height: "42%", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(20,184,166,0.20) 0%, transparent 70%)",
              filter: "blur(20px)", zIndex: 1,
            }} />

            {/* ── Center portrait circle ── */}
            <div
              className="hero-portrait absolute overflow-hidden rounded-full"
              style={{
                left: "50%", top: "50%",
                transform: "translate(-50%, -50%)",
                width: "62%", aspectRatio: "1/1",
                zIndex: 10,
                border: "6px solid rgba(255,255,255,0.95)",
                boxShadow: "0 8px 48px rgba(249,115,22,0.22), 0 2px 16px rgba(0,0,0,0.10), 0 0 0 1px rgba(249,115,22,0.08)",
              }}
            >
              <img src={heroPortrait} alt="Smiling attendee portrait" className="h-full w-full object-cover" />
              {/* AI scan brackets */}
              <div className="hero-scanbox absolute" style={{
                left: "50%", top: "50%",
                transform: "translate(-50%, -48%)",
                width: "42%", height: "42%",
                borderRadius: "6px",
                border: "2.5px solid rgba(249,115,22,0.85)",
              }}>
                {/* Corner brackets */}
                {[
                  { top: "-3px", left: "-3px", borderTop: "3px solid #f97316", borderLeft: "3px solid #f97316" },
                  { top: "-3px", right: "-3px", borderTop: "3px solid #f97316", borderRight: "3px solid #f97316" },
                  { bottom: "-3px", left: "-3px", borderBottom: "3px solid #f97316", borderLeft: "3px solid #f97316" },
                  { bottom: "-3px", right: "-3px", borderBottom: "3px solid #f97316", borderRight: "3px solid #f97316" },
                ].map((s, i) => (
                  <span key={i} style={{ position: "absolute", width: 12, height: 12, ...s }} />
                ))}
              </div>
            </div>

            {/* ── TOP-LEFT tile ── */}
            <div className="hero-tile-0 absolute overflow-hidden rounded-2xl"
              style={{
                top: "3%", left: "0%", width: "36%", aspectRatio: "4/3",
                zIndex: 20,
                border: "4px solid rgba(255,255,255,0.95)",
                boxShadow: "0 12px 32px -6px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.06)",
                transform: "rotate(-6deg)",
              }}>
              <img src={heroTile1} alt="Group of friends at an evening party" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>

            {/* ── TOP-RIGHT tile ── */}
            <div className="hero-tile-1 absolute overflow-hidden rounded-2xl"
              style={{
                top: "3%", right: "0%", width: "34%", aspectRatio: "4/3",
                zIndex: 20,
                border: "4px solid rgba(255,255,255,0.95)",
                boxShadow: "0 12px 32px -6px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.06)",
                transform: "rotate(6deg)",
              }}>
              <img src={heroTile2} alt="Two friends laughing with confetti" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>

            {/* ── BOTTOM-LEFT tile ── */}
            <div className="hero-tile-2 absolute overflow-hidden rounded-2xl"
              style={{
                bottom: "10%", left: "0%", width: "33%", aspectRatio: "4/3",
                zIndex: 20,
                border: "4px solid rgba(255,255,255,0.95)",
                boxShadow: "0 12px 32px -6px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.06)",
                transform: "rotate(5deg)",
              }}>
              <img src={heroTile3} alt="Concert crowd with stage lights" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>

            {/* ── BOTTOM-RIGHT tile (behind stats card) ── */}
            <div className="hero-tile-3 absolute overflow-hidden rounded-2xl"
              style={{
                bottom: "4%", right: "1%", width: "36%", aspectRatio: "4/3",
                zIndex: 5,
                border: "4px solid rgba(255,255,255,0.95)",
                boxShadow: "0 12px 32px -6px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.06)",
                transform: "rotate(-5deg)",
              }}>
              <img src={heroTile4} alt="Friends celebrating outdoors" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>

            {/* ── Upload Selfie pill ── */}
            <Link to="/find"
              className="hero-upload-pill group absolute flex flex-col items-center gap-1.5"
              style={{ left: "50%", bottom: "18%", zIndex: 30, transform: "translateX(-50%)" }}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1"
                style={{
                  background: "linear-gradient(135deg, #f97316, #ef4444)",
                  boxShadow: "0 6px 20px rgba(249,115,22,0.40)",
                }}>
                <UploadCloud className="h-5 w-5" />
              </div>
              <div className="rounded-full px-4 py-1.5 text-center"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(249,115,22,0.20)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}>
                <div className="text-xs font-bold whitespace-nowrap" style={{ color: "#f97316" }}>Upload Selfie</div>
                <div className="text-[10px] whitespace-nowrap" style={{ color: "#94a3b8" }}>or drag &amp; drop</div>
              </div>
            </Link>

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
