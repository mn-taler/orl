import { DARK_MODE_KEY, DARK_MODE_KEY_LEGACY, MAX_IMPORT_BYTES } from '../config.js';
import {
  createExportPayload,
  getStore,
  importIncomingStore,
  normalizeStore,
  storageErrorMessage,
} from '../domain/store.js';
import { applyDarkMode, resolveDarkMode, saveDarkMode } from '../data/preferences.js';
import { readStoredValue } from '../data/storage.js';

export function initSettings({ refreshCollection, setStatus }) {
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
      setStatus('settings', 'Import file is too large', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setStatus('settings', 'Could not read import file', 'error');
    reader.onload = () => {
      try {
        const incoming = normalizeStore(JSON.parse(reader.result));
        const { added, updated, skipped, importedTagCount } = importIncomingStore(getStore(), incoming);
        refreshCollection();
        if (added > 0) {
          const extra = [
            updated > 0 ? `updated ${updated}` : '',
            skipped > 0 ? `skipped ${skipped}` : '',
          ].filter(Boolean).join(', ');
          setStatus('settings', extra ? `Imported ${added}, ${extra}` : `Imported ${added} link(s)`, 'success');
        } else if (updated > 0) {
          setStatus('settings', skipped > 0 ? `Updated ${updated}, skipped ${skipped}` : `Updated ${updated} link(s)`, 'success');
        } else if (importedTagCount > 0) {
          setStatus('settings', 'Imported tags', 'success');
        } else if (skipped > 0) {
          setStatus('settings', `No new links (skipped ${skipped})`, 'info');
        } else {
          setStatus('settings', 'No new links (all already saved)', 'info');
        }
      } catch (error) {
        setStatus(
          'settings',
          error instanceof SyntaxError ? 'Invalid or unsupported JSON file' : storageErrorMessage(error),
          'error'
        );
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
    setStatus('settings', 'Exported', 'success');
  });
}
