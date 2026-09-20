import { TAGS_GROUP } from '../config.js';
import { countGroupLinks, groupHasLinks, removeLinkFromStore } from '../domain/groups.js';
import { getStore, saveStoreSafe } from '../domain/store.js';
import { createTagField } from './chips.js';
import { createTreeArrow } from './dom.js';
import { setListInfo } from './status.js';

const expandedNodes = new Set([`group:${TAGS_GROUP}`]);

export function expandGroup(name) {
  expandedNodes.add(`group:${name}`);
}

function createLinkRow(link, onChange) {
  const li = document.createElement('li');
  li.className = 'tree-link';

  const main = document.createElement('div');
  main.className = 'tree-link-main';

  const a = document.createElement('a');
  a.href = link.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = 'link-url';
  a.textContent = link.name || link.url;
  a.title = link.url;

  main.appendChild(a);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-link';
  removeBtn.type = 'button';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => {
    const label = link.name || link.url;
    if (!window.confirm(`Remove ${label}?`)) return;
    const store = getStore();
    removeLinkFromStore(store, link.url);
    const error = saveStoreSafe(store);
    if (error) {
      setListInfo(error);
      return;
    }
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

function createTagsGroup(tags) {
  const fieldWrap = document.createElement('li');
  fieldWrap.className = 'tree-tag-field';
  fieldWrap.appendChild(createTagField(tags));
  return createTreeNode(TAGS_GROUP, `group:${TAGS_GROUP}`, [fieldWrap], tags.length, false);
}

export function renderCollection(listEl, onChange) {
  const store = getStore();
  listEl.innerHTML = '';
  store.groups.filter(groupHasLinks).forEach((group) => {
    listEl.appendChild(createTreeGroup(group, onChange));
  });
  if (store.tags.length > 0) {
    listEl.appendChild(createTagsGroup(store.tags));
  }
}

export function refreshGroupSuggestions() {
  const datalist = document.getElementById('group-suggestions');
  if (!datalist) return;
  datalist.innerHTML = '';
  getStore().groups.forEach((group) => {
    const option = document.createElement('option');
    option.value = group.name;
    datalist.appendChild(option);
  });
}
