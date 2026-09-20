import { getLinks, getStorageError } from '../domain/store.js';

const EMPTY_LIST_MESSAGE = 'No links saved yet';
const DAMAGED_LIST_MESSAGE = 'Saved data is damaged. New saves will replace it.';
const STATUS_DURATION_MS = 3000;

const SECTION_IDS = {
  collection: 'list-info',
  settings: 'settings-status',
};

const BUTTON_SECTIONS = {
  open: { id: 'open-button', label: 'OPEN' },
  add: { id: 'add-link-button', label: 'ADD' },
  tags: { id: 'global-tag-add', label: 'ADD' },
};

const TONES = new Set(['success', 'error', 'info']);
const timeouts = {};

function getStatusEl(section) {
  return document.getElementById(SECTION_IDS[section]);
}

function applyTone(el, tone) {
  el.classList.remove('is-success', 'is-error', 'is-info');
  el.classList.add(`is-${TONES.has(tone) ? tone : 'info'}`);
}

function restoreButton(section) {
  const spec = BUTTON_SECTIONS[section];
  const button = document.getElementById(spec.id);
  if (!button) return;
  button.textContent = spec.label;
  button.classList.remove('is-success', 'is-error', 'is-info');
}

function setButtonStatus(section, message, tone) {
  const spec = BUTTON_SECTIONS[section];
  const button = document.getElementById(spec.id);
  if (!button) return;
  if (timeouts[section]) {
    clearTimeout(timeouts[section]);
    timeouts[section] = null;
  }
  if (!message) {
    restoreButton(section);
    return;
  }
  button.textContent = message;
  applyTone(button, tone);
  timeouts[section] = setTimeout(() => {
    timeouts[section] = null;
    restoreButton(section);
  }, STATUS_DURATION_MS);
}

function clearStatus(section) {
  if (BUTTON_SECTIONS[section]) {
    restoreButton(section);
    return;
  }
  const el = getStatusEl(section);
  if (!el) return;
  el.textContent = '';
  el.hidden = true;
  el.classList.remove('is-success', 'is-error', 'is-info', 'hidden');
}

export function restoreListInfo(links) {
  const infoEl = getStatusEl('collection');
  if (!infoEl) return;
  if (timeouts.collection) {
    clearTimeout(timeouts.collection);
    timeouts.collection = null;
  }
  if (getStorageError() === 'unreadable') {
    infoEl.textContent = DAMAGED_LIST_MESSAGE;
    infoEl.hidden = false;
    infoEl.classList.remove('hidden');
    applyTone(infoEl, 'error');
    return;
  }
  if (links.length === 0) {
    infoEl.textContent = EMPTY_LIST_MESSAGE;
    infoEl.hidden = false;
    infoEl.classList.remove('hidden');
    applyTone(infoEl, 'info');
    return;
  }
  infoEl.textContent = '';
  infoEl.hidden = false;
  infoEl.classList.add('hidden');
  applyTone(infoEl, 'info');
}

export function setStatus(section, message, tone = 'info') {
  if (BUTTON_SECTIONS[section]) {
    setButtonStatus(section, message, tone);
    return;
  }
  const el = getStatusEl(section);
  if (!el) return;
  if (timeouts[section]) {
    clearTimeout(timeouts[section]);
    timeouts[section] = null;
  }
  el.textContent = message;
  el.hidden = !message;
  el.classList.remove('hidden');
  applyTone(el, tone);
  if (!message) return;
  timeouts[section] = setTimeout(() => {
    timeouts[section] = null;
    if (section === 'collection') restoreListInfo(getLinks());
    else clearStatus(section);
  }, STATUS_DURATION_MS);
}
