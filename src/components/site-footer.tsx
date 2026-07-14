import { Link } from "@tanstack/react-router";
import morpheLogo from "@/assets/morphe-logo.png";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center">
              <img
                src={morpheLogo}
                alt="Morphe Labs"
                className="h-16 w-auto object-contain brightness-0"
                style={{ filter: "brightness(0)" }}
              />
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              AI-powered photo discovery so every attendee walks home with their moments.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="/#features">Features</a></li>
              <li><a href="/#how">How It Works</a></li>
              <li><Link to="/find">Find photos</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">For Organizers</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" search={{ mode: "signup" }}>Create event</Link></li>
              <li><a href="/#organizers">Learn more</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Contact</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Morphe Labs. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
