import { getLinks } from './domain/store.js';
import { renderCollection, refreshGroupSuggestions } from './ui/collection.js';
import { initEditor } from './ui/editor.js';
import { initOpenOptions } from './ui/open-options.js';
import { initSettings } from './ui/settings.js';
import { restoreListInfo, setListInfo } from './ui/status.js';

function boot() {
  const linkList = document.getElementById('link-list');
  const openOptions = initOpenOptions({ setListInfo });

  const refreshCollection = () => {
    renderCollection(linkList, refreshCollection);
    restoreListInfo(getLinks());
    refreshGroupSuggestions();
    openOptions.refresh();
  };

  initSettings({ refreshCollection, setListInfo });
  initEditor({ refreshCollection, setListInfo });
  refreshCollection();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
