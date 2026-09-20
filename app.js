const STORAGE_KEY = 'savedLinks';
const DARK_MODE_KEY = 'darkMode';
const LINK_AMOUNT_KEY = 'linkAmount';
const MIN_LINK_AMOUNT = 1;
const MAX_LINK_AMOUNT = 10;
const DEFAULT_GROUP = 'Main';

function normalizeUrl(url) {
  const s = (url || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) return 'https://' + s;
  return s;
}

function normalizeGroupName(name) {
  const s = (name || '').trim();
  if (!s || s.toLowerCase() === 'main') return DEFAULT_GROUP;
  return s;
}

function createEmptyStore() {
  return { groups: [{ name: DEFAULT_GROUP, links: [], subgroups: [] }] };
}

function normalizeSubgroup(subgroup) {
  const links = Array.isArray(subgroup?.links)
    ? subgroup.links.map((item) => (typeof item === 'string' ? normalizeUrl(item) : '')).filter(Boolean)
    : [];
  return {
    name: (subgroup?.name || '').trim() || 'Untitled',
    links,
  };
}

function normalizeGroup(group) {
  const links = Array.isArray(group?.links)
    ? group.links.map((item) => (typeof item === 'string' ? normalizeUrl(item) : '')).filter(Boolean)
    : [];
  const subgroups = Array.isArray(group?.subgroups) ? group.subgroups.map(normalizeSubgroup) : [];
  return {
    name: normalizeGroupName(group?.name),
    links,
    subgroups,
  };
}

function mergeGroupInto(target, incoming) {
  for (const url of incoming.links) {
    if (!target.links.includes(url)) target.links.push(url);
  }
  for (const subgroup of incoming.subgroups) {
    let dest = target.subgroups.find((item) => item.name === subgroup.name);
    if (!dest) {
      dest = { name: subgroup.name, links: [] };
      target.subgroups.push(dest);
    }
    for (const url of subgroup.links) {
      if (!dest.links.includes(url)) dest.links.push(url);
    }
  }
}

function extractUrlList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return normalizeUrl(item);
      if (item && typeof item === 'object') {
        if (typeof item.url === 'string') return normalizeUrl(item.url);
        if (typeof item.href === 'string') return normalizeUrl(item.href);
        if (typeof item.link === 'string') return normalizeUrl(item.link);
      }
      return '';
    })
    .filter(Boolean);
}

function hasGroupFormat(data) {
  return Boolean(data && Array.isArray(data.groups) && data.groups.length > 0);
}

function normalizeStore(data) {
  const store = createEmptyStore();
  if (data == null) return store;

  if (Array.isArray(data)) {
    mergeGroupInto(findOrCreateGroup(store, DEFAULT_GROUP), {
      name: DEFAULT_GROUP,
      links: extractUrlList(data),
      subgroups: [],
    });
    return store;
  }

  if (typeof data !== 'object') return store;

  if (hasGroupFormat(data)) {
    for (const group of data.groups.map(normalizeGroup)) {
      mergeGroupInto(findOrCreateGroup(store, group.name), group);
    }
    return store;
  }

  const legacyLinks = extractUrlList(data.links);
  if (legacyLinks.length > 0) {
    mergeGroupInto(findOrCreateGroup(store, DEFAULT_GROUP), {
      name: DEFAULT_GROUP,
      links: legacyLinks,
      subgroups: [],
    });
  }

  return store;
}

function findOrCreateGroup(store, name) {
  const groupName = normalizeGroupName(name);
  let group = store.groups.find((item) => item.name === groupName);
  if (!group) {
    group = { name: groupName, links: [], subgroups: [] };
    store.groups.push(group);
  }
  return group;
}

function flattenLinks(store) {
  const urls = [];
  for (const group of store.groups) {
    urls.push(...group.links);
    for (const subgroup of group.subgroups) urls.push(...subgroup.links);
  }
  return urls;
}

function pruneStore(store) {
  for (const group of store.groups) {
    group.subgroups = group.subgroups.filter((subgroup) => subgroup.links.length > 0);
  }
  store.groups = store.groups.filter((group) => (
    group.name === DEFAULT_GROUP || group.links.length > 0 || group.subgroups.length > 0
  ));
  if (!store.groups.some((group) => group.name === DEFAULT_GROUP)) {
    store.groups.unshift({ name: DEFAULT_GROUP, links: [], subgroups: [] });
  } else {
    const main = store.groups.find((group) => group.name === DEFAULT_GROUP);
    store.groups = [main, ...store.groups.filter((group) => group.name !== DEFAULT_GROUP)];
  }
  return store;
}

function getStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    const store = pruneStore(normalizeStore(data));
    if (raw && !(data && Array.isArray(data.groups))) {
      saveStore(store);
    }
    return store;
  } catch {
    return createEmptyStore();
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pruneStore(store)));
}

function getLinks() {
  return flattenLinks(getStore());
}

function groupHasLinks(group) {
  return group.links.length > 0 || group.subgroups.some((subgroup) => subgroup.links.length > 0);
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

const expandedNodes = new Set();

function createTreeArrow() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tree-arrow');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', '9 18 15 12 9 6');
  svg.appendChild(polyline);
  return svg;
}

function countGroupLinks(group) {
  return group.links.length + group.subgroups.reduce((sum, subgroup) => sum + subgroup.links.length, 0);
}

function createLinkRow(url, onChange) {
  const li = document.createElement('li');
  li.className = 'tree-link';

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
    const store = getStore();
    for (const group of store.groups) {
      group.links = group.links.filter((item) => item !== url);
      for (const subgroup of group.subgroups) {
        subgroup.links = subgroup.links.filter((item) => item !== url);
      }
    }
    saveStore(store);
    onChange();
    setListInfo('Removed');
  });

  li.appendChild(a);
  li.appendChild(removeBtn);
  return li;
}

function createTreeNode(name, key, childEls, count, isSubgroup) {
  const li = document.createElement('li');
  li.className = isSubgroup ? 'tree-node tree-node-sub' : 'tree-node';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'tree-toggle';
  const expanded = expandedNodes.has(key);
  toggle.setAttribute('aria-expanded', String(expanded));

  const label = document.createElement('span');
  label.className = 'tree-label';
  label.textContent = name;

  const countEl = document.createElement('span');
  countEl.className = 'tree-count';
  countEl.textContent = String(count);

  toggle.appendChild(createTreeArrow());
  toggle.appendChild(label);
  toggle.appendChild(countEl);

  const children = document.createElement('ul');
  children.className = 'tree-children';
  children.hidden = !expanded;
  childEls.forEach((child) => children.appendChild(child));

  toggle.addEventListener('click', () => {
    const open = children.hidden;
    children.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) expandedNodes.add(key);
    else expandedNodes.delete(key);
  });

  li.appendChild(toggle);
  li.appendChild(children);
  return li;
}

function createTreeSubgroup(groupName, subgroup, onChange) {
  const children = subgroup.links.map((url) => createLinkRow(url, onChange));
  return createTreeNode(
    subgroup.name,
    `subgroup:${groupName}/${subgroup.name}`,
    children,
    subgroup.links.length,
    true
  );
}

function createTreeGroup(group, onChange) {
  const children = group.links.map((url) => createLinkRow(url, onChange));
  group.subgroups.forEach((subgroup) => {
    if (subgroup.links.length === 0) return;
    children.push(createTreeSubgroup(group.name, subgroup, onChange));
  });
  return createTreeNode(group.name, `group:${group.name}`, children, countGroupLinks(group), false);
}

function renderLinkList(listEl, onChange) {
  const store = getStore();
  listEl.innerHTML = '';
  store.groups.filter(groupHasLinks).forEach((group) => {
    listEl.appendChild(createTreeGroup(group, onChange));
  });
}

function refreshGroupSuggestions() {
  const datalist = document.getElementById('group-suggestions');
  if (!datalist) return;
  datalist.innerHTML = '';
  getStore().groups.forEach((group) => {
    const option = document.createElement('option');
    option.value = group.name;
    datalist.appendChild(option);
  });
}

function bindDisclosure(toggle, panel) {
  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
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
  if (themeColor) themeColor.content = enabled ? '#1a2c22' : '#e4f6e9';
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
  const linkGroupInput = document.getElementById('link-group');
  const linkInfoToggle = document.getElementById('link-info-toggle');
  const linkInfoPanel = document.getElementById('link-info-panel');
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

  bindDisclosure(optionsToggle, optionsPanel);
  bindDisclosure(linkInfoToggle, linkInfoPanel);

  linkAmountInput.addEventListener('change', () => {
    applyLinkAmount(linkAmountInput.value);
  });

  const refreshCollection = () => {
    renderLinkList(linkList, refreshCollection);
    restoreListInfo(getLinks());
    refreshGroupSuggestions();
  };

  refreshCollection();

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
        const existing = getStore();
        const beforeCount = flattenLinks(existing).length;
        const seen = new Set(flattenLinks(existing));
        const incoming = normalizeStore(data);
        for (const group of incoming.groups) {
          const dest = findOrCreateGroup(existing, group.name);
          for (const url of group.links) {
            if (!seen.has(url)) {
              dest.links.push(url);
              seen.add(url);
            }
          }
          for (const subgroup of group.subgroups) {
            let destSubgroup = dest.subgroups.find((item) => item.name === subgroup.name);
            if (!destSubgroup) {
              destSubgroup = { name: subgroup.name, links: [] };
              dest.subgroups.push(destSubgroup);
            }
            for (const url of subgroup.links) {
              if (!seen.has(url)) {
                destSubgroup.links.push(url);
                seen.add(url);
              }
            }
          }
        }
        saveStore(existing);
        const added = flattenLinks(existing).length - beforeCount;
        refreshCollection();
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
    const exportData = { exportedAt: new Date().toISOString(), groups: getStore().groups };
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
    const store = getStore();
    if (flattenLinks(store).includes(url)) {
      setListInfo('Link is already saved');
      return;
    }
    const group = findOrCreateGroup(store, linkGroupInput.value);
    group.links.push(url);
    saveStore(store);
    expandedNodes.add(`group:${group.name}`);
    linkInput.value = '';
    refreshCollection();
    setListInfo('Link added');
  });

  linkInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addLinkButton.click();
  });

  linkGroupInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addLinkButton.click();
  });
});
