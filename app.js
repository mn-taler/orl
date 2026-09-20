const STORAGE_KEY = 'savedLinks';
const DARK_MODE_KEY = 'darkMode';
const LINK_AMOUNT_KEY = 'linkAmount';
const MIN_LINK_AMOUNT = 1;
const MAX_LINK_AMOUNT = 10;

function normalizeUrl(url) {
  const s = (url || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) return 'https://' + s;
  return s;
}

function getLinks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveLinks(links) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

const EMPTY_LIST_MESSAGE = 'No links saved yet';
const STATUS_DURATION_MS = 3000;
let listInfoTimeoutId = null;

function getListInfoEl() {
  return document.getElementById('list-info');
}

function restoreListInfo(links) {
  const infoEl = getListInfoEl();
  if (links.length === 0) {
    infoEl.textContent = EMPTY_LIST_MESSAGE;
    infoEl.classList.remove('hidden');
  } else {
    infoEl.textContent = '';
    infoEl.classList.add('hidden');
  }
}

function setListInfo(message) {
  const infoEl = getListInfoEl();
  if (listInfoTimeoutId) clearTimeout(listInfoTimeoutId);
  infoEl.textContent = message;
  infoEl.classList.remove('hidden');
  listInfoTimeoutId = setTimeout(() => {
    listInfoTimeoutId = null;
    restoreListInfo(getLinks());
  }, STATUS_DURATION_MS);
}

function renderLinkList(links, listEl) {
  listEl.innerHTML = '';

  links.forEach((url, index) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'link-url';
    a.textContent = url;
    a.title = url;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-link';
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      const updated = getLinks().filter((_, i) => i !== index);
      saveLinks(updated);
      renderLinkList(updated, listEl);
      setListInfo('Removed');
    });

    li.appendChild(a);
    li.appendChild(removeBtn);
    listEl.appendChild(li);
  });
}

function prefersDarkMode() {
  if (!window.matchMedia) return true;
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return false;
  return true;
}

function resolveDarkMode() {
  const stored = localStorage.getItem(DARK_MODE_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return prefersDarkMode();
}

function applyDarkMode(enabled) {
  document.documentElement.classList.toggle('dark', enabled);
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = enabled ? '#1a1a1a' : '#f0f0f0';
}

function clampLinkAmount(value) {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n)) return MIN_LINK_AMOUNT;
  return Math.min(MAX_LINK_AMOUNT, Math.max(MIN_LINK_AMOUNT, n));
}

function getLinkAmount() {
  return clampLinkAmount(localStorage.getItem(LINK_AMOUNT_KEY));
}

function saveLinkAmount(amount) {
  localStorage.setItem(LINK_AMOUNT_KEY, String(amount));
}

function pickRandomLinks(list, count) {
  const n = Math.min(count, list.length);
  const remaining = list.slice();
  const picked = [];
  for (let i = 0; i < n; i++) {
    const index = Math.floor(Math.random() * remaining.length);
    picked.push(remaining.splice(index, 1)[0]);
  }
  return picked;
}

document.addEventListener('DOMContentLoaded', () => {
  const openRandomLinkButton = document.getElementById('open-button');
  const optionsToggle = document.getElementById('options-toggle');
  const optionsPanel = document.getElementById('options-panel');
  const linkAmountInput = document.getElementById('link-amount');
  const addLinkButton = document.getElementById('add-link-button');
  const linkInput = document.getElementById('link-input');
  const linkList = document.getElementById('link-list');
  const darkModeCheckbox = document.getElementById('dark-mode');
  const settingsButton = document.getElementById('settings-button');
  const settingsMenu = document.getElementById('settings-menu');
  const darkModeToggle = darkModeCheckbox.closest('.settings-toggle');

  const applyLinkAmount = (value) => {
    const amount = clampLinkAmount(value);
    linkAmountInput.value = String(amount);
    saveLinkAmount(amount);
    return amount;
  };

  applyLinkAmount(getLinkAmount());

  optionsToggle.addEventListener('click', () => {
    const open = optionsPanel.hidden;
    optionsPanel.hidden = !open;
    optionsToggle.setAttribute('aria-expanded', String(open));
  });

  linkAmountInput.addEventListener('change', () => {
    applyLinkAmount(linkAmountInput.value);
  });

  let links = getLinks();
  renderLinkList(links, linkList);
  restoreListInfo(links);

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
    localStorage.setItem(DARK_MODE_KEY, String(enabled));
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
      if (localStorage.getItem(DARK_MODE_KEY) == null) {
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
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const imported = Array.isArray(data) ? data : (Array.isArray(data?.links) ? data.links : []);
        const normalized = imported
          .map((item) => (typeof item === 'string' ? normalizeUrl(item) : ''))
          .filter((url) => url.length > 0);
        const existing = getLinks();
        const merged = [...existing];
        for (const url of normalized) {
          if (!merged.includes(url)) merged.push(url);
        }
        saveLinks(merged);
        links = merged;
        renderLinkList(merged, linkList);
        const added = merged.length - existing.length;
        setListInfo(added > 0 ? `Imported ${added} link(s)` : 'No new links (all already saved)');
      } catch {
        setListInfo('Invalid or unsupported JSON file');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('export-link').addEventListener('click', (e) => {
    e.preventDefault();
    setSettingsMenuOpen(false);
    const list = getLinks();
    const exportData = { exportedAt: new Date().toISOString(), links: list };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open-random-link-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setListInfo('Exported');
  });

  openRandomLinkButton.addEventListener('click', () => {
    const list = getLinks();
    if (list.length === 0) {
      setListInfo('No links saved');
      return;
    }
    const amount = applyLinkAmount(linkAmountInput.value);
    const picked = pickRandomLinks(list, amount);
    picked.forEach((url) => {
      window.open(url, '_blank', 'noopener');
    });
    if (picked.length === 1) {
      setListInfo('Link opened');
    } else if (picked.length < amount) {
      setListInfo(`Opened ${picked.length} of ${amount}`);
    } else {
      setListInfo(`${picked.length} links opened`);
    }
  });

  addLinkButton.addEventListener('click', () => {
    const url = normalizeUrl(linkInput.value);
    if (!url) {
    setListInfo('Please enter a valid URL');
      return;
    }
    links = getLinks();
    if (links.includes(url)) {
      setListInfo('Link is already saved');
      return;
    }
    links.push(url);
    saveLinks(links);
    renderLinkList(links, linkList);
    linkInput.value = '';
    setListInfo('Link added');
  });

  linkInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addLinkButton.click();
  });
});
