/**
 * Service worker: opens side panel, forwards selection, handles auth token storage.
 */

const DEFAULT_BACKEND = 'https://api.thestrang.com';
const STALE_BACKENDS = [
  'https://strang-heygen-production.up.railway.app',
];
const BACKEND_KEY = 'strang_backend_url';

function normalizeBackend(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function migrateStaleBackend() {
  try {
    chrome.storage.local.get([BACKEND_KEY], (result) => {
      const stored = normalizeBackend(result[BACKEND_KEY]);
      if (stored && STALE_BACKENDS.includes(stored)) {
        chrome.storage.local.set({ [BACKEND_KEY]: DEFAULT_BACKEND });
      }
    });
  } catch (_e) {
  }
}

migrateStaleBackend();

if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  try {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (e) {
    // Ignore if not supported
  }
}

function getPageSelection() {
  try {
    const cached = window.__AI_VIDEO_EXPLAINER_LAST_SELECTION__;
    if (cached && typeof cached === 'string') return cached;
    const sel = window.getSelection();
    return sel ? sel.toString().trim() : '';
  } catch (e) {
    return '';
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_SELECTION_FROM_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ text: '', success: false });
        return;
      }
      chrome.scripting.executeScript(
        { target: { tabId: tab.id }, func: getPageSelection },
        (results) => {
          if (chrome.runtime.lastError) {
            sendResponse({ text: '', success: false });
            return;
          }
          const text = (results && results[0] && results[0].result) || '';
          sendResponse({ text: String(text).trim(), success: true });
        }
      );
    });
    return true;
  }

  // Auth token received from content script (bridged from landing page)
  if (message.action === 'SET_AUTH_TOKEN') {
    const nextState = {
      strang_access_token: message.access_token,
      strang_refresh_token: message.refresh_token || '',
      strang_email: message.email || '',
    };
    const backendUrl = String(message.backend_url || '').trim().replace(/\/+$/, '');
    if (backendUrl) {
      nextState[BACKEND_KEY] = backendUrl;
    }
    chrome.storage.local.set(nextState, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  // Get stored auth token
  if (message.action === 'GET_AUTH_TOKEN') {
    chrome.storage.local.get(
      ['strang_access_token', 'strang_refresh_token', 'strang_email'],
      (result) => {
        sendResponse({
          access_token: result.strang_access_token || '',
          refresh_token: result.strang_refresh_token || '',
          email: result.strang_email || '',
        });
      }
    );
    return true;
  }

  // Clear auth token (logout)
  if (message.action === 'CLEAR_AUTH_TOKEN') {
    chrome.storage.local.remove(
      ['strang_access_token', 'strang_refresh_token', 'strang_email'],
      () => { sendResponse({ ok: true }); }
    );
    return true;
  }

  // Silently refresh Supabase access token via the backend proxy.
  // Returns { ok: true, access_token, refresh_token } on success, { ok: false } on failure.
  if (message.action === 'REFRESH_AUTH_TOKEN') {
    chrome.storage.local.get(
      ['strang_refresh_token', 'strang_email'],
      async (result) => {
        const refreshToken = result.strang_refresh_token;
        if (!refreshToken) {
          sendResponse({ ok: false });
          return;
        }
        const backend = message.backend || DEFAULT_BACKEND;
        try {
          const res = await fetch(`${backend}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (!res.ok) {
            sendResponse({ ok: false });
            return;
          }
          const data = await res.json();
          if (!data.access_token) {
            sendResponse({ ok: false });
            return;
          }
          chrome.storage.local.set({
            strang_access_token: data.access_token,
            strang_refresh_token: data.refresh_token || refreshToken,
          }, () => {
            sendResponse({
              ok: true,
              access_token: data.access_token,
              refresh_token: data.refresh_token || refreshToken,
              email: result.strang_email || '',
            });
          });
        } catch (_e) {
          sendResponse({ ok: false });
        }
      }
    );
    return true;
  }

  return false;
});
