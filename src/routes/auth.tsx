import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — EventFace" },
      { name: "description", content: "Sign in to EventFace to create events or find your photos." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

// ─── Config ────────────────────────────────────────────────────────────────
const SPRING = { type: "spring", stiffness: 300, damping: 32, mass: 1 } as const;
const EASE = { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } as const;

// Project coral/orange gradient — matches styles.css --gradient-cta
const PANEL_BG = "linear-gradient(135deg, oklch(0.72 0.20 45) 0%, oklch(0.65 0.22 35) 50%, oklch(0.58 0.22 28) 100%)";
const BTN_BG = "linear-gradient(135deg, oklch(0.72 0.20 45), oklch(0.62 0.22 25))";
const LOGO_BG = "linear-gradient(135deg, oklch(0.72 0.20 45), oklch(0.62 0.22 25))";

// ─── Panel Illustration ────────────────────────────────────────────────────
function PanelIllustration({ isSignup }: { isSignup: boolean }) {
  return (
    <div className="relative mx-auto w-44 h-40">
      {/* Tilted back card */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.28)" }}
        animate={{ rotate: isSignup ? -5 : 5 }}
        transition={SPRING}
      />
      {/* Front card */}
      <div
        className="absolute inset-3 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.20)", border: "1px solid rgba(255,255,255,0.32)" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isSignup ? "su-icon" : "si-icon"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.28, ease: "backOut" }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.28)" }}>
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="w-18 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.30)" }} />
            <div className="w-12 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Floating badges */}
      <motion.div
        className="absolute -top-3 -left-3 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.35)" }}
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {isSignup ? <Sparkles className="w-4 h-4 text-white" /> : <CheckCircle2 className="w-4 h-4 text-white" />}
      </motion.div>
      <motion.div
        className="absolute -bottom-3 -right-3 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.35)" }}
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        {isSignup ? <Zap className="w-4 h-4 text-white" /> : <ArrowRight className="w-4 h-4 text-white" />}
      </motion.div>
      <motion.div
        className="absolute -top-3 -right-3 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.35)" }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      >
        <Shield className="w-4 h-4 text-white" />
      </motion.div>
    </div>
  );
}

// ─── Gradient Panel ────────────────────────────────────────────────────────
function GradientPanel({
  isSignup,
  onSwitch,
}: {
  isSignup: boolean;
  onSwitch: () => void;
}) {
  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center gap-7 px-8 py-10 overflow-hidden select-none"
      style={{ background: PANEL_BG }}
    >
      {/* Animated orbs */}
      <motion.div
        className="absolute w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: "oklch(0.85 0.15 55)", top: "-25%", left: "-15%" }}
        animate={{ x: [0, 22, 0], y: [0, 28, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-52 h-52 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "oklch(0.60 0.20 20)", bottom: "-15%", right: "-10%" }}
        animate={{ x: [0, -16, 0], y: [0, -22, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-white text-center">
        <PanelIllustration isSignup={isSignup} />

        <div className="space-y-2.5">
          <AnimatePresence mode="wait">
            <motion.p
              key={`ey-${isSignup}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.75, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={EASE}
              className="text-[11px] font-bold tracking-widest uppercase"
            >
              {isSignup ? "Good to see you" : "Make it yours"}
            </motion.p>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.h2
              key={`h-${isSignup}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={EASE}
              className="text-2xl font-black leading-tight"
            >
              {isSignup ? <>Already have an<br />account?</> : <>New here?</>}
            </motion.h2>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.p
              key={`sub-${isSignup}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.78, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ ...EASE, delay: 0.06 }}
              className="text-sm leading-relaxed max-w-[200px] mx-auto"
            >
              {isSignup
                ? "Your photos are right where you left them. Sign in and pick up the thread."
                : "Create your account, save your events, and keep every bright moment within reach."}
            </motion.p>
          </AnimatePresence>
        </div>

        <motion.button
          onClick={onSwitch}
          className="group flex items-center gap-2 rounded-full border border-white/40 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING}
        >
          {isSignup ? (
            <>
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Back to sign in
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </motion.button>

        <p className="text-[10px] text-white/45 tracking-wide">
          {isSignup ? "Secure access · Always in sync" : "Free to start · No card needed"}
        </p>
      </div>
    </div>
  );
}

// ─── Input Field ───────────────────────────────────────────────────────────
interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  required?: boolean;
  rightSlot?: React.ReactNode;
  autoComplete?: string;
}

function InputField({
  id, label, type = "text", placeholder, value, onChange, icon,
  required, rightSlot, autoComplete,
}: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-foreground/80">
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3.5 text-muted-foreground/60">{icon}</span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-border bg-background/60 py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-border"
        />
        {rightSlot && <span className="absolute right-3.5">{rightSlot}</span>}
      </div>
    </div>
  );
}

// ─── Custom Checkbox ───────────────────────────────────────────────────────
function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center cursor-pointer transition-colors ${checked ? "bg-primary border-primary" : "border-border bg-transparent"
        }`}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// ─── Submit Button ─────────────────────────────────────────────────────────
function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <motion.button
      type="submit"
      disabled={loading}
      className="relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-bold text-white shadow-soft disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ background: BTN_BG }}
      whileHover={{ scale: loading ? 1 : 1.02, boxShadow: "0 8px 28px -6px oklch(0.68 0.22 35 / 0.55)" }}
      whileTap={{ scale: loading ? 1 : 0.97 }}
      transition={SPRING}
    >
      <motion.span
        className="absolute inset-0 bg-white/10"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
      <span className="relative">{loading ? loadingLabel : label}</span>
    </motion.button>
  );
}

// ─── Sign In Form ──────────────────────────────────────────────────────────
function SignInForm({
  onSubmit, loading, email, setEmail, password, setPassword,
}: {
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 w-full">
      <div className="space-y-1">
        <p className="text-[11px] font-bold tracking-widest uppercase text-primary">Your workspace awaits</p>
        <h1 className="text-[28px] font-black tracking-tight text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to continue to your account.</p>
      </div>

      <div className="space-y-4">
        <InputField
          id="si-email" label="Email address" type="email" placeholder="you@company.com"
          value={email} onChange={setEmail} icon={<Mail className="w-4 h-4" />} required autoComplete="email"
        />
        <InputField
          id="si-password" label="Password" type={showPw ? "text" : "password"} placeholder="Enter your password"
          value={password} onChange={setPassword} icon={<Lock className="w-4 h-4" />} required autoComplete="current-password"
          rightSlot={
            <button type="button" onClick={() => setShowPw(v => !v)} className="text-muted-foreground/55 hover:text-muted-foreground transition-colors" tabIndex={-1}>
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox checked={rememberMe} onChange={() => setRememberMe(v => !v)} />
          <span className="text-sm text-muted-foreground">Remember me</span>
        </label>
        <button type="button" className="text-sm font-semibold text-primary hover:underline transition-colors">
          Forgot password?
        </button>
      </div>

      <SubmitButton loading={loading} label="Sign in" loadingLabel="Signing in…" />
    </form>
  );
}

// ─── Sign Up Form ──────────────────────────────────────────────────────────
function SignUpForm({
  onSubmit, loading, name, setName, email, setEmail, password, setPassword,
}: {
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
}) {
  const [showPw, setShowPw] = useState(false);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full">
      <div className="space-y-1">
        <p className="text-[11px] font-bold tracking-widest uppercase text-primary">Start building in minutes</p>
        <h1 className="text-[28px] font-black tracking-tight text-foreground">Create your account</h1>
        <p className="text-sm text-muted-foreground">Join thousands discovering their event photos.</p>
      </div>

      <div className="space-y-3">
        <InputField
          id="su-name" label="Full name" placeholder="Your Name"
          value={name} onChange={setName} icon={<User className="w-4 h-4" />} required autoComplete="name"
        />
        <InputField
          id="su-email" label="Email address" type="email" placeholder="you@company.com"
          value={email} onChange={setEmail} icon={<Mail className="w-4 h-4" />} required autoComplete="email"
        />
        <InputField
          id="su-password" label="Password" type={showPw ? "text" : "password"} placeholder="At least 8 characters"
          value={password} onChange={setPassword} icon={<Lock className="w-4 h-4" />} required autoComplete="new-password"
          rightSlot={
            <button type="button" onClick={() => setShowPw(v => !v)} className="text-muted-foreground/55 hover:text-muted-foreground transition-colors" tabIndex={-1}>
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        {/* Password credential hint */}
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60" />
          Use a mix of letters and numbers for a stronger password
        </p>
      </div>

      <SubmitButton loading={loading} label="Create account" loadingLabel="Creating account…" />
    </form>
  );
}

// ─── Logo ──────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-soft" style={{ background: LOGO_BG }}>
        <Camera className="w-[18px] h-[18px] text-white" />
      </div>
      <span className="font-black text-[15px] tracking-tight text-foreground group-hover:text-primary transition-colors">
        EventFace
      </span>
    </Link>
  );
}

// ─── Main Auth Page ────────────────────────────────────────────────────────
function AuthPage() {
  const { mode } = Route.useSearch();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  // ── Auth logic — untouched ────────────────────────────────────────────
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
        setPassword("");      // Clear password so they can type it in
        setIsSignup(false);   // Switch to sign-in view mode
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

  // ── Sliding panel:
  //   Login  → panel on RIGHT  (left: "58%")
  //   Signup → panel on LEFT   (left: "0%")
  // Panel width = 42%, form width = 58% of container.
  // We animate the `left` CSS property via Framer Motion.
  const PANEL_W = 42; // %
  const FORM_W = 100 - PANEL_W; // 58%

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 25% 20%, oklch(0.72 0.16 45 / 0.14) 0%, transparent 50%), " +
          "radial-gradient(ellipse at 78% 80%, oklch(0.60 0.14 35 / 0.10) 0%, transparent 50%)",
      }}
    >
      {/* ── Card entrance animation ───────────────────────────────── */}
      <motion.div
        className="relative w-full max-w-[900px] rounded-[1.25rem] shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 36, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING, delay: 0.06 }}
      >

        {/* ══════════════════════════════════════════════════════════
            DESKTOP LAYOUT — true absolute-slide panel
            ══════════════════════════════════════════════════════════ */}
        <div className="hidden md:block relative bg-card" style={{ height: 600 }}>

          {/* Login form — anchored LEFT, visible when panel is RIGHT */}
          <div
            className={`absolute top-0 bottom-0 left-0 flex flex-col justify-center px-12 py-10 transition-all duration-300 ${
              isSignup ? "opacity-0 pointer-events-none select-none" : "opacity-100"
            }`}
            style={{ width: `${FORM_W}%` }}
          >
            <div className="absolute top-8 left-10"><Logo /></div>

            <div className="mt-8 overflow-y-auto max-h-[520px] pr-1">
              <AnimatePresence mode="wait">
                {!isSignup && (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={EASE}
                  >
                    <SignInForm
                      onSubmit={submit} loading={loading}
                      email={email} setEmail={setEmail}
                      password={password} setPassword={setPassword}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer links for sign-in form */}
            <AnimatePresence>
              {!isSignup && (
                <motion.div
                  key="si-footer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute bottom-6 left-0 right-0 flex items-center justify-between px-10"
                >
                  <p className="text-xs text-muted-foreground">
                    New here?{" "}
                    <button type="button" onClick={() => setIsSignup(true)} className="font-semibold text-primary hover:underline">
                      Create one
                    </button>
                  </p>
                  <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Home</Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Signup form — anchored RIGHT, visible when panel is LEFT */}
          <div
            className={`absolute top-0 bottom-0 right-0 flex flex-col justify-center px-12 py-10 transition-all duration-300 ${
              !isSignup ? "opacity-0 pointer-events-none select-none" : "opacity-100"
            }`}
            style={{ width: `${FORM_W}%` }}
          >
            <div className="absolute top-8 left-10"><Logo /></div>

            <div className="mt-8 overflow-y-auto max-h-[520px] pr-1">
              <AnimatePresence mode="wait">
                {isSignup && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={EASE}
                  >
                    <SignUpForm
                      onSubmit={submit} loading={loading}
                      name={name} setName={setName}
                      email={email} setEmail={setEmail}
                      password={password} setPassword={setPassword}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer links for sign-up form */}
            <AnimatePresence>
              {isSignup && (
                <motion.div
                  key="su-footer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute bottom-6 left-0 right-0 flex items-center justify-between px-10"
                >
                  <p className="text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" onClick={() => setIsSignup(false)} className="font-semibold text-primary hover:underline">
                      Sign in
                    </button>
                  </p>
                  <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Home</Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── THE SLIDING GRADIENT PANEL ────────────────────────── */}
          {/* Uses Framer Motion to animate `left` between 0% and 58%  */}
          <motion.div
            className="absolute top-0 bottom-0"
            style={{ width: `${PANEL_W}%` }}
            animate={{ left: isSignup ? "0%" : `${FORM_W}%` }}
            transition={SPRING}
          >
            {/* Rounded corners that follow the card on the exposed edge */}
            <div
              className="w-full h-full"
              style={{
                borderRadius: isSignup
                  ? "1.25rem 0 0 1.25rem"  // left-side: round left corners
                  : "0 1.25rem 1.25rem 0", // right-side: round right corners
              }}
            >
              <GradientPanel isSignup={isSignup} onSwitch={() => setIsSignup(v => !v)} />
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            MOBILE LAYOUT — stacked vertically
            ══════════════════════════════════════════════════════════ */}
        <div className="flex md:hidden flex-col w-full">
          {/* Panel on top */}
          <div className="relative" style={{ minHeight: 260 }}>
            <GradientPanel isSignup={isSignup} onSwitch={() => setIsSignup(v => !v)} />
          </div>

          {/* Form below */}
          <div className="bg-card px-6 py-8">
            <div className="mb-5"><Logo /></div>

            <AnimatePresence mode="wait">
              {isSignup ? (
                <motion.div key="m-signup" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={EASE}>
                  <SignUpForm
                    onSubmit={submit} loading={loading}
                    name={name} setName={setName}
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                  />
                </motion.div>
              ) : (
                <motion.div key="m-signin" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={EASE}>
                  <SignInForm
                    onSubmit={submit} loading={loading}
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              {isSignup ? "Already have an account? " : "New here? "}
              <button type="button" onClick={() => setIsSignup(v => !v)} className="font-semibold text-primary hover:underline">
                {isSignup ? "Sign in" : "Create one"}
              </button>
            </p>
            <div className="mt-3 text-center">
              <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to home</Link>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
