import { getLinks } from './domain/store.js';
import { renderCollection } from './ui/collection.js';
import { initOpenOptions } from './ui/open-options.js';
import { initSettings } from './ui/settings.js';
import { initTagsPanel } from './ui/tags-panel.js?v=addtag3';
import { restoreListInfo, setStatus } from './ui/status.js';

function boot() {
  const linkList = document.getElementById('link-list');
  let refreshAll = () => {};

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

  initSettings({ refreshCollection: () => refreshAll(), setStatus });
  refreshAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
