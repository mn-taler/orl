const STORAGE_KEY = 'savedLinks';
const DARK_MODE_KEY = 'darkMode';
const LINK_AMOUNT_KEY = 'linkAmount';
const MIN_LINK_AMOUNT = 1;
const MAX_LINK_AMOUNT = 10;
const DEFAULT_GROUP = 'Main';
const TAGS_GROUP = 'Tags';
const TAG_MAX_LENGTH = 128;
const TAG_PATTERN = /^[A-Za-z0-9]+$/;

function normalizeUrl(url) {
  const s = (url || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) return 'https://' + s;
  return s;
}

function isReservedGroupName(name) {
  return (name || '').trim().toLowerCase() === TAGS_GROUP.toLowerCase();
}

function normalizeGroupName(name) {
  const s = (name || '').trim();
  if (!s || s.toLowerCase() === 'main' || isReservedGroupName(s)) return DEFAULT_GROUP;
  return s;
}

function createEmptyStore() {
  return { groups: [{ name: DEFAULT_GROUP, links: [], subgroups: [] }], tags: [] };
}

function normalizeLinkName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTag(value) {
  const tag = String(value ?? '').trim();
  if (!tag || tag.length > TAG_MAX_LENGTH || !TAG_PATTERN.test(tag)) return '';
  return tag;
}

function validateTag(value) {
  const tag = String(value ?? '').trim();
  if (!tag) return 'Please enter a tag';
  if (tag.length > TAG_MAX_LENGTH) return 'Tags can be at most 128 characters';
  if (!TAG_PATTERN.test(tag)) return 'Use only letters and numbers';
  return '';
}

function normalizeTags(value) {
  const parts = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,;]+/)
      : [];
  const tags = [];
  for (const part of parts) {
    const tag = normalizeTag(part);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function collectTagsFromLinks(store) {
  const tags = [];
  for (const link of flattenLinks(store)) {
    for (const tag of link.tags) {
      if (tag && !tags.includes(tag)) tags.push(tag);
    }
  }
  return tags;
}

function addStoreTags(store, extra = []) {
  const unique = [];
  const add = (tag) => {
    const normalized = normalizeTag(tag);
    if (normalized && !unique.includes(normalized)) unique.push(normalized);
  };
  collectTagsFromLinks(store).forEach(add);
  extra.forEach(add);
  store.tags = unique;
}

function syncStoreTags(store) {
  store.tags = collectTagsFromLinks(store);
}

function extractImportedTags(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return normalizeTags(data.tags);
}

function normalizeLinkEntry(item) {
  if (typeof item === 'string') {
    const url = normalizeUrl(item);
    return url ? { url, name: '', tags: [] } : null;
  }
  if (!item || typeof item !== 'object') return null;
  const url = normalizeUrl(item.url || item.href || item.link || '');
  if (!url) return null;
  return {
    url,
    name: normalizeLinkName(item.name),
    tags: normalizeTags(item.tags),
  };
}

function linkHasMeta(link) {
  return Boolean(link && (link.name || (link.tags && link.tags.length > 0)));
}

function serializeLink(link) {
  if (!linkHasMeta(link)) return link.url;
  const out = { url: link.url };
  if (link.name) out.name = link.name;
  if (link.tags.length > 0) out.tags = link.tags;
  return out;
}

function mergeLinkIntoList(list, incoming) {
  const existing = list.find((item) => item.url === incoming.url);
  if (!existing) {
    list.push({ url: incoming.url, name: incoming.name, tags: incoming.tags.slice() });
    return 'added';
  }
  if (!linkHasMeta(existing) && linkHasMeta(incoming)) {
    existing.name = incoming.name;
    existing.tags = incoming.tags.slice();
    return 'updated';
  }
  return 'exists';
}

function normalizeSubgroup(subgroup) {
  const links = Array.isArray(subgroup?.links)
    ? subgroup.links.map(normalizeLinkEntry).filter(Boolean)
    : [];
  return {
    name: (subgroup?.name || '').trim() || 'Untitled',
    links,
  };
}

function normalizeGroup(group) {
  const links = Array.isArray(group?.links)
    ? group.links.map(normalizeLinkEntry).filter(Boolean)
    : [];
  const subgroups = Array.isArray(group?.subgroups) ? group.subgroups.map(normalizeSubgroup) : [];
  return {
    name: normalizeGroupName(group?.name),
    links,
    subgroups,
  };
}

function mergeGroupInto(target, incoming) {
  for (const link of incoming.links) {
    mergeLinkIntoList(target.links, link);
  }
  for (const subgroup of incoming.subgroups) {
    let dest = target.subgroups.find((item) => item.name === subgroup.name);
    if (!dest) {
      dest = { name: subgroup.name, links: [] };
      target.subgroups.push(dest);
    }
    for (const link of subgroup.links) {
      mergeLinkIntoList(dest.links, link);
    }
  }
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
      links: data.map(normalizeLinkEntry).filter(Boolean),
      subgroups: [],
    });
    addStoreTags(store, []);
    return store;
  }

  if (typeof data !== 'object') return store;

  if (hasGroupFormat(data)) {
    for (const group of data.groups.map(normalizeGroup)) {
      mergeGroupInto(findOrCreateGroup(store, group.name), group);
    }
    addStoreTags(store, extractImportedTags(data));
    return store;
  }

  const legacyLinks = Array.isArray(data.links)
    ? data.links.map(normalizeLinkEntry).filter(Boolean)
    : [];
  if (legacyLinks.length > 0) {
    mergeGroupInto(findOrCreateGroup(store, DEFAULT_GROUP), {
      name: DEFAULT_GROUP,
      links: legacyLinks,
      subgroups: [],
    });
  }

  addStoreTags(store, extractImportedTags(data));
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
  const links = [];
  for (const group of store.groups) {
    links.push(...group.links);
    for (const subgroup of group.subgroups) links.push(...subgroup.links);
  }
  return links;
}

function flattenUrls(store) {
  return flattenLinks(store).map((link) => link.url);
}

function findLinkInStore(store, url) {
  for (const group of store.groups) {
    const inGroup = group.links.find((link) => link.url === url);
    if (inGroup) return { link: inGroup, group };
    for (const subgroup of group.subgroups) {
      const inSubgroup = subgroup.links.find((item) => item.url === url);
      if (inSubgroup) return { link: inSubgroup, group, subgroup };
    }
  }
  return null;
}

function serializeStore(store) {
  const pruned = pruneStore(store);
  return {
    groups: pruned.groups.map((group) => ({
      name: group.name,
      links: group.links.map(serializeLink),
      subgroups: group.subgroups.map((subgroup) => ({
        name: subgroup.name,
        links: subgroup.links.map(serializeLink),
      })),
    })),
    tags: Array.isArray(pruned.tags) ? pruned.tags.slice() : [],
  };
}

function pruneStore(store) {
  const reserved = store.groups.filter((group) => isReservedGroupName(group.name));
  if (reserved.length > 0) {
    const main = findOrCreateGroup(store, DEFAULT_GROUP);
    for (const group of reserved) {
      mergeGroupInto(main, { ...group, name: DEFAULT_GROUP });
    }
  }
  for (const group of store.groups) {
    group.subgroups = group.subgroups.filter((subgroup) => subgroup.links.length > 0);
  }
  store.groups = store.groups.filter((group) => (
    !isReservedGroupName(group.name) &&
    (group.name === DEFAULT_GROUP || group.links.length > 0 || group.subgroups.length > 0)
  ));
  if (!store.groups.some((group) => group.name === DEFAULT_GROUP)) {
    store.groups.unshift({ name: DEFAULT_GROUP, links: [], subgroups: [] });
  } else {
    const main = store.groups.find((group) => group.name === DEFAULT_GROUP);
    store.groups = [main, ...store.groups.filter((group) => group.name !== DEFAULT_GROUP)];
  }
  store.tags = normalizeTags(store.tags);
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

function persistStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeStore(store)));
}

function saveStore(store) {
  syncStoreTags(store);
  persistStore(store);
}

function getLinks() {
  return flattenUrls(getStore());
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

function createTagRemoveIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('width', '10');
  svg.setAttribute('height', '10');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M2 2l8 8M10 2L2 10');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.75');
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
  return svg;
}

function createTagChip(tag, onRemove) {
  const chip = document.createElement('span');
  chip.className = 'tag-chip';

  const name = document.createElement('span');
  name.className = 'tag-chip-name';
  name.textContent = tag;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'tag-chip-remove';
  removeBtn.setAttribute('aria-label', `Remove tag ${tag}`);
  removeBtn.appendChild(createTagRemoveIcon());
  removeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(tag);
  });

  chip.appendChild(name);
  chip.appendChild(removeBtn);
  return chip;
}

function createTagField(tags, onRemove) {
  const field = document.createElement('div');
  field.className = 'tag-field';
  tags.forEach((tag) => field.appendChild(createTagChip(tag, onRemove)));
  return field;
}

function removeTagFromStore(tag) {
  const store = getStore();
  for (const item of flattenLinks(store)) {
    item.tags = item.tags.filter((value) => value !== tag);
  }
  saveStore(store);
}

function createLinkRow(link, onChange) {
  const li = document.createElement('li');
  li.className = 'tree-link';

  const main = document.createElement('div');
  main.className = 'tree-link-main';

  const a = document.createElement('a');
  a.href = link.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.className = 'link-url';
  a.textContent = link.name || link.url;
  a.title = link.url;

  main.appendChild(a);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-link';
  removeBtn.type = 'button';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => {
    const store = getStore();
    for (const group of store.groups) {
      group.links = group.links.filter((item) => item.url !== link.url);
      for (const subgroup of group.subgroups) {
        subgroup.links = subgroup.links.filter((item) => item.url !== link.url);
      }
    }
    saveStore(store);
    onChange();
    setListInfo('Removed');
  });

  li.appendChild(main);
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
  const children = subgroup.links.map((link) => createLinkRow(link, onChange));
  return createTreeNode(
    subgroup.name,
    `subgroup:${groupName}/${subgroup.name}`,
    children,
    subgroup.links.length,
    true
  );
}

function createTreeGroup(group, onChange) {
  const children = group.links.map((link) => createLinkRow(link, onChange));
  group.subgroups.forEach((subgroup) => {
    if (subgroup.links.length === 0) return;
    children.push(createTreeSubgroup(group.name, subgroup, onChange));
  });
  return createTreeNode(group.name, `group:${group.name}`, children, countGroupLinks(group), false);
}

function createTagsGroup(tags, onChange) {
  const fieldWrap = document.createElement('li');
  fieldWrap.className = 'tree-tag-field';
  fieldWrap.appendChild(createTagField(tags, (tag) => {
    removeTagFromStore(tag);
    onChange();
    setListInfo('Tag removed');
  }));
  return createTreeNode(TAGS_GROUP, `group:${TAGS_GROUP}`, [fieldWrap], tags.length, false);
}

function renderLinkList(listEl, onChange) {
  const store = getStore();
  listEl.innerHTML = '';
  store.groups.filter(groupHasLinks).forEach((group) => {
    listEl.appendChild(createTreeGroup(group, onChange));
  });
  if (store.tags.length > 0) {
    listEl.appendChild(createTagsGroup(store.tags, onChange));
  }
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
  const linkNameInput = document.getElementById('link-name');
  const draftTagList = document.getElementById('draft-tag-list');
  const tagInput = document.getElementById('tag-input');
  const addTagButton = document.getElementById('add-tag-button');
  const tagEditorError = document.getElementById('tag-editor-error');
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
        const incoming = normalizeStore(data);
        let added = 0;
        let updated = 0;
        const importLink = (list, link) => {
          const found = findLinkInStore(existing, link.url);
          if (found) {
            if (!linkHasMeta(found.link) && linkHasMeta(link)) {
              found.link.name = link.name;
              found.link.tags = link.tags.slice();
              updated += 1;
            }
            return;
          }
          list.push({ url: link.url, name: link.name, tags: link.tags.slice() });
          added += 1;
        };
        for (const group of incoming.groups) {
          const dest = findOrCreateGroup(existing, group.name);
          for (const link of group.links) importLink(dest.links, link);
          for (const subgroup of group.subgroups) {
            let destSubgroup = dest.subgroups.find((item) => item.name === subgroup.name);
            if (!destSubgroup) {
              destSubgroup = { name: subgroup.name, links: [] };
              dest.subgroups.push(destSubgroup);
            }
            for (const link of subgroup.links) importLink(destSubgroup.links, link);
          }
        }
        addStoreTags(existing, incoming.tags);
        persistStore(existing);
        refreshCollection();
        if (added > 0) {
          setListInfo(updated > 0 ? `Imported ${added}, updated ${updated}` : `Imported ${added} link(s)`);
        } else if (updated > 0) {
          setListInfo(`Updated ${updated} link(s)`);
        } else if (incoming.tags.length > 0) {
          setListInfo('Imported tags');
        } else {
          setListInfo('No new links (all already saved)');
        }
      } catch {
        setListInfo('Invalid or unsupported JSON file');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('export-link').addEventListener('click', (e) => {
    e.preventDefault();
    setSettingsMenuOpen(false);
    const serialized = serializeStore(getStore());
    const exportData = { exportedAt: new Date().toISOString(), ...serialized };
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

  let draftTags = [];

  const setTagEditorError = (message) => {
    tagEditorError.textContent = message || '';
  };

  const renderDraftTags = () => {
    draftTagList.innerHTML = '';
    draftTags.forEach((tag) => {
      draftTagList.appendChild(createTagChip(tag, () => {
        draftTags = draftTags.filter((item) => item !== tag);
        renderDraftTags();
        setTagEditorError('');
      }));
    });
    draftTagList.hidden = draftTags.length === 0;
  };

  const addDraftTag = () => {
    const raw = tagInput.value;
    const error = validateTag(raw);
    if (error) {
      setTagEditorError(error);
      return;
    }
    const tag = raw.trim();
    if (draftTags.includes(tag)) {
      setTagEditorError('Tag is already added');
      return;
    }
    draftTags.push(tag);
    tagInput.value = '';
    setTagEditorError('');
    renderDraftTags();
  };

  addTagButton.addEventListener('click', addDraftTag);

  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDraftTag();
    }
  });

  const clearLinkForm = () => {
    linkInput.value = '';
    linkNameInput.value = '';
    draftTags = [];
    tagInput.value = '';
    setTagEditorError('');
    renderDraftTags();
  };

  addLinkButton.addEventListener('click', () => {
    const incoming = normalizeLinkEntry({
      url: linkInput.value,
      name: linkNameInput.value,
      tags: draftTags.slice(),
    });
    if (!incoming) {
      setListInfo('Please enter a valid URL');
      return;
    }
    const store = getStore();
    const existing = findLinkInStore(store, incoming.url);
    if (existing) {
      if (!linkHasMeta(existing.link) && linkHasMeta(incoming)) {
        existing.link.name = incoming.name;
        existing.link.tags = incoming.tags.slice();
        saveStore(store);
        expandedNodes.add(`group:${existing.group.name}`);
        if (incoming.tags.length > 0) expandedNodes.add(`group:${TAGS_GROUP}`);
        clearLinkForm();
        refreshCollection();
        setListInfo('Link updated');
        return;
      }
      setListInfo('Link is already saved');
      return;
    }
    const group = findOrCreateGroup(store, linkGroupInput.value);
    group.links.push(incoming);
    saveStore(store);
    expandedNodes.add(`group:${group.name}`);
    if (incoming.tags.length > 0) expandedNodes.add(`group:${TAGS_GROUP}`);
    clearLinkForm();
    refreshCollection();
    setListInfo('Link added');
  });

  [linkInput, linkGroupInput, linkNameInput].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addLinkButton.click();
    });
  });
});
