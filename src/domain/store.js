import {
  DEFAULT_GROUP,
  MAX_GROUPS,
  MAX_LINKS,
  MAX_SUBGROUPS_PER_GROUP,
  STORAGE_CORRUPT_KEY,
  STORAGE_KEY,
  STORAGE_KEY_LEGACY,
} from '../config.js';
import { readStoredValue, writeStoredValue } from '../data/storage.js';
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
  flattenLinks,
  flattenUrls,
  isReservedGroupName,
  mergeGroupInto,
  normalizeGroup,
} from './groups.js';
import { linkHasMeta, normalizeLinkEntry, serializeLink } from './links.js';

export const STORAGE_QUOTA = 'STORAGE_QUOTA';

let storageLoadError = null;

export function createEmptyStore() {
  return { groups: [{ name: DEFAULT_GROUP, links: [], subgroups: [] }], tags: [] };
}

export function getStorageError() {
  return storageLoadError;
}

export function storageErrorMessage(error) {
  if (error?.code === STORAGE_QUOTA) return 'Storage is full';
  return 'Could not save';
}

function hasGroupFormat(data) {
  return Boolean(data && Array.isArray(data.groups) && data.groups.length > 0);
}

function trimStoreToLimits(store) {
  store.groups = store.groups.slice(0, MAX_GROUPS);
  let remaining = MAX_LINKS;
  for (const group of store.groups) {
    group.subgroups = (group.subgroups || []).slice(0, MAX_SUBGROUPS_PER_GROUP);
    const keep = Math.min(group.links.length, remaining);
    group.links = group.links.slice(0, keep);
    remaining -= keep;
    for (const subgroup of group.subgroups) {
      const subKeep = Math.min(subgroup.links.length, remaining);
      subgroup.links = subgroup.links.slice(0, subKeep);
      remaining -= subKeep;
    }
  }
  return store;
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
    return trimStoreToLimits(store);
  }

  if (typeof data !== 'object') return store;

  if (hasGroupFormat(data)) {
    for (const group of data.groups.map(normalizeGroup)) {
      mergeGroupInto(findOrCreateGroup(store, group.name), group);
    }
    addStoreTags(store, extractImportedTags(data));
    return trimStoreToLimits(store);
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
  return trimStoreToLimits(store);
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
  store.groups = store.groups.filter((group) => !isReservedGroupName(group.name));
  if (!store.groups.some((group) => group.name === DEFAULT_GROUP)) {
    store.groups.unshift({ name: DEFAULT_GROUP, links: [], subgroups: [] });
  } else {
    const main = store.groups.find((group) => group.name === DEFAULT_GROUP);
    store.groups = [main, ...store.groups.filter((group) => group.name !== DEFAULT_GROUP)];
  }
  trimStoreToLimits(store);
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

function createStorageError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function backupCorruptRaw(raw) {
  try {
    localStorage.setItem(STORAGE_CORRUPT_KEY, raw);
  } catch {
    /* ignore backup failures */
  }
}

export function persistStore(store) {
  try {
    writeStoredValue(STORAGE_KEY, JSON.stringify(serializeStore(store)), STORAGE_KEY_LEGACY);
    storageLoadError = null;
  } catch {
    throw createStorageError(STORAGE_QUOTA, 'Storage is full');
  }
}

export function saveStore(store) {
  syncStoreTags(store);
  persistStore(store);
}

export function saveStoreSafe(store) {
  try {
    saveStore(store);
    return null;
  } catch (error) {
    return storageErrorMessage(error);
  }
}

export function getStore() {
  storageLoadError = null;
  const raw = readStoredValue(STORAGE_KEY, STORAGE_KEY_LEGACY);
  if (!raw) return createEmptyStore();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    storageLoadError = 'unreadable';
    backupCorruptRaw(raw);
    return createEmptyStore();
  }

  const store = pruneStore(normalizeStore(data));
  const usedLegacyKey = localStorage.getItem(STORAGE_KEY) == null;
  try {
    if (usedLegacyKey || !(data && Array.isArray(data.groups))) {
      saveStore(store);
    } else if (tagCatalogNeedsSave(data, store)) {
      persistStore(store);
    }
  } catch {
    /* keep the readable in-memory store */
  }
  return store;
}

export function getLinks() {
  return flattenUrls(getStore());
}

export function importIncomingStore(existing, incoming) {
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let total = flattenLinks(existing).length;

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
    if (total >= MAX_LINKS) {
      skipped += 1;
      return;
    }
    list.push({ url: link.url, name: link.name, tags: link.tags.slice() });
    added += 1;
    total += 1;
  };

  for (const group of incoming.groups) {
    const dest = findOrCreateGroup(existing, group.name);
    for (const link of group.links) importLink(dest.links, link);
    for (const subgroup of group.subgroups) {
      let destSubgroup = dest.subgroups.find((item) => item.name === subgroup.name);
      if (!destSubgroup) {
        if (dest.subgroups.length >= MAX_SUBGROUPS_PER_GROUP) {
          for (const link of subgroup.links) importLink(dest.links, link);
          continue;
        }
        destSubgroup = { name: subgroup.name, links: [] };
        dest.subgroups.push(destSubgroup);
      }
      for (const link of subgroup.links) importLink(destSubgroup.links, link);
    }
  }
  addStoreTags(existing, incoming.tags);
  persistStore(existing);
  return { added, updated, skipped, importedTagCount: incoming.tags.length };
}

export function createExportPayload() {
  return { exportedAt: new Date().toISOString(), ...serializeStore(getStore()) };
}
