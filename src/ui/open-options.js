import { filterOpenLinks, flattenUrls, listOpenGroups } from '../domain/groups.js';
import { pickRandomLinks } from '../domain/links.js';
import { getStore } from '../domain/store.js';
import { sameTagList } from '../domain/tags.js';
import {
  clampLinkAmount,
  getLinkAmount,
  getOpenGroup,
  getOpenTags,
  saveLinkAmount,
  saveOpenGroup,
  saveOpenTags,
} from '../data/preferences.js';
import { bindDisclosure, fillSelect } from './dom.js';
import { bindTagMultiSelect } from './tag-select.js';

export function initOpenOptions({ setStatus }) {
  const openRandomLinkButton = document.getElementById('open-button');
  const optionsToggle = document.getElementById('options-toggle');
  const optionsPanel = document.getElementById('options-panel');
  const linkAmountInput = document.getElementById('link-amount');
  const openGroupSelect = document.getElementById('open-group');
  const openTagToggle = document.getElementById('open-tag-toggle');
  const openTagMenu = document.getElementById('open-tag-menu');

  const applyLinkAmount = (value) => {
    const amount = clampLinkAmount(value);
    linkAmountInput.value = String(amount);
    saveLinkAmount(amount);
    return amount;
  };

  applyLinkAmount(getLinkAmount());

  const tagSelect = bindTagMultiSelect({
    toggle: openTagToggle,
    menu: openTagMenu,
    emptyLabel: 'All',
    includeClear: true,
    clearLabel: 'All',
    onChange: (selected) => {
      saveOpenTags(selected);
    },
  });

  const refresh = () => {
    const store = getStore();
    const group = fillSelect(
      openGroupSelect,
      listOpenGroups(store).map((item) => item.name),
      getOpenGroup()
    );
    if (group !== getOpenGroup()) saveOpenGroup(group);
    const tags = tagSelect.refresh(store.tags, getOpenTags());
    if (!sameTagList(tags, getOpenTags())) saveOpenTags(tags);
    if (optionsPanel.hidden) tagSelect.close();
  };

  openGroupSelect.addEventListener('change', () => {
    saveOpenGroup(openGroupSelect.value);
  });

  bindDisclosure(optionsToggle, optionsPanel);

  optionsToggle.addEventListener('click', () => {
    if (optionsPanel.hidden) tagSelect.close();
  });

  linkAmountInput.addEventListener('change', () => {
    applyLinkAmount(linkAmountInput.value);
  });

  openRandomLinkButton.addEventListener('click', () => {
    const store = getStore();
    const allLinks = flattenUrls(store);
    if (allLinks.length === 0) {
      setStatus('open', 'No links saved', 'error');
      return;
    }
    const groupName = openGroupSelect.value;
    const tagNames = tagSelect.getSelected();
    const list = filterOpenLinks(store, groupName, tagNames).map((link) => link.url);
    if (list.length === 0) {
      setStatus('open', 'No matching links', 'error');
      return;
    }
    const amount = applyLinkAmount(linkAmountInput.value);
    const picked = pickRandomLinks(list, amount);
    let opened = 0;
    picked.forEach((url) => {
      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      if (popup) opened += 1;
    });
    if (opened === 0) {
      setStatus('open', picked.length === 1 ? 'Popup blocked' : 'Popups blocked', 'error');
    } else if (opened < picked.length) {
      setStatus('open', `Opened ${opened} of ${picked.length} (popups blocked)`, 'error');
    }
  });

  return { refresh };
}
