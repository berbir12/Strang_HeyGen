import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const DUMMY_EVENTS = [
  "Someone generated a 58-second explainer on photosynthesis",
  "A student created a 42-second video about mitosis",
  "A user converted a quantum mechanics paragraph into a video",
  "Someone generated an anatomy explainer about blood circulation",
  "A learner turned a calculus concept into a 1-minute video",
  "A team member created an onboarding explainer in Strang",
  "Someone generated a short video on supply and demand",
  "A student transformed textbook notes into an AI explainer",
  "A user created a video on neural networks in under 3 minutes",
  "Someone generated a recap video on World War II causes",
  "A learner turned chemistry notes into a quick explainer",
  "A user created a sidebar video on cloud computing basics",
];

const SHOW_FOR_MS = 4200;
const HIDE_FOR_MS = 2600;

const LiveActivityPopup = () => {
  const events = useMemo(() => DUMMY_EVENTS, []);
  const [isVisible, setIsVisible] = useState(true);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    const hideTimer = window.setTimeout(() => setIsVisible(false), SHOW_FOR_MS);
    const nextTimer = window.setTimeout(() => {
      setIndex((prev) => (prev + 1) % events.length);
      setIsVisible(true);
    }, SHOW_FOR_MS + HIDE_FOR_MS);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(nextTimer);
    };
  }, [dismissed, index, events.length]);

  if (dismissed) return null;

  return (
    <div
      className={`fixed left-4 bottom-4 z-40 hidden lg:block transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <div className="rounded-xl border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-xl min-w-[380px] max-w-[430px]">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss activity popup"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-sm text-muted-foreground pr-5">
          {events[index].split(" ").slice(0, -2).join(" ")}{" "}
          <span className="text-foreground font-semibold">{events[index].split(" ").slice(-2).join(" ")}</span>
        </p>
      </div>
    </div>
  );
};

export default LiveActivityPopup;
