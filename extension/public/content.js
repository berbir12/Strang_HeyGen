/**
 * Content script: captures user text selection and bridges auth tokens
 * from the Strang landing page back to the extension.
 */

(function () {
  'use strict';

  if (typeof window.__AI_VIDEO_EXPLAINER_LAST_SELECTION__ === 'undefined') {
    window.__AI_VIDEO_EXPLAINER_LAST_SELECTION__ = '';
  }

  function getSelectedText() {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : '';
  }

  document.addEventListener('selectionchange', () => {
    const text = getSelectedText();
    if (text.length > 0) {
      window.__AI_VIDEO_EXPLAINER_LAST_SELECTION__ = text;
    }
  });

  // Listen for auth tokens posted by the Strang landing page (/extension-auth)
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'STRANG_AUTH_TOKEN' && event.data.access_token) {
      chrome.runtime.sendMessage({
        action: 'SET_AUTH_TOKEN',
        access_token: event.data.access_token,
        refresh_token: event.data.refresh_token || '',
        email: event.data.email || '',
      });
    }
  });

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'GET_SELECTION') {
      const current = getSelectedText();
      const text = current.length > 0 ? current : window.__AI_VIDEO_EXPLAINER_LAST_SELECTION__ || '';
      sendResponse({ text, success: true });
    }
    return true;
  });
})();
