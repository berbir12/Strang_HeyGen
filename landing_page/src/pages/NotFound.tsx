import { Link } from "react-router-dom";
import { Home } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="glass-card p-8 sm:p-12 max-w-md w-full text-center">
        <h1 className="font-display text-6xl sm:text-7xl font-bold text-primary mb-4">
          404
        </h1>
        <p className="text-muted-foreground text-lg mb-6">
          This page doesn't exist. Head back home to get Strang.
        </p>
        <Link
          to="/"
          className="glow-button inline-flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
