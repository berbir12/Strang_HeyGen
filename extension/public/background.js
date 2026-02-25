/**
 * Service worker: opens side panel, forwards selection to backend, handles polling.
 */

const DEFAULT_BACKEND = 'http://localhost:8000';

// Let Chrome open the side panel automatically when the user clicks the
// toolbar icon. This avoids calling sidePanel.open() ourselves and keeps
// everything within a proper user gesture according to the new API.
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  try {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (e) {
    // Ignore if not supported; user can still open side panel manually.
  }
}

// Function injected into the tab to read cached selection (set by content script).
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
      // Use scripting.executeScript to read selection/cache from the page.
      // Works even when content script messaging is flaky and reads cached selection.
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
  return false;
});
