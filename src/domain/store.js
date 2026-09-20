import { DEFAULT_GROUP, STORAGE_KEY } from '../config.js';
import {
  addStoreTags,
  extractImportedTags,
  rebuildTagCatalog,
  syncStoreTags,
  tagCatalogNeedsSave,
} from './tags.js';
import {
  findLinkInStore,
  findOrCreateGroup,
  flattenUrls,
  isReservedGroupName,
  mergeGroupInto,
  normalizeGroup,
} from './groups.js';
import { linkHasMeta, normalizeLinkEntry, serializeLink } from './links.js';

export function createEmptyStore() {
  return { groups: [{ name: DEFAULT_GROUP, links: [], subgroups: [] }], tags: [] };
}

function hasGroupFormat(data) {
  return Boolean(data && Array.isArray(data.groups) && data.groups.length > 0);
}

export function normalizeStore(data) {
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

export function pruneStore(store) {
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
  rebuildTagCatalog(store, store.tags);
  return store;
}

export function serializeStore(store) {
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
    tags: Array.isArray(pruned.tags)
      ? pruned.tags.map((tag) => ({
        name: tag.name,
        'color-dark': tag.colorDark,
        'color-light': tag.colorLight,
      }))
      : [],
  };
}

export function persistStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeStore(store)));
}

export function saveStore(store) {
  syncStoreTags(store);
  persistStore(store);
}

export function getStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    const store = pruneStore(normalizeStore(data));
    if (raw && !(data && Array.isArray(data.groups))) {
      saveStore(store);
    } else if (tagCatalogNeedsSave(data, store)) {
      persistStore(store);
    }
    return store;
  } catch {
    return createEmptyStore();
  }
}

export function getLinks() {
  return flattenUrls(getStore());
}

export function importIncomingStore(existing, incoming) {
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
  return { added, updated, importedTagCount: incoming.tags.length };
}

export function createExportPayload() {
  return { exportedAt: new Date().toISOString(), ...serializeStore(getStore()) };
}
