import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`;

const TopNav = () => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/strang-logo.png"
            alt="Strang logo"
            className="h-8 w-8 rounded-md"
          />
          <span className="font-display text-2xl font-semibold leading-none">Strang</span>
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-secondary transition-colors"
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
            className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
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
