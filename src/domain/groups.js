import { DEFAULT_GROUP, MAX_GROUP_NAME_LENGTH, MAX_GROUPS, MAX_LINKS, TAGS_GROUP } from '../config.js';
import { linkHasMeta, mergeLinkIntoList, normalizeLinkEntry } from './links.js';

export function isReservedGroupName(name) {
  return (name || '').trim().toLowerCase() === TAGS_GROUP.toLowerCase();
}

export function normalizeGroupName(name) {
  const s = (name || '').trim().slice(0, MAX_GROUP_NAME_LENGTH);
  if (!s || isReservedGroupName(s)) return '';
  return s;
}

function claimGroupName(used, ...candidates) {
  for (const candidate of candidates) {
    const name = normalizeGroupName(candidate);
    if (name && !used.has(name.toLowerCase())) {
      used.add(name.toLowerCase());
      return name;
    }
  }
  const named = candidates.map(normalizeGroupName).find(Boolean);
  const base = named || DEFAULT_GROUP;
  let n = 2;
  let name = `${base} ${n}`.slice(0, MAX_GROUP_NAME_LENGTH);
  while (used.has(name.toLowerCase()) || isReservedGroupName(name)) {
    n += 1;
    name = `${base} ${n}`.slice(0, MAX_GROUP_NAME_LENGTH);
  }
  used.add(name.toLowerCase());
  return name;
}

export function flattenImportedGroups(groups) {
  const used = new Set();
  const out = [];

  for (const raw of Array.isArray(groups) ? groups : []) {
    const rawName = (raw?.name || '').trim();
    const links = Array.isArray(raw?.links)
      ? raw.links.map(normalizeLinkEntry).filter(Boolean)
      : [];
    const subgroups = Array.isArray(raw?.subgroups) ? raw.subgroups : [];
    const parentName = normalizeGroupName(rawName);
    let destName = '';

    if (parentName || links.length > 0) {
      destName = parentName ? claimGroupName(used, parentName) : claimGroupName(used, DEFAULT_GROUP);
      out.push({ name: destName, links });
    }

    for (const sub of subgroups) {
      const subLinks = Array.isArray(sub?.links)
        ? sub.links.map(normalizeLinkEntry).filter(Boolean)
        : [];
      const subRaw = (sub?.name || '').trim();
      if (!subRaw && subLinks.length === 0) continue;
      const parentLabel = destName || parentName || DEFAULT_GROUP;
      out.push({
        name: claimGroupName(used, subRaw, `${parentLabel} · ${subRaw || 'Untitled'}`),
        links: subLinks,
      });
    }
  }

  return out;
}

export function normalizeGroup(group) {
  return {
    name: normalizeGroupName(group?.name) || DEFAULT_GROUP,
    links: Array.isArray(group?.links)
      ? group.links.map(normalizeLinkEntry).filter(Boolean)
      : [],
  };
}

export function mergeGroupInto(target, incoming) {
  for (const link of incoming.links || []) {
    mergeLinkIntoList(target.links, link);
  }
}

export function ensureDefaultGroup(store) {
  if (store.groups.length > 0) return store.groups[0];
  const group = { name: DEFAULT_GROUP, links: [] };
  store.groups.push(group);
  return group;
}

export function findOrCreateGroup(store, name) {
  const groupName = normalizeGroupName(name);
  if (!groupName) return ensureDefaultGroup(store);
  const existing = store.groups.find((item) => item.name.toLowerCase() === groupName.toLowerCase());
  if (existing) return existing;
  if (store.groups.length >= MAX_GROUPS) {
    return store.groups[0] || ensureDefaultGroup(store);
  }
  const group = { name: groupName, links: [] };
  store.groups.push(group);
  return group;
}

export function findGroup(store, name) {
  const groupName = normalizeGroupName(name);
  if (groupName) {
    const match = store.groups.find((item) => item.name.toLowerCase() === groupName.toLowerCase());
    if (match) return match;
  }
  return store.groups[0] || null;
}

export function createGroup(store, name) {
  const groupName = (name || '').trim().slice(0, MAX_GROUP_NAME_LENGTH);
  if (!groupName) return { error: 'Please enter a group name' };
  if (isReservedGroupName(groupName)) return { error: 'This name is reserved' };
  const exists = store.groups.some((item) => item.name.toLowerCase() === groupName.toLowerCase());
  if (exists) return { error: 'Group already exists' };
  if (store.groups.length >= MAX_GROUPS) return { error: 'Too many groups' };
  const group = { name: groupName, links: [] };
  store.groups.push(group);
  return { group };
}

export function flattenLinks(store) {
  const links = [];
  for (const group of store.groups) links.push(...group.links);
  return links;
}

export function flattenGroupLinks(group) {
  return group.links.slice();
}

export function flattenUrls(store) {
  return flattenLinks(store).map((link) => link.url);
}

export function findLinkInStore(store, url) {
  for (const group of store.groups) {
    const inGroup = group.links.find((link) => link.url === url);
    if (inGroup) return { link: inGroup, group };
  }
  return null;
}

export function groupHasLinks(group) {
  return group.links.length > 0;
}

export function countGroupLinks(group) {
  return group.links.length;
}

export function listOpenGroups(store) {
  return store.groups.filter((group) => !isReservedGroupName(group.name) && groupHasLinks(group));
}

export function filterOpenLinks(store, groupName, tagNames) {
  const groups = groupName
    ? store.groups.filter((group) => group.name === groupName && !isReservedGroupName(group.name))
    : listOpenGroups(store);
  const links = [];
  for (const group of groups) links.push(...flattenGroupLinks(group));
  const selected = Array.isArray(tagNames) ? tagNames.filter(Boolean) : (tagNames ? [tagNames] : []);
  if (selected.length === 0) return links;
  return links.filter((link) => selected.some((tag) => link.tags.includes(tag)));
}

export function removeTagFromLinks(store, tag) {
  for (const item of flattenLinks(store)) {
    item.tags = item.tags.filter((value) => value !== tag);
  }
}

export function removeLinkFromStore(store, url) {
  for (const group of store.groups) {
    group.links = group.links.filter((item) => item.url !== url);
  }
}

export function deleteLinkFromStore(store, url) {
  const found = findLinkInStore(store, url);
  if (!found) return { error: 'Link not found' };
  removeLinkFromStore(store, url);
  return { link: found.link, group: found.group };
}

export function renameGroup(store, currentName, nextName) {
  const current = (currentName || '').trim();
  const group = store.groups.find((item) => item.name === current && !isReservedGroupName(item.name));
  if (!group) return { error: 'Group not found' };

  const groupName = (nextName || '').trim().slice(0, MAX_GROUP_NAME_LENGTH);
  if (!groupName) return { error: 'Please enter a group name' };
  if (isReservedGroupName(groupName)) return { error: 'This name is reserved' };
  const exists = store.groups.some((item) => (
    item !== group && item.name.toLowerCase() === groupName.toLowerCase()
  ));
  if (exists) return { error: 'Group already exists' };

  group.name = groupName;
  return { group };
}

export function removeGroupFromStore(store, name) {
  const current = (name || '').trim();
  const index = store.groups.findIndex((item) => (
    item.name === current && !isReservedGroupName(item.name)
  ));
  if (index < 0) return { error: 'Group not found' };
  const [group] = store.groups.splice(index, 1);
  return { group };
}

export function addLinkToStore(store, draft) {
  const incoming = normalizeLinkEntry({
    url: draft?.url,
    name: draft?.name,
    tags: draft?.tags,
  });
  if (!incoming) return { error: 'Please enter a valid URL' };

  const existing = findLinkInStore(store, incoming.url);
  if (existing) {
    if (!linkHasMeta(existing.link) && linkHasMeta(incoming)) {
      existing.link.name = incoming.name;
      existing.link.tags = incoming.tags.slice();
      return { link: existing.link, group: existing.group, updated: true };
    }
    return { error: 'Link is already saved' };
  }
  if (flattenLinks(store).length >= MAX_LINKS) return { error: 'Collection is full' };

  const requested = normalizeGroupName(draft?.group);
  const group = requested
    ? findOrCreateGroup(store, requested)
    : (store.groups[0] || ensureDefaultGroup(store));
  if (!group) return { error: 'Group not found' };
  group.links.push(incoming);
  return { link: incoming, group };
}

export function updateLinkInStore(store, originalUrl, draft) {
  const found = findLinkInStore(store, originalUrl);
  if (!found) return { error: 'Link not found' };
  const incoming = normalizeLinkEntry({
    url: draft?.url,
    name: draft?.name,
    tags: draft?.tags,
  });
  if (!incoming) return { error: 'Please enter a valid URL' };
  if (incoming.url !== originalUrl && findLinkInStore(store, incoming.url)) {
    return { error: 'Link is already saved' };
  }

  const targetName = normalizeGroupName(draft?.group);
  found.link.url = incoming.url;
  found.link.name = incoming.name;
  found.link.tags = incoming.tags.slice();

  if (!targetName || found.group.name.toLowerCase() === targetName.toLowerCase()) {
    return { link: found.link, group: found.group };
  }

  removeLinkFromStore(store, incoming.url);
  const group = findOrCreateGroup(store, targetName);
  group.links.push(found.link);
  return { link: found.link, group };
}
