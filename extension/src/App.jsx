import React, { useState, useCallback, useEffect } from 'react';

const BACKEND_KEY = 'strang_backend_url';
const BACKEND_KEY_LEGACY = 'ai_video_explainer_backend_url';
const API_KEY_STORAGE_KEY = 'strang_api_key';
const PRODUCTION_BACKEND = 'https://api.thestrang.com';
const DEFAULT_BACKEND = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRANG_API_URL) || PRODUCTION_BACKEND;
const STALE_BACKENDS = new Set([
  'https://strang-heygen-production.up.railway.app',
]);
const LANDING_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LANDING_URL) || 'https://www.thestrang.com';
const MAX_CHARS = 3000;
const SOFT_LIMIT_CHARS = 2500;
const LOCAL_BACKEND_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;
const IS_DEV_BUILD = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;

function normalizeBackend(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function getBackendUrl() {
  try {
    const stored = localStorage.getItem(BACKEND_KEY) || localStorage.getItem(BACKEND_KEY_LEGACY);
    const normalizedStored = normalizeBackend(stored);
    if (!normalizedStored) return DEFAULT_BACKEND;

    if (STALE_BACKENDS.has(normalizedStored)) {
      localStorage.removeItem(BACKEND_KEY);
      localStorage.removeItem(BACKEND_KEY_LEGACY);
      return DEFAULT_BACKEND;
    }

    if (!IS_DEV_BUILD && LOCAL_BACKEND_RE.test(normalizedStored)) {
      localStorage.removeItem(BACKEND_KEY);
      localStorage.removeItem(BACKEND_KEY_LEGACY);
      return DEFAULT_BACKEND;
    }
    return normalizedStored;
  } catch {
    return DEFAULT_BACKEND;
  }
}

function setBackendUrl(url) {
  try {
    const normalized = normalizeBackend(url);
    if (!normalized) return;
    localStorage.setItem(BACKEND_KEY, normalized);
    try {
      chrome.storage?.local?.set?.({ [BACKEND_KEY]: normalized });
    } catch {
    }
  } catch {
  }
}

function getLegacyApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function friendlyError(err, context) {
  if (!err) return "Something went wrong. Please try again.";
  const msg = typeof err === "string" ? err : (err.message || "");

  const ours = [
    "Session expired",
    "Daily limit",
    "Free limit",
    "Upgrade",
    "No text selected",
    "Can't read this page",
    "Select some text",
    "Text is too long",
    "sign in",
    "Sign in",
    "connection",
    "Connection",
  ];
  if (ours.some((s) => msg.includes(s))) return msg;

  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("net::") ||
    msg.includes("Load failed")
  ) {
    return "Connection issue. Check your internet and try again.";
  }

  if (context === "poll") {
    return "Your video is taking longer than expected. Please try again.";
  }
  if (context === "generate") {
    return "We couldn't start your video. Please try again in a moment.";
  }

  return "Something went wrong. Please try again.";
}

function progressLabel(status) {
  switch (status) {
    case 'loading':
      return 'Writing script…';
    case 'polling':
      return 'Creating video…';
    default:
      return null;
  }
}

function getAuthToken() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: 'GET_AUTH_TOKEN' }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ access_token: '', email: '' });
          return;
        }
        resolve(res || { access_token: '', email: '' });
      });
    } catch {
      resolve({ access_token: '', email: '' });
    }
  });
}

function clearAuthToken() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: 'CLEAR_AUTH_TOKEN' }, () => resolve());
    } catch {
      resolve();
    }
  });
}

function refreshAuthToken(backend) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: 'REFRESH_AUTH_TOKEN', backend }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false });
          return;
        }
        resolve(res || { ok: false });
      });
    } catch {
      resolve({ ok: false });
    }
  });
}

function getBackendLabel(base) {
  try {
    return new URL(base).host;
  } catch {
    return base || 'configured backend';
  }
}

async function readErrorDetail(res) {
  try {
    const data = await res.clone().json();
    return String(data?.detail || data?.message || '').trim();
  } catch {
    return '';
  }
}

function shouldClearAuthOn401(detail) {
  const normalized = String(detail || '').toLowerCase();
  return (
    normalized.includes('expired') ||
    normalized.includes('authentication required') ||
    normalized.includes('invalid token') ||
    normalized.includes('jwt')
  );
}

function auth401Message(detail, _base) {
  const normalized = String(detail || '').toLowerCase();
  if (normalized.includes('expired')) {
    return "Your session expired. Please sign in again.";
  }
  if (shouldClearAuthOn401(detail)) {
    return "Your account session is no longer valid. Please sign in again.";
  }
  return "Please sign in to continue using Strang.";
}

export default function App() {
  const [selectedText, setSelectedText] = useState('');
  const [status, setStatus] = useState('idle');
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  // Auth state
  const [authToken, setAuthToken] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  const needsAuthAction = (message) => {
    const normalized = String(message || '').toLowerCase();
    return normalized.includes('log in') || normalized.includes('sign in');
  };

  useEffect(() => {
    getAuthToken().then((res) => {
      setAuthToken(res.access_token || '');
      setAuthEmail(res.email || '');
      setAuthLoading(false);
    });

    // Listen for token changes (e.g. user logs in from another tab)
    const listener = (changes) => {
      if (changes.strang_access_token) {
        setAuthToken(changes.strang_access_token.newValue || '');
      }
      if (changes.strang_email) {
        setAuthEmail(changes.strang_email.newValue || '');
      }
    };
    try {
      chrome.storage.onChanged.addListener(listener);
    } catch {}
    return () => {
      try { chrome.storage.onChanged.removeListener(listener); } catch {}
    };
  }, []);

  const isLoggedIn = !!authToken;

  const authHeaders = () => {
    const h = { 'Content-Type': 'application/json' };
    if (authToken) {
      h['Authorization'] = `Bearer ${authToken}`;
    } else {
      const key = getLegacyApiKey();
      if (key) h['X-API-Key'] = key;
    }
    return h;
  };

  const handleLogin = () => {
    const url = `${LANDING_URL}/login?extension=true`;
    chrome.tabs.create({ url });
  };

  const handleLogout = async () => {
    await clearAuthToken();
    setAuthToken('');
    setAuthEmail('');
  };

  const loadSelection = useCallback(() => {
    setError(null);
    chrome.runtime.sendMessage({ action: 'GET_SELECTION_FROM_TAB' }, (res) => {
      if (chrome.runtime.lastError) {
        setError("Can't read this page. Try a regular website (like wikipedia.org) or paste your text above.");
        return;
      }
      const text = (res?.text ?? '').trim();
      setSelectedText(text);
      if (!text) setError("No text selected. Highlight some text on the page, then try again.");
      else setError(null);
    });
  }, []);

  const generate = async () => {
    const text = selectedText.trim();
    if (!text) {
      setError("Select some text on the page, or paste it above, then tap Generate.");
      return;
    }
    if (text.length > MAX_CHARS) {
      setError(`Text is too long. Please keep it under ${MAX_CHARS.toLocaleString()} characters.`);
      return;
    }
    let base = getBackendUrl();
    setError(null);
    setStatus('loading');
    setVideoUrl(null);

    // Build headers using a given token, falling back to state/legacy key.
    const headersFor = (overrideToken) => {
      const h = { 'Content-Type': 'application/json' };
      const tok = overrideToken ?? authToken;
      if (tok) {
        h['Authorization'] = `Bearer ${tok}`;
      } else {
        const key = getLegacyApiKey();
        if (key) h['X-API-Key'] = key;
      }
      return h;
    };

    try {
      let res = await fetch(`${base}/generate`, {
        method: 'POST',
        headers: headersFor(),
        body: JSON.stringify({ text }),
      });

      // Silently try to refresh the token once before giving up.
      if (res.status === 401) {
        const refreshed = await refreshAuthToken(base);
        if (refreshed.ok && refreshed.access_token) {
          setAuthToken(refreshed.access_token);
          res = await fetch(`${base}/generate`, {
            method: 'POST',
            headers: headersFor(refreshed.access_token),
            body: JSON.stringify({ text }),
          });
        }
      }

      // If custom/stale backend auth fails, retry once against production backend.
      if (res.status === 401 && base !== DEFAULT_BACKEND) {
        const fallbackBase = DEFAULT_BACKEND;
        let fallbackRes = await fetch(`${fallbackBase}/generate`, {
          method: 'POST',
          headers: headersFor(),
          body: JSON.stringify({ text }),
        });

        if (fallbackRes.status === 401) {
          const refreshed = await refreshAuthToken(fallbackBase);
          if (refreshed.ok && refreshed.access_token) {
            setAuthToken(refreshed.access_token);
            fallbackRes = await fetch(`${fallbackBase}/generate`, {
              method: 'POST',
              headers: headersFor(refreshed.access_token),
              body: JSON.stringify({ text }),
            });
          }
        }

        if (fallbackRes.status !== 401) {
          base = fallbackBase;
          setBackendUrl(fallbackBase);
          res = fallbackRes;
        }
      }

      if (res.status === 401) {
        const detail = await readErrorDetail(res);
        setError(auth401Message(detail, base));
        setStatus('error');
        if (shouldClearAuthOn401(detail)) {
          await clearAuthToken();
          setAuthToken('');
        }
        return;
      }
      if (res.status === 403) {
        setError("You've reached your free plan limit. Upgrade to Pro to create more videos.");
        setStatus('error');
        return;
      }

      const raw = await res.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_) {
        throw new Error(res.ok ? 'parse_error' : `http_${res.status}`);
      }

      if (!res.ok) {
        throw new Error(`http_${res.status}`);
      }

      const { job_id } = data;
      if (!job_id) {
        setStatus('done');
        if (data.video_url) setVideoUrl(data.video_url);
        return;
      }

      setStatus('polling');
      const poll = async (currentToken) => {
        try {
          let pollRes = await fetch(`${base}/generate/status/${job_id}`, { headers: headersFor(currentToken) });

          if (pollRes.status === 401) {
            const refreshed = await refreshAuthToken(base);
            if (refreshed.ok && refreshed.access_token) {
              setAuthToken(refreshed.access_token);
              pollRes = await fetch(`${base}/generate/status/${job_id}`, { headers: headersFor(refreshed.access_token) });
            }
          }

          if (pollRes.status === 401) {
            const detail = await readErrorDetail(pollRes);
            setError(auth401Message(detail, base));
            setStatus('error');
            if (shouldClearAuthOn401(detail)) {
              await clearAuthToken();
              setAuthToken('');
            }
            return;
          }

          const pollRaw = await pollRes.text();
          let pollData = {};
          try {
            pollData = pollRaw ? JSON.parse(pollRaw) : {};
          } catch (_) {
            setError("Something went wrong while creating your video. Please try again.");
            setStatus('error');
            return;
          }
          if (!pollRes.ok) {
            setError("We couldn't check on your video. Please try again.");
            setStatus('error');
            return;
          }
          if (pollData.status === 'completed' && pollData.video_url) {
            setVideoUrl(pollData.video_url);
            setStatus('done');
            return;
          }
          if (pollData.status === 'failed') {
            setError("Your video didn't finish generating. Please try again.");
            setStatus('error');
            return;
          }
          setTimeout(() => poll(currentToken), 4000);
        } catch (e) {
          setError(friendlyError(e, 'poll'));
          setStatus('error');
        }
      };
      poll(null);
    } catch (e) {
      setError(friendlyError(e, 'generate'));
      setStatus('error');
    }
  };

  const charCount = selectedText.length;
  const overSoft = charCount > SOFT_LIMIT_CHARS;
  const overHard = charCount > MAX_CHARS;
  const progressStep = progressLabel(status);
  const showEmptyState = !videoUrl && status === 'idle' && !error;

  const handleTextChange = (e) => {
    setSelectedText(e.target.value);
    setError(null);
  };

  const copyVideoLink = () => {
    if (!videoUrl) return;
    navigator.clipboard.writeText(videoUrl);
    if (typeof document !== 'undefined') {
      const btn = document.getElementById('strang-copy-link');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }
    }
  };

  const openVideoInTab = () => {
    if (videoUrl) chrome.tabs.create({ url: videoUrl });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-primary/45 to-transparent" aria-hidden />
      <div className="p-4 pb-5 flex flex-col flex-1 min-h-0">
        <header className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold tracking-tight text-gradient leading-none">
              Strang
            </h1>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Page text → explainer video
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!authLoading && (
              isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary/80"
                  title={authEmail || 'Logged in'}
                >
                  {authEmail ? authEmail.split('@')[0] : 'Logout'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary/12 text-primary hover:bg-primary/20 font-semibold border border-primary/20"
                >
                  Login
                </button>
              )
            )}
          </div>
        </header>

        <section className="mb-4">
          <div className="mb-3">
            <h2 id="strang-explain-heading" className="section-title">What should we explain?</h2>
            <p className="section-hint mb-0">
              Paste anything dense or worth summarizing—we turn it into a short talking-head style video.
            </p>
          </div>
          <textarea
            id="strang-source-text"
            aria-labelledby="strang-explain-heading"
            value={selectedText}
            onChange={handleTextChange}
            placeholder="Drop text here, or pull a highlight from the page with the link below."
            className={`w-full min-h-[7.5rem] px-3.5 py-3 rounded-xl bg-secondary/90 border text-foreground text-sm leading-relaxed placeholder:text-muted-foreground/80 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              overHard ? 'border-destructive' : overSoft ? 'border-primary/45' : 'border-border'
            }`}
            rows={5}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => { setError(null); loadSelection(); }}
              className="text-sm text-primary hover:text-primary/85 font-semibold underline decoration-primary/30 underline-offset-2"
            >
              Use selection from page
            </button>
            {charCount > 0 && (
              <span className={`quiet-stat ${overHard ? '!text-destructive' : overSoft ? '!text-primary' : ''}`}>
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            )}
          </div>
          {overSoft && !overHard && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/35 pl-3">
              Longer passages take a bit more time. Ceiling is {MAX_CHARS.toLocaleString()} characters.
            </p>
          )}
        </section>

        {progressStep && (
          <div className="mb-3 flex items-stretch gap-3 rounded-xl bg-primary/[0.09] border border-primary/25 overflow-hidden">
            <div className="w-1 shrink-0 bg-primary/70" aria-hidden />
            <div className="flex items-center py-2.5 pr-3 min-w-0">
              <span className="text-sm font-semibold text-foreground tracking-tight">{progressStep}</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={status === 'loading' || status === 'polling' || overHard}
          className="w-full glow-button disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {status === 'loading' && 'Writing script…'}
          {status === 'polling' && 'Creating video…'}
          {(status === 'idle' || status === 'done' || status === 'error') && 'Generate video'}
        </button>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-destructive/15 border border-destructive/35 text-destructive-foreground text-sm space-y-3 leading-relaxed">
            <p className="font-medium text-foreground/95">{error}</p>
            {status === 'error' && needsAuthAction(error) && (
              <button
                type="button"
                onClick={handleLogin}
                className="text-sm font-semibold text-primary hover:text-primary/85 underline decoration-primary/35 underline-offset-2"
              >
                Log in
              </button>
            )}
            {status === 'error' && error.includes('Upgrade') && (
              <button
                type="button"
                onClick={() => chrome.tabs.create({ url: `${LANDING_URL}/dashboard` })}
                className="text-sm font-semibold text-primary hover:text-primary/85 underline decoration-primary/35 underline-offset-2"
              >
                Upgrade to Pro
              </button>
            )}
            {status === 'error' && selectedText.trim() && !needsAuthAction(error) && !error.includes('Upgrade') && (
              <button
                type="button"
                onClick={() => { setError(null); generate(); }}
                className="text-sm font-semibold text-primary hover:text-primary/85 underline decoration-primary/35 underline-offset-2"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {videoUrl && (
          <div className="flex-1 min-h-0 flex flex-col glass-card p-3 min-h-[200px]">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-display text-sm font-semibold text-foreground tracking-tight">Your video</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Ready when you are—share or open full screen.</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  id="strang-copy-link"
                  type="button"
                  onClick={copyVideoLink}
                  className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1.5 rounded-lg bg-secondary border border-border hover:bg-primary/12 text-foreground"
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={openVideoInTab}
                  className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1.5 rounded-lg bg-secondary border border-border hover:bg-primary/12 text-foreground"
                >
                  Open tab
                </button>
              </div>
            </div>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg flex-1 min-h-0 border border-border/80 bg-black/40"
              playsInline
            />
          </div>
        )}

        {status === 'polling' && (
          <p className="text-sm text-muted-foreground mt-3 pl-1 border-l-2 border-muted-foreground/25 leading-relaxed">
            This usually takes a few minutes. You can keep browsing—this panel will update when it&apos;s ready.
          </p>
        )}

        {showEmptyState && (
          <div className="mt-1 rounded-2xl border border-dashed border-border/90 bg-secondary/25 px-4 py-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Quick start</p>
            <ul className="text-sm text-muted-foreground text-left space-y-2.5 max-w-[32ch] mx-auto leading-relaxed">
              {isLoggedIn ? (
                <>
                  <li className="flex gap-2">
                    <span className="font-display font-semibold text-primary shrink-0 w-5">1</span>
                    <span>Highlight text on the page <span className="text-foreground/90 font-medium">or</span> paste into the box.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-display font-semibold text-primary shrink-0 w-5">2</span>
                    <span>Press <span className="text-foreground font-semibold">Generate video</span> and let Strang work.</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-2">
                    <span className="font-display font-semibold text-primary shrink-0 w-5">1</span>
                    <span>
                      <button type="button" onClick={handleLogin} className="text-primary font-semibold underline decoration-primary/35 underline-offset-2">Log in</button>
                      {' '}to use your account.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-display font-semibold text-primary shrink-0 w-5">2</span>
                    <span>Paste text above, then hit <span className="text-foreground font-semibold">Generate video</span>.</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
