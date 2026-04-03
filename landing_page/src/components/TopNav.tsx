import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`;

const TopNav = () => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-2 left-0 right-0 z-50 px-2 sm:px-4">
      <div className="h-16 w-full rounded-2xl border border-border bg-background/90 backdrop-blur-xl shadow-sm px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/strang-logo.png"
            alt="Strang logo"
            className="w-9 h-9 rounded-lg border border-border/60 shadow-sm"
          />
          <span className="font-display text-2xl font-bold leading-none">Strang</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          <NavLink to="/how-it-works" className={navLinkClass}>
            How it works
          </NavLink>
          <NavLink to="/features" className={navLinkClass}>
            Features
          </NavLink>
          <NavLink to="/reviews" className={navLinkClass}>
            Reviews
          </NavLink>
          <NavLink to="/pricing" className={navLinkClass}>
            Pricing
          </NavLink>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-secondary/70 hover:bg-secondary transition-colors"
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="text-sm font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-colors"
          >
            Get Started
          </Link>
          {/* <a href="#waitlist" className="text-sm font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-colors">Join Waitlist</a> */}
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
