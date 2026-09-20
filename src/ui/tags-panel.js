import { TAG_PALETTE } from '../config.js';
import { addCatalogTag, removeCatalogTag, validateTag } from '../domain/tags.js';
import { getStore, saveStoreSafe } from '../domain/store.js';
import { createTagChip } from './chips.js';
import { bindDisclosure, createTreeArrow } from './dom.js';

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

export function initTagsPanel({ refreshAll, setStatus }) {
  const sectionToggle = document.getElementById('tags-toggle');
  const sectionPanel = document.getElementById('tags-panel');
  const listEl = document.getElementById('global-tag-list');
  const input = document.getElementById('global-tag-input');
  const addButton = document.getElementById('global-tag-add');
  const toggle = document.getElementById('tag-palette-toggle');
  const menu = document.getElementById('tag-palette');

  if (!sectionToggle.querySelector('.tree-arrow')) {
    sectionToggle.appendChild(createTreeArrow());
  }
  bindDisclosure(sectionToggle, sectionPanel);

  let selectedIndex = 0;

  const setMenuOpen = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };

  const renderToggle = () => {
    let preview = toggle.querySelector('.tag-palette-swatch');
    if (!preview) {
      preview = document.createElement('span');
      preview.className = 'tag-palette-swatch';
      preview.setAttribute('aria-hidden', 'true');
      toggle.appendChild(preview);
    }
    paintSwatch(preview, TAG_PALETTE[selectedIndex]);
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

  const addTag = () => {
    const error = validateTag(input.value);
    if (error) {
      setStatus('tags', error, 'error');
      return;
    }
    const store = getStore();
    const result = addCatalogTag(store, input.value, TAG_PALETTE[selectedIndex]);
    if (result.error) {
      setStatus('tags', result.error, 'error');
      return;
    }
    const saveError = saveStoreSafe(store);
    if (saveError) {
      setStatus('tags', saveError, 'error');
      return;
    }
    input.value = '';
    refreshAll();
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setMenuOpen(menu.hidden);
  });

  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    if (!menu.hidden) setMenuOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      setMenuOpen(false);
      toggle.focus();
    }
  });

  addButton.addEventListener('click', addTag);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  });

  renderPalette();

  return { refresh: renderList };
}
