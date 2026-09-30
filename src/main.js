import { initSession } from './auth/session.js';
import { getLinks, initStore } from './domain/store.js';
import { initCollectionSection, renderCollection } from './ui/collection.js?v=section1';
import { initOpenOptions } from './ui/open-options.js?v=section1';
import { initSettings } from './ui/settings.js?v=signin8';
import { applyAuthView, enterLocalMode, initSignIn, leaveLocalMode, needsSignIn } from './ui/sign-in.js?v=signin7';
import { initTagsPanel } from './ui/tags-panel.js?v=section1';
import { restoreListInfo, setStatus } from './ui/status.js';

async function boot() {
  const linkList = document.getElementById('link-list');
  let appReady = false;
  let refreshAll = () => {};

  const startApp = async () => {
    if (!appReady) {
      try {
        await initStore();
      } catch (error) {
        setStatus('settings', error.message || 'Could not load collection', 'error');
      }

      initCollectionSection();
      const openOptions = initOpenOptions({ setStatus });
      const tagsPanel = initTagsPanel({
        refreshAll: () => refreshAll(),
        setStatus,
      });

      refreshAll = () => {
        renderCollection(linkList, refreshAll);
        restoreListInfo(getLinks());
        tagsPanel.refresh();
        openOptions.refresh();
      };
      appReady = true;
    }
    refreshAll();
  };

  try {
    await initSession();
  } catch (error) {
    setStatus('settings', error.message || 'Could not sign in', 'error');
  }

  initSignIn({
    setStatus,
    onUseLocal: () => startApp(),
  });

  initSettings({
    refreshCollection: () => refreshAll(),
    setStatus,
    onSignedOut: () => {
      leaveLocalMode();
    },
    onEnteredLocal: async () => {
      enterLocalMode();
      await startApp();
    },
  });

  if (needsSignIn()) return;
  await startApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    boot();
  });
} else {
  boot();
}
