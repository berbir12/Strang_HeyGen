/**
 * Service worker: opens side panel, forwards selection, handles auth token storage.
 */

const DEFAULT_BACKEND = 'https://strang-heygen-production.up.railway.app';

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
    chrome.storage.local.set({
      strang_access_token: message.access_token,
      strang_refresh_token: message.refresh_token || '',
      strang_email: message.email || '',
    }, () => {
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

  return false;
});
