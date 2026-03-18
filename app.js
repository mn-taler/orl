const STORAGE_KEY = 'savedLinks';
const DARK_MODE_KEY = 'darkMode';

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

function renderLinkList(links, listEl, emptyEl) {
  listEl.innerHTML = '';
  emptyEl.classList.toggle('hidden', links.length > 0);

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
      renderLinkList(updated, listEl, emptyEl);
      setStatus('Removed.');
    });

    li.appendChild(a);
    li.appendChild(removeBtn);
    listEl.appendChild(li);
  });
}

const STATUS_DURATION_MS = 3000;
let statusTimeoutId = null;

function setStatus(message) {
  const status = document.getElementById('status');
  if (statusTimeoutId) clearTimeout(statusTimeoutId);
  status.textContent = message;
  statusTimeoutId = setTimeout(() => {
    status.textContent = '';
    statusTimeoutId = null;
  }, STATUS_DURATION_MS);
}

document.addEventListener('DOMContentLoaded', () => {
  const openRandomLinkButton = document.getElementById('open-random-link-button');
  const addLinkButton = document.getElementById('add-link-button');
  const linkInput = document.getElementById('link-input');
  const linkList = document.getElementById('link-list');
  const emptyMessage = document.getElementById('empty-message');
  const darkModeCheckbox = document.getElementById('dark-mode');

  let links = getLinks();
  renderLinkList(links, linkList, emptyMessage);

  const darkMode = localStorage.getItem(DARK_MODE_KEY) === 'true';
  document.body.classList.toggle('dark', darkMode);
  darkModeCheckbox.checked = darkMode;

  darkModeCheckbox.addEventListener('change', () => {
    const enabled = darkModeCheckbox.checked;
    localStorage.setItem(DARK_MODE_KEY, String(enabled));
    document.body.classList.toggle('dark', enabled);
    setStatus(enabled ? 'Dark mode on.' : 'Dark mode off.');
  });

  document.getElementById('import-link').addEventListener('click', (e) => {
    e.preventDefault();
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
        renderLinkList(merged, linkList, emptyMessage);
        const added = merged.length - existing.length;
        setStatus(added > 0 ? `Imported ${added} link(s).` : 'No new links (all already saved).');
      } catch {
        setStatus('Invalid or unsupported JSON file.');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('export-link').addEventListener('click', (e) => {
    e.preventDefault();
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
    setStatus('Exported.');
  });

  openRandomLinkButton.addEventListener('click', () => {
    const list = getLinks();
    if (list.length === 0) {
      setStatus('No links saved.');
      return;
    }
    const url = list[Math.floor(Math.random() * list.length)];
    window.open(url, '_blank', 'noopener');
    setStatus('Link opened!');
  });

  addLinkButton.addEventListener('click', () => {
    const url = normalizeUrl(linkInput.value);
    if (!url) {
      setStatus('Please enter a valid URL.');
      return;
    }
    links = getLinks();
    if (links.includes(url)) {
      setStatus('Link is already saved.');
      return;
    }
    links.push(url);
    saveLinks(links);
    renderLinkList(links, linkList, emptyMessage);
    linkInput.value = '';
    setStatus('Link added!');
  });

  linkInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addLinkButton.click();
  });
});
