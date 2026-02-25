/**
 * Analytics: inject script only when configured.
 * Set VITE_PLAUSIBLE_DOMAIN in env (e.g. yourdomain.com) to enable Plausible.
 * Or use VITE_ANALYTICS_SCRIPT_URL for a custom script URL.
 */
import { useEffect } from "react";

const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();
const ANALYTICS_SCRIPT_URL = import.meta.env.VITE_ANALYTICS_SCRIPT_URL?.trim();

const Analytics = () => {
  useEffect(() => {
    if (PLAUSIBLE_DOMAIN) {
      const script = document.createElement("script");
      script.defer = true;
      script.dataset.domain = PLAUSIBLE_DOMAIN;
      script.src = "https://plausible.io/js/script.js";
      document.head.appendChild(script);
      return () => {
        script.remove();
      };
    }
    if (ANALYTICS_SCRIPT_URL) {
      const script = document.createElement("script");
      script.defer = true;
      script.src = ANALYTICS_SCRIPT_URL;
      document.head.appendChild(script);
      return () => script.remove();
    }
  }, []);

  return null;
};

export default Analytics;
