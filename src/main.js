import { getLinks } from './domain/store.js';
import { renderCollection } from './ui/collection.js?v=mobile5';
import { initOpenOptions } from './ui/open-options.js?v=mobile4';
import { initSettings } from './ui/settings.js';
import { initTagsPanel } from './ui/tags-panel.js?v=mobile5';
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
