import React, { useState, useCallback } from 'react';

const BACKEND_KEY = 'strang_backend_url';
const BACKEND_KEY_LEGACY = 'ai_video_explainer_backend_url';
const API_KEY_STORAGE_KEY = 'strang_api_key';
// For Chrome Web Store build, set VITE_STRANG_API_URL to your production API (e.g. in CI or .env.production).
const DEFAULT_BACKEND = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRANG_API_URL) || 'http://localhost:8000';
const MAX_CHARS = 3000;
const SOFT_LIMIT_CHARS = 2500;

function getBackendUrl() {
  try {
    const stored = localStorage.getItem(BACKEND_KEY) || localStorage.getItem(BACKEND_KEY_LEGACY);
    return stored || DEFAULT_BACKEND;
  } catch {
    return DEFAULT_BACKEND;
  }
}

function setBackendUrl(url) {
  try {
    localStorage.setItem(BACKEND_KEY, url);
    localStorage.setItem(BACKEND_KEY_LEGACY, url);
  } catch (_) {}
}

function getApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function setApiKey(key) {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key || '');
  } catch (_) {}
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

export default function App() {
  const [selectedText, setSelectedText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | polling | done | error
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [backendUrl, setBackendUrlState] = useState(getBackendUrl());
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [showSettings, setShowSettings] = useState(false);

  const authHeaders = () => {
    const key = getApiKey();
    const h = { 'Content-Type': 'application/json' };
    if (key) h['X-API-Key'] = key;
    return h;
  };

  const loadSelection = useCallback(() => {
    setError(null);
    chrome.runtime.sendMessage({ action: 'GET_SELECTION_FROM_TAB' }, (res) => {
      if (chrome.runtime.lastError) {
        setError('Cannot access this page. Try a normal website (e.g. wikipedia.org) or paste text above.');
        return;
      }
      const text = (res?.text ?? '').trim();
      setSelectedText(text);
      if (!text) setError('No selection found. Select text on the page first, then click the button again.');
      else setError(null);
    });
  }, []);

  const saveBackend = () => {
    setBackendUrl(backendUrl);
    setApiKey(apiKey);
    setShowSettings(false);
  };

  const generate = async () => {
    const text = selectedText.trim();
    if (!text) {
      setError('Select some text on the page first, or paste it above, then click Generate.');
      return;
    }
    if (text.length > MAX_CHARS) {
      setError(`Text is too long. Please use ${MAX_CHARS.toLocaleString()} characters or less.`);
      return;
    }
    const base = getBackendUrl();
    setError(null);
    setStatus('loading');
    setVideoUrl(null);

    try {
      const res = await fetch(`${base}/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text }),
      });
      const raw = await res.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_) {
        throw new Error(res.ok ? 'Invalid response' : (raw || `Error ${res.status}`));
      }

      if (!res.ok) {
        throw new Error(data.detail || data.message || raw || 'Request failed');
      }

      const { job_id } = data;
      if (!job_id) {
        setStatus('done');
        if (data.video_url) setVideoUrl(data.video_url);
        return;
      }

      setStatus('polling');
      const poll = async () => {
        try {
          const pollRes = await fetch(`${base}/generate/status/${job_id}`, { headers: authHeaders() });
          const pollRaw = await pollRes.text();
          let pollData = {};
          try {
            pollData = pollRaw ? JSON.parse(pollRaw) : {};
          } catch (_) {
            setError(pollRaw || 'Invalid response');
            setStatus('error');
            return;
          }
          if (pollRes.ok && pollData.status === 'completed' && pollData.video_url) {
            setVideoUrl(pollData.video_url);
            setStatus('done');
            return;
          }
          if (pollData.status === 'failed') {
            setError(pollData.error || 'Video generation failed');
            setStatus('error');
            return;
          }
          setTimeout(poll, 4000);
        } catch (e) {
          setError(e.message || 'Polling failed');
          setStatus('error');
        }
      };
      poll();
    } catch (e) {
      setError(e.message || 'Failed to start generation');
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
    // Could add a tiny toast; for now user can see the link was copied if we briefly show feedback
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
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-display font-semibold text-primary">Strang</h1>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 glass-card space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-2">Backend URL</label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrlState(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="http://localhost:8000"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-2">API key (optional)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Leave empty if backend has no key"
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            onClick={saveBackend}
            className="glow-button text-sm px-4 py-2"
          >
            Save
          </button>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs text-muted-foreground mb-2">Text to explain (paste or pull from page)</label>
        <textarea
          value={selectedText}
          onChange={handleTextChange}
          placeholder="Paste text here, or select text on the page and click “Use selection from page”"
          className={`w-full h-24 px-3 py-2.5 rounded-xl bg-secondary border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
            overHard ? 'border-destructive' : overSoft ? 'border-primary/50' : 'border-border'
          }`}
          rows={4}
        />
        <div className="mt-1 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setError(null); loadSelection(); }}
            className="text-sm text-primary hover:text-primary/90 font-medium transition-colors"
          >
            Use selection from page
          </button>
          {charCount > 0 && (
            <span className={`text-xs ${overHard ? 'text-destructive' : overSoft ? 'text-primary' : 'text-muted-foreground'}`}>
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          )}
        </div>
        {overSoft && !overHard && (
          <p className="mt-1 text-xs text-muted-foreground">Longer text may take longer to process. Max {MAX_CHARS.toLocaleString()} characters.</p>
        )}
      </div>

      {progressStep && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground">{progressStep}</span>
        </div>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={status === 'loading' || status === 'polling' || overHard}
        className="w-full glow-button disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mb-4"
      >
        {status === 'loading' && 'Writing script…'}
        {status === 'polling' && 'Creating video…'}
        {(status === 'idle' || status === 'done' || status === 'error') && 'Generate video'}
      </button>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive-foreground text-sm space-y-2">
          <p>{error}</p>
          {(status === 'error') && selectedText.trim() && (
            <button
              type="button"
              onClick={() => { setError(null); generate(); }}
              className="text-sm font-medium text-primary hover:text-primary/90"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {videoUrl && (
        <div className="flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Your explainer video</p>
            <div className="flex items-center gap-1">
              <button
                id="strang-copy-link"
                type="button"
                onClick={copyVideoLink}
                className="text-xs px-2 py-1 rounded-lg bg-secondary border border-border hover:bg-primary/10 text-foreground transition-colors"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={openVideoInTab}
                className="text-xs px-2 py-1 rounded-lg bg-secondary border border-border hover:bg-primary/10 text-foreground transition-colors"
              >
                Open in new tab
              </button>
            </div>
          </div>
          <video
            src={videoUrl}
            controls
            className="w-full rounded-lg flex-1 min-h-0"
            playsInline
          />
        </div>
      )}

      {status === 'polling' && (
        <p className="text-sm text-muted-foreground mt-2">This may take a few minutes. You can keep using the tab.</p>
      )}

      {showEmptyState && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Highlight text on the page or paste above, then click <strong className="text-foreground">Generate video</strong>.
        </p>
      )}
    </div>
  );
}
