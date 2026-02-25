/**
 * Backend API base URL for waitlist (and future Strang API).
 * Set VITE_STRANG_API_URL in .env (e.g. http://localhost:8000 for dev, https://api.yoursite.com for prod).
 */
export const STRANG_API_URL =
  import.meta.env.VITE_STRANG_API_URL?.trim() ||
  (typeof window !== "undefined" && window.location?.hostname === "localhost"
    ? "http://localhost:8000"
    : "");

export async function joinWaitlist(email: string): Promise<{ ok: boolean; message?: string }> {
  if (!STRANG_API_URL) {
    return { ok: false, message: "Waitlist is not configured." };
  }
  const res = await fetch(`${STRANG_API_URL}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, message: data.detail || data.message || "Something went wrong." };
  }
  return { ok: true, message: data.message };
}

export async function getWaitlistCount(): Promise<number | null> {
  if (!STRANG_API_URL) return null;
  try {
    const res = await fetch(`${STRANG_API_URL}/waitlist/count`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.count === "number" ? data.count : null;
  } catch {
    return null;
  }
}
