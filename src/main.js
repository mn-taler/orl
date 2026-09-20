import { getLinks } from './domain/store.js';
import { renderCollection, refreshGroupSuggestions } from './ui/collection.js';
import { initEditor } from './ui/editor.js';
import { initOpenOptions } from './ui/open-options.js';
import { initSettings } from './ui/settings.js';
import { initTagsPanel } from './ui/tags-panel.js';
import { restoreListInfo, setStatus } from './ui/status.js';

function boot() {
  const linkList = document.getElementById('link-list');
  let refreshAll = () => {};

  const openOptions = initOpenOptions({ setStatus });
  const tagsPanel = initTagsPanel({
    refreshAll: () => refreshAll(),
    setStatus,
  });
  const editor = initEditor({
    refreshAll: () => refreshAll(),
    setStatus,
  });

  refreshAll = () => {
    renderCollection(linkList, refreshAll);
    restoreListInfo(getLinks());
    refreshGroupSuggestions();
    tagsPanel.refresh();
    editor.refresh();
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
