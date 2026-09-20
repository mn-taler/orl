import { MAX_TAG_CATALOG, TAG_MAX_LENGTH, TAG_PALETTE, TAG_PATTERN } from '../config.js';

function linksInStore(store) {
  const links = [];
  for (const group of store.groups || []) {
    links.push(...(group.links || []));
    for (const subgroup of group.subgroups || []) links.push(...(subgroup.links || []));
  }
  return links;
}

export function normalizeTag(value) {
  const tag = String(value ?? '').trim();
  if (!tag || tag.length > TAG_MAX_LENGTH || !TAG_PATTERN.test(tag)) return '';
  return tag;
}

export function validateTag(value) {
  const tag = String(value ?? '').trim();
  if (!tag) return 'Please enter a tag';
  if (tag.length > TAG_MAX_LENGTH) return 'Tags can be at most 128 characters';
  if (!TAG_PATTERN.test(tag)) return 'Use only letters and numbers';
  return '';
}

export function normalizeTags(value) {
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

export function collectTagsFromLinks(store) {
  const tags = [];
  for (const link of linksInStore(store)) {
    for (const tag of link.tags) {
      if (tag && !tags.includes(tag)) tags.push(tag);
    }
  }
  return tags;
}

export function normalizeHexColor(value) {
  const hex = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : '';
}

function paletteIndexForColors(light, dark) {
  return TAG_PALETTE.findIndex((swatch) => swatch.light === light && swatch.dark === dark);
}

function nextPaletteIndex(entries) {
  const counts = TAG_PALETTE.map(() => 0);
  for (const entry of entries) {
    const index = paletteIndexForColors(entry.colorLight, entry.colorDark);
    if (index >= 0) counts[index] += 1;
  }
  let chosen = 0;
  let lowest = Infinity;
  counts.forEach((count, index) => {
    if (count < lowest) {
      lowest = count;
      chosen = index;
    }
  });
  return chosen;
}

function swatchFromPreferred(entries, preferred) {
  const light = normalizeHexColor(preferred?.colorLight || preferred?.['color-light']);
  const dark = normalizeHexColor(preferred?.colorDark || preferred?.['color-dark']);
  const exact = paletteIndexForColors(light, dark);
  if (exact >= 0) return TAG_PALETTE[exact];
  const byLight = TAG_PALETTE.findIndex((swatch) => swatch.light === light);
  if (byLight >= 0) return TAG_PALETTE[byLight];
  const byDark = TAG_PALETTE.findIndex((swatch) => swatch.dark === dark);
  if (byDark >= 0) return TAG_PALETTE[byDark];
  return TAG_PALETTE[nextPaletteIndex(entries)];
}

export function createTagEntry(name, entries, preferred) {
  const swatch = swatchFromPreferred(entries, preferred);
  return { name, colorLight: swatch.light, colorDark: swatch.dark };
}

export function normalizeTagCatalogEntry(item) {
  if (typeof item === 'string') {
    const name = normalizeTag(item);
    return name ? { name, colorLight: '', colorDark: '' } : null;
  }
  if (!item || typeof item !== 'object') return null;
  const name = normalizeTag(item.name || item.tag || item.label);
  if (!name) return null;
  return {
    name,
    colorLight: normalizeHexColor(item.colorLight || item['color-light']),
    colorDark: normalizeHexColor(item.colorDark || item['color-dark']),
  };
}

export function catalogName(item) {
  if (typeof item === 'string') return normalizeTag(item);
  return normalizeTag(item?.name || item?.tag || item?.label);
}

export function rebuildTagCatalog(store, extra = []) {
  const known = new Map();
  const remember = (item) => {
    const entry = normalizeTagCatalogEntry(item);
    if (!entry) return;
    const prev = known.get(entry.name);
    if (!prev) {
      known.set(entry.name, entry);
      return;
    }
    if (!prev.colorLight && entry.colorLight) prev.colorLight = entry.colorLight;
    if (!prev.colorDark && entry.colorDark) prev.colorDark = entry.colorDark;
  };
  (Array.isArray(store.tags) ? store.tags : []).forEach(remember);
  extra.forEach(remember);

  const names = [];
  const addName = (name) => {
    const tag = normalizeTag(name);
    if (tag && !names.includes(tag)) names.push(tag);
  };
  collectTagsFromLinks(store).forEach(addName);
  extra.forEach((item) => addName(catalogName(item)));
  names.splice(MAX_TAG_CATALOG);

  const assigned = [];
  names.forEach((name) => {
    assigned.push(createTagEntry(name, assigned, known.get(name)));
  });
  store.tags = assigned;
}

export function addStoreTags(store, extra = []) {
  rebuildTagCatalog(store, extra);
}

export function syncStoreTags(store) {
  rebuildTagCatalog(store, []);
}

export function extractImportedTags(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return Array.isArray(data.tags) ? data.tags : [];
}

export function tagCatalogNeedsSave(data, store) {
  if (!store.tags.length) return false;
  const raw = data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.tags)
    ? data.tags
    : [];
  return store.tags.some((tag) => {
    const source = raw.find((item) => catalogName(item) === tag.name);
    if (!source || typeof source === 'string') return true;
    return !normalizeHexColor(source['color-dark'] || source.colorDark)
      || !normalizeHexColor(source['color-light'] || source.colorLight);
  });
}

export function normalizeOpenTags(value) {
  if (Array.isArray(value)) return value.map(normalizeTag).filter(Boolean);
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(normalizeTag).filter(Boolean);
  } catch {
    /* legacy single tag */
  }
  const single = normalizeTag(value);
  return single ? [single] : [];
}

export function sameTagList(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
