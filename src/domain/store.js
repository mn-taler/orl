import {
  DEFAULT_GROUP,
  MAX_GROUPS,
  MAX_LINKS,
  STORAGE_CORRUPT_KEY,
  STORAGE_KEY,
  STORAGE_KEY_LEGACY,
} from '../config.js';
import { getSession } from '../auth/session.js';
import { isSupabaseConfigured } from '../data/supabase/config.js';
import { loadSnapshot, replaceSnapshot } from '../data/supabase/snapshot.js';
import { readStoredValue, removeStoredValue, writeStoredValue } from '../data/storage.js';
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
  flattenImportedGroups,
  flattenLinks,
  flattenUrls,
  isReservedGroupName,
  mergeGroupInto,
} from './groups.js';
import { linkHasMeta, normalizeLinkEntry, serializeLink } from './links.js';

export const STORAGE_QUOTA = 'STORAGE_QUOTA';

let storageLoadError = null;

export function createEmptyStore() {
  return { groups: [], tags: [] };
}

export function getStorageError() {
  return storageLoadError;
}

export function storageErrorMessage(error) {
  if (error?.code === STORAGE_QUOTA) return 'Storage is full';
  return 'Could not save';
}

export function isCloudActive() {
  return isSupabaseConfigured() && Boolean(getSession()?.access_token);
}

function hasGroupFormat(data) {
  return Boolean(data && Array.isArray(data.groups));
}

function storeHasData(store) {
  return Boolean(store && (store.groups.length > 0 || store.tags.length > 0));
}

function trimStoreToLimits(store) {
  store.groups = store.groups.slice(0, MAX_GROUPS);
  let remaining = MAX_LINKS;
  for (const group of store.groups) {
    const keep = Math.min(group.links.length, remaining);
    group.links = group.links.slice(0, keep);
    remaining -= keep;
  }
  return store;
}

export function normalizeStore(data) {
  const store = createEmptyStore();
  if (data == null) return store;

  if (Array.isArray(data)) {
    const links = data.map(normalizeLinkEntry).filter(Boolean);
    if (links.length > 0) {
      mergeGroupInto(findOrCreateGroup(store, DEFAULT_GROUP), { links });
    }
    addStoreTags(store, []);
    return trimStoreToLimits(store);
  }

  if (typeof data !== 'object') return store;

  if (hasGroupFormat(data)) {
    for (const group of flattenImportedGroups(data.groups)) {
      mergeGroupInto(findOrCreateGroup(store, group.name), group);
    }
    addStoreTags(store, extractImportedTags(data));
    return trimStoreToLimits(store);
  }

  const legacyLinks = Array.isArray(data.links)
    ? data.links.map(normalizeLinkEntry).filter(Boolean)
    : [];
  if (legacyLinks.length > 0) {
    mergeGroupInto(findOrCreateGroup(store, DEFAULT_GROUP), { links: legacyLinks });
  }

  addStoreTags(store, extractImportedTags(data));
  return trimStoreToLimits(store);
}

export function pruneStore(store) {
  const reserved = store.groups.filter((group) => isReservedGroupName(group.name));
  store.groups = store.groups.filter((group) => !isReservedGroupName(group.name));
  if (reserved.length > 0) {
    const links = reserved.flatMap((group) => group.links || []);
    if (links.length > 0) {
      const dest = findOrCreateGroup(store, store.groups[0]?.name || DEFAULT_GROUP);
      mergeGroupInto(dest, { links });
    }
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

export function clearLocalStore() {
  removeStoredValue(STORAGE_KEY, STORAGE_KEY_LEGACY);
  removeStoredValue(STORAGE_CORRUPT_KEY);
  storageLoadError = null;
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

export async function saveStoreSafe(store) {
  try {
    saveStore(store);
    if (isCloudActive()) await replaceSnapshot(store);
    return null;
  } catch (error) {
    return storageErrorMessage(error);
  }
}

function loadLocalStore() {
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

export function getStore() {
  return loadLocalStore();
}

export async function initStore() {
  const local = loadLocalStore();
  if (!isCloudActive()) return local;

  try {
    const remote = pruneStore(normalizeStore(await loadSnapshot()));
    if (storeHasData(remote)) {
      persistStore(remote);
      return remote;
    }
    if (storeHasData(local)) await replaceSnapshot(local);
    return local;
  } catch {
    return local;
  }
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

  for (const group of flattenImportedGroups(incoming.groups)) {
    const dest = findOrCreateGroup(existing, group.name);
    for (const link of group.links) importLink(dest.links, link);
  }
  addStoreTags(existing, incoming.tags);
  persistStore(existing);
  return { added, updated, skipped, importedTagCount: incoming.tags.length };
}

export function createExportPayload() {
  return { exportedAt: new Date().toISOString(), ...serializeStore(getStore()) };
}
