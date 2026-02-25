/**
 * Content script: captures user text selection and caches it so the background
 * can read it via scripting.executeScript (avoids messaging issues).
 */

(function () {
  'use strict';

  // Store on window so background's executeScript can read it (same isolated world)
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

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'GET_SELECTION') {
      const current = getSelectedText();
      const text = current.length > 0 ? current : window.__AI_VIDEO_EXPLAINER_LAST_SELECTION__ || '';
      sendResponse({ text, success: true });
    }
    return true;
  });
})();
