import { Link } from "react-router-dom";
import { Home } from "lucide-react";

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      <div className="w-full max-w-md border-t border-border py-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Page not found</p>
        <h1 className="mb-4 font-display text-6xl font-semibold sm:text-7xl">
          404
        </h1>
        <p className="mb-7 text-lg text-muted-foreground">
          This page doesn't exist. Head back home to get Strang.
        </p>
        <Link
          to="/"
          className="primary-button inline-flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
