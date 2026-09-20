import { DARK_MODE_KEY, DARK_MODE_KEY_LEGACY, MAX_IMPORT_BYTES, TAGS_GROUP } from '../config.js';
import {
  createExportPayload,
  getStore,
  importIncomingStore,
  normalizeStore,
  storageErrorMessage,
} from '../domain/store.js';
import { applyDarkMode, resolveDarkMode, saveDarkMode } from '../data/preferences.js';
import { readStoredValue } from '../data/storage.js';
import { expandGroup } from './collection.js';

export function initSettings({ refreshCollection, setListInfo }) {
  const darkModeCheckbox = document.getElementById('dark-mode');
  const settingsButton = document.getElementById('settings-button');
  const settingsMenu = document.getElementById('settings-menu');
  const darkModeToggle = darkModeCheckbox.closest('.settings-toggle');

  const setSettingsMenuOpen = (open) => {
    settingsMenu.hidden = !open;
    settingsButton.setAttribute('aria-expanded', String(open));
  };

  const applyResolvedDarkMode = () => {
    const enabled = resolveDarkMode();
    applyDarkMode(enabled);
    darkModeCheckbox.checked = enabled;
    if (darkModeToggle) darkModeToggle.setAttribute('aria-checked', String(enabled));
  };

  applyResolvedDarkMode();

  darkModeCheckbox.addEventListener('change', () => {
    const enabled = darkModeCheckbox.checked;
    saveDarkMode(enabled);
    applyDarkMode(enabled);
    if (darkModeToggle) darkModeToggle.setAttribute('aria-checked', String(enabled));
    setListInfo(enabled ? 'Dark mode on' : 'Dark mode off');
  });

  settingsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    setSettingsMenuOpen(settingsMenu.hidden);
  });

  document.addEventListener('click', (e) => {
    if (settingsMenu.hidden) return;
    if (settingsMenu.contains(e.target) || settingsButton.contains(e.target)) return;
    setSettingsMenuOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsMenu.hidden) {
      setSettingsMenuOpen(false);
      settingsButton.focus();
    }
  });

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (readStoredValue(DARK_MODE_KEY, DARK_MODE_KEY_LEGACY) == null) {
        applyResolvedDarkMode();
      }
    });
  }

  document.getElementById('import-link').addEventListener('click', (e) => {
    e.preventDefault();
    setSettingsMenuOpen(false);
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setListInfo('Import file is too large');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setListInfo('Could not read import file');
    reader.onload = () => {
      try {
        const incoming = normalizeStore(JSON.parse(reader.result));
        const { added, updated, skipped, importedTagCount } = importIncomingStore(getStore(), incoming);
        expandGroup(TAGS_GROUP);
        refreshCollection();
        if (added > 0) {
          const extra = [
            updated > 0 ? `updated ${updated}` : '',
            skipped > 0 ? `skipped ${skipped}` : '',
          ].filter(Boolean).join(', ');
          setListInfo(extra ? `Imported ${added}, ${extra}` : `Imported ${added} link(s)`);
        } else if (updated > 0) {
          setListInfo(skipped > 0 ? `Updated ${updated}, skipped ${skipped}` : `Updated ${updated} link(s)`);
        } else if (importedTagCount > 0) {
          setListInfo('Imported tags');
        } else if (skipped > 0) {
          setListInfo(`No new links (skipped ${skipped})`);
        } else {
          setListInfo('No new links (all already saved)');
        }
      } catch (error) {
        setListInfo(error instanceof SyntaxError ? 'Invalid or unsupported JSON file' : storageErrorMessage(error));
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('export-link').addEventListener('click', (e) => {
    e.preventDefault();
    setSettingsMenuOpen(false);
    const json = JSON.stringify(createExportPayload(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open-random-link-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setListInfo('Exported');
  });
}
