/**
 * Backend API base URL for waitlist (and future Strang API).
 * Set VITE_STRANG_API_URL in .env (e.g. http://localhost:8000 for dev, https://api.yoursite.com for prod).
 */
export const STRANG_API_URL =
  import.meta.env.VITE_STRANG_API_URL?.trim() ||
  (typeof window !== "undefined" && window.location?.hostname === "localhost"
    ? "http://localhost:8000"
    : "");

const STRANG_API_URL_BASE = STRANG_API_URL.replace(/\/+$/, "");

export interface WaitlistResult {
  ok: boolean;
  message?: string;
  is_new?: boolean;
  referral_code?: string;
  position?: number;
  referral_count?: number;
}

/**
 * Join the waitlist. Pass the `ref` query param value when present in the URL
 * so the backend can credit the referrer.
 */
export async function joinWaitlist(
  email: string,
  refCode?: string | null,
): Promise<WaitlistResult> {
  if (!STRANG_API_URL_BASE) {
    return { ok: false, message: "Waitlist is not configured." };
  }
  const body: Record<string, string> = { email: email.trim().toLowerCase() };
  if (refCode) body.ref = refCode;

  let res: Response;
  try {
    res = await fetch(`${STRANG_API_URL_BASE}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Most commonly triggered by CORS/preflight failures in production.
    return { ok: false, message: "Could not reach the waitlist server. Please try again." };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, message: data.detail || data.message || "Something went wrong." };
  }
  return {
    ok: true,
    message: data.message,
    is_new: data.is_new,
    referral_code: data.referral_code,
    position: data.position,
    referral_count: data.referral_count,
  };
}

export async function getWaitlistCount(): Promise<number | null> {
  if (!STRANG_API_URL_BASE) return null;
  try {
    const res = await fetch(`${STRANG_API_URL_BASE}/waitlist/count`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.count === "number" ? data.count : null;
  } catch {
    return null;
  }
}

export async function getWaitlistPosition(email: string): Promise<WaitlistResult | null> {
  if (!STRANG_API_URL_BASE) return null;
  try {
    const res = await fetch(
      `${STRANG_API_URL_BASE}/waitlist/position?email=${encodeURIComponent(email)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      ok: true,
      referral_code: data.referral_code,
      position: data.position,
      referral_count: data.referral_count,
    };
  } catch {
    return null;
  }
}
