import { DEFAULT_GROUP, MAX_GROUP_NAME_LENGTH, MAX_GROUPS, MAX_LINKS, TAGS_GROUP } from '../config.js';
import { linkHasMeta, mergeLinkIntoList, normalizeLinkEntry } from './links.js';

export function isReservedGroupName(name) {
  return (name || '').trim().toLowerCase() === TAGS_GROUP.toLowerCase();
}

export function normalizeGroupName(name) {
  const s = (name || '').trim().slice(0, MAX_GROUP_NAME_LENGTH);
  if (!s || s.toLowerCase() === 'main' || isReservedGroupName(s)) return DEFAULT_GROUP;
  return s;
}

export function normalizeSubgroup(subgroup) {
  const links = Array.isArray(subgroup?.links)
    ? subgroup.links.map(normalizeLinkEntry).filter(Boolean)
    : [];
  return {
    name: (subgroup?.name || '').trim().slice(0, MAX_GROUP_NAME_LENGTH) || 'Untitled',
    links,
  };
}

export function normalizeGroup(group) {
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

export function mergeGroupInto(target, incoming) {
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

export function findOrCreateGroup(store, name) {
  const groupName = normalizeGroupName(name);
  const existing = store.groups.find((item) => item.name === groupName);
  if (existing) return existing;
  if (store.groups.length >= MAX_GROUPS) {
    return store.groups.find((item) => item.name === DEFAULT_GROUP) || store.groups[0];
  }
  const group = { name: groupName, links: [], subgroups: [] };
  store.groups.push(group);
  return group;
}

export function findGroup(store, name) {
  const groupName = normalizeGroupName(name);
  return store.groups.find((item) => item.name === groupName)
    || store.groups.find((item) => item.name === DEFAULT_GROUP)
    || store.groups[0];
}

export function createGroup(store, name) {
  const groupName = (name || '').trim().slice(0, MAX_GROUP_NAME_LENGTH);
  if (!groupName) return { error: 'Please enter a group name' };
  if (isReservedGroupName(groupName)) return { error: 'This name is reserved' };
  const exists = store.groups.some((item) => item.name.toLowerCase() === groupName.toLowerCase());
  if (exists) return { error: 'Group already exists' };
  if (store.groups.length >= MAX_GROUPS) return { error: 'Too many groups' };
  const group = { name: groupName, links: [], subgroups: [] };
  store.groups.push(group);
  return { group };
}

export function flattenLinks(store) {
  const links = [];
  for (const group of store.groups) {
    links.push(...group.links);
    for (const subgroup of group.subgroups) links.push(...subgroup.links);
  }
  return links;
}

export function flattenGroupLinks(group) {
  const links = group.links.slice();
  for (const subgroup of group.subgroups) links.push(...subgroup.links);
  return links;
}

export function flattenUrls(store) {
  return flattenLinks(store).map((link) => link.url);
}

export function findLinkInStore(store, url) {
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

export function groupHasLinks(group) {
  return group.links.length > 0 || group.subgroups.some((subgroup) => subgroup.links.length > 0);
}

export function countGroupLinks(group) {
  return group.links.length + group.subgroups.reduce((sum, subgroup) => sum + subgroup.links.length, 0);
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
    for (const subgroup of group.subgroups) {
      subgroup.links = subgroup.links.filter((item) => item.url !== url);
    }
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

  const group = findGroup(store, draft?.group);
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

  if (found.group.name === targetName) {
    return { link: found.link, group: found.group };
  }

  removeLinkFromStore(store, incoming.url);
  const group = findOrCreateGroup(store, targetName);
  group.links.push(found.link);
  return { link: found.link, group };
}
