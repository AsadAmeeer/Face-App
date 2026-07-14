import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Mail, Lock, User } from "lucide-react";
import heroCollage from "@/assets/hero-collage.jpg";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — EventFace" }, { name: "description", content: "Sign in to EventFace to create events or find your photos." }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        
        // Force sign out to prevent auto-login behavior of Supabase signup
        await supabase.auth.signOut();
        
        toast.success("Account created successfully! Please sign in with your credentials.");
        setPassword(""); // Clear password so they can type it in
        setIsSignup(false); // Switch to sign-in view mode
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        router.invalidate();
        navigate({ to: "/onboarding" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 -z-10 scale-110 bg-cover bg-center blur-2xl opacity-40"
        style={{ backgroundImage: `url(${heroCollage})` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-background/60" aria-hidden />
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-card/90 p-8 shadow-soft backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-glow">
              <Camera className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-black">{isSignup ? "Create your account" : "Welcome back"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignup ? "Start finding & sharing event moments" : "Sign in to continue"}
            </p>
          </div>


          <form onSubmit={submit} className="space-y-4">
            {isSignup && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" required className="pl-9" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" required className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" required className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-hero text-primary-foreground shadow-soft hover:opacity-95">
              {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button type="button" onClick={() => setIsSignup((v) => !v)} className="font-semibold text-primary hover:underline">
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
        <Link to="/" className="mt-6 text-center text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
      </div>
    </div>
  );
}
