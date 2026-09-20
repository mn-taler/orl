import { DEFAULT_GROUP, TAGS_GROUP } from '../config.js';
import { mergeLinkIntoList, normalizeLinkEntry } from './links.js';

export function isReservedGroupName(name) {
  return (name || '').trim().toLowerCase() === TAGS_GROUP.toLowerCase();
}

export function normalizeGroupName(name) {
  const s = (name || '').trim();
  if (!s || s.toLowerCase() === 'main' || isReservedGroupName(s)) return DEFAULT_GROUP;
  return s;
}

export function normalizeSubgroup(subgroup) {
  const links = Array.isArray(subgroup?.links)
    ? subgroup.links.map(normalizeLinkEntry).filter(Boolean)
    : [];
  return {
    name: (subgroup?.name || '').trim() || 'Untitled',
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
  let group = store.groups.find((item) => item.name === groupName);
  if (!group) {
    group = { name: groupName, links: [], subgroups: [] };
    store.groups.push(group);
  }
  return group;
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
