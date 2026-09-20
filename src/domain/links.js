import { normalizeTags } from './tags.js';

export function normalizeUrl(url) {
  const s = (url || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) return 'https://' + s;
  return s;
}

export function normalizeLinkName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeLinkEntry(item) {
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

export function linkHasMeta(link) {
  return Boolean(link && (link.name || (link.tags && link.tags.length > 0)));
}

export function serializeLink(link) {
  if (!linkHasMeta(link)) return link.url;
  const out = { url: link.url };
  if (link.name) out.name = link.name;
  if (link.tags.length > 0) out.tags = link.tags;
  return out;
}

export function mergeLinkIntoList(list, incoming) {
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

export function pickRandomLinks(list, count) {
  const n = Math.min(count, list.length);
  const remaining = list.slice();
  const picked = [];
  for (let i = 0; i < n; i++) {
    const index = Math.floor(Math.random() * remaining.length);
    picked.push(remaining.splice(index, 1)[0]);
  }
  return picked;
}
