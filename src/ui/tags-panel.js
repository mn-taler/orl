import { TAG_MAX_LENGTH, TAG_PALETTE } from '../config.js';
import { addCatalogTag, removeCatalogTag, validateTag } from '../domain/tags.js';
import { getStore, saveStoreSafe } from '../domain/store.js';
import { createEditorActionBar } from './action-bar.js';
import { createTagChip } from './chips.js';
import { bindDisclosure, createPlusIcon, createSelectCaret, createTreeArrow } from './dom.js';

function paintSwatch(el, swatch) {
  el.style.setProperty('--tag-chip-light', swatch.light);
  el.style.setProperty('--tag-chip-dark', swatch.dark);
}

function createSwatch(swatch, index, selected, onPick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tag-palette-swatch';
  button.setAttribute('role', 'option');
  button.setAttribute('aria-selected', String(index === selected));
  button.setAttribute('aria-label', `Color ${index + 1}`);
  paintSwatch(button, swatch);
  if (onPick) button.addEventListener('click', () => onPick(index));
  return button;
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

function createAddTagRow(onClick) {
  const wrap = document.createElement('div');
  wrap.className = 'tree-add';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tree-add-group';
  button.setAttribute('aria-label', 'Add Tag');
  button.appendChild(createPlusIcon());
  const label = document.createElement('span');
  label.className = 'tree-label';
  label.textContent = 'Add Tag';
  button.appendChild(label);
  button.addEventListener('click', onClick);

  wrap.appendChild(button);
  return wrap;
}

export function initTagsPanel({ refreshAll, setStatus }) {
  const sectionToggle = document.getElementById('tags-toggle');
  const sectionPanel = document.getElementById('tags-panel');
  const listEl = document.getElementById('global-tag-list');
  const addEl = document.getElementById('tags-add');
  if (!sectionToggle || !sectionPanel || !listEl || !addEl) {
    return { refresh: () => {} };
  }

  if (!sectionToggle.querySelector('.tree-arrow')) {
    sectionToggle.appendChild(createTreeArrow());
  }
  bindDisclosure(sectionToggle, sectionPanel);

  let addingTag = false;
  let closeColorMenu = () => {};

  document.addEventListener('click', () => closeColorMenu());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeColorMenu();
  });

  const createColorSelect = (initialIndex) => {
    let selectedIndex = initialIndex;
    const select = document.createElement('div');
    select.className = 'tag-select tag-palette-select';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'add-tag-color-toggle';
    toggle.className = 'tag-select-toggle';
    toggle.setAttribute('aria-haspopup', 'listbox');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'add-tag-color-menu');
    toggle.setAttribute('aria-labelledby', 'add-tag-color-label');

    const menu = document.createElement('div');
    menu.id = 'add-tag-color-menu';
    menu.className = 'tag-palette-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'Tag color');
    menu.hidden = true;

    const setMenuOpen = (open) => {
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    };

    closeColorMenu = () => {
      if (!menu.hidden) {
        setMenuOpen(false);
        toggle.focus();
      }
    };

    const renderToggle = () => {
      toggle.innerHTML = '';
      const value = document.createElement('span');
      value.className = 'tag-select-value';
      const preview = document.createElement('span');
      preview.className = 'tag-palette-swatch';
      preview.setAttribute('aria-hidden', 'true');
      paintSwatch(preview, TAG_PALETTE[selectedIndex]);
      value.appendChild(preview);
      toggle.appendChild(value);
      toggle.appendChild(createSelectCaret());
    };

    const renderPalette = () => {
      menu.innerHTML = '';
      TAG_PALETTE.forEach((swatch, index) => {
        menu.appendChild(createSwatch(swatch, index, selectedIndex, (next) => {
          selectedIndex = next;
          renderToggle();
          renderPalette();
          setMenuOpen(false);
          toggle.focus();
        }));
      });
      renderToggle();
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenuOpen(menu.hidden);
    });
    menu.addEventListener('click', (e) => e.stopPropagation());

    select.appendChild(toggle);
    select.appendChild(menu);
    renderPalette();

    return {
      el: select,
      getSwatch: () => TAG_PALETTE[selectedIndex],
    };
  };

  const createAddTagEditor = () => {
    const wrap = document.createElement('div');
    wrap.className = 'tree-link tree-link-editing tree-add-editor';

    const frame = document.createElement('div');
    frame.className = 'tree-link-frame tree-link-editor-frame';

    const editor = document.createElement('div');
    editor.className = 'options-panel tree-link-editor';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'add-tag-name';
    nameInput.placeholder = 'Name';
    nameInput.maxLength = TAG_MAX_LENGTH;
    nameInput.setAttribute('autocomplete', 'off');
    nameInput.setAttribute('spellcheck', 'false');

    const color = createColorSelect(0);
    const colorRow = createOptionsRow('Color', color.el);
    colorRow.querySelector('.options-row-label').id = 'add-tag-color-label';

    editor.appendChild(createOptionsRow('Name', nameInput, 'add-tag-name'));
    editor.appendChild(colorRow);

    const save = () => {
      const error = validateTag(nameInput.value);
      if (error) {
        setStatus('tags', error, 'error');
        return;
      }
      const store = getStore();
      const result = addCatalogTag(store, nameInput.value, color.getSwatch());
      if (result.error) {
        setStatus('tags', result.error, 'error');
        return;
      }
      const saveError = saveStoreSafe(store);
      if (saveError) {
        setStatus('tags', saveError, 'error');
        return;
      }
      addingTag = false;
      closeColorMenu = () => {};
      refreshAll();
    };

    const cancel = () => {
      addingTag = false;
      closeColorMenu = () => {};
      renderAdd();
    };

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      }
    });

    frame.appendChild(editor);
    frame.appendChild(createEditorActionBar(save, cancel));
    wrap.appendChild(frame);
    requestAnimationFrame(() => nameInput.focus());
    return wrap;
  };

  const renderAdd = () => {
    addEl.innerHTML = '';
    addEl.appendChild(addingTag
      ? createAddTagEditor()
      : createAddTagRow(() => {
        addingTag = true;
        renderAdd();
      }));
  };

  const renderList = () => {
    const store = getStore();
    listEl.innerHTML = '';
    if (store.tags.length === 0) {
      listEl.hidden = true;
      return;
    }
    listEl.hidden = false;
    store.tags.forEach((tag) => {
      listEl.appendChild(createTagChip(tag, (name) => {
        const next = getStore();
        const result = removeCatalogTag(next, name);
        if (result.error) {
          setStatus('tags', result.error, 'error');
          return;
        }
        const error = saveStoreSafe(next);
        if (error) {
          setStatus('tags', error, 'error');
          return;
        }
        refreshAll();
      }));
    });
  };

  return {
    refresh: () => {
      renderList();
      renderAdd();
    },
  };
}
