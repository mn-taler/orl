import { MAX_GROUP_NAME_LENGTH } from '../config.js';
import {
  addLinkToStore,
  countGroupLinks,
  createGroup,
  deleteLinkFromStore,
  findLinkInStore,
  isReservedGroupName,
  removeGroupFromStore,
  renameGroup,
  updateLinkInStore,
} from '../domain/groups.js';
import { getStore, saveStoreSafe } from '../domain/store.js';
import { createDeleteActionBar, createEditorActionBar } from './action-bar.js';
import { createOverflowTagRow } from './chips.js?v=overflow4';
import {
  createEditIcon,
  createPlusIcon,
  createTrashIcon,
  createTreeArrow,
} from './dom.js';
import { setStatus } from './status.js';
import { bindTagMultiSelect } from './tag-select.js';

const expandedNodes = new Set();
let editingUrl = null;
let addingGroup = false;
let addingLinkGroup = null;
let editingGroup = null;
let deletingUrl = null;
let deletingGroup = null;

export function expandGroup(name) {
  expandedNodes.add(`group:${name}`);
}

function closeEditors() {
  editingUrl = null;
  addingGroup = false;
  addingLinkGroup = null;
  editingGroup = null;
  deletingUrl = null;
  deletingGroup = null;
}

function persistChange(store, onSuccess) {
  const error = saveStoreSafe(store);
  if (error) {
    setStatus('collection', error, 'error');
    return false;
  }
  onSuccess();
  return true;
}

function resolveLinkTags(store, names) {
  return (names || []).map((name) => store.tags.find((tag) => tag.name === name) || { name });
}

function listGroupNames(store) {
  return store.groups
    .filter((group) => !isReservedGroupName(group.name))
    .map((group) => group.name);
}

function createIconButton(labelText, icon, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', labelText);
  button.appendChild(icon);
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return button;
}

function createDeleteConfirm(tagName, onDelete, onCancel) {
  const el = document.createElement(tagName);
  el.className = 'tree-link tree-link-editing tree-link-confirm';
  el.appendChild(createDeleteActionBar(onDelete, onCancel));
  return el;
}

function createOptionsRow(labelText, control, labelFor) {
  const row = document.createElement(labelFor ? 'label' : 'div');
  row.className = 'options-row';
  if (labelFor) row.setAttribute('for', labelFor);
  const label = document.createElement('span');
  label.className = 'options-row-label';
  label.textContent = labelText;
  row.appendChild(label);
  row.appendChild(control);
  return row;
}

function fillGroupSelect(select, groupName) {
  const groupNames = listGroupNames(getStore());
  if (groupName && !groupNames.includes(groupName)) groupNames.unshift(groupName);
  select.innerHTML = '';
  groupNames.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
  select.value = groupNames.includes(groupName) ? groupName : groupNames[0] || '';
}

function createLinkForm(link, groupName, idPrefix) {
  const editor = document.createElement('div');
  editor.className = 'options-panel tree-link-editor';

  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.id = `${idPrefix}-url`;
  urlInput.value = link?.url || '';
  urlInput.placeholder = 'https://…';
  urlInput.setAttribute('autocomplete', 'off');
  urlInput.setAttribute('spellcheck', 'false');

  const groupSelect = document.createElement('select');
  groupSelect.id = `${idPrefix}-group`;
  groupSelect.setAttribute('aria-label', 'Group');
  fillGroupSelect(groupSelect, groupName);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = `${idPrefix}-name`;
  nameInput.placeholder = 'Name';
  nameInput.setAttribute('autocomplete', 'off');
  nameInput.value = link?.name || '';

  const tagSelect = document.createElement('div');
  tagSelect.className = 'tag-select';
  const tagToggle = document.createElement('button');
  tagToggle.type = 'button';
  tagToggle.id = `${idPrefix}-tag-toggle`;
  tagToggle.className = 'tag-select-toggle';
  tagToggle.setAttribute('aria-haspopup', 'listbox');
  tagToggle.setAttribute('aria-expanded', 'false');
  tagToggle.setAttribute('aria-controls', `${idPrefix}-tag-menu`);
  const tagMenu = document.createElement('div');
  tagMenu.id = `${idPrefix}-tag-menu`;
  tagMenu.className = 'tag-select-menu';
  tagMenu.setAttribute('role', 'listbox');
  tagMenu.setAttribute('aria-multiselectable', 'true');
  tagMenu.hidden = true;
  tagSelect.appendChild(tagToggle);
  tagSelect.appendChild(tagMenu);

  const tagsRow = createOptionsRow('Tags', tagSelect);
  tagsRow.querySelector('.options-row-label').id = `${idPrefix}-tag-label`;
  tagToggle.setAttribute('aria-labelledby', `${idPrefix}-tag-label`);

  editor.appendChild(createOptionsRow('URL', urlInput, `${idPrefix}-url`));
  editor.appendChild(createOptionsRow('Group', groupSelect, `${idPrefix}-group`));
  editor.appendChild(createOptionsRow('Name', nameInput, `${idPrefix}-name`));
  editor.appendChild(tagsRow);

  const tags = bindTagMultiSelect({
    toggle: tagToggle,
    menu: tagMenu,
    emptyLabel: 'None',
  });
  tags.refresh(getStore().tags, link?.tags || []);

  return {
    editor,
    urlInput,
    nameInput,
    getDraft: () => ({
      url: urlInput.value,
      name: nameInput.value,
      tags: tags.getSelected(),
      group: groupSelect.value,
    }),
  };
}

function createLinkEditorShell(form, onSave, onCancel, extraClass) {
  const li = document.createElement('li');
  li.className = extraClass ? `tree-link tree-link-editing ${extraClass}` : 'tree-link tree-link-editing';

  const frame = document.createElement('div');
  frame.className = 'tree-link-frame tree-link-editor-frame';

  [form.urlInput, form.nameInput].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSave();
      }
    });
  });

  frame.appendChild(form.editor);
  frame.appendChild(createEditorActionBar(onSave, onCancel));
  li.appendChild(frame);
  return li;
}

function createLinkEditor(link, groupName, onChange) {
  const form = createLinkForm(link, groupName, 'edit-link');

  const save = () => {
    const store = getStore();
    const result = updateLinkInStore(store, link.url, form.getDraft());
    if (result.error) {
      setStatus('collection', result.error, 'error');
      return;
    }
    const error = saveStoreSafe(store);
    if (error) {
      setStatus('collection', error, 'error');
      return;
    }
    editingUrl = null;
    expandGroup(result.group.name);
    onChange();
    setStatus('collection', 'Link updated', 'success');
  };

  return createLinkEditorShell(form, save, () => {
    editingUrl = null;
    onChange();
  });
}

function createAddLinkEditor(groupName, onChange) {
  const form = createLinkForm({ url: '', name: '', tags: [] }, groupName, 'add-link');

  const save = () => {
    const store = getStore();
    const result = addLinkToStore(store, form.getDraft());
    if (result.error) {
      setStatus('collection', result.error, 'error');
      return;
    }
    const error = saveStoreSafe(store);
    if (error) {
      setStatus('collection', error, 'error');
      return;
    }
    addingLinkGroup = null;
    expandGroup(result.group.name);
    onChange();
    setStatus('collection', result.updated ? 'Link updated' : 'Link added', 'success');
  };

  const li = createLinkEditorShell(form, save, () => {
    addingLinkGroup = null;
    onChange();
  }, 'tree-add-editor');
  requestAnimationFrame(() => form.urlInput.focus());
  return li;
}

function createAddActionRow(labelText, onClick, tagName = 'li') {
  const li = document.createElement(tagName);
  li.className = 'tree-add';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tree-add-group';
  button.setAttribute('aria-label', labelText);
  button.appendChild(createPlusIcon());
  const label = document.createElement('span');
  label.className = 'tree-label';
  label.textContent = labelText;
  button.appendChild(label);
  button.addEventListener('click', onClick);

  li.appendChild(button);
  return li;
}

function createAddLinkRow(groupName, onChange) {
  return createAddActionRow('add link', () => {
    closeEditors();
    addingLinkGroup = groupName;
    expandGroup(groupName);
    onChange();
  });
}

function createLinkRow(link, groupName, onChange) {
  const title = link.name || link.url;
  if (deletingUrl === link.url) {
    return createDeleteConfirm('li', () => {
      const store = getStore();
      const result = deleteLinkFromStore(store, link.url);
      if (result.error) {
        setStatus('collection', result.error, 'error');
        return;
      }
      persistChange(store, () => {
        closeEditors();
        onChange();
        setStatus('collection', 'Link deleted', 'success');
      });
    }, () => {
      deletingUrl = null;
      onChange();
    });
  }
  if (editingUrl === link.url) {
    return createLinkEditor(link, groupName, onChange);
  }

  const li = document.createElement('li');
  li.className = 'tree-link';

  const frame = document.createElement('div');
  frame.className = 'tree-link-frame';

  const a = document.createElement('a');
  a.href = link.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = 'link-url';
  a.textContent = title;
  a.title = link.url;

  const tags = createOverflowTagRow(resolveLinkTags(getStore(), link.tags));

  const editBtn = createIconButton(`Edit ${title}`, createEditIcon(), 'tree-link-action tree-link-edit', () => {
    closeEditors();
    editingUrl = link.url;
    onChange();
  });
  const deleteBtn = createIconButton(`Delete ${title}`, createTrashIcon(), 'tree-link-action tree-link-delete', () => {
    closeEditors();
    deletingUrl = link.url;
    onChange();
  });

  frame.appendChild(a);
  frame.appendChild(tags);
  frame.appendChild(editBtn);
  frame.appendChild(deleteBtn);
  li.appendChild(frame);
  return li;
}

function createTreeNode(name, key, childEls, count, isSubgroup, leadingEl, actions) {
  const li = document.createElement('li');
  li.className = isSubgroup ? 'tree-node tree-node-sub' : 'tree-node';

  const row = document.createElement('div');
  row.className = 'tree-node-row';

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

  row.appendChild(toggle);
  (actions || []).forEach((action) => row.appendChild(action));
  li.appendChild(row);
  if (leadingEl) li.appendChild(leadingEl);
  li.appendChild(children);
  return li;
}

function createTreeSubgroup(groupName, subgroup, onChange) {
  const children = subgroup.links.map((link) => createLinkRow(link, groupName, onChange));
  return createTreeNode(
    subgroup.name,
    `subgroup:${groupName}/${subgroup.name}`,
    children,
    subgroup.links.length,
    true
  );
}

function createTreeGroup(group, onChange) {
  if (editingGroup === group.name) {
    return createGroupNameEditor({
      tagName: 'li',
      idPrefix: 'edit-group',
      initialName: group.name,
      onSaveName: (name) => {
        const store = getStore();
        const result = renameGroup(store, group.name, name);
        if (result.error) return result.error;
        const error = saveStoreSafe(store);
        if (error) return error;
        expandedNodes.delete(`group:${group.name}`);
        expandGroup(result.group.name);
        closeEditors();
        onChange();
        setStatus('collection', 'Group updated', 'success');
        return null;
      },
      onCancel: () => {
        editingGroup = null;
        onChange();
      },
    });
  }
  if (deletingGroup === group.name) {
    return createDeleteConfirm('li', () => {
      const store = getStore();
      const result = removeGroupFromStore(store, group.name);
      if (result.error) {
        setStatus('collection', result.error, 'error');
        return;
      }
      persistChange(store, () => {
        expandedNodes.delete(`group:${group.name}`);
        closeEditors();
        onChange();
        setStatus('collection', 'Group deleted', 'success');
      });
    }, () => {
      deletingGroup = null;
      onChange();
    });
  }

  const children = group.links.map((link) => createLinkRow(link, group.name, onChange));
  group.subgroups.forEach((subgroup) => {
    if (subgroup.links.length === 0) return;
    children.push(createTreeSubgroup(group.name, subgroup, onChange));
  });
  const leading = addingLinkGroup === group.name
    ? createAddLinkEditor(group.name, onChange)
    : createAddLinkRow(group.name, onChange);
  const editBtn = createIconButton(`Edit ${group.name}`, createEditIcon(), 'tree-link-action tree-link-edit', () => {
    closeEditors();
    editingGroup = group.name;
    onChange();
  });
  const deleteBtn = createIconButton(`Delete ${group.name}`, createTrashIcon(), 'tree-link-action tree-link-delete', () => {
    closeEditors();
    deletingGroup = group.name;
    onChange();
  });
  return createTreeNode(
    group.name,
    `group:${group.name}`,
    children,
    countGroupLinks(group),
    false,
    leading,
    [editBtn, deleteBtn]
  );
}

function createGroupNameEditor({
  tagName = 'div',
  extraClass = '',
  idPrefix,
  initialName = '',
  onSaveName,
  onCancel,
}) {
  const li = document.createElement(tagName);
  li.className = extraClass
    ? `tree-link tree-link-editing ${extraClass}`
    : 'tree-link tree-link-editing';

  const frame = document.createElement('div');
  frame.className = 'tree-link-frame tree-link-editor-frame';

  const editor = document.createElement('div');
  editor.className = 'options-panel tree-link-editor';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = `${idPrefix}-name`;
  nameInput.placeholder = 'Name';
  nameInput.maxLength = MAX_GROUP_NAME_LENGTH;
  nameInput.value = initialName;
  nameInput.setAttribute('autocomplete', 'off');
  nameInput.setAttribute('spellcheck', 'false');

  editor.appendChild(createOptionsRow('Name', nameInput, `${idPrefix}-name`));

  const save = () => {
    const error = onSaveName(nameInput.value);
    if (error) setStatus('collection', error, 'error');
  };

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  });

  frame.appendChild(editor);
  frame.appendChild(createEditorActionBar(save, onCancel));
  li.appendChild(frame);
  requestAnimationFrame(() => {
    nameInput.focus();
    nameInput.select();
  });
  return li;
}

function createGroupEditor(onChange) {
  return createGroupNameEditor({
    tagName: 'div',
    extraClass: 'tree-add-editor',
    idPrefix: 'add-group',
    onSaveName: (name) => {
      const store = getStore();
      const result = createGroup(store, name);
      if (result.error) return result.error;
      const error = saveStoreSafe(store);
      if (error) return error;
      addingGroup = false;
      expandGroup(result.group.name);
      onChange();
      setStatus('collection', 'Group added', 'success');
      return null;
    },
    onCancel: () => {
      addingGroup = false;
      onChange();
    },
  });
}

function createAddGroupRow(onChange) {
  return createAddActionRow('add group', () => {
    closeEditors();
    addingGroup = true;
    onChange();
  }, 'div');
}

export function renderCollection(listEl, onChange) {
  const store = getStore();
  if (editingUrl && !findLinkInStore(store, editingUrl)) {
    editingUrl = null;
  }
  if (deletingUrl && !findLinkInStore(store, deletingUrl)) {
    deletingUrl = null;
  }
  if (addingLinkGroup && !store.groups.some((group) => group.name === addingLinkGroup)) {
    addingLinkGroup = null;
  }
  if (editingGroup && !store.groups.some((group) => group.name === editingGroup)) {
    editingGroup = null;
  }
  if (deletingGroup && !store.groups.some((group) => group.name === deletingGroup)) {
    deletingGroup = null;
  }
  listEl.innerHTML = '';
  store.groups.filter((group) => !isReservedGroupName(group.name)).forEach((group) => {
    listEl.appendChild(createTreeGroup(group, onChange));
  });
  const addEl = document.getElementById('collection-add');
  if (addEl) {
    addEl.innerHTML = '';
    addEl.appendChild(addingGroup ? createGroupEditor(onChange) : createAddGroupRow(onChange));
  }
}
