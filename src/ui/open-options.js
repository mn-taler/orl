import { filterOpenLinks, flattenUrls, listOpenGroups } from '../domain/groups.js';
import { pickRandomLinks } from '../domain/links.js';
import { getStore } from '../domain/store.js';
import { normalizeOpenTags, sameTagList } from '../domain/tags.js';
import {
  clampLinkAmount,
  getLinkAmount,
  getOpenGroup,
  getOpenTags,
  saveLinkAmount,
  saveOpenGroup,
  saveOpenTags,
} from '../data/preferences.js';
import { createTagChip } from './chips.js';
import { bindDisclosure, createSelectCaret, fillSelect } from './dom.js';

export function initOpenOptions({ setListInfo }) {
  const openRandomLinkButton = document.getElementById('open-button');
  const optionsToggle = document.getElementById('options-toggle');
  const optionsPanel = document.getElementById('options-panel');
  const linkAmountInput = document.getElementById('link-amount');
  const openGroupSelect = document.getElementById('open-group');
  const openTagSelect = document.getElementById('open-tag');
  const openTagToggle = document.getElementById('open-tag-toggle');
  const openTagMenu = document.getElementById('open-tag-menu');

  const applyLinkAmount = (value) => {
    const amount = clampLinkAmount(value);
    linkAmountInput.value = String(amount);
    saveLinkAmount(amount);
    return amount;
  };

  applyLinkAmount(getLinkAmount());

  const setOpenTagMenuOpen = (open) => {
    openTagMenu.hidden = !open;
    openTagToggle.setAttribute('aria-expanded', String(open));
  };

  const selectedOpenTags = () => normalizeOpenTags(openTagSelect.value);

  const renderOpenTagToggle = (tags, selected) => {
    openTagToggle.innerHTML = '';
    const value = document.createElement('span');
    value.className = 'tag-select-value';
    const entries = tags.filter((tag) => selected.includes(tag.name));
    if (entries.length > 0) {
      entries.forEach((tag) => value.appendChild(createTagChip(tag)));
    } else {
      value.textContent = 'All';
    }
    openTagToggle.appendChild(value);
    openTagToggle.appendChild(createSelectCaret());
  };

  const syncTagOptionState = (selected) => {
    [...openTagMenu.children].forEach((item) => {
      const value = item.dataset.value;
      const isSelected = value ? selected.includes(value) : selected.length === 0;
      item.setAttribute('aria-selected', String(isSelected));
    });
  };

  const applyOpenTags = (tags, selected) => {
    const current = selected.filter((name) => tags.some((tag) => tag.name === name));
    openTagSelect.value = JSON.stringify(current);
    saveOpenTags(current);
    renderOpenTagToggle(tags, current);
    syncTagOptionState(current);
    return current;
  };

  const fillTagSelect = (tags, selected) => {
    const current = selected.filter((name) => tags.some((tag) => tag.name === name));
    openTagMenu.innerHTML = '';

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
          applyOpenTags(tags, []);
          setOpenTagMenuOpen(false);
          openTagToggle.focus();
          return;
        }
        const next = selectedOpenTags();
        const index = next.indexOf(value);
        if (index >= 0) next.splice(index, 1);
        else next.push(value);
        applyOpenTags(tags, next);
      });
      openTagMenu.appendChild(option);
    };

    addOption('', 'All');
    tags.forEach((tag) => addOption(tag.name, createTagChip(tag)));
    return applyOpenTags(tags, current);
  };

  const refresh = () => {
    const store = getStore();
    const group = fillSelect(
      openGroupSelect,
      listOpenGroups(store).map((item) => item.name),
      getOpenGroup()
    );
    if (group !== getOpenGroup()) saveOpenGroup(group);
    const tags = fillTagSelect(store.tags, getOpenTags());
    if (!sameTagList(tags, getOpenTags())) saveOpenTags(tags);
    if (openTagMenu.hidden === false && store.tags.length === 0) {
      setOpenTagMenuOpen(false);
    }
  };

  openGroupSelect.addEventListener('change', () => {
    saveOpenGroup(openGroupSelect.value);
  });

  openTagToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpenTagMenuOpen(openTagMenu.hidden);
  });

  openTagMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    if (!openTagMenu.hidden) setOpenTagMenuOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !openTagMenu.hidden) {
      setOpenTagMenuOpen(false);
      openTagToggle.focus();
    }
  });

  bindDisclosure(optionsToggle, optionsPanel);

  optionsToggle.addEventListener('click', () => {
    if (optionsPanel.hidden) setOpenTagMenuOpen(false);
  });

  linkAmountInput.addEventListener('change', () => {
    applyLinkAmount(linkAmountInput.value);
  });

  openRandomLinkButton.addEventListener('click', () => {
    const store = getStore();
    const allLinks = flattenUrls(store);
    if (allLinks.length === 0) {
      setListInfo('No links saved');
      return;
    }
    const groupName = openGroupSelect.value;
    const tagNames = selectedOpenTags();
    const list = filterOpenLinks(store, groupName, tagNames).map((link) => link.url);
    if (list.length === 0) {
      setListInfo('No matching links');
      return;
    }
    const amount = applyLinkAmount(linkAmountInput.value);
    const picked = pickRandomLinks(list, amount);
    picked.forEach((url) => {
      window.open(url, '_blank', 'noopener');
    });
    if (picked.length === 1) {
      setListInfo('Link opened');
    } else if (picked.length < amount) {
      setListInfo(`Opened ${picked.length} of ${amount}`);
    } else {
      setListInfo(`${picked.length} links opened`);
    }
  });

  return { refresh };
}
