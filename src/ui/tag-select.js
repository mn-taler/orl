import { createTagChip } from './chips.js';
import { createSelectCaret } from './dom.js';

export function bindTagMultiSelect({
  toggle,
  menu,
  emptyLabel,
  includeClear = false,
  clearLabel = 'All',
  onChange,
}) {
  let catalog = [];
  let selected = [];

  const setMenuOpen = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };

  const renderToggle = () => {
    toggle.innerHTML = '';
    const value = document.createElement('span');
    value.className = 'tag-select-value';
    const entries = catalog.filter((tag) => selected.includes(tag.name));
    if (entries.length > 0) {
      entries.forEach((tag) => value.appendChild(createTagChip(tag)));
    } else {
      value.textContent = emptyLabel;
    }
    toggle.appendChild(value);
    toggle.appendChild(createSelectCaret());
  };

  const syncOptionState = () => {
    [...menu.children].forEach((item) => {
      const value = item.dataset.value;
      const isSelected = value ? selected.includes(value) : selected.length === 0;
      item.setAttribute('aria-selected', String(isSelected));
    });
  };

  const apply = (next) => {
    selected = next.filter((name) => catalog.some((tag) => tag.name === name));
    renderToggle();
    syncOptionState();
    if (onChange) onChange(selected.slice());
    return selected.slice();
  };

  const addOption = (value, content) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'tag-select-option';
    option.dataset.value = value;
    option.setAttribute('role', 'option');
    if (typeof content === 'string') option.textContent = content;
    else option.appendChild(content);
    option.addEventListener('click', () => {
      if (!value) {
        apply([]);
        setMenuOpen(false);
        toggle.focus();
        return;
      }
      const next = selected.slice();
      const index = next.indexOf(value);
      if (index >= 0) next.splice(index, 1);
      else next.push(value);
      apply(next);
    });
    menu.appendChild(option);
  };

  const refresh = (tags, nextSelected = selected) => {
    catalog = Array.isArray(tags) ? tags : [];
    selected = (nextSelected || []).filter((name) => catalog.some((tag) => tag.name === name));
    menu.innerHTML = '';
    if (includeClear) addOption('', clearLabel);
    catalog.forEach((tag) => addOption(tag.name, createTagChip(tag)));
    renderToggle();
    syncOptionState();
    if (menu.hidden === false && catalog.length === 0) setMenuOpen(false);
    return selected.slice();
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

  return {
    refresh,
    getSelected: () => selected.slice(),
    close: () => setMenuOpen(false),
    isOpen: () => menu.hidden === false,
  };
}
